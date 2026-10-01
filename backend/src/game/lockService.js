// Three-player lock: each of the three owners confirms, and the third confirmation
// (within the window) creates the lock in PostgreSQL.
import { withTransaction } from '../db/db.js';
import { gameConfig } from '../config/game.js';
import { httpError } from './errors.js';
import {
  getPlayer, requireTeam, requireActiveGame, lockTerritory, requireNearby, logEvent,
} from './gameService.js';
import { getActiveResonators } from './territoryService.js';
import * as handshake from './lockHandshake.js';

const NEEDED = gameConfig.MAX_RESONATORS_PER_TERRITORY;

/** POST /territories/:id/lock */
export async function confirmLock(uid, territoryId, { latitude, longitude }) {
  const result = await withTransaction(async (client) => {
    // Lock order: the player's row, then the territory row.
    const player = await getPlayer(uid, { client, lock: true });
    requireTeam(player);
    const territory = await lockTerritory(client, territoryId, player);
    await requireActiveGame(client, territory.game_id);
    requireNearby(territory, latitude, longitude);

    const active = await getActiveResonators(client, territory.id);
    if (active.length === 0) throw httpError(409, 'This territory has no resonators to lock');
    if (active.some((r) => r.team_id !== player.team_id)) {
      throw httpError(403, 'This territory is not held by your team');
    }
    if (active.length !== NEEDED) {
      throw httpError(409, `A territory needs ${NEEDED}/${NEEDED} resonators before it can be locked`);
    }
    if (!active.some((r) => r.user_id === player.id)) {
      throw httpError(403, 'Only players with a resonator on this territory can lock it');
    }
    const { rowCount: alreadyLocked } = await client.query(
      'SELECT 1 FROM territory_locks WHERE territory_id = $1 AND unlocked_at IS NULL',
      [territory.id]
    );
    if (alreadyLocked > 0) throw httpError(409, 'This territory is already locked');

    // Only the three current resonator owners count toward the lock.
    const ownerIds = active.map((r) => r.user_id);
    const confirmed = handshake.confirm(territory.id, player.id).filter((id) => ownerIds.includes(id));

    if (confirmed.length < NEEDED) {
      return {
        locked: false,
        confirmed: confirmed.length,
        needed: NEEDED,
        expires_in_seconds: gameConfig.LOCK_CONFIRM_WINDOW_SECONDS,
      };
    }

    // Third distinct confirmation: create the lock.
    const [one, two, three] = ownerIds;
    let lock;
    try {
      const { rows } = await client.query(
        `INSERT INTO territory_locks
           (territory_id, team_id, locked_by_user_id, player_one_id, player_two_id, player_three_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, territory_id, team_id, locked_by_user_id, player_one_id, player_two_id, player_three_id, locked_at`,
        [territory.id, player.team_id, player.id, one, two, three]
      );
      lock = rows[0];
    } catch (err) {
      // Backstop: partial unique index "one active lock per territory".
      if (err.code === '23505') throw httpError(409, 'This territory is already locked');
      throw err;
    }

    await client.query('UPDATE territories SET locked = TRUE WHERE id = $1', [territory.id]);
    await logEvent(client, {
      gameId: territory.game_id, userId: player.id, teamId: player.team_id, territoryId: territory.id,
      type: 'TERRITORY_LOCKED',
      data: { lock_id: lock.id, players: [one, two, three], locked_by: player.id },
    });

    return {
      locked: true,
      lock: {
        id: lock.id,
        territory_id: lock.territory_id,
        team_id: lock.team_id,
        locked_by_user_id: lock.locked_by_user_id,
        players: [lock.player_one_id, lock.player_two_id, lock.player_three_id],
        locked_at: lock.locked_at,
      },
    };
  });

  // Clear the pending confirmations only after the transaction committed.
  if (result.locked) handshake.clear(territoryId);
  return result;
}
