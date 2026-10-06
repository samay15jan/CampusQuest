import { apiFetch } from "./client.js";

export async function getLeaderboard({ scope = "global", period = "event", limit = 20 } = {}) {
  const params = new URLSearchParams({ scope, period, limit: String(limit) });
  return apiFetch(`/leaderboard?${params.toString()}`);
}
