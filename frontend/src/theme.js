export const RED = "#ff3b3b";
export const BLUE = "#2f7bff";
export const PURPLE = "#a45bff";
export const NEUTRAL = "#8a8fa0";

export const OWNERS = {
  red: { label: "Red Control", status: "Red Controlled", team: "Red Team", color: RED },
  blue: { label: "Blue Control", status: "Blue Controlled", team: "Blue Team", color: BLUE },
  neutral: { label: "Neutral", status: "Unclaimed", team: "No Faction", color: NEUTRAL },
};

export const teamAccent = (team) => (team === "blue" ? BLUE : RED);
export const GREEN = "#22c55e";