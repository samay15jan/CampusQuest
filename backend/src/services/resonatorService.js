// Resonator inventory, location+photo verification, and deployment.
import { createReadStream } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { query, queryMany, withTransaction } from '../db/db.js';
import { gameConfig } from '../config/game.js';
import { env } from '../config/env.js';
import { httpError } from '../lib/errors.js';
import {
  getPlayer, requireOnboarded, requireLiveEvent, requirePortalOpen, getEventPortal,
  distanceTo, rangeFor, today, awardXp, logEvent, getCurrentEvent,
} from '../lib/context.js';
import { compareImages, matcherMode } from '../matcher/index.js';
import { getActiveResonators, recalculatePortal, stateView } from './portalState.js';

/** Derived, never stored: resonators earned this event (correct riddles) minus resonators deployed this event. */
export async function getInventory(run, userId, eventId) {
  const { rows } = await run(
    `SELECT (SELECT COUNT(*) FROM riddle_attempts WHERE user_id = $1 AND event_id = $2 AND correct)::int AS earned,
            (SELECT COUNT(*) FROM resonators WHERE user_id = $1 AND event_id = $2)::int AS deployed`,
    [userId, eventId]
  );
  const { earned, deployed } = rows[0];
  return { earned, deployed, available: Math.max(0, earned - deployed) };
}

/** GET /me/resonators */
export async function getMyResonators(uid) {
  const ev = await getCurrentEvent();
  const player = await getPlayer(uid);
  if (!ev) return { available: 0, earned: 0, deployed: 0, active: [] };
  const inv = await getInventory(query, player.id, ev.id);
  const active = await queryMany(
    `SELECT r.id, r.portal_id, p.name AS portal_name, r.deployed_at
     FROM resonators r JOIN portals p ON p.id = r.portal_id
     WHERE r.user_id = $1 AND r.event_id = $2 AND r.status = 'active' ORDER BY r.deployed_at`,
    [player.id, ev.id]
  );
  return { ...inv, active };
}

/**
 * POST /portals/:id/verify  (multipart: photo + latitude + longitude)
 * Checks distance and compares the live photo with the portal's reference images.
 * Always answers 200 with details so the UI can show the result screen; a passed result
 * carries a single-use verification_id that POST /portals/:id/deploy consumes.
 */
export async function verifyPortal(uid, portalId, { photo, latitude, longitude }) {
  const player = await getPlayer(uid);
  requireOnboarded(player);
  const ev = await requireLiveEvent();
  requirePortalOpen();
  const portal = await getEventPortal({ query }, ev.id, portalId);

  const { rows: rate } = await query(
    `SELECT COUNT(*)::int AS n FROM deploy_verifications WHERE user_id = $1 AND created_at > NOW() - INTERVAL '60 seconds'`, [player.id]);
  if (rate[0].n >= gameConfig.MAX_VERIFICATIONS_PER_MINUTE) throw httpError(429, 'Too many verification attempts. Wait a minute', { retryAfter: 60 });

  const distance = distanceTo(portal, latitude, longitude);
  const range = rangeFor(portal, 'deploy');
  const locationOk = distance <= range;

  let similarity = null;
  if (locationOk) {                                     // skip the (expensive) matcher when too far away
    const refs = await queryMany('SELECT id, file_path FROM portal_reference_images WHERE portal_id = $1 ORDER BY is_primary DESC, id', [portal.id]);
    const references = [];
    for (const r of refs) {
      try { references.push({ id: r.id, buffer: await readFile(path.join(env.UPLOAD_DIR, r.file_path)) }); } catch { /* missing file: skip */ }
    }
    if (!references.length && matcherMode !== 'mock') throw httpError(409, 'This portal has no reference image yet. Ask an admin to add one');
    similarity = (await compareImages({ photo, references })).similarity;
  }
  const imageOk = similarity !== null && similarity >= gameConfig.IMAGE_MATCH_THRESHOLD;
  const passed = locationOk && imageOk;

  const { rows } = await query(
    `INSERT INTO deploy_verifications (user_id, event_id, portal_id, latitude, longitude, distance_m, location_ok, similarity, image_ok, passed)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
    [player.id, ev.id, portal.id, latitude, longitude, distance, locationOk, similarity, imageOk, passed]
  );
  return {
    passed,
    verification_id: passed ? rows[0].id : null,
    expires_in_seconds: passed ? gameConfig.VERIFICATION_TTL_SECONDS : null,
    location: { ok: locationOk, distance_m: Math.round(distance), allowed_range_m: range },
    image: { ok: imageOk, similarity: similarity === null ? null : Math.round(similarity * 100), required_pct: Math.round(gameConfig.IMAGE_MATCH_THRESHOLD * 100) },
    message: passed ? 'Portal verified' : !locationOk ? `Too far from the portal (${Math.round(distance)} m)` : 'The photo does not match this portal. Try again',
  };
}

/** POST /portals/:id/deploy  { verification_id } */
export async function deployResonator(uid, portalId, { verification_id: verificationId }) {
  return withTransaction(async (client) => {
    const player = await getPlayer(uid, { client, lock: true });
    requireOnboarded(player);
    const ev = await requireLiveEvent(client.query.bind(client));
    requirePortalOpen();
    const portal = await getEventPortal(client, ev.id, portalId, { lock: true });   // lock order: user, then portal

    const { rows: vr } = await client.query('SELECT * FROM deploy_verifications WHERE id = $1 AND user_id = $2 FOR UPDATE', [verificationId, player.id]);
    const v = vr[0];
    if (!v || v.portal_id !== portal.id || v.event_id !== ev.id) throw httpError(404, 'Verification not found for this portal');
    if (!v.passed) throw httpError(403, 'This verification did not pass');
    if (v.consumed_at) throw httpError(409, 'This verification was already used');
    if (Date.now() - new Date(v.created_at).getTime() > gameConfig.VERIFICATION_TTL_SECONDS * 1000) {
      throw httpError(409, 'Verification expired. Capture the portal again');
    }

    const inv = await getInventory((t, p) => client.query(t, p), player.id, ev.id);
    if (inv.available < 1) throw httpError(409, 'No resonators available. Solve a riddle to earn one');

    const active = await getActiveResonators(client, ev.id, portal.id);
    if (active.some((r) => r.faction !== player.faction)) throw httpError(409, 'An enemy faction holds resonators here. Destroy them first');
    if (active.length >= gameConfig.RESONATORS_TO_CAPTURE) throw httpError(409, 'This portal already has all resonators');
    if (active.some((r) => r.user_id === player.id)) throw httpError(409, 'You already have a resonator on this portal');
    const day = today();
    const dup = await client.query('SELECT 1 FROM resonators WHERE event_id = $1 AND portal_id = $2 AND user_id = $3 AND deployed_day = $4', [ev.id, portal.id, player.id, day]);
    if (dup.rowCount) throw httpError(409, 'You already deployed a resonator at this portal today');

    let res;
    try {
      const { rows } = await client.query(
        `INSERT INTO resonators (event_id, portal_id, user_id, faction, deployed_day) VALUES ($1, $2, $3, $4, $5)
         RETURNING id, portal_id, user_id, faction, status, deployed_at`,
        [ev.id, portal.id, player.id, player.faction, day]
      );
      res = rows[0];
    } catch (err) {
      if (err.code === '23505') throw httpError(409, 'You already deployed a resonator at this portal today');
      throw err;
    }
    await client.query('UPDATE deploy_verifications SET consumed_at = NOW() WHERE id = $1', [v.id]);

    const state = await recalculatePortal(client, ev.id, portal.id, portal.status);
    const base = { eventId: ev.id, userId: player.id, faction: player.faction, portalId: portal.id };
    await logEvent(client, { ...base, type: 'RESONATOR_DEPLOYED', data: { resonator_id: res.id, active_resonators: state.total } });

    let xp = await awardXp(client, { userId: player.id, eventId: ev.id, faction: player.faction, amount: gameConfig.XP.RESONATOR_DEPLOYED, reason: 'RESONATOR_DEPLOYED', refId: res.id });
    let bonus = 0;
    if (state.captured) {
      bonus = gameConfig.XP.PORTAL_CAPTURED;
      xp = await awardXp(client, { userId: player.id, eventId: ev.id, faction: player.faction, amount: bonus, reason: 'PORTAL_CAPTURED', refId: portal.id });
      await logEvent(client, { ...base, type: 'PORTAL_CAPTURED', data: { locked_until: state.locked_until } });
    }
    return {
      resonator: res,
      portal: stateView(portal.id, state),
      captured: state.captured,
      available_resonators: inv.available - 1,
      xp: { ...xp, awarded: gameConfig.XP.RESONATOR_DEPLOYED + bonus },
    };
  });
}

export { createReadStream };
