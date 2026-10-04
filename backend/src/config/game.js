// Tunable game rules. Change a value here (or via env) and every endpoint follows.
import { env } from './env.js';

export const gameConfig = {
  TIMEZONE: env.CAMPUS_TZ,
  DAY_START: '09:00',           // campus working hours
  DAY_END: '17:00',
  PLAY_DAYS: [1, 2, 3, 4, 5],   // Mon-Fri (ISO: Mon=1 ... Sun=7); Sat/Sun off
  PORTAL_WINDOWS: env.PORTAL_WINDOWS.split(',').map((w) => w.trim()).filter(Boolean), // "HH:MM-HH:MM"
  IGNORE_HOURS: env.DEV_IGNORE_HOURS,

  EVENT_PORTAL_COUNT: 10,       // portals picked at random from the master list each week
  RESONATORS_TO_CAPTURE: 3,     // 3 active resonators from one faction = controlled
  RIDDLES_PER_DAY: 2,           // each correct riddle = 1 resonator
  MAX_WRONG_ANSWERS_PER_MINUTE: 5,

  IMAGE_MATCH_THRESHOLD: env.IMAGE_MATCH_THRESHOLD, // 0..1
  VERIFICATION_TTL_SECONDS: 300,   // a passed verification can be used to deploy for 5 minutes
  MAX_VERIFICATIONS_PER_MINUTE: 10,
  ATTACK_COOLDOWN_SECONDS: 60,

  XP: {
    RIDDLE_SOLVED: 100,
    RESONATOR_DEPLOYED: 50,
    RESONATOR_DESTROYED: 30,
    PORTAL_CAPTURED: 100,        // bonus to the player who places the 3rd resonator
    WEEKLY_WIN: 500,             // each participant of the winning faction
  },
};
