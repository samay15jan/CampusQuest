// Read-only snapshot for the public big-screen dashboard (GET /public/dashboard).
// Exposes only what players already see on each other's screens: team scores, portal state,
// usernames/avatars/levels, and the recent activity feed. No emails, uids or per-player data.
import { getEventStatus } from './eventService.js';
import { listPortalsPublic } from './portalService.js';
import { getPublicLeaderboard, getActivity } from './socialService.js';
import { queryMany } from '../db/db.js';
import { gameConfig } from '../config/game.js';

const LEADERBOARD_LIMIT = 100;
const ACTIVITY_LIMIT = 30;

/** Registered players per faction (the leaderboard itself is capped, this is the true headcount). */
async function playerCounts() {
  const rows = await queryMany(
    `SELECT faction, COUNT(*)::int AS n FROM users WHERE username IS NOT NULL AND faction IN ('red', 'blue') GROUP BY faction`
  );
  const out = { red: 0, blue: 0 };
  for (const r of rows) out[r.faction] = r.n;
  return out;
}

/** The rules the big screen explains, straight from the game config so it never drifts from the server. */
const publicRules = () => ({
  resonators_to_capture: gameConfig.RESONATORS_TO_CAPTURE,
  riddles_per_day: gameConfig.RIDDLES_PER_DAY,
  day_start: gameConfig.DAY_START,
  day_end: gameConfig.DAY_END,
  play_days: gameConfig.PLAY_DAYS,
  verification_ttl_seconds: gameConfig.VERIFICATION_TTL_SECONDS,
  portal_windows: gameConfig.PORTAL_WINDOWS,
  attack_cooldown_seconds: gameConfig.ATTACK_COOLDOWN_SECONDS,
  xp: gameConfig.XP,
});

const TTL_MS = 4000;
let cached = null;
let inflight = null;

async function build() {
  const [status, portals, red, blue, activity, players] = await Promise.all([
    getEventStatus(),
    listPortalsPublic(),
    getPublicLeaderboard('red', { limit: LEADERBOARD_LIMIT }),
    getPublicLeaderboard('blue', { limit: LEADERBOARD_LIMIT }),
    getActivity({ limit: ACTIVITY_LIMIT }),
    playerCounts(),
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
    players,
    rules: publicRules(),
    activity,
  };
}

/** Cached for a few seconds so many screens polling at once cost one set of queries. */
export async function getDashboardSnapshot() {
  if (cached && Date.now() - cached.at < TTL_MS) return cached.data;
  inflight ??= build().then((data) => { cached = { at: Date.now(), data }; return data; }).finally(() => { inflight = null; });
  return inflight;
}
