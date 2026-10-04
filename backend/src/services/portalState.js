// The ONE place where a portal's stored status / owner / lock is recomputed from its active resonators.
import { gameConfig } from '../config/game.js';
import { lockExpiry } from '../lib/clock.js';

export async function getActiveResonators(client, eventId, portalId) {
  const { rows } = await client.query(
    `SELECT id, user_id, faction, deployed_at FROM resonators
     WHERE event_id = $1 AND portal_id = $2 AND status = 'active' ORDER BY deployed_at, id`,
    [eventId, portalId]
  );
  return rows;
}

/**
 * 0 active -> neutral | 1-2 -> partial | 3 -> controlled (locked until 17:00 campus time).
 * Call inside the same transaction as the resonator change, with the event_portals row locked.
 */
export async function recalculatePortal(client, eventId, portalId, prevStatus) {
  const active = await getActiveResonators(client, eventId, portalId);
  const total = active.length;
  const owner = total ? active[0].faction : null;
  const status = total === 0 ? 'neutral' : total >= gameConfig.RESONATORS_TO_CAPTURE ? 'controlled' : 'partial';
  const lockedUntil = status === 'controlled' ? lockExpiry() : null;
  await client.query(
    `UPDATE event_portals SET status = $3, owner_faction = $4, locked_until = $5, updated_at = NOW()
     WHERE event_id = $1 AND portal_id = $2`,
    [eventId, portalId, status, owner, lockedUntil]
  );
  return {
    total, status, owner_faction: owner, locked_until: lockedUntil,
    locked: status === 'controlled',
    captured: status === 'controlled' && prevStatus !== 'controlled',
    lost: prevStatus === 'controlled' && status !== 'controlled',
  };
}

export const stateView = (portalId, s) => ({
  id: portalId, status: s.status, owner_faction: s.owner_faction, locked: s.locked,
  locked_until: s.locked_until, active_resonators: s.total,
});
