-- Migration 001: initial CampusQuest schema.
-- Safe on a fresh database. Re-running it on an already-migrated database is harmless
-- (everything is IF NOT EXISTS). It never drops or rewrites data.
BEGIN;

-- Guard: stop (changing nothing) if the old Day 1 / Day 2 prototype tables are present.
-- Those had a different shape (teams without game_id), so they cannot be upgraded in place.
DO $$
BEGIN
  IF to_regclass('public.teams') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'teams' AND column_name = 'game_id'
     )
  THEN
    RAISE EXCEPTION 'Legacy Day 1/Day 2 schema detected (teams has no game_id). '
      'Back up anything you need, then reset the dev database once: docker compose down -v';
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- Conventions
--   * PostgreSQL is the source of truth; the JavaScript game engine enforces the rules.
--   * IDs are INTEGER identity columns (returned by `pg` as JSON numbers).
--   * All timestamps are TIMESTAMPTZ (stored in UTC).
--   * Enumerations are CHECK constraints (easy to extend later with a new migration).
--   * Derived state (resonator counts, 1/3..3/3, capture level) is NOT stored.
--     Compute it: SELECT COUNT(*) FROM resonators WHERE territory_id = $1 AND status = 'active';
--
-- Foreign key policy (ON DELETE)
--   * RESTRICT everywhere, so game history cannot be destroyed by accident.
--     Deleting a user, team, territory, riddle, resonator or game that is still
--     referenced fails instead of cascading. There is no ON DELETE CASCADE.
--   * The one exception: users.team_id is SET NULL. Team membership is a
--     changeable attribute of a player, not history (history lives in
--     resonators / attacks / game_events, which all use RESTRICT).
-- ---------------------------------------------------------------------

-- Display and store timestamps in UTC for every new session on this database.
DO $$
BEGIN
  EXECUTE format('ALTER DATABASE %I SET timezone TO ''UTC''', current_database());
END $$;

-- =====================================================================
-- game_sessions: one actual CampusQuest game / event
-- =====================================================================
CREATE TABLE IF NOT EXISTS game_sessions (
  id         INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name       VARCHAR(255) NOT NULL,
  status     VARCHAR(20)  NOT NULL DEFAULT 'scheduled',
  starts_at  TIMESTAMPTZ,
  ends_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_game_sessions_status
    CHECK (status IN ('scheduled', 'active', 'paused', 'finished')),
  CONSTRAINT chk_game_sessions_dates
    CHECK (starts_at IS NULL OR ends_at IS NULL OR ends_at > starts_at)
);

-- =====================================================================
-- teams: a team belongs to exactly one game session
-- =====================================================================
CREATE TABLE IF NOT EXISTS teams (
  id         INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  game_id    INTEGER      NOT NULL REFERENCES game_sessions(id) ON DELETE RESTRICT,
  name       VARCHAR(50)  NOT NULL,
  color      VARCHAR(7)   NOT NULL,                       -- hex, e.g. #EF4444
  score      INTEGER      NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_teams_game_name UNIQUE (game_id, name),   -- no duplicate team names within a game
  CONSTRAINT chk_teams_color    CHECK (color ~ '^#[0-9A-Fa-f]{6}$')
);

-- =====================================================================
-- users: a player. Authentication is handled by Firebase (no passwords here).
-- A user may exist without a team (they sign in before joining a game).
-- =====================================================================
CREATE TABLE IF NOT EXISTS users (
  id           INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  firebase_uid VARCHAR(128) NOT NULL,
  name         VARCHAR(255) NOT NULL,
  email        VARCHAR(255) NOT NULL,
  avatar_url   TEXT,                                   -- Firebase/Google photo
  username     VARCHAR(20),                            -- NULL until the player picks one
  bio          VARCHAR(160) NOT NULL
                 DEFAULT 'New to CampusQuest. Ready to capture some territory!',
  avatar       VARCHAR(5),                             -- preset key: red1-4 / blue1-4; NULL = none chosen
  team_id      INTEGER REFERENCES teams(id) ON DELETE SET NULL,  -- membership, not history
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen    TIMESTAMPTZ,

  -- UNIQUE constraints create the indexes on firebase_uid and email.
  CONSTRAINT uq_users_firebase_uid UNIQUE (firebase_uid),
  CONSTRAINT uq_users_email        UNIQUE (email),
  CONSTRAINT chk_users_username CHECK (username IS NULL OR username ~ '^[A-Za-z0-9_]{3,20}$'),
  CONSTRAINT chk_users_avatar   CHECK (avatar IS NULL OR avatar ~ '^(red|blue)[1-4]$')
);

-- =====================================================================
-- territories: a physical location that can be captured.
-- There is deliberately no resonator_count / capture_level column:
-- those are derived from the resonators table.
-- =====================================================================
CREATE TABLE IF NOT EXISTS territories (
  id            INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  game_id       INTEGER          NOT NULL REFERENCES game_sessions(id) ON DELETE RESTRICT,
  name          VARCHAR(255)     NOT NULL,
  description   TEXT,

  latitude      DOUBLE PRECISION NOT NULL,
  longitude     DOUBLE PRECISION NOT NULL,
  radius        DOUBLE PRECISION NOT NULL,               -- metres

  owner_team_id INTEGER REFERENCES teams(id) ON DELETE RESTRICT,
  status        VARCHAR(20)      NOT NULL DEFAULT 'neutral',
  locked        BOOLEAN          NOT NULL DEFAULT FALSE,

  created_at    TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ      NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_territories_status
    CHECK (status IN ('neutral', 'partial', 'controlled')),
  CONSTRAINT chk_territories_latitude  CHECK (latitude  BETWEEN -90  AND 90),
  CONSTRAINT chk_territories_longitude CHECK (longitude BETWEEN -180 AND 180),
  CONSTRAINT chk_territories_radius    CHECK (radius > 0)
);

-- =====================================================================
-- riddles: a territory can have one or more riddles.
-- Only a hash of the answer is stored, never the plaintext.
-- The game engine must normalise (trim + lower-case) and hash the submitted
-- answer the same way as the stored one, e.g. SHA-256 hex.
-- =====================================================================
CREATE TABLE IF NOT EXISTS riddles (
  id           INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  territory_id INTEGER     NOT NULL REFERENCES territories(id) ON DELETE RESTRICT,
  question     TEXT        NOT NULL,
  answer_hash  TEXT        NOT NULL,
  difficulty   VARCHAR(10) NOT NULL,
  active       BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_riddles_difficulty CHECK (difficulty IN ('easy', 'medium', 'hard')),
  CONSTRAINT chk_riddles_answer_hash CHECK (length(answer_hash) > 0)
);

-- =====================================================================
-- riddle_attempts: every answer a player submits (history, anti-abuse input)
-- =====================================================================
CREATE TABLE IF NOT EXISTS riddle_attempts (
  id           INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  riddle_id    INTEGER     NOT NULL REFERENCES riddles(id) ON DELETE RESTRICT,
  user_id      INTEGER     NOT NULL REFERENCES users(id)   ON DELETE RESTRICT,
  answer       TEXT        NOT NULL,                     -- submitted answer, kept for debugging / history
  correct      BOOLEAN     NOT NULL,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================================
-- resonators: the core territory-control table.
-- Active rows = current control; destroyed rows stay forever as history.
-- =====================================================================
CREATE TABLE IF NOT EXISTS resonators (
  id           INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  territory_id INTEGER     NOT NULL REFERENCES territories(id) ON DELETE RESTRICT,
  user_id      INTEGER     NOT NULL REFERENCES users(id)       ON DELETE RESTRICT,
  team_id      INTEGER     NOT NULL REFERENCES teams(id)       ON DELETE RESTRICT,
  status       VARCHAR(10) NOT NULL DEFAULT 'active',
  deployed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  destroyed_at TIMESTAMPTZ,

  CONSTRAINT chk_resonators_status CHECK (status IN ('active', 'destroyed')),
  -- destroyed_at is set if and only if the resonator is destroyed
  CONSTRAINT chk_resonators_destroyed_at CHECK (
    (status = 'active'    AND destroyed_at IS NULL) OR
    (status = 'destroyed' AND destroyed_at IS NOT NULL)
  )
);

-- =====================================================================
-- attacks: attack history against territories / resonators (never deleted)
-- target_resonator_id is nullable because an attack may target a territory as a whole.
-- =====================================================================
CREATE TABLE IF NOT EXISTS attacks (
  id                 INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  territory_id       INTEGER     NOT NULL REFERENCES territories(id) ON DELETE RESTRICT,
  attacker_user_id   INTEGER     NOT NULL REFERENCES users(id)       ON DELETE RESTRICT,
  attacker_team_id   INTEGER     NOT NULL REFERENCES teams(id)       ON DELETE RESTRICT,
  target_resonator_id INTEGER    REFERENCES resonators(id)           ON DELETE RESTRICT,
  status             VARCHAR(12) NOT NULL DEFAULT 'pending',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at        TIMESTAMPTZ,

  CONSTRAINT chk_attacks_status
    CHECK (status IN ('pending', 'successful', 'failed', 'cancelled')),
  -- resolved_at is set if and only if the attack is no longer pending
  CONSTRAINT chk_attacks_resolved_at CHECK (
    (status = 'pending'  AND resolved_at IS NULL) OR
    (status <> 'pending' AND resolved_at IS NOT NULL)
  )
);

-- =====================================================================
-- territory_locks: the three-player lock. One row per lock; unlocked_at stays
-- NULL while the lock is active. The engine validates team membership, active
-- resonators and proximity; the database stores the result.
-- =====================================================================
CREATE TABLE IF NOT EXISTS territory_locks (
  id                INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  territory_id      INTEGER     NOT NULL REFERENCES territories(id) ON DELETE RESTRICT,
  team_id           INTEGER     NOT NULL REFERENCES teams(id)       ON DELETE RESTRICT,
  locked_by_user_id INTEGER     NOT NULL REFERENCES users(id)       ON DELETE RESTRICT,
  player_one_id     INTEGER     NOT NULL REFERENCES users(id)       ON DELETE RESTRICT,
  player_two_id     INTEGER     NOT NULL REFERENCES users(id)       ON DELETE RESTRICT,
  player_three_id   INTEGER     NOT NULL REFERENCES users(id)       ON DELETE RESTRICT,
  locked_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  unlocked_at       TIMESTAMPTZ,

  -- Three different people. (Same team / proximity are game rules, left to the engine.)
  CONSTRAINT chk_territory_locks_distinct_players CHECK (
    player_one_id <> player_two_id AND
    player_one_id <> player_three_id AND
    player_two_id <> player_three_id
  ),
  CONSTRAINT chk_territory_locks_unlock_after_lock
    CHECK (unlocked_at IS NULL OR unlocked_at >= locked_at)
);

-- =====================================================================
-- game_events: permanent audit log. Every reference is nullable because some
-- events have no specific user / team / territory (e.g. GAME_STARTED).
-- =====================================================================
CREATE TABLE IF NOT EXISTS game_events (
  id           INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  game_id      INTEGER     NOT NULL REFERENCES game_sessions(id) ON DELETE RESTRICT,
  user_id      INTEGER     REFERENCES users(id)       ON DELETE RESTRICT,
  team_id      INTEGER     REFERENCES teams(id)       ON DELETE RESTRICT,
  territory_id INTEGER     REFERENCES territories(id) ON DELETE RESTRICT,
  event_type   VARCHAR(40) NOT NULL,
  event_data   JSONB       NOT NULL DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_game_events_type CHECK (event_type IN (
    'GAME_STARTED', 'GAME_ENDED',
    'PLAYER_JOINED', 'PLAYER_LEFT',
    'RIDDLE_SOLVED', 'RESONATOR_GRANTED', 'RESONATOR_DEPLOYED',
    'TERRITORY_PARTIALLY_CAPTURED', 'TERRITORY_CAPTURED', 'TERRITORY_LOCKED',
    'TERRITORY_ATTACKED', 'RESONATOR_DESTROYED',
    'TERRITORY_LOST', 'TERRITORY_RECLAIMED'
  )),
  CONSTRAINT chk_game_events_data_is_object CHECK (jsonb_typeof(event_data) = 'object')
);

-- =====================================================================
-- Generic housekeeping trigger: keep territories.updated_at current.
-- (Not game logic: it only maintains a timestamp.)
-- =====================================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_territories_updated_at ON territories;
CREATE TRIGGER trg_territories_updated_at
  BEFORE UPDATE ON territories
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =====================================================================
-- Indexes
-- (users.firebase_uid and users.email are already indexed by their UNIQUE constraints.)
-- =====================================================================
CREATE INDEX IF NOT EXISTS idx_users_team_id                ON users (team_id);
-- Usernames are unique, case-insensitively ("Sam" and "sam" collide).
CREATE UNIQUE INDEX IF NOT EXISTS uq_users_username_lower ON users (lower(username));

CREATE INDEX IF NOT EXISTS idx_teams_game_id                ON teams (game_id);

CREATE INDEX IF NOT EXISTS idx_territories_game_id          ON territories (game_id);
CREATE INDEX IF NOT EXISTS idx_territories_owner_team_id    ON territories (owner_team_id);

CREATE INDEX IF NOT EXISTS idx_riddles_territory_id         ON riddles (territory_id);

CREATE INDEX IF NOT EXISTS idx_riddle_attempts_riddle_id    ON riddle_attempts (riddle_id);
CREATE INDEX IF NOT EXISTS idx_riddle_attempts_user_id      ON riddle_attempts (user_id);

CREATE INDEX IF NOT EXISTS idx_resonators_territory_id      ON resonators (territory_id);
CREATE INDEX IF NOT EXISTS idx_resonators_user_id           ON resonators (user_id);
CREATE INDEX IF NOT EXISTS idx_resonators_team_id           ON resonators (team_id);
CREATE INDEX IF NOT EXISTS idx_resonators_status            ON resonators (status);
-- Hot path: "how many active resonators does each team have on this territory?"
CREATE INDEX IF NOT EXISTS idx_resonators_active_territory_team
  ON resonators (territory_id, team_id) WHERE status = 'active';
-- Rule: one ACTIVE resonator per player per territory.
CREATE UNIQUE INDEX IF NOT EXISTS uq_resonators_one_active_per_user_territory
  ON resonators (territory_id, user_id) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_attacks_territory_id         ON attacks (territory_id);
CREATE INDEX IF NOT EXISTS idx_attacks_attacker_user_id     ON attacks (attacker_user_id);
CREATE INDEX IF NOT EXISTS idx_attacks_attacker_team_id     ON attacks (attacker_team_id);
CREATE INDEX IF NOT EXISTS idx_attacks_target_resonator_id  ON attacks (target_resonator_id);

CREATE INDEX IF NOT EXISTS idx_territory_locks_territory_id ON territory_locks (territory_id);
CREATE INDEX IF NOT EXISTS idx_territory_locks_team_id      ON territory_locks (team_id);
-- Rule: a territory can have only one ACTIVE lock.
CREATE UNIQUE INDEX IF NOT EXISTS uq_territory_locks_one_active_per_territory
  ON territory_locks (territory_id) WHERE unlocked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_game_events_game_id          ON game_events (game_id);
CREATE INDEX IF NOT EXISTS idx_game_events_territory_id     ON game_events (territory_id);
CREATE INDEX IF NOT EXISTS idx_game_events_user_id          ON game_events (user_id);
CREATE INDEX IF NOT EXISTS idx_game_events_team_id          ON game_events (team_id);
CREATE INDEX IF NOT EXISTS idx_game_events_created_at       ON game_events (created_at);

COMMIT;