// Riddles: fetch the next unsolved riddle, and check answers (granting resonators).
import { createHash } from 'node:crypto';
import { queryOne, withTransaction } from '../db/db.js';
import { gameConfig } from '../config/game.js';
import { httpError } from './errors.js';
import { getPlayer, resolveGameId, requireTeam, requireActiveGame, logEvent } from './gameService.js';
import { getInventory } from './resonatorService.js';

/** SHA-256 hex of the answer, trimmed and lower-cased (same as the seeded answer_hash). */
export function hashAnswer(answer) {
  return createHash('sha256').update(answer.trim().toLowerCase(), 'utf8').digest('hex');
}

/** GET /territories/:id/riddle: next active riddle the player has not solved (question only). */
export async function getNextRiddle(uid, territoryId) {
  const player = await getPlayer(uid);
  const gameId = await resolveGameId(player);

  const territory = await queryOne('SELECT id FROM territories WHERE id = $1 AND game_id = $2', [territoryId, gameId]);
  if (!territory) throw httpError(404, 'Territory not found');

  const riddle = await queryOne(
    `SELECT r.id, r.territory_id, r.question, r.difficulty
     FROM riddles r
     WHERE r.territory_id = $1 AND r.active
       AND NOT EXISTS (
         SELECT 1 FROM riddle_attempts a
         WHERE a.riddle_id = r.id AND a.user_id = $2 AND a.correct
       )
     ORDER BY CASE r.difficulty WHEN 'easy' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, r.id
     LIMIT 1`,
    [territoryId, player.id]
  );
  if (!riddle) throw httpError(404, 'No unsolved riddles at this territory');
  return riddle;
}

/** POST /riddles/:id/answer */
export async function submitAnswer(uid, riddleId, answer) {
  return withTransaction(async (client) => {
    // Locking the player's row serialises their concurrent answers (no double grant).
    const player = await getPlayer(uid, { client, lock: true });
    requireTeam(player);

    const { rows } = await client.query(
      `SELECT r.id, r.territory_id, r.answer_hash, t.game_id
       FROM riddles r JOIN territories t ON t.id = r.territory_id
       WHERE r.id = $1 AND r.active`,
      [riddleId]
    );
    const riddle = rows[0];
    if (!riddle || riddle.game_id !== player.game_id) throw httpError(404, 'Riddle not found');
    await requireActiveGame(client, riddle.game_id);

    const solved = await client.query(
      'SELECT 1 FROM riddle_attempts WHERE riddle_id = $1 AND user_id = $2 AND correct',
      [riddle.id, player.id]
    );
    if (solved.rowCount > 0) throw httpError(409, 'You already solved this riddle');

    // Throttle: too many wrong answers on this riddle within the last minute.
    const { rows: recent } = await client.query(
      `SELECT COUNT(*)::int AS wrong,
              CEIL(60 - EXTRACT(EPOCH FROM (NOW() - MIN(attempted_at))))::int AS retry_after
       FROM riddle_attempts
       WHERE riddle_id = $1 AND user_id = $2 AND NOT correct
         AND attempted_at > NOW() - INTERVAL '60 seconds'`,
      [riddle.id, player.id]
    );
    if (recent[0].wrong >= gameConfig.MAX_WRONG_ANSWERS_PER_MINUTE) {
      const retryAfter = Math.max(1, recent[0].retry_after ?? 60);
      throw httpError(429, `Too many wrong answers. Try again in ${retryAfter}s`, { retryAfter });
    }

    const correct = hashAnswer(answer) === riddle.answer_hash;
    try {
      await client.query(
        'INSERT INTO riddle_attempts (riddle_id, user_id, answer, correct) VALUES ($1, $2, $3, $4)',
        [riddle.id, player.id, answer, correct]
      );
    } catch (err) {
      // Backstop: partial unique index "one correct attempt per player per riddle".
      if (err.code === '23505') throw httpError(409, 'You already solved this riddle');
      throw err;
    }

    if (!correct) {
      return {
        correct: false,
        resonator_granted: false,
        wrong_attempts_left_this_minute: gameConfig.MAX_WRONG_ANSWERS_PER_MINUTE - (recent[0].wrong + 1),
      };
    }

    const base = { gameId: riddle.game_id, userId: player.id, teamId: player.team_id, territoryId: riddle.territory_id };
    await logEvent(client, { ...base, type: 'RIDDLE_SOLVED', data: { riddle_id: riddle.id } });
    await logEvent(client, { ...base, type: 'RESONATOR_GRANTED', data: { riddle_id: riddle.id } });

    const inventory = await getInventory((t, p) => client.query(t, p), player.id);
    return { correct: true, resonator_granted: true, available_resonators: inventory.available };
  });
}
