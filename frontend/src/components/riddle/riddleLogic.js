import { LOCATIONS } from "../../data/locations.js";

export const RIDDLE_XP = 100;

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/**
 * Picks one of the location's riddles and builds 4 answer options:
 * the real location name plus 3 other campus locations as distractors.
 */
export function buildQuestion(location) {
  const riddle = location.riddles[Math.floor(Math.random() * location.riddles.length)];
  const others = [...new Set(LOCATIONS.filter((l) => l.name !== location.name).map((l) => l.name))];
  const labels = shuffle([location.name, ...shuffle(others).slice(0, 3)]);

  return {
    riddle,
    options: labels.map((label, i) => ({ id: "ABCD"[i], label, correct: label === location.name })),
  };
}