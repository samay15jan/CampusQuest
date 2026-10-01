-- Migration 002: integrity and performance indexes for the Game APIs.
-- Adds indexes only. No data is changed or removed. Safe to re-run.
BEGIN;

-- A player can be rewarded at most once per riddle, even under a race
-- (wrong attempts are unrestricted; only ONE correct attempt per player per riddle).
CREATE UNIQUE INDEX IF NOT EXISTS uq_riddle_attempts_one_correct_per_user_riddle
  ON riddle_attempts (riddle_id, user_id) WHERE correct = true;

-- Wrong-answer throttle: recent attempts of a player on a riddle.
CREATE INDEX IF NOT EXISTS idx_riddle_attempts_user_riddle_time
  ON riddle_attempts (user_id, riddle_id, attempted_at DESC);

-- Attack cooldown: most recent attack of a player.
CREATE INDEX IF NOT EXISTS idx_attacks_attacker_user_created
  ON attacks (attacker_user_id, created_at DESC);

COMMIT;
