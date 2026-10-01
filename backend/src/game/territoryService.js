// Territory reads (with derived resonator counts) and the single place where a
// territory's stored status / owner / lock flag is recalculated from its resonators.
import { queryMany, queryOne } from '../db/db.js';
import { httpError } from './errors.js';
import { gameConfig } from '../config/game.js';

// ONE aggregated query: active resonator counts are computed per territory and team.
const SUMMARY_SQL = `
  SELECT t.id, t.name, t.description, t.latitude, t.longitude, t.radius, t.status, t.locked,
         t.owner_team_id, ot.name AS owner_name, ot.color AS owner_color,
         COALESCE(rc.total, 0) AS total_active,
         COALESCE(rc.by_team, '{}'::jsonb) AS by_team
  FROM territories t
  LEFT JOIN teams ot ON ot.id = t.owner_team_id
  LEFT JOIN (
    SELECT territory_id, SUM(n)::int AS total, jsonb_object_agg(team_id::text, n) AS by_team
    FROM (
      SELECT territory_id, team_id, COUNT(*)::int AS n
      FROM resonators WHERE status = 'active'
      GROUP BY territory_id, team_id
    ) per_team
    GROUP BY territory_id
  ) rc ON rc.territory_id = t.id
  WHERE t.game_id = $1`;

function shapeTerritory(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    latitude: row.latitude,
    longitude: row.longitude,
    radius: row.radius,
    status: row.status,
    locked: row.locked,
    owner_team: row.owner_team_id
      ? { id: row.owner_team_id, name: row.owner_name, color: row.owner_color }
      : null,
    resonators: { total_active: row.total_active, by_team: row.by_team },
  };
}

export async function listTerritories(gameId) {
  const rows = await queryMany(`${SUMMARY_SQL} ORDER BY t.id`, [gameId]);
  return rows.map(shapeTerritory);
}

export async function getTerritoryDetail(gameId, territoryId, userId) {
  const row = await queryOne(`${SUMMARY_SQL} AND t.id = $2`, [gameId, territoryId]);
  if (!row) throw httpError(404, 'Territory not found');

  const myResonator = await queryOne(
    `SELECT id, deployed_at FROM resonators
     WHERE territory_id = $1 AND user_id = $2 AND status = 'active'`,
    [territoryId, userId]
  );
  const lock = await queryOne(
    `SELECT id, team_id, locked_by_user_id, player_one_id, player_two_id, player_three_id, locked_at
     FROM territory_locks WHERE territory_id = $1 AND unlocked_at IS NULL`,
    [territoryId]
  );

  return {
    ...shapeTerritory(row),
    my_resonator: myResonator,
    active_lock: lock && {
      id: lock.id,
      team_id: lock.team_id,
      locked_by_user_id: lock.locked_by_user_id,
      players: [lock.player_one_id, lock.player_two_id, lock.player_three_id],
      locked_at: lock.locked_at,
    },
  };
}

/** Active resonators of a territory, oldest first. */
export async function getActiveResonators(client, territoryId) {
  const { rows } = await client.query(
    `SELECT id, user_id, team_id, deployed_at FROM resonators
     WHERE territory_id = $1 AND status = 'active'
     ORDER BY deployed_at, id`,
    [territoryId]
  );
  return rows;
}

/**
 * Recalculates territories.status / owner_team_id / locked from the active resonators.
 *   0 -> neutral (no owner, unlocked)   1-2 -> partial   3 -> controlled
 * Below 3/3 any active lock is released. Call inside the same transaction as the
 * resonator change so stored state can never disagree with the resonators.
 */
export async function recalculateTerritory(client, territoryId) {
  const { rows } = await client.query(
    `SELECT team_id, COUNT(*)::int AS n FROM resonators
     WHERE territory_id = $1 AND status = 'active'
     GROUP BY team_id ORDER BY n DESC, team_id`,
    [territoryId]
  );
  const total = rows.reduce((sum, r) => sum + r.n, 0);
  const ownerTeamId = total > 0 ? rows[0].team_id : null;
  const status =
    total === 0 ? 'neutral' : total >= gameConfig.MAX_RESONATORS_PER_TERRITORY ? 'controlled' : 'partial';
  const keepLock = total >= gameConfig.MAX_RESONATORS_PER_TERRITORY;

  let lockReleased = false;
  if (!keepLock) {
    const released = await client.query(
      `UPDATE territory_locks SET unlocked_at = NOW()
       WHERE territory_id = $1 AND unlocked_at IS NULL`,
      [territoryId]
    );
    lockReleased = released.rowCount > 0;
  }

  const { rows: updated } = await client.query(
    `UPDATE territories
     SET status = $2, owner_team_id = $3, locked = (locked AND $4::boolean)
     WHERE id = $1
     RETURNING id, status, owner_team_id, locked`,
    [territoryId, status, ownerTeamId, keepLock]
  );

  return { total, status, ownerTeamId, locked: updated[0].locked, lockReleased };
}

/** Small public view of a territory's state, used in action responses. */
export function stateView(territoryId, state) {
  return {
    id: territoryId,
    status: state.status,
    owner_team_id: state.ownerTeamId,
    locked: state.locked,
    active_resonators: state.total,
  };
}
