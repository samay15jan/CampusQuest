// Shared helpers used by every game service: player, live event, portal rows, XP, logging.
import { query, queryOne } from '../db/db.js';
import { httpError } from './errors.js';
import { levelInfo } from './levels.js';
import { isPlayTime, currentPortalWindow, campusParts } from './clock.js';
import { distanceMeters } from './geo.js';
import { env } from '../config/env.js';

/** Acting player by Firebase uid. lock=true -> SELECT FOR UPDATE (serialises one player's actions). */
export async function getPlayer(uid, { client = null, lock = false } = {}) {
  const sql = `SELECT id, username, faction, xp, avatar FROM users WHERE firebase_uid = $1 ${lock ? 'FOR UPDATE' : ''}`;
  const { rows } = client ? await client.query(sql, [uid]) : await query(sql, [uid]);
  if (!rows[0]) throw httpError(404, 'User not found. Call GET /me first');
  return rows[0];
}

export function requireOnboarded(p) {
  if (!p.faction) throw httpError(403, 'Choose a faction first');
  if (!p.username) throw httpError(403, 'Finish your profile first');
}

/** Active event if there is one, otherwise the next scheduled one, otherwise null. */
export async function getCurrentEvent(run = query) {
  const { rows } = await run(
    `SELECT id, name, status, starts_at, ends_at, winner_faction FROM events
     WHERE status IN ('active', 'scheduled')
     ORDER BY (status = 'active') DESC, starts_at LIMIT 1`
  );
  return rows[0] ?? null;
}

/** The event must be running AND it must be campus hours (Mon-Fri 9-5). */
export async function requireLiveEvent(run = query) {
  const ev = await getCurrentEvent(run);
  if (!ev) throw httpError(404, 'No event scheduled');
  if (ev.status !== 'active') throw httpError(409, 'The event has not started yet');
  if (!isPlayTime()) throw httpError(409, 'CampusQuest is only playable Mon-Fri, 9:00-17:00 campus time');
  return ev;
}

export function requirePortalOpen() {
  if (!currentPortalWindow()) throw httpError(409, 'Portals are closed right now. They open twice a day');
}

/** Event portal row (portal + live state). lock=true locks the state row for the transaction. */
export async function getEventPortal(client, eventId, portalId, { lock = false } = {}) {
  const { rows } = await client.query(
    `SELECT p.id, p.name, p.latitude, p.longitude, p.radius_m,
            ep.event_id, ep.status, ep.owner_faction, ep.locked_until
     FROM event_portals ep JOIN portals p ON p.id = ep.portal_id
     WHERE ep.event_id = $1 AND ep.portal_id = $2 ${lock ? 'FOR UPDATE OF ep' : ''}`,
    [eventId, portalId]
  );
  if (!rows[0]) throw httpError(404, 'Portal is not part of the current event');
  return rows[0];
}

export const isLocked = (p) => p.status === 'controlled' && p.locked_until && new Date(p.locked_until) > new Date();

/** Allowed distance (m) for an action: env override, else the portal's own radius. */
export function rangeFor(portal, action) {
  const override = action === 'attack' ? env.ATTACK_RANGE_M : env.DEPLOY_RANGE_M;
  return override ?? portal.radius_m;
}

export const distanceTo = (portal, lat, lng) => distanceMeters(lat, lng, portal.latitude, portal.longitude);

export function requireNearby(portal, lat, lng, action) {
  const dist = distanceTo(portal, lat, lng);
  const range = rangeFor(portal, action);
  if (dist > range) {
    throw httpError(403, `Too far from ${portal.name}: you are ${Math.round(dist)} m away, must be within ${range} m`);
  }
}

export const today = () => campusParts().date;

/** Writes an XP row, bumps users.xp, returns the new totals. Call inside the action's transaction. */
export async function awardXp(client, { userId, eventId, faction, amount, reason, refId = null }) {
  await client.query(
    `INSERT INTO xp_ledger (user_id, event_id, faction, amount, reason, ref_id) VALUES ($1, $2, $3, $4, $5, $6)`,
    [userId, eventId, faction, amount, reason, refId]
  );
  const { rows } = await client.query('UPDATE users SET xp = xp + $2 WHERE id = $1 RETURNING xp', [userId, amount]);
  const total = rows[0].xp;
  const after = levelInfo(total);
  return { awarded: amount, total, level: after.level, leveled_up: levelInfo(total - amount).level < after.level };
}

export async function logEvent(client, { eventId = null, userId = null, faction = null, portalId = null, type, data = {} }) {
  await client.query(
    `INSERT INTO game_events (event_id, user_id, faction, portal_id, event_type, event_data) VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
    [eventId, userId, faction, portalId, type, JSON.stringify(data)]
  );
}

/** Team scores for an event: XP earned by each faction (win bonuses excluded). */
export async function getScores(eventId, run = query) {
  const { rows } = await run(
    `SELECT faction, COALESCE(SUM(amount), 0)::int AS points FROM xp_ledger
     WHERE event_id = $1 AND reason <> 'WEEKLY_WIN' GROUP BY faction`,
    [eventId]
  );
  const s = { red: 0, blue: 0 };
  for (const r of rows) s[r.faction] = r.points;
  const total = s.red + s.blue;
  return { red: s.red, blue: s.blue, red_pct: total ? Math.round((s.red / total) * 100) : 50, blue_pct: total ? 100 - Math.round((s.red / total) * 100) : 50 };
}

export { queryOne };
