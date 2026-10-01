// In-memory "three players must confirm" state for the lock action.
//   territory_id -> Map(user_id -> confirmation timestamp in ms)
// LIMITS: it is lost when the server restarts and only works with a single API
// instance. The resulting lock itself is stored in PostgreSQL (territory_locks).
import { gameConfig } from '../config/game.js';

// Replaceable clock so tests can fast-forward time.
export const clock = { now: () => Date.now() };

const pending = new Map();

function prune(territoryId) {
  const confirmations = pending.get(territoryId);
  if (!confirmations) return new Map();
  const cutoff = clock.now() - gameConfig.LOCK_CONFIRM_WINDOW_SECONDS * 1000;
  for (const [userId, at] of confirmations) {
    if (at < cutoff) confirmations.delete(userId);
  }
  if (confirmations.size === 0) pending.delete(territoryId);
  return confirmations;
}

/** Records a confirmation and returns the user ids with a non-expired confirmation. */
export function confirm(territoryId, userId) {
  prune(territoryId);
  if (!pending.has(territoryId)) pending.set(territoryId, new Map());
  pending.get(territoryId).set(userId, clock.now());
  return [...prune(territoryId).keys()];
}

export function clear(territoryId) {
  pending.delete(territoryId);
}

/** Test helper. */
export function reset() {
  pending.clear();
  clock.now = () => Date.now();
}
