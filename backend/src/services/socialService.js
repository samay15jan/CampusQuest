// Leaderboards, activity feed, heatmap.
import { queryMany } from '../db/db.js';
import { httpError } from '../lib/errors.js';
import { levelInfo } from '../lib/levels.js';
import { getCurrentEvent, getPlayer } from '../lib/context.js';

/** scope: global | red | blue   period: event (XP earned this week) | all (lifetime XP) */
export async function getLeaderboard(uid, { scope = 'global', period = 'event', limit = 20 }) {
  const me = await getPlayer(uid);
  const ev = period === 'event' ? await getCurrentEvent() : null;
  if (period === 'event' && !ev) throw httpError(404, 'No event scheduled');
  const faction = scope === 'global' ? null : scope;

  const rows = await queryMany(
    `WITH pts AS (
       SELECT u.id, u.username, u.avatar, u.faction, u.xp,
              ${period === 'event'
                ? `COALESCE((SELECT SUM(amount) FROM xp_ledger x WHERE x.user_id = u.id AND x.event_id = $2 AND x.reason <> 'WEEKLY_WIN'), 0)::int`
                : 'u.xp'} AS points
       FROM users u WHERE u.username IS NOT NULL AND u.faction IS NOT NULL AND ($1::text IS NULL OR u.faction = $1)
     ), ranked AS (SELECT pts.*, ROW_NUMBER() OVER (ORDER BY points DESC, id) AS rank FROM pts)
     SELECT * FROM ranked WHERE rank <= $3 OR id = $4 ORDER BY rank`,
    [faction, ev?.id ?? null, limit, me.id]
  );
  const shape = (r) => ({ rank: Number(r.rank), user_id: r.id, username: r.username, avatar: r.avatar, faction: r.faction, level: levelInfo(r.xp).level, points: r.points });
  return {
    scope, period,
    entries: rows.filter((r) => Number(r.rank) <= limit).map(shape),
    me: rows.filter((r) => r.id === me.id).map(shape)[0] ?? null,
  };
}

const FEED_TYPES = ['RESONATOR_DEPLOYED', 'RESONATOR_DESTROYED', 'PORTAL_CAPTURED', 'PORTAL_LOST'];

/** Live Activity box on the map. */
export async function getActivity({ limit = 20 }) {
  const ev = await getCurrentEvent();
  if (!ev) return [];
  return queryMany(
    `SELECT g.id, g.event_type AS type, g.faction, g.created_at, p.id AS portal_id, p.name AS portal_name,
            u.id AS user_id, u.username
     FROM game_events g
     LEFT JOIN portals p ON p.id = g.portal_id LEFT JOIN users u ON u.id = g.user_id
     WHERE g.event_id = $1 AND g.event_type = ANY($2) ORDER BY g.created_at DESC, g.id DESC LIMIT $3`,
    [ev.id, FEED_TYPES, limit]
  );
}

/** Heatmap: recent deploy/destroy activity per portal and faction, with a 0..1 intensity for the map layer. */
export async function getHeatmap({ hours = 24 }) {
  const ev = await getCurrentEvent();
  if (!ev) return [];
  const rows = await queryMany(
    `SELECT p.id AS portal_id, p.name, p.latitude, p.longitude,
            COUNT(*) FILTER (WHERE g.faction = 'red')::int AS red,
            COUNT(*) FILTER (WHERE g.faction = 'blue')::int AS blue
     FROM event_portals ep JOIN portals p ON p.id = ep.portal_id
     LEFT JOIN game_events g ON g.portal_id = p.id AND g.event_id = ep.event_id
       AND g.event_type IN ('RESONATOR_DEPLOYED', 'RESONATOR_DESTROYED')
       AND g.created_at > NOW() - make_interval(hours => $2)
     WHERE ep.event_id = $1 GROUP BY p.id ORDER BY p.id`,
    [ev.id, hours]
  );
  const max = Math.max(1, ...rows.map((r) => r.red + r.blue));
  return rows.map((r) => ({ ...r, intensity: Number(((r.red + r.blue) / max).toFixed(2)) }));
}
