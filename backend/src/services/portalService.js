// Read side: portal list (map + Intel tab), portal detail, reference image lookup.
import { query, queryMany, queryOne } from '../db/db.js';
import { httpError } from '../lib/errors.js';
import { getCurrentEvent, getPlayer, today } from '../lib/context.js';
import { currentPortalWindow, isPlayTime } from '../lib/clock.js';
import { gameConfig } from '../config/game.js';

const shape = (r, openNow) => {
  const locked = r.status === 'controlled' && r.locked_until && new Date(r.locked_until) > new Date();
  return {
    id: r.id, name: r.name, description: r.description,
    latitude: r.latitude, longitude: r.longitude, radius_m: r.radius_m,
    status: r.status,                       // neutral | partial | controlled
    owner_faction: r.owner_faction,         // null = neutral (grey on the map)
    locked, locked_until: locked ? r.locked_until : null,
    resonators: { red: r.red, blue: r.blue, total: r.red + r.blue },
    image_url: r.has_image ? `/portals/${r.id}/image` : null,
    open: openNow,
    you: { has_active_resonator: r.my_active, deployed_today: r.my_today },
  };
};

const LIST_SQL = `
  SELECT p.id, p.name, p.description, p.latitude, p.longitude, p.radius_m,
         ep.status, ep.owner_faction, ep.locked_until,
         COALESCE(rc.red, 0) AS red, COALESCE(rc.blue, 0) AS blue,
         EXISTS (SELECT 1 FROM portal_reference_images i WHERE i.portal_id = p.id AND i.is_primary) AS has_image,
         EXISTS (SELECT 1 FROM resonators r WHERE r.event_id = ep.event_id AND r.portal_id = p.id
                 AND r.user_id = $2 AND r.status = 'active') AS my_active,
         EXISTS (SELECT 1 FROM resonators r WHERE r.event_id = ep.event_id AND r.portal_id = p.id
                 AND r.user_id = $2 AND r.deployed_day = $3) AS my_today
  FROM event_portals ep
  JOIN portals p ON p.id = ep.portal_id
  LEFT JOIN LATERAL (
    SELECT COUNT(*) FILTER (WHERE faction = 'red')::int AS red, COUNT(*) FILTER (WHERE faction = 'blue')::int AS blue
    FROM resonators r WHERE r.event_id = ep.event_id AND r.portal_id = p.id AND r.status = 'active'
  ) rc ON TRUE
  WHERE ep.event_id = $1`;

const openNow = (ev) => ev.status === 'active' && isPlayTime() && !!currentPortalWindow();

export async function listPortals(uid, { faction } = {}) {
  const ev = await getCurrentEvent();
  if (!ev) throw httpError(404, 'No event scheduled');
  const me = await getPlayer(uid);
  const open = openNow(ev);
  const rows = await queryMany(`${LIST_SQL} ${faction ? 'AND ep.owner_faction = $4' : ''} ORDER BY p.id`,
    faction ? [ev.id, me.id, today(), faction] : [ev.id, me.id, today()]);
  return rows.map((r) => shape(r, open));
}

export async function getPortalDetail(uid, portalId) {
  const ev = await getCurrentEvent();
  if (!ev) throw httpError(404, 'No event scheduled');
  const me = await getPlayer(uid);
  const row = await queryOne(`${LIST_SQL} AND p.id = $4`, [ev.id, me.id, today(), portalId]);
  if (!row) throw httpError(404, 'Portal is not part of the current event');

  const resonators = await queryMany(
    `SELECT r.id, r.faction, r.deployed_at, u.id AS user_id, u.username, u.avatar
     FROM resonators r JOIN users u ON u.id = r.user_id
     WHERE r.event_id = $1 AND r.portal_id = $2 AND r.status = 'active' ORDER BY r.deployed_at, r.id`,
    [ev.id, portalId]
  );
  const activity = await queryMany(
    `SELECT g.event_type AS type, g.faction, g.created_at, u.username
     FROM game_events g LEFT JOIN users u ON u.id = g.user_id
     WHERE g.event_id = $1 AND g.portal_id = $2 AND g.event_type IN
       ('RESONATOR_DEPLOYED', 'RESONATOR_DESTROYED', 'PORTAL_CAPTURED', 'PORTAL_LOST')
     ORDER BY g.created_at DESC, g.id DESC LIMIT 15`,
    [ev.id, portalId]
  );
  return {
    ...shape(row, openNow(ev)),
    resonator_slots: Array.from({ length: gameConfig.RESONATORS_TO_CAPTURE }, (_, i) => resonators[i]
      ? { filled: true, resonator_id: resonators[i].id, faction: resonators[i].faction,
          player: { id: resonators[i].user_id, username: resonators[i].username, avatar: resonators[i].avatar },
          deployed_at: resonators[i].deployed_at }
      : { filled: false }),
    activity,
  };
}

/** Primary reference image of a portal (file path + mime) or null. */
export async function getPrimaryImage(portalId) {
  return queryOne(
    `SELECT file_path, mime FROM portal_reference_images WHERE portal_id = $1 ORDER BY is_primary DESC, id LIMIT 1`,
    [portalId]
  );
}

export { query };
