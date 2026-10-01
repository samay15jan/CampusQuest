// Attacks: resolve immediately, destroying one enemy resonator.
import { withTransaction } from '../db/db.js';
import { gameConfig } from '../config/game.js';
import { httpError } from './errors.js';
import {
  getPlayer, requireTeam, requireActiveGame, lockTerritory, requireNearby, logEvent,
} from './gameService.js';
import { getActiveResonators, recalculateTerritory, stateView } from './territoryService.js';

/** POST /territories/:id/attack */
export async function attackTerritory(uid, territoryId, { latitude, longitude, target_resonator_id: targetId }) {
  return withTransaction(async (client) => {
    // Lock order: the player's row, then the territory row.
    const player = await getPlayer(uid, { client, lock: true });
    requireTeam(player);
    const territory = await lockTerritory(client, territoryId, player);
    await requireActiveGame(client, territory.game_id);
    requireNearby(territory, latitude, longitude);

    const active = await getActiveResonators(client, territory.id);
    if (active.length === 0) throw httpError(409, 'This territory is neutral: there is nothing to attack');
    if (active.some((r) => r.team_id === player.team_id)) {
      throw httpError(403, 'You cannot attack your own team');
    }

    // Cooldown: one attack per player per ATTACK_COOLDOWN_SECONDS (across all territories).
    const { rows: last } = await client.query(
      `SELECT CEIL($2 - EXTRACT(EPOCH FROM (NOW() - created_at)))::int AS wait
       FROM attacks WHERE attacker_user_id = $1
       ORDER BY created_at DESC LIMIT 1`,
      [player.id, gameConfig.ATTACK_COOLDOWN_SECONDS]
    );
    if (last[0] && last[0].wait > 0) {
      throw httpError(429, `Attack cooldown: wait ${last[0].wait}s`, { retryAfter: last[0].wait });
    }

    // Target: the requested resonator, otherwise the oldest active one.
    let target = active[0];
    if (targetId !== undefined) {
      target = active.find((r) => r.id === targetId);
      if (!target) throw httpError(404, 'Target resonator not found on this territory');
    }

    const { rows: attackRows } = await client.query(
      `INSERT INTO attacks (territory_id, attacker_user_id, attacker_team_id, target_resonator_id, status, resolved_at)
       VALUES ($1, $2, $3, $4, 'successful', NOW())
       RETURNING id, status, created_at, resolved_at`,
      [territory.id, player.id, player.team_id, target.id]
    );
    const attack = attackRows[0];

    // The resonator is destroyed, never deleted: history stays in the table.
    await client.query(
      `UPDATE resonators SET status = 'destroyed', destroyed_at = NOW() WHERE id = $1`,
      [target.id]
    );

    const previousOwnerTeamId = target.team_id;
    const state = await recalculateTerritory(client, territory.id);

    const gameId = territory.game_id;
    await logEvent(client, {
      gameId, userId: player.id, teamId: player.team_id, territoryId: territory.id,
      type: 'TERRITORY_ATTACKED',
      data: {
        attack_id: attack.id, attacker_id: player.id, resonator_id: target.id,
        defender_team_id: previousOwnerTeamId, lock_released: state.lockReleased,
      },
    });
    await logEvent(client, {
      gameId, userId: target.user_id, teamId: previousOwnerTeamId, territoryId: territory.id,
      type: 'RESONATOR_DESTROYED',
      data: { resonator_id: target.id, attack_id: attack.id, attacker_id: player.id, attacker_team_id: player.team_id },
    });
    if (state.total === 0) {
      await logEvent(client, {
        gameId, userId: null, teamId: previousOwnerTeamId, territoryId: territory.id,
        type: 'TERRITORY_LOST',
        data: { attack_id: attack.id, attacker_id: player.id, attacker_team_id: player.team_id },
      });
    }

    return {
      attack,
      destroyed_resonator: { id: target.id, user_id: target.user_id, team_id: target.team_id },
      territory: stateView(territory.id, state),
      cooldown_seconds: gameConfig.ATTACK_COOLDOWN_SECONDS,
    };
  });
}
