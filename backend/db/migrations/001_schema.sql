-- CampusQuest schema (v1, fresh database).
-- Rules: PostgreSQL is the source of truth; the game services enforce the rules.
--   * Timestamps are TIMESTAMPTZ (UTC). "Game days" are DATE in campus time, set by the app.
--   * Factions are the literals 'red' / 'blue'.
--   * Derived state (resonator counts, available resonators, level) is NOT stored.
--   * History is never deleted: foreign keys are RESTRICT.

-- ---------------------------------------------------------------- users
CREATE TABLE users (
  id           INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  firebase_uid VARCHAR(128) NOT NULL,
  email        VARCHAR(255) NOT NULL,
  name         VARCHAR(255) NOT NULL,            -- from Google; internal only, never shown to players
  google_photo TEXT,
  username     VARCHAR(16),                      -- NULL until onboarding is finished
  bio          VARCHAR(60) NOT NULL DEFAULT '',
  avatar       VARCHAR(6),                       -- preset key red1-8 / blue1-8
  faction      VARCHAR(4),                       -- NULL until chosen; locked once set
  xp           INTEGER NOT NULL DEFAULT 0 CHECK (xp >= 0),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen    TIMESTAMPTZ,
  CONSTRAINT uq_users_firebase_uid UNIQUE (firebase_uid),
  CONSTRAINT uq_users_email UNIQUE (email),
  CONSTRAINT chk_users_username CHECK (username IS NULL OR username ~ '^[A-Za-z0-9_]{3,16}$'),
  CONSTRAINT chk_users_faction  CHECK (faction IS NULL OR faction IN ('red', 'blue')),
  CONSTRAINT chk_users_avatar   CHECK (avatar IS NULL OR avatar ~ '^(red|blue)[1-8]$')
);
CREATE UNIQUE INDEX uq_users_username_lower ON users (lower(username));
CREATE INDEX idx_users_faction_xp ON users (faction, xp DESC);

-- Backstop for the faction lock: once set, it can never change.
CREATE FUNCTION users_faction_lock() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.faction IS NOT NULL AND NEW.faction IS DISTINCT FROM OLD.faction THEN
    RAISE EXCEPTION 'faction is locked' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_users_faction_lock BEFORE UPDATE OF faction ON users
  FOR EACH ROW EXECUTE FUNCTION users_faction_lock();

-- ---------------------------------------------------------------- portals (master list, ~14)
CREATE TABLE portals (
  id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name        VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  latitude    DOUBLE PRECISION NOT NULL CHECK (latitude  BETWEEN -90  AND 90),
  longitude   DOUBLE PRECISION NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  radius_m    DOUBLE PRECISION NOT NULL DEFAULT 20 CHECK (radius_m > 0),   -- allowed distance to act
  active      BOOLEAN NOT NULL DEFAULT TRUE,                               -- eligible for weekly selection
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Reference photos used by the image-recognition check. File lives in UPLOAD_DIR.
CREATE TABLE portal_reference_images (
  id         INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  portal_id  INTEGER NOT NULL REFERENCES portals(id) ON DELETE RESTRICT,
  file_path  TEXT NOT NULL,                     -- relative to UPLOAD_DIR
  mime       VARCHAR(50) NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,    -- shown in the app
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_ref_images_portal ON portal_reference_images (portal_id);
CREATE UNIQUE INDEX uq_ref_images_one_primary ON portal_reference_images (portal_id) WHERE is_primary;

-- ---------------------------------------------------------------- weekly events
CREATE TABLE events (
  id             INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name           VARCHAR(255) NOT NULL,
  status         VARCHAR(10) NOT NULL DEFAULT 'scheduled',
  starts_at      TIMESTAMPTZ NOT NULL,          -- Monday 09:00 campus time
  ends_at        TIMESTAMPTZ NOT NULL,          -- Friday 17:00 campus time
  winner_faction VARCHAR(4),                    -- NULL = tie / not finished
  finalized_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_events_status  CHECK (status IN ('scheduled', 'active', 'finished')),
  CONSTRAINT chk_events_dates   CHECK (ends_at > starts_at),
  CONSTRAINT chk_events_winner  CHECK (winner_faction IS NULL OR winner_faction IN ('red', 'blue'))
);
CREATE UNIQUE INDEX uq_events_one_active ON events (status) WHERE status = 'active';

-- The portals in play this week, plus their live control state.
CREATE TABLE event_portals (
  event_id      INTEGER NOT NULL REFERENCES events(id)  ON DELETE RESTRICT,
  portal_id     INTEGER NOT NULL REFERENCES portals(id) ON DELETE RESTRICT,
  status        VARCHAR(10) NOT NULL DEFAULT 'neutral',
  owner_faction VARCHAR(4),
  locked_until  TIMESTAMPTZ,                    -- set while 3/3; immune to attacks until then
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (event_id, portal_id),
  CONSTRAINT chk_ep_status CHECK (status IN ('neutral', 'partial', 'controlled')),
  CONSTRAINT chk_ep_owner  CHECK (owner_faction IS NULL OR owner_faction IN ('red', 'blue'))
);

-- ---------------------------------------------------------------- riddles
CREATE TABLE riddles (
  id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  portal_id   INTEGER NOT NULL REFERENCES portals(id) ON DELETE RESTRICT,  -- the answer is this portal's name
  question    TEXT NOT NULL,
  answer_hash TEXT NOT NULL CHECK (length(answer_hash) > 0),               -- sha256(lower(trim(answer)))
  difficulty  VARCHAR(6) NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_riddles_portal ON riddles (portal_id);

-- The 2 riddles a player gets per game day (not tied to being near a portal).
CREATE TABLE daily_riddles (
  user_id     INTEGER NOT NULL REFERENCES users(id)   ON DELETE RESTRICT,
  event_id    INTEGER NOT NULL REFERENCES events(id)  ON DELETE RESTRICT,
  day         DATE    NOT NULL,
  slot        SMALLINT NOT NULL CHECK (slot BETWEEN 1 AND 9),
  riddle_id   INTEGER NOT NULL REFERENCES riddles(id) ON DELETE RESTRICT,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, day, slot),
  UNIQUE (user_id, event_id, riddle_id)
);

CREATE TABLE riddle_attempts (
  id           INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id      INTEGER NOT NULL REFERENCES users(id)   ON DELETE RESTRICT,
  riddle_id    INTEGER NOT NULL REFERENCES riddles(id) ON DELETE RESTRICT,
  event_id     INTEGER NOT NULL REFERENCES events(id)  ON DELETE RESTRICT,
  answer       TEXT NOT NULL,
  correct      BOOLEAN NOT NULL,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_attempts_user_riddle_time ON riddle_attempts (user_id, riddle_id, attempted_at DESC);
CREATE INDEX idx_attempts_user_event ON riddle_attempts (user_id, event_id) WHERE correct;
-- Reward at most once per player per riddle, even under a race.
CREATE UNIQUE INDEX uq_attempts_one_correct ON riddle_attempts (riddle_id, user_id) WHERE correct;

-- ---------------------------------------------------------------- resonators
CREATE TABLE resonators (
  id                   INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_id             INTEGER NOT NULL REFERENCES events(id)  ON DELETE RESTRICT,
  portal_id            INTEGER NOT NULL REFERENCES portals(id) ON DELETE RESTRICT,
  user_id              INTEGER NOT NULL REFERENCES users(id)   ON DELETE RESTRICT,
  faction              VARCHAR(4) NOT NULL CHECK (faction IN ('red', 'blue')),
  status               VARCHAR(10) NOT NULL DEFAULT 'active',
  deployed_day         DATE NOT NULL,                    -- campus-time game day
  deployed_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  destroyed_at         TIMESTAMPTZ,
  destroyed_by_user_id INTEGER REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT chk_resonators_status CHECK (status IN ('active', 'destroyed')),
  CONSTRAINT chk_resonators_destroyed CHECK (
    (status = 'active'    AND destroyed_at IS NULL) OR
    (status = 'destroyed' AND destroyed_at IS NOT NULL)
  )
);
CREATE INDEX idx_resonators_portal_active ON resonators (event_id, portal_id, faction) WHERE status = 'active';
CREATE INDEX idx_resonators_user_event ON resonators (user_id, event_id);
-- One ACTIVE resonator per player per portal.
CREATE UNIQUE INDEX uq_resonators_active_user_portal ON resonators (event_id, portal_id, user_id) WHERE status = 'active';
-- One deployment per player per portal per day (destroyed ones still count).
CREATE UNIQUE INDEX uq_resonators_user_portal_day ON resonators (event_id, portal_id, user_id, deployed_day);

-- ---------------------------------------------------------------- deploy verification (location + photo)
-- A passed verification is a single-use, short-lived ticket for POST /portals/:id/deploy.
-- The photo itself is not stored.
CREATE TABLE deploy_verifications (
  id            INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES users(id)   ON DELETE RESTRICT,
  event_id      INTEGER NOT NULL REFERENCES events(id)  ON DELETE RESTRICT,
  portal_id     INTEGER NOT NULL REFERENCES portals(id) ON DELETE RESTRICT,
  latitude      DOUBLE PRECISION NOT NULL,
  longitude     DOUBLE PRECISION NOT NULL,
  distance_m    DOUBLE PRECISION NOT NULL,
  location_ok   BOOLEAN NOT NULL,
  similarity    DOUBLE PRECISION,                         -- 0..1, NULL if the photo was not compared
  image_ok      BOOLEAN NOT NULL DEFAULT FALSE,
  passed        BOOLEAN NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  consumed_at   TIMESTAMPTZ
);
CREATE INDEX idx_verifications_user_time ON deploy_verifications (user_id, created_at DESC);

-- ---------------------------------------------------------------- attacks
CREATE TABLE attacks (
  id                  INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_id            INTEGER NOT NULL REFERENCES events(id)  ON DELETE RESTRICT,
  portal_id           INTEGER NOT NULL REFERENCES portals(id) ON DELETE RESTRICT,
  attacker_user_id    INTEGER NOT NULL REFERENCES users(id)   ON DELETE RESTRICT,
  attacker_faction    VARCHAR(4) NOT NULL CHECK (attacker_faction IN ('red', 'blue')),
  target_resonator_id INTEGER NOT NULL REFERENCES resonators(id) ON DELETE RESTRICT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_attacks_user_time ON attacks (attacker_user_id, created_at DESC);

-- ---------------------------------------------------------------- XP ledger (source of team scores)
-- Team score of an event = SUM(amount) per faction, excluding WEEKLY_WIN bonuses.
CREATE TABLE xp_ledger (
  id         INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id)  ON DELETE RESTRICT,
  event_id   INTEGER REFERENCES events(id)          ON DELETE RESTRICT,
  faction    VARCHAR(4) NOT NULL CHECK (faction IN ('red', 'blue')),
  amount     INTEGER NOT NULL CHECK (amount > 0),
  reason     VARCHAR(30) NOT NULL,
  ref_id     INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_xp_reason CHECK (reason IN
    ('RIDDLE_SOLVED', 'RESONATOR_DEPLOYED', 'RESONATOR_DESTROYED', 'PORTAL_CAPTURED', 'WEEKLY_WIN'))
);
CREATE INDEX idx_xp_event_faction ON xp_ledger (event_id, faction);
CREATE INDEX idx_xp_user_event ON xp_ledger (user_id, event_id);

-- ---------------------------------------------------------------- activity log (feed + heatmap)
CREATE TABLE game_events (
  id         INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_id   INTEGER REFERENCES events(id)  ON DELETE RESTRICT,
  user_id    INTEGER REFERENCES users(id)   ON DELETE RESTRICT,
  faction    VARCHAR(4),
  portal_id  INTEGER REFERENCES portals(id) ON DELETE RESTRICT,
  event_type VARCHAR(30) NOT NULL,
  event_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_game_events_type CHECK (event_type IN (
    'GAME_STARTED', 'GAME_ENDED', 'PLAYER_JOINED', 'RIDDLE_SOLVED',
    'RESONATOR_DEPLOYED', 'RESONATOR_DESTROYED', 'PORTAL_CAPTURED', 'PORTAL_LOST')),
  CONSTRAINT chk_game_events_data CHECK (jsonb_typeof(event_data) = 'object')
);
CREATE INDEX idx_game_events_event_time ON game_events (event_id, created_at DESC);
CREATE INDEX idx_game_events_portal ON game_events (portal_id, created_at DESC);
