// Tunable game rules. Change a value here and every endpoint follows.
export const gameConfig = {
  // A territory is "controlled" at this many active resonators (3/3).
  MAX_RESONATORS_PER_TERRITORY: 3,

  // A player may attack at most once per this many seconds (across all territories).
  ATTACK_COOLDOWN_SECONDS: 60,

  // The three owners must all confirm a lock within this window.
  LOCK_CONFIRM_WINDOW_SECONDS: 60,

  // More than this many wrong answers per riddle per player per minute -> 429.
  MAX_WRONG_ANSWERS_PER_MINUTE: 5,
};
