// Read-only snapshot for the public big-screen dashboard (GET /public/dashboard).
// Exposes only what players already see on each other's screens: team scores, portal state,
// usernames/avatars/levels, and the recent activity feed. No emails, uids or per-player data.
import { getEventStatus } from './eventService.js';
import { listPortalsPublic } from './portalService.js';
import { getPublicLeaderboard, getActivity } from './socialService.js';

const TTL_MS = 4000;
let cached = null;
let inflight = null;

async function build() {
  const [status, portals, red, blue, activity] = await Promise.all([
    getEventStatus(),
    listPortalsPublic(),
    getPublicLeaderboard('red', { limit: 5 }),
    getPublicLeaderboard('blue', { limit: 5 }),
    getActivity({ limit: 8 }),
  ]);
  return {
    event: status.event,
    scores: status.scores,
    seconds_remaining: status.seconds_remaining,
    seconds_until_start: status.seconds_until_start,
    game_open: status.game_open,
    server_time: status.server_time,
    portals,
    leaderboard: { red, blue },
    activity,
  };
}

/** Cached for a few seconds so many screens polling at once cost one set of queries. */
export async function getDashboardSnapshot() {
  if (cached && Date.now() - cached.at < TTL_MS) return cached.data;
  inflight ??= build().then((data) => { cached = { at: Date.now(), data }; return data; }).finally(() => { inflight = null; });
  return inflight;
}
