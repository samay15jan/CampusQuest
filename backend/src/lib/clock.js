// Campus time helpers: working hours (Mon-Fri 9-5), portal windows, game days, weekly ranges.
import { gameConfig } from '../config/game.js';

export const clock = { now: () => new Date() };   // replaceable in tests
const tz = gameConfig.TIMEZONE;
const hm = (s) => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
const WD = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };

const fmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23', weekday: 'short',
});

/** { date: 'YYYY-MM-DD', minutes: minutes since midnight, weekday: 1..7 } in campus time. */
export function campusParts(d = clock.now()) {
  const p = Object.fromEntries(fmt.formatToParts(d).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, minutes: Number(p.hour) * 60 + Number(p.minute), weekday: WD[p.weekday], ts: Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) };
}

/** Converts a campus-local date + "HH:MM" into a UTC Date. */
export function zonedToUtc(dateStr, time) {
  const [y, mo, d] = dateStr.split('-').map(Number);
  const [h, mi] = time.split(':').map(Number);
  const wall = Date.UTC(y, mo - 1, d, h, mi);
  let guess = wall;
  for (let i = 0; i < 2; i++) guess = wall - (campusParts(new Date(guess)).ts - guess);
  return new Date(guess);
}

export const addDays = (dateStr, n) => {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/** Mon 09:00 -> Fri 17:00 of the week containing `dateStr` (campus time). */
export function weekRange(dateStr) {
  const wd = new Date(`${dateStr}T00:00:00Z`).getUTCDay() || 7; // Mon=1..Sun=7
  const monday = addDays(dateStr, 1 - wd);
  return {
    monday,
    starts_at: zonedToUtc(monday, gameConfig.DAY_START),
    ends_at: zonedToUtc(addDays(monday, 4), gameConfig.DAY_END),
  };
}

export function isPlayTime(d = clock.now()) {
  if (gameConfig.IGNORE_HOURS) return true;
  const p = campusParts(d);
  return gameConfig.PLAY_DAYS.includes(p.weekday) && p.minutes >= hm(gameConfig.DAY_START) && p.minutes < hm(gameConfig.DAY_END);
}

/** Index (1-based) of the portal window we are in, or null. */
export function currentPortalWindow(d = clock.now()) {
  if (gameConfig.IGNORE_HOURS) return 1;
  const { minutes } = campusParts(d);
  const i = gameConfig.PORTAL_WINDOWS.findIndex((w) => {
    const [a, b] = w.split('-');
    return minutes >= hm(a) && minutes < hm(b);
  });
  return i === -1 ? null : i + 1;
}

/** Next time a portal window opens (UTC Date) or null. Used for UI hints. */
export function nextPortalOpening(d = clock.now()) {
  const p = campusParts(d);
  for (let add = 0; add < 8; add++) {
    const date = addDays(p.date, add);
    const wd = ((p.weekday - 1 + add) % 7) + 1;
    if (!gameConfig.PLAY_DAYS.includes(wd)) continue;
    for (const w of gameConfig.PORTAL_WINDOWS) {
      const at = zonedToUtc(date, w.split('-')[0]);
      if (at > d) return at;
    }
  }
  return null;
}

/** When a freshly-captured portal's lock ends: today's 17:00 campus time (tomorrow's if already past). */
export function lockExpiry(d = clock.now()) {
  const { date } = campusParts(d);
  let at = zonedToUtc(date, gameConfig.DAY_END);
  if (at <= d) at = zonedToUtc(addDays(date, 1), gameConfig.DAY_END);
  return at;
}
