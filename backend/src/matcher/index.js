// Image-recognition adapter.
//   compareImages({ photo: Buffer, contentType, portal }) -> { similarity: 0..1, label, matches }
//
//   similarity  confidence the photo shows THIS portal (0 if the portal is not among the model's top guesses)
//   label       the model's best guess (highest similarity) for the photo
//   matches     true when that best guess is this portal
//
// The decision (matches && similarity >= IMAGE_MATCH_THRESHOLD) is made in resonatorService.
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
  return { similarity: env.MATCHER_MOCK_SIMILARITY, label: portal?.name ?? null, matches: true };
}

// HTTP contract (ML/README.md):
//   POST {IMAGE_MATCHER_URL}/v1/predict   Authorization: Bearer <token>   Content-Type: image/*   body = raw image bytes
//   -> 200 { predictedTerritory, accepted, similarity, margin, predictions: [{ label, similarity }] }
// The service's own `accepted` / `predictedTerritory` verdict is ignored on purpose: the game decides
// from the highest-similarity prediction and IMAGE_MATCH_THRESHOLD.
async function httpCompare({ photo, contentType = 'image/jpeg', portal }) {
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
    .map((p) => ({ label: String(p?.label ?? ''), similarity: Number(p?.similarity) }))
    .filter((p) => p.label && Number.isFinite(p.similarity))
    .sort((a, b) => b.similarity - a.similarity);              // don't trust the service's ordering
  if (!predictions.length) { logMatcher('response had no predictions'); throw httpError(503, 'Image matcher returned no predictions'); }

  const clamp = (n) => Math.min(1, Math.max(0, n));
  const top = predictions[0];
  const wanted = normalizeName(portal.name);
  const own = predictions.find((p) => normalizeName(p.label) === wanted);
  return {
    similarity: own ? clamp(own.similarity) : 0,
    label: top.label,
    matches: normalizeName(top.label) === wanted,
  };
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
