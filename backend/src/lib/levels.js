// Level curve: level n starts at 100*(n-1)^2 XP  (L1 0, L2 100, L3 400, L4 900 ...).
export function levelInfo(xp) {
  const level = Math.floor(Math.sqrt(xp / 100)) + 1;
  const floor = 100 * (level - 1) ** 2;
  const next = 100 * level ** 2;
  return { level, xp_into_level: xp - floor, xp_for_next_level: next - floor };
}
