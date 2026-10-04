// Attack: destroys one enemy resonator (partial or unlocked portals only). XMP happens at the location.
import { withTransaction } from '../db/db.js';
import { gameConfig } from '../config/game.js';
import { httpError } from '../lib/errors.js';
import {
  getPlayer, requireOnboarded, requireLiveEvent, requirePortalOpen, getEventPortal,
  requireNearby, isLocked, awardXp, logEvent,
} from '../lib/context.js';
import { getActiveResonators, recalculatePortal, stateView } from './portalState.js';

/** POST /portals/:id/attack  { latitude, longitude, target_resonator_id? } */
export async function attackPortal(uid, portalId, { latitude, longitude, target_resonator_id: targetId }) {
  return withTransaction(async (client) => {
    const player = await getPlayer(uid, { client, lock: true });
    requireOnboarded(player);
    const ev = await requireLiveEvent(client.query.bind(client));
    requirePortalOpen();
    const portal = await getEventPortal(client, ev.id, portalId, { lock: true });
    requireNearby(portal, latitude, longitude, 'attack');

    if (isLocked(portal)) throw httpError(409, 'This portal is locked and cannot be attacked until the lock expires', { locked_until: portal.locked_until });
    const active = await getActiveResonators(client, ev.id, portal.id);
    if (!active.length) throw httpError(409, 'This portal is neutral: nothing to attack');
    if (active.some((r) => r.faction === player.faction)) throw httpError(403, 'You cannot attack your own faction');

    const { rows: last } = await client.query(
      `SELECT CEIL($2 - EXTRACT(EPOCH FROM (NOW() - created_at)))::int AS wait FROM attacks
       WHERE attacker_user_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [player.id, gameConfig.ATTACK_COOLDOWN_SECONDS]
    );
    if (last[0] && last[0].wait > 0) throw httpError(429, `Attack cooldown: wait ${last[0].wait}s`, { retryAfter: last[0].wait });

    let target = active[0];
    if (targetId !== undefined) {
      target = active.find((r) => r.id === targetId);
      if (!target) throw httpError(404, 'Target resonator not found on this portal');
    }

    const { rows: atk } = await client.query(
      `INSERT INTO attacks (event_id, portal_id, attacker_user_id, attacker_faction, target_resonator_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, created_at`,
      [ev.id, portal.id, player.id, player.faction, target.id]
    );
    await client.query(`UPDATE resonators SET status = 'destroyed', destroyed_at = NOW(), destroyed_by_user_id = $2 WHERE id = $1`, [target.id, player.id]);

    const state = await recalculatePortal(client, ev.id, portal.id, portal.status);
    await logEvent(client, {
      eventId: ev.id, userId: player.id, faction: player.faction, portalId: portal.id, type: 'RESONATOR_DESTROYED',
      data: { attack_id: atk[0].id, resonator_id: target.id, victim_user_id: target.user_id, victim_faction: target.faction },
    });
    if (state.total === 0) {
      await logEvent(client, { eventId: ev.id, userId: player.id, faction: target.faction, portalId: portal.id, type: 'PORTAL_LOST', data: { attacker_faction: player.faction } });
    }
    const xp = await awardXp(client, { userId: player.id, eventId: ev.id, faction: player.faction, amount: gameConfig.XP.RESONATOR_DESTROYED, reason: 'RESONATOR_DESTROYED', refId: target.id });

    return {
      attack: atk[0],
      destroyed_resonator: { id: target.id, user_id: target.user_id, faction: target.faction },
      portal: stateView(portal.id, state),
      cooldown_seconds: gameConfig.ATTACK_COOLDOWN_SECONDS,
      xp,
    };
  });
}
