import { ownerColor } from "../../theme.js";

/** Used until the server sends `rules` (older backends) so the how-to-play screen never renders empty. */
export const DEFAULT_RULES = {
  resonators_to_capture: 3,
  riddles_per_day: 2,
  day_start: "09:00",
  day_end: "17:00",
  play_days: [1, 2, 3, 4, 5],
  portal_windows: ["09:00-12:30", "14:00-17:00"],
  attack_cooldown_seconds: 60,
  verification_ttl_seconds: 300,
  xp: { RIDDLE_SOLVED: 0, RESONATOR_DEPLOYED: 50, RESONATOR_DESTROYED: 30, PORTAL_CAPTURED: 100, WEEKLY_WIN: 500 },
};

export function getRules(data) {
  const r = data?.rules ?? {};
  return { ...DEFAULT_RULES, ...r, xp: { ...DEFAULT_RULES.xp, ...(r.xp ?? {}) } };
}

export const fmt = (n) => Number(n || 0).toLocaleString();
export const cap = (s) => (s ? `${s[0].toUpperCase()}${s.slice(1)}` : "");
export const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** "09:00" -> "9:00 AM" */
export function time12(hhmm) {
  const [h, m] = String(hhmm).split(":").map(Number);
  if (Number.isNaN(h)) return hhmm;
  return `${((h + 11) % 12) + 1}:${String(m || 0).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

/** "09:00-12:30" -> "9:00 AM – 12:30 PM" */
export const windowLabel = (w) => String(w).split("-").map(time12).join(" – ");

const DAYS = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
/** [1,2,3,4,5] -> "Mon – Fri"; otherwise a comma list. */
export function daysLabel(days) {
  const d = [...days].sort((a, b) => a - b);
  if (d.length > 2 && d.every((n, i) => i === 0 || n === d[i - 1] + 1)) return `${DAYS[d[0]]} – ${DAYS[d[d.length - 1]]}`;
  return d.map((n) => DAYS[n]).join(", ");
}

/** Local clock time of an ISO timestamp, e.g. "5:00 PM". */
export const clockTime = (iso) => (iso ? new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "");

export function relTime(iso, now) {
  const s = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
}

export const VERB_PAST = {
  RESONATOR_DEPLOYED: "deployed a resonator",
  RESONATOR_DESTROYED: "destroyed a resonator",
  PORTAL_CAPTURED: "captured the portal",
  PORTAL_LOST: "lost the portal",
};

/** Per-team numbers shown on the leaderboard banner, derived from the public snapshot. */
export function buildTeamStats(team, { portals = [], leaderboard = {}, players = {}, scores = {} }) {
  const rows = leaderboard[team] ?? [];
  const mine = portals.filter((p) => p.owner === team);
  const points = scores[team] ?? 0;
  const count = players[team] ?? rows.length;
  return {
    team,
    points,
    players: count,
    avg: count ? Math.round(points / count) : 0,
    leader: rows[0] ?? null,
    controlled: mine.filter((p) => p.status === "controlled").length,
    locked: mine.filter((p) => p.status === "controlled" && p.locked).length,
    building: mine.filter((p) => p.status === "partial").length,
    resonators: portals.reduce((n, p) => n + (p.resonators?.[team] ?? 0), 0),
  };
}

/** Both teams merged into one overall ranking (points desc, then name for stable ties). */
export function mergeRankings(leaderboard = {}) {
  const all = [
    ...(leaderboard.red ?? []).map((r) => ({ ...r, team: "red" })),
    ...(leaderboard.blue ?? []).map((r) => ({ ...r, team: "blue" })),
  ];
  all.sort((a, b) => b.points - a.points || a.username.localeCompare(b.username));
  return all.map((r, i) => ({ ...r, overall: i + 1 }));
}

/** What each team should do at a portal right now, plus a display label. */
export function missionFor(p, rules) {
  const need = rules.resonators_to_capture;
  const r = p.resonators ?? { red: 0, blue: 0, total: 0 };
  const owner = p.owner;
  const other = owner === "red" ? "blue" : "red";
  const lines = {};

  if (p.status === "controlled" && p.locked) {
    const until = clockTime(p.locked_until);
    const label = until ? `until ${until}` : "for now";
    lines[owner] = `Locked ${label}. Your territory is safe.`;
    lines[other] = `Locked ${label}. It can't be attacked yet.`;
    return { kind: "locked", label: "LOCKED", priority: 3, lines };
  }
  if (p.status === "controlled") {
    lines[owner] = "Defend it. Enemy players can attack its resonators.";
    lines[other] = `Attack: destroy ${plural(r[owner] ?? 0, "resonator")} to break control.`;
    return { kind: "contested", label: "ATTACKABLE", priority: 0, lines };
  }
  if (p.status === "partial") {
    const n = r[owner] ?? r.total;
    lines[owner] = `Deploy ${plural(Math.max(need - n, 0), "more resonator")} to capture it.`;
    lines[other] = `Destroy ${plural(n, "resonator")}, then claim it.`;
    return { kind: "building", label: "BUILDING", priority: 1, lines };
  }
  const claim = `Solve a riddle and deploy ${need} resonators to claim it.`;
  return { kind: "neutral", label: "UNCLAIMED", priority: 2, lines: { red: claim, blue: claim } };
}

export const statusColor = (p) => ownerColor(p.owner);
