// Weekly events: creation (10 random portals), activation, finalisation (winner + bonus), and status view.
import { query, queryMany, withTransaction } from '../db/db.js';
import { gameConfig } from '../config/game.js';
import { httpError } from '../lib/errors.js';
import { awardXp, getScores, logEvent, getCurrentEvent } from '../lib/context.js';
import { weekRange, campusParts, addDays, isPlayTime, currentPortalWindow, nextPortalOpening, clock } from '../lib/clock.js';

/** Creates the Mon 09:00 - Fri 17:00 event for the week containing `weekOf` (default: today). */
export async function createWeeklyEvent({ weekOf, portalIds, name } = {}) {
  return withTransaction(async (client) => {
    const { monday, starts_at, ends_at } = weekRange(weekOf ?? campusParts().date);
    const dup = await client.query('SELECT 1 FROM events WHERE starts_at = $1', [starts_at]);
    if (dup.rowCount) throw httpError(409, `An event for the week of ${monday} already exists`);

    let ids = portalIds;
    if (ids?.length) {
      const { rows } = await client.query('SELECT id FROM portals WHERE id = ANY($1::int[])', [ids]);
      if (rows.length !== new Set(ids).size) throw httpError(400, 'portal_ids contains an unknown portal');
    } else {
      const { rows } = await client.query('SELECT id FROM portals WHERE active ORDER BY random() LIMIT $1', [gameConfig.EVENT_PORTAL_COUNT]);
      ids = rows.map((r) => r.id);
    }
    if (!ids.length) throw httpError(409, 'No active portals to build an event from');

    const { rows } = await client.query(
      `INSERT INTO events (name, starts_at, ends_at) VALUES ($1, $2, $3) RETURNING id, name, status, starts_at, ends_at`,
      [name ?? `Week of ${monday}`, starts_at, ends_at]
    );
    const event = rows[0];
    await client.query('INSERT INTO event_portals (event_id, portal_id) SELECT $1, UNNEST($2::int[])', [event.id, ids]);
    return { ...event, portal_ids: ids };
  });
}

export async function finalizeEvent(eventId) {
  return withTransaction(async (client) => {
    const { rows } = await client.query('SELECT * FROM events WHERE id = $1 FOR UPDATE', [eventId]);
    const ev = rows[0];
    if (!ev) throw httpError(404, 'Event not found');
    const run = (t, p) => client.query(t, p);
    if (ev.finalized_at) return { event_id: ev.id, winner_faction: ev.winner_faction, scores: await getScores(ev.id, run), already_finalized: true };

    const scores = await getScores(ev.id, run);
    const winner = scores.red > scores.blue ? 'red' : scores.blue > scores.red ? 'blue' : null;
    if (winner) {
      const { rows: people } = await client.query(
        `SELECT DISTINCT user_id FROM xp_ledger WHERE event_id = $1 AND faction = $2 AND reason <> 'WEEKLY_WIN'`,
        [ev.id, winner]
      );
      for (const { user_id } of people) {
        await awardXp(client, { userId: user_id, eventId: ev.id, faction: winner, amount: gameConfig.XP.WEEKLY_WIN, reason: 'WEEKLY_WIN' });
      }
    }
    await client.query(`UPDATE events SET status = 'finished', winner_faction = $2, finalized_at = NOW() WHERE id = $1`, [ev.id, winner]);
    await logEvent(client, { eventId: ev.id, type: 'GAME_ENDED', faction: winner, data: { scores, winner } });
    return { event_id: ev.id, winner_faction: winner, scores, already_finalized: false };
  });
}

async function ensureNextEvent() {
  const exists = await query(`SELECT 1 FROM events WHERE status IN ('scheduled', 'active') LIMIT 1`);
  if (exists.rowCount) return;
  let base = campusParts().date;
  if (weekRange(base).ends_at <= clock.now()) base = addDays(base, 7);
  try { await createWeeklyEvent({ weekOf: base }); } catch (err) { if (err.statusCode !== 409) throw err; }
}

/** Called every ~30 s by the scheduler (and by tests). */
export async function tick() {
  const due = await queryMany(`SELECT id FROM events WHERE status IN ('scheduled', 'active') AND ends_at <= NOW()`);
  for (const { id } of due) await finalizeEvent(id);

  const started = await queryMany(
    `UPDATE events SET status = 'active' WHERE status = 'scheduled' AND starts_at <= NOW() AND ends_at > NOW() RETURNING id`
  );
  for (const { id } of started) {
    await withTransaction((c) => logEvent(c, { eventId: id, type: 'GAME_STARTED' }));
  }
  await ensureNextEvent();
}

/** GET /event/current payload. */
export async function getEventStatus() {
  const ev = await getCurrentEvent();
  if (!ev) throw httpError(404, 'No event scheduled');
  const now = clock.now();
  const live = ev.status === 'active';
  return {
    event: { id: ev.id, name: ev.name, status: ev.status, starts_at: ev.starts_at, ends_at: ev.ends_at },
    scores: await getScores(ev.id),
    seconds_remaining: live ? Math.max(0, Math.round((new Date(ev.ends_at) - now) / 1000)) : null,
    seconds_until_start: !live ? Math.max(0, Math.round((new Date(ev.starts_at) - now) / 1000)) : null,
    game_open: live && isPlayTime(now),                // Mon-Fri 9-5
    portals_open: live && isPlayTime(now) && !!currentPortalWindow(now),
    portal_window: currentPortalWindow(now),
    next_portal_opening: nextPortalOpening(now),
    portal_windows: gameConfig.PORTAL_WINDOWS,
    server_time: now,
  };
}
