// Shared helpers: current game, the acting player, common guards, event logging.
import { query, queryOne } from '../db/db.js';
import { httpError } from './errors.js';
import { distanceMeters } from './geo.js';

/** Latest game that is scheduled or active, or null. */
export async function getCurrentGame() {
  return queryOne(
    `SELECT id, name, status, starts_at, ends_at
     FROM game_sessions
     WHERE status IN ('scheduled', 'active')
     ORDER BY created_at DESC, id DESC
     LIMIT 1`
  );
}

/**
 * Loads the acting player (looked up by Firebase uid) together with their team's game.
 * With a `client` and lock=true the user row is locked (SELECT ... FOR UPDATE), which
 * serialises concurrent actions of the same player (prevents double-spending).
 */
export async function getPlayer(uid, { client = null, lock = false } = {}) {
  const sql = `
    SELECT u.id, u.name, u.team_id, t.game_id, t.name AS team_name
    FROM users u
    LEFT JOIN teams t ON t.id = u.team_id
    WHERE u.firebase_uid = $1
    ${lock ? 'FOR UPDATE OF u' : ''}`;
  const { rows } = client ? await client.query(sql, [uid]) : await query(sql, [uid]);
  if (!rows[0]) throw httpError(404, 'User not found. Call GET /me first');
  return rows[0];
}

export function requireTeam(player) {
  if (!player.team_id) throw httpError(403, 'Join a team first');
}

/** The game the player is looking at: their team's game, otherwise the current game. */
export async function resolveGameId(player) {
  if (player.game_id) return player.game_id;
  const game = await getCurrentGame();
  if (!game) throw httpError(404, 'No active game');
  return game.id;
}

export async function requireActiveGame(client, gameId) {
  const { rows } = await client.query('SELECT status FROM game_sessions WHERE id = $1', [gameId]);
  if (!rows[0] || rows[0].status !== 'active') throw httpError(409, 'Game is not active');
}

/** Locks and returns a territory, which must belong to the player's game. */
export async function lockTerritory(client, territoryId, player) {
  const { rows } = await client.query('SELECT * FROM territories WHERE id = $1 FOR UPDATE', [territoryId]);
  const territory = rows[0];
  if (!territory) throw httpError(404, 'Territory not found');
  if (territory.game_id !== player.game_id) {
    throw httpError(403, 'Territory belongs to another game');
  }
  return territory;
}

/** Player must be within the territory's radius (metres). */
export function requireNearby(territory, latitude, longitude) {
  const dist = distanceMeters(latitude, longitude, territory.latitude, territory.longitude);
  if (dist > territory.radius) {
    throw httpError(
      403,
      `Too far from ${territory.name}: you are ${Math.round(dist)} m away, must be within ${territory.radius} m`
    );
  }
}

/** Appends a row to the permanent game_events log (call inside the action's transaction). */
export async function logEvent(client, { gameId, userId = null, teamId = null, territoryId = null, type, data = {} }) {
  await client.query(
    `INSERT INTO game_events (game_id, user_id, team_id, territory_id, event_type, event_data)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
    [gameId, userId, teamId, territoryId, type, JSON.stringify(data)]
  );
}
