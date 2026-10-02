import { RED, BLUE, PURPLE } from "../theme.js";
// Mock data. Replace with Firestore / API data.
const IMG = "https://mockups-design.com/wp-content/uploads/2023/04/Free_Exhibition_Mockup_1.jpg";
const DESC = "A landmark at the heart of the campus. A key strategic location with high visibility and value.";

export const EVENT_END = Date.now() + (6 * 3600 + 24 * 60 + 17) * 1000;
export const SCORE = { red: 2340, blue: 1870 };

const defaults = {
  img: IMG,
  description: DESC,
  capture: { done: 2, total: 3 },
  xp: 300,
  resonators: [{ player: "R1v3n", team: "red" }, { player: "kael", team: "red" }, null],
  activity: [
    { id: 1, kind: "deploy", team: "red", who: "R1v3n", text: "deployed a resonator", ago: "10 min ago" },
    { id: 2, kind: "capture", team: "blue", who: "snowlite", text: "captured this portal", ago: "2 hours ago" },
    { id: 3, kind: "link", team: "red", who: "kael", text: "linked this portal", ago: "5 hours ago" },
    { id: 4, kind: "status", team: "red", who: "", text: "Portal status changed to Red Control", ago: "1 day ago" },
  ],
};

export const PORTALS = [
  { id: "central-sculpture", name: "Central Sculpture", lvl: 3, owner: "red", dist: "120 m",
    description: "A landmark sculpture at the heart of the campus, installed in 2015. A key strategic location with high visibility and value." },
  { id: "library-entrance", name: "Library Entrance", lvl: 4, owner: "blue", dist: "250 m", resonators: [{ player: "snowlite", team: "blue" }, null, null] },
  { id: "cafeteria", name: "Cafeteria", lvl: 2, owner: "neutral", dist: "320 m", capture: { done: 0, total: 3 }, resonators: [null, null, null] },
  { id: "science-block", name: "Science Block", lvl: 3, owner: "red", dist: "410 m" },
  { id: "sports-ground", name: "Sports Ground", lvl: 1, owner: "red", dist: "620 m", xp: 150 },
].map((p) => ({ ...defaults, ...p }));

// Add real coordinates per portal to enable the GPS check: coords: { lat: 28.6, lng: 77.3 }
export const RESONATOR_TYPES = [
  { id: "standard", name: "Standard", owned: 4, color: RED },
  { id: "enhanced", name: "Enhanced", owned: 2, color: BLUE },
  { id: "advanced", name: "Advanced", owned: 1, color: PURPLE },
];

/* ---------- player profile + leaderboard ---------- */
export const ME = "nova_482";
export const TAGLINES = { red: "Passion. Control. Unity.", blue: "Strategy. Progress. Change." };

export const PLAYER = {
  username: ME,
  level: 12,
  xp: 2840,
  nextXp: 3000,
  stats: { portals: 32, links: 14, missions: 8 },
};

export const PROFILE_ACTIVITY = [
  { id: 1, icon: "tower", color: RED, text: "Captured Central Sculpture", ago: "10 min ago", xp: 100 },
  { id: 2, icon: "crystal", color: BLUE, text: "Deployed a Resonator", ago: "2 hours ago", xp: 150 },
  { id: 3, icon: "link", color: "#9aa0b4", text: "Created a Link (Library → Cafeteria)", ago: "5 hours ago", xp: 200 },
  { id: 4, icon: "clip", color: "#9aa0b4", text: "Completed Campus Sweep", ago: "1 day ago", xp: 300 },
];

export const ACHIEVEMENTS = [
  { id: "first", name: "First Capture", icon: "shield", color: RED },
  { id: "links", name: "Link Builder", icon: "link", color: BLUE },
  { id: "explorer", name: "Explorer", icon: "bolt", color: "#ffb020" },
  { id: "secret", name: "???", icon: "lock", locked: true },
];

// One source of truth: Red / Blue tabs are filtered + re-ranked from this list.
export const LEADERBOARD = [
  { name: "R1v3n", team: "red", lvl: 24, pts: 4320 },
  { name: "arkn0va", team: "red", lvl: 21, pts: 3980 },
  { name: "z3phir", team: "blue", lvl: 20, pts: 3760 },
  { name: "snowlite", team: "blue", lvl: 20, pts: 3620 },
  { name: "cyanide", team: "blue", lvl: 18, pts: 3410 },
  { name: "kaze", team: "blue", lvl: 17, pts: 3200 },
  { name: "voidd", team: "red", lvl: 16, pts: 2980 },
  { name: "itsmefrost", team: "blue", lvl: 16, pts: 2760 },
  { name: "aeris", team: "blue", lvl: 15, pts: 2540 },
  { name: "lynx", team: "blue", lvl: 14, pts: 2430 },
  { name: "telo", team: "blue", lvl: 13, pts: 2310 },
  { name: ME, team: "red", lvl: 12, pts: 2240 },
  { name: "maverick", team: "red", lvl: 12, pts: 2120 },
  { name: "eclipse", team: "blue", lvl: 11, pts: 2000 },
  { name: "rinshi", team: "blue", lvl: 11, pts: 1940 },
  { name: "kuro", team: "red", lvl: 11, pts: 1860 },
  { name: "shirox", team: "red", lvl: 10, pts: 1740 },
  { name: "azazel", team: "red", lvl: 10, pts: 1620 },
  { name: "crimson", team: "red", lvl: 9, pts: 1500 },
  { name: "natsuu", team: "red", lvl: 9, pts: 1440 },
];

/** Players sorted by points, optionally filtered to a team, with a 1-based rank. */
export function rankPlayers(scope = "global") {
  return [...LEADERBOARD]
    .sort((a, b) => b.pts - a.pts)
    .filter((p) => scope === "global" || p.team === scope)
    .map((p, i) => ({ ...p, rank: i + 1 }));
}