// Daily riddles: 2 per player per game day, independent of portal location. Each correct answer = 1 resonator.
import { createHash } from 'node:crypto';
import { queryMany, withTransaction } from '../db/db.js';
import { gameConfig } from '../config/game.js';
import { httpError } from '../lib/errors.js';
import { getPlayer, requireOnboarded, getCurrentEvent, requireLiveEvent, today, awardXp, logEvent } from '../lib/context.js';
import { getInventory } from './resonatorService.js';
import { isPlayTime } from '../lib/clock.js';

export const normalizeAnswer = (a) => a.trim().toLowerCase().replace(/[\u2018\u2019]/g, "'").replace(/\s+/g, ' ');
export const hashAnswer = (a) => createHash('sha256').update(normalizeAnswer(a), 'utf8').digest('hex');
const h = (s) => createHash('sha256').update(s).digest('hex');

/** 4 multiple-choice options (correct portal name + 3 other event portals), stable per player+riddle. */
function buildOptions(userId, riddleId, correct, names) {
  const others = names.filter((n) => n !== correct).sort((a, b) => h(`${userId}:${riddleId}:${a}`).localeCompare(h(`${userId}:${riddleId}:${b}`))).slice(0, 3);
  return [correct, ...others].sort((a, b) => h(`o:${userId}:${riddleId}:${a}`).localeCompare(h(`o:${userId}:${riddleId}:${b}`)));
}

/** GET /riddles/today: assigns today's riddles on first call, then returns them with solved state. */
export async function getTodaysRiddles(uid) {
  const ev = await getCurrentEvent();
  if (!ev || ev.status !== 'active') throw httpError(409, ev ? 'The event has not started yet' : 'No event scheduled');
  const day = today();

  return withTransaction(async (client) => {
    const player = await getPlayer(uid, { client, lock: true });
    requireOnboarded(player);

    const { rows: have } = await client.query('SELECT slot FROM daily_riddles WHERE user_id = $1 AND day = $2', [player.id, day]);
    const missing = gameConfig.RIDDLES_PER_DAY - have.length;
    if (missing > 0) {
      const { rows: pick } = await client.query(
        `SELECT r.id FROM riddles r JOIN event_portals ep ON ep.portal_id = r.portal_id AND ep.event_id = $1
         WHERE r.active
           AND r.id NOT IN (SELECT riddle_id FROM daily_riddles WHERE user_id = $2 AND event_id = $1)
           AND r.id NOT IN (SELECT riddle_id FROM riddle_attempts WHERE user_id = $2 AND correct)
         ORDER BY random() LIMIT $3`,
        [ev.id, player.id, missing]
      );
      const used = new Set(have.map((r) => r.slot));
      let slot = 1;
      for (const r of pick) {
        while (used.has(slot)) slot++;
        used.add(slot);
        await client.query('INSERT INTO daily_riddles (user_id, event_id, day, slot, riddle_id) VALUES ($1, $2, $3, $4, $5)', [player.id, ev.id, day, slot, r.id]);
      }
    }

    const { rows } = await client.query(
      `SELECT d.slot, r.id AS riddle_id, r.question, r.difficulty, p.name AS answer_name,
              EXISTS (SELECT 1 FROM riddle_attempts a WHERE a.riddle_id = r.id AND a.user_id = $1 AND a.correct) AS solved
       FROM daily_riddles d JOIN riddles r ON r.id = d.riddle_id JOIN portals p ON p.id = r.portal_id
       WHERE d.user_id = $1 AND d.day = $2 ORDER BY d.slot`,
      [player.id, day]
    );
    const { rows: names } = await client.query(
      'SELECT p.name FROM event_portals ep JOIN portals p ON p.id = ep.portal_id WHERE ep.event_id = $1', [ev.id]);
    const portalNames = names.map((n) => n.name);
    const inventory = await getInventory((t, p) => client.query(t, p), player.id, ev.id);

    return {
      day,
      game_open: isPlayTime(),
      available_resonators: inventory.available,
      riddles: rows.map((r) => ({
        slot: r.slot, id: r.riddle_id, question: r.question, difficulty: r.difficulty, solved: r.solved,
        options: r.solved ? null : buildOptions(player.id, r.riddle_id, r.answer_name, portalNames),
      })),
      all_solved: rows.length > 0 && rows.every((r) => r.solved),
    };
  });
}

/** POST /riddles/:id/answer */
export async function submitAnswer(uid, riddleId, answer) {
  return withTransaction(async (client) => {
    const player = await getPlayer(uid, { client, lock: true });
    requireOnboarded(player);
    const ev = await requireLiveEvent(client.query.bind(client));
    const day = today();

    const { rows } = await client.query(
      `SELECT r.id, r.portal_id, r.answer_hash FROM riddles r
       JOIN daily_riddles d ON d.riddle_id = r.id AND d.user_id = $2 AND d.day = $3 AND d.event_id = $4
       WHERE r.id = $1 AND r.active`,
      [riddleId, player.id, day, ev.id]
    );
    const riddle = rows[0];
    if (!riddle) throw httpError(404, 'This riddle is not one of your riddles for today');

    const solved = await client.query('SELECT 1 FROM riddle_attempts WHERE riddle_id = $1 AND user_id = $2 AND correct', [riddle.id, player.id]);
    if (solved.rowCount) throw httpError(409, 'You already solved this riddle');

    const { rows: recent } = await client.query(
      `SELECT COUNT(*)::int AS wrong, CEIL(60 - EXTRACT(EPOCH FROM (NOW() - MIN(attempted_at))))::int AS retry_after
       FROM riddle_attempts WHERE riddle_id = $1 AND user_id = $2 AND NOT correct AND attempted_at > NOW() - INTERVAL '60 seconds'`,
      [riddle.id, player.id]
    );
    if (recent[0].wrong >= gameConfig.MAX_WRONG_ANSWERS_PER_MINUTE) {
      const retryAfter = Math.max(1, recent[0].retry_after ?? 60);
      throw httpError(429, `Too many wrong answers. Try again in ${retryAfter}s`, { retryAfter });
    }

    const correct = hashAnswer(answer) === riddle.answer_hash;
    await client.query('INSERT INTO riddle_attempts (user_id, riddle_id, event_id, answer, correct) VALUES ($1, $2, $3, $4, $5)',
      [player.id, riddle.id, ev.id, answer.slice(0, 200), correct]);

    if (!correct) {
      return { correct: false, resonator_granted: false, wrong_attempts_left_this_minute: gameConfig.MAX_WRONG_ANSWERS_PER_MINUTE - (recent[0].wrong + 1) };
    }

    const xp = await awardXp(client, { userId: player.id, eventId: ev.id, faction: player.faction, amount: gameConfig.XP.RIDDLE_SOLVED, reason: 'RIDDLE_SOLVED', refId: riddle.id });
    await logEvent(client, { eventId: ev.id, userId: player.id, faction: player.faction, type: 'RIDDLE_SOLVED', data: { riddle_id: riddle.id } });
    const inventory = await getInventory((t, p) => client.query(t, p), player.id, ev.id);
    return { correct: true, resonator_granted: true, available_resonators: inventory.available, xp };
  });
}

export { queryMany };
