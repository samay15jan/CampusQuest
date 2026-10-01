// Resonator inventory (derived) and deployment.
import { query, queryMany, withTransaction } from '../db/db.js';
import { gameConfig } from '../config/game.js';
import { httpError } from './errors.js';
import {
  getPlayer, requireTeam, requireActiveGame, lockTerritory, requireNearby, logEvent,
} from './gameService.js';
import { getActiveResonators, recalculateTerritory, stateView } from './territoryService.js';

/**
 * Inventory is derived, never stored:
 *   available = riddles solved correctly - resonators ever deployed (destroyed ones are not refunded)
 * `run` is client.query inside a transaction, or the pool's query outside one.
 */
export async function getInventory(run, userId) {
  const { rows } = await run(
    `SELECT
       (SELECT COUNT(DISTINCT riddle_id) FROM riddle_attempts WHERE user_id = $1 AND correct)::int AS solved,
       (SELECT COUNT(*) FROM resonators WHERE user_id = $1)::int AS deployed`,
    [userId]
  );
  const { solved, deployed } = rows[0];
  return { solved, deployed, available: Math.max(0, solved - deployed) };
}

/** GET /me/resonators */
export async function getMyResonators(uid) {
  const player = await getPlayer(uid);
  const inventory = await getInventory(query, player.id);
  const active = await queryMany(
    `SELECT r.id, r.territory_id, t.name AS territory_name, r.status, r.deployed_at
     FROM resonators r JOIN territories t ON t.id = r.territory_id
     WHERE r.user_id = $1 AND r.status = 'active'
     ORDER BY r.deployed_at, r.id`,
    [player.id]
  );
  return {
    available: inventory.available,
    solved_riddles: inventory.solved,
    deployed_total: inventory.deployed,
    active,
  };
}

/** POST /territories/:id/deploy */
export async function deployResonator(uid, territoryId, { latitude, longitude }) {
  return withTransaction(async (client) => {
    // Lock order: the player's row, then the territory row.
    const player = await getPlayer(uid, { client, lock: true });
    requireTeam(player);
    const territory = await lockTerritory(client, territoryId, player);
    await requireActiveGame(client, territory.game_id);
    requireNearby(territory, latitude, longitude);

    // Re-check every rule now that both rows are locked.
    const inventory = await getInventory((t, p) => client.query(t, p), player.id);
    if (inventory.available < 1) {
      throw httpError(409, 'No resonators available. Solve a riddle to earn one');
    }

    const active = await getActiveResonators(client, territory.id);
    if (active.some((r) => r.team_id !== player.team_id)) {
      throw httpError(409, 'This territory is held by another team');
    }
    if (active.length >= gameConfig.MAX_RESONATORS_PER_TERRITORY) {
      throw httpError(409, `This territory already has ${gameConfig.MAX_RESONATORS_PER_TERRITORY} resonators`);
    }
    if (active.some((r) => r.user_id === player.id)) {
      throw httpError(409, 'You already have a resonator on this territory');
    }

    let resonator;
    try {
      const { rows } = await client.query(
        `INSERT INTO resonators (territory_id, user_id, team_id)
         VALUES ($1, $2, $3)
         RETURNING id, territory_id, user_id, team_id, status, deployed_at`,
        [territory.id, player.id, player.team_id]
      );
      resonator = rows[0];
    } catch (err) {
      // Backstop: the partial unique index "one active resonator per player per territory".
      if (err.code === '23505') throw httpError(409, 'You already have a resonator on this territory');
      throw err;
    }

    const state = await recalculateTerritory(client, territory.id);

    const base = { gameId: territory.game_id, userId: player.id, teamId: player.team_id, territoryId: territory.id };
    await logEvent(client, {
      ...base,
      type: 'RESONATOR_DEPLOYED',
      data: { resonator_id: resonator.id, user_id: player.id, active_resonators: state.total },
    });
    if (state.total === 1) {
      await logEvent(client, {
        ...base,
        type: 'TERRITORY_PARTIALLY_CAPTURED',
        data: { resonator_id: resonator.id, team_id: player.team_id },
      });
    }
    if (state.total === gameConfig.MAX_RESONATORS_PER_TERRITORY) {
      // Captured for the first time, or taken back after having been lost.
      const lost = await client.query(
        `SELECT 1 FROM game_events WHERE territory_id = $1 AND event_type = 'TERRITORY_LOST' LIMIT 1`,
        [territory.id]
      );
      await logEvent(client, {
        ...base,
        type: lost.rowCount > 0 ? 'TERRITORY_RECLAIMED' : 'TERRITORY_CAPTURED',
        data: { resonator_id: resonator.id, team_id: player.team_id },
      });
    }

    return {
      resonator,
      territory: stateView(territory.id, state),
      available_resonators: inventory.available - 1,
    };
  });
}
