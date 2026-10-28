// Image-recognition adapter.
//   compareImages({ photo: Buffer, contentType, portal }) -> { predictions: [{ label, score }] }   best first
//   decideMatch(predictions, target, portals, isNearby)   -> { matches, portal, label, score }
//
// There is no percentage threshold. A photo is accepted when, among the portals that can actually be at the
// player's location, the model's highest-ranked guess is the portal being captured.
import { env } from '../config/env.js';
import { httpError } from '../lib/errors.js';

// ML labels come from photo folder names ("Raras Foodtruck", "Bank"), portals from the DB
// ("Rara's Food Truck", "The Bank"). Compare them ignoring case, punctuation, spaces and a leading "The".
const baseName = (s) =>
  String(s ?? '').toLowerCase().replace(/^\s*the\s+/, '').replace(/[^a-z0-9]/g, '');

// Names that differ by more than punctuation. Key = baseName(any spelling), value = canonical key.
// ML photo folder "Gate 2A" is the portal "Gate No. 2".
const ALIASES = { gate2a: 'gateno2', gate2: 'gateno2' };

export const normalizeName = (s) => {
  const n = baseName(s);
  return ALIASES[n] ?? n;
};

// The 503 messages below are all the player sees, so say why in the server log (never the token).
const logMatcher = (msg, extra = {}) => console.error(`[matcher] ${msg}`, extra);

async function mockCompare({ portal }) {
  return { predictions: [{ label: portal?.name ?? '', score: env.MATCHER_MOCK_SIMILARITY }] };
}

// HTTP contract (ML/README.md):
//   POST {IMAGE_MATCHER_URL}/v1/predict   Authorization: Bearer <token>   Content-Type: image/*   body = raw image bytes
//   -> 200 { predictedTerritory, accepted, similarity, margin, predictions: [{ label, similarity }] }
// The service's own `accepted` / `predictedTerritory` verdict is ignored on purpose: the game decides
// from the ranked predictions (see decideMatch) and where the player actually is.
async function httpCompare({ photo, contentType = 'image/jpeg' }) {
  if (!env.IMAGE_MATCHER_URL || !env.IMAGE_MATCHER_TOKEN) {
    logMatcher('IMAGE_MATCHER=http but IMAGE_MATCHER_URL or IMAGE_MATCHER_TOKEN is empty');
    throw httpError(503, 'Image matcher is not configured');
  }
  const url = new URL('/v1/predict', env.IMAGE_MATCHER_URL);

  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { authorization: `Bearer ${env.IMAGE_MATCHER_TOKEN}`, 'content-type': contentType },
      body: photo,
      signal: AbortSignal.timeout(15_000),
    });
  } catch (err) {
    logMatcher(`cannot reach ${url.origin}: ${err?.name === 'TimeoutError' ? 'timed out after 15s' : (err?.cause?.code || err?.message)}`);
    throw httpError(503, 'Image matcher is unavailable');
  }
  if (!res.ok) {
    // 401/403 = wrong IMAGE_MATCHER_TOKEN (or Cloudflare blocking), 413 = photo too big, 415 = bad type, 502/530 = tunnel/container down
    logMatcher(`${url.origin} answered HTTP ${res.status}`, { server: res.headers.get('server'), body: (await res.text().catch(() => '')).slice(0, 200) });
    throw httpError(503, 'Image matcher failed');
  }

  let body;
  try { body = await res.json(); } catch { logMatcher('response was not JSON'); throw httpError(503, 'Image matcher returned an invalid response'); }

  const predictions = (Array.isArray(body?.predictions) ? body.predictions : [])
    .map((p) => ({ label: String(p?.label ?? ''), score: Number(p?.similarity) }))
    .filter((p) => p.label && Number.isFinite(p.score))
    .sort((x, y) => y.score - x.score);                        // don't trust the service's ordering
  if (!predictions.length) { logMatcher('response had no predictions'); throw httpError(503, 'Image matcher returned no predictions'); }
  return { predictions };
}

/**
 * Pick the model's best guess among the portals that could be here.
 *  predictions  ranked best-first: [{ label, score }]
 *  target       the portal being captured
 *  portals      every portal we know ({ id, name, ... }), used to turn ML labels into portals
 *  isNearby     (portal) => true when the player is within range of that portal
 * Guesses for a known portal that is NOT nearby are skipped (it cannot be what the player is looking at).
 * The first remaining guess decides: it passes only if it is the target. A guess that is not a known portal
 * (e.g. "_other", or a label with no portal) counts as a miss rather than being skipped.
 */
export function decideMatch(predictions, target, portals, isNearby) {
  const byName = new Map(portals.map((p) => [normalizeName(p.name), p]));
  for (const p of predictions) {
    const portal = byName.get(normalizeName(p.label)) ?? null;
    if (portal && portal.id !== target.id && !isNearby(portal)) continue;
    return { matches: portal?.id === target.id, portal, label: p.label, score: p.score };
  }
  return { matches: false, portal: null, label: null, score: null };
}

// Readiness probe for GET /health (cached so it can't be used to hammer the ML box).
let probe = { at: 0, value: null };
export async function matcherStatus() {
  if (env.IMAGE_MATCHER !== 'http') return { mode: env.IMAGE_MATCHER };
  if (!env.IMAGE_MATCHER_URL || !env.IMAGE_MATCHER_TOKEN) return { mode: 'http', ready: false, reason: 'IMAGE_MATCHER_URL / IMAGE_MATCHER_TOKEN not set' };
  if (probe.value && Date.now() - probe.at < 10_000) return probe.value;
  let value;
  try {
    const res = await fetch(new URL('/readyz', env.IMAGE_MATCHER_URL), { signal: AbortSignal.timeout(5_000) });
    value = res.ok ? { mode: 'http', ready: true } : { mode: 'http', ready: false, reason: `ML service answered HTTP ${res.status}` };
  } catch (err) {
    value = { mode: 'http', ready: false, reason: 'ML service unreachable' };
    logMatcher(`health probe failed: ${err?.cause?.code || err?.message}`);
  }
  probe = { at: Date.now(), value };
  return value;
}

export const matcherMode = env.IMAGE_MATCHER;
export const compareImages = env.IMAGE_MATCHER === 'http' ? httpCompare : mockCompare;
