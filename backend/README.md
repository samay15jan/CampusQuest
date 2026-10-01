# CampusQuest Backend

Node.js (JavaScript, ES Modules) + Fastify + PostgreSQL (`pg`) + Firebase Admin + Docker.

## 1. Installation

Requirements: Docker + Docker Compose, or Node.js 22+ and a local PostgreSQL 16 for running without Docker.

```bash
npm install        # only needed for running locally (without Docker)
```

## 2. Firebase setup

The frontend signs users in with Firebase (Google) and sends the Firebase **ID token** to this API. The backend verifies it with the Firebase Admin SDK.

1. Go to the [Firebase console](https://console.firebase.google.com) and create (or open) a project.
2. **Authentication → Sign-in method** → enable **Google**.
3. **Project settings → Service accounts → Generate new private key**. This downloads a JSON file.
4. Copy three values from that JSON into your `.env` (next section):

   | JSON field     | Env variable            |
   |----------------|-------------------------|
   | `project_id`   | `FIREBASE_PROJECT_ID`   |
   | `client_email` | `FIREBASE_CLIENT_EMAIL` |
   | `private_key`  | `FIREBASE_PRIVATE_KEY`  |

> **Never commit the service-account JSON or your `.env`.** `.env` is already in `.gitignore`.

## 3. Environment setup

```bash
cp .env.example .env      # Windows PowerShell: Copy-Item .env.example .env
```

| Variable                | Default       | Description                                        |
|-------------------------|---------------|----------------------------------------------------|
| `PORT`                  | `3000`        | API port                                           |
| `DB_HOST`               | `postgres`    | `postgres` in Docker, `localhost` when running locally |
| `DB_PORT`               | `5432`        | PostgreSQL port                                    |
| `DB_NAME`               | `campusquest` | Database name                                      |
| `DB_USER`               | `campus`      | Database user                                      |
| `DB_PASSWORD`           | `campus123`   | Database password                                  |
| `FIREBASE_PROJECT_ID`   | -             | Firebase project ID                                |
| `FIREBASE_CLIENT_EMAIL` | -             | Service-account email                              |
| `FIREBASE_PRIVATE_KEY`  | -             | Service-account private key                        |

**Private key format:** keep it on one line, wrapped in double quotes, with `\n` where the line breaks were:

```env
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBg...\n-----END PRIVATE KEY-----\n"
```

The app converts the `\n` sequences back into real line breaks. Docker Compose reads `.env` automatically and sets the database values itself.

If the Firebase variables are missing the server still starts (so `/health` works), but protected routes return `500 {"error": "Authentication is not configured"}`.

## 4. Running with Docker

```bash
docker compose up --build
```

- API: http://localhost:3000/health
- PostgreSQL: `localhost:5432`
- `src/` is mounted into the container, so edits hot-reload via nodemon.
- On a **fresh** database volume, Postgres automatically runs `db/migrations/*.sql` (creates all tables).
- Seed data is **not** loaded automatically; see [Seed data](#seed-data).

Expected logs: `✓ PostgreSQL connected`, `✓ Firebase Admin initialized`.

**Upgrading from the Day 1 / Day 2 prototype?** Those tables had a different shape (teams had no `game_id`), so the migration refuses to touch them and tells you so. Reset the dev database volume **once** (this deletes the old prototype data, e.g. test users; they are recreated when they log in again):

```bash
docker compose down -v
docker compose up --build
```

## 5. Running locally

1. Start PostgreSQL (e.g. `docker compose up postgres`) or use your own instance.
2. In `.env`, set `DB_HOST=localhost`.
3. Apply the migration once (see [Running migrations](#running-migrations)).
4. Run:

```bash
npm run dev     # nodemon, auto-restart on changes
npm start       # plain node
```

## 6. Database

PostgreSQL is the **source of truth** for game state. The database stores facts and protects basic integrity (foreign keys, unique and CHECK constraints). The JavaScript game engine (added later) enforces the game *rules*: proximity, who may attack whom, scoring, and so on.

```text
db/
├── migrations/
│   ├── 001_initial_schema.sql   # authoritative, versioned schema changes
│   └── 002_game_integrity_indexes.sql  # indexes for the Game APIs (no data changes)
├── seeds/
│   └── 001_demo_data.sql        # development demo data (kept separate from the schema)
└── schema.sql                   # reference snapshot of the full current schema
```

### Database architecture

- **Migrations** are plain SQL files, applied in filename order. Add future changes as `002_...sql`, `003_...sql`; never edit an applied migration. `schema.sql` mirrors the result of all migrations on an empty database.
- **IDs** are integer identity columns. **Timestamps** are `TIMESTAMPTZ` (UTC).
- **Derived state is never stored.** There is no `resonator_count`, capture level, or `1/3` column. Compute it:

  ```sql
  SELECT COUNT(*) FROM resonators WHERE territory_id = $1 AND status = 'active';
  -- 0 -> neutral   1 or 2 -> partial   3 -> controlled
  ```
- **Foreign keys use `ON DELETE RESTRICT`** everywhere (no cascades), so game history cannot be deleted by accident. The only exception is `users.team_id` (`SET NULL`): team membership is a changeable attribute, not history.
- **Riddle answers are never stored in plaintext**, only `answer_hash` (SHA-256 hex of the trimmed, lower-cased answer).
- **Enumerations** (statuses, difficulty, event types) are `CHECK` constraints.

### Tables

| Table | Purpose |
|-------|---------|
| `game_sessions` | One CampusQuest game/event: `name`, `status` (`scheduled`, `active`, `paused`, `finished`), optional `starts_at` / `ends_at`. |
| `teams` | A team in exactly one game: `game_id`, `name`, `color`, `score`. Team names are unique within a game. |
| `users` | A player: `firebase_uid`, `name`, `email`, `avatar_url`, nullable `team_id`, `created_at`, `last_seen`. No passwords (Firebase handles auth). |
| `territories` | A capturable physical location: `game_id`, `name`, `description`, `latitude`, `longitude`, `radius` (metres), `owner_team_id`, `status` (`neutral`, `partial`, `controlled`), `locked`, `created_at`, `updated_at`. |
| `riddles` | Riddles attached to a territory: `question`, `answer_hash`, `difficulty` (`easy`, `medium`, `hard`), `active`. |
| `riddle_attempts` | Every submitted answer: `riddle_id`, `user_id`, `answer`, `correct`, `attempted_at`. |
| `resonators` | One deployed resonator: `territory_id`, `user_id`, `team_id`, `status` (`active`, `destroyed`), `deployed_at`, `destroyed_at`. Destroyed rows are kept as history. |
| `attacks` | Attack history: `territory_id`, `attacker_user_id`, `attacker_team_id`, optional `target_resonator_id`, `status` (`pending`, `successful`, `failed`, `cancelled`), `created_at`, `resolved_at`. |
| `territory_locks` | The three-player lock: `territory_id`, `team_id`, `locked_by_user_id`, `player_one_id`, `player_two_id`, `player_three_id`, `locked_at`, `unlocked_at` (NULL while active). |
| `game_events` | Permanent audit log: `game_id`, optional `user_id` / `team_id` / `territory_id`, `event_type`, `event_data` (JSONB), `created_at`. |

### Relationships

```text
game_sessions 1 --< teams                   (teams.game_id)
game_sessions 1 --< territories             (territories.game_id)
game_sessions 1 --< game_events             (game_events.game_id)
teams         1 --< users                   (users.team_id, nullable)
teams         1 --< territories             (territories.owner_team_id, nullable)
territories   1 --< riddles                 (riddles.territory_id)
riddles       1 --< riddle_attempts         (riddle_attempts.riddle_id)
users         1 --< riddle_attempts         (riddle_attempts.user_id)
territories   1 --< resonators              (resonators.territory_id)
users         1 --< resonators              (resonators.user_id)
teams         1 --< resonators              (resonators.team_id)
territories   1 --< attacks                 (attacks.territory_id)
users         1 --< attacks                 (attacker_user_id)
teams         1 --< attacks                 (attacker_team_id)
resonators    1 --< attacks                 (target_resonator_id, nullable)
territories   1 --< territory_locks         (territory_id)
teams         1 --< territory_locks         (team_id)
users         1 --< territory_locks         (locked_by_user_id, player_one_id, player_two_id, player_three_id)
users/teams/territories 0..1 --< game_events (all three nullable)
```

### ER diagram

```text
                               +----------------+
                               | game_sessions  |
                               +-------+--------+
            +-------------------------+-+---------------------+
            |                           |                     |
            v                           v                     v
        +-------+   owner_team_id  +-------------+       +-------------+
        | teams |<-----------------| territories |       | game_events |  (user, team,
        +---+---+                  +------+------+       +-------------+   territory:
            |                             |                                 all nullable)
            v  team_id (nullable)         |
        +-------+                         |
        | users |                         |
        +---+---+                         |
            |      +----------------------+----------------------+
            |      |                      |                      |
            |      v                      v                      v
            |  +---------+          +------------+          +-----------------+
            |  | riddles |          | resonators |<---------| attacks         |
            |  +----+----+          +------------+ target   +-----------------+
            |       |                (user, team)           (attacker user/team)
            |       v                                        
            |  +-----------------+    +-----------------+
            +->| riddle_attempts |    | territory_locks |  (team, locked_by, 3 players -> users)
               +-----------------+    +-----------------+
```

### Running migrations

Everything below runs from the project folder, with the Docker containers up (`docker compose up`). The `db/` folder is mounted inside the Postgres container at `/db`, so the same command works on Windows, macOS and Linux.

```bash
# Apply the migration (fresh volumes do this automatically on first start)
docker exec campusquest-postgres psql -U campus -d campusquest -v ON_ERROR_STOP=1 -f /db/migrations/001_initial_schema.sql
```

A **fresh** volume runs every file in `db/migrations/` automatically (001, then 002). For a database that already has 001, apply the new one by hand. It only adds indexes, never changes data, and is harmless to re-run:

```bash
docker exec campusquest-postgres psql -U campus -d campusquest -v ON_ERROR_STOP=1 -f /db/migrations/002_game_integrity_indexes.sql
```

Migration 001 is safe on an empty database and harmless to re-run. It runs in one transaction and never drops or rewrites data. If it finds the old Day 1/Day 2 prototype tables it stops and changes nothing (see the upgrade note in section 4).

Without Docker, use your local `psql` (run 001, then 002):

```bash
psql -h localhost -U campus -d campusquest -v ON_ERROR_STOP=1 -f db/migrations/001_initial_schema.sql
psql -h localhost -U campus -d campusquest -v ON_ERROR_STOP=1 -f db/migrations/002_game_integrity_indexes.sql
```

### Seed data

Creates the demo game (`CampusQuest Demo`, status `scheduled`), teams **Red** (`#EF4444`) and **Blue** (`#2563EB`), 4 territories with placeholder coordinates, and 6 riddles. It creates no users, resonators or attacks. It can be run more than once without creating duplicates.

```bash
docker exec campusquest-postgres psql -U campus -d campusquest -v ON_ERROR_STOP=1 -f /db/seeds/001_demo_data.sql
```

Demo riddle answers (hashed in the database): `book`, `egg`, `future`, `stamp`, `fire`, `footsteps`.

### Inspecting the database

```bash
# Open an interactive psql shell
docker exec -it campusquest-postgres psql -U campus -d campusquest

# One-off commands
docker exec campusquest-postgres psql -U campus -d campusquest -c "\dt"
docker exec campusquest-postgres psql -U campus -d campusquest -c "\d resonators"
docker exec campusquest-postgres psql -U campus -d campusquest -c "SELECT id, name, status, locked FROM territories;"
```

Current capture state of every territory, derived from resonators:

```sql
SELECT t.id, t.name, COUNT(r.id) FILTER (WHERE r.status = 'active') AS active_resonators
FROM territories t
LEFT JOIN resonators r ON r.territory_id = t.id
GROUP BY t.id, t.name
ORDER BY t.id;
```

Useful `psql` commands: `\dt` (tables), `\d <table>` (columns, constraints, indexes), `\di` (indexes), `\q` (quit).

## 7. Authentication flow

1. The frontend signs in with Firebase Google Login.
2. The frontend gets the ID token (`await user.getIdToken()`).
3. The frontend sends it on every request: `Authorization: Bearer <ID_TOKEN>`.
4. The backend verifies the token with Firebase Admin and sets `request.user = { uid, email, name, picture }`.
5. `GET /me` inserts the user in PostgreSQL on first login (otherwise updates `last_seen`) and returns the profile.

Invalid, expired, or missing tokens get `401 {"error": "Unauthorized"}`.

## 8. API documentation

Errors always look like `{ "error": "message" }`. The game endpoints are documented in [section 10](#10-game-api).

### `GET /health`

Public liveness check. `200 OK`:

```json
{ "message": "Server running" }
```

### `GET /me` (protected)

Returns the authenticated player's profile, creating it on first login.

`200 OK`:

```json
{
  "id": 3,
  "name": "Nitik",
  "email": "nitik@email.com",
  "team_id": null,
  "avatar_url": "https://...",
  "created_at": "2026-09-29T16:20:00.000Z",
  "last_seen": "2026-09-29T16:20:00.000Z"
}
```

Errors: `401 Unauthorized`, `400 Token does not contain an email`, `409 User already exists with this email`.

### `GET /users/:id` (protected)

Public profile of a player (no email or Firebase UID).

`200 OK`:

```json
{
  "id": 3,
  "name": "Nitik",
  "avatar_url": "https://...",
  "team_id": null,
  "created_at": "2026-09-29T16:20:00.000Z"
}
```

Errors: `401 Unauthorized`, `400 Invalid user id`, `404 User not found`.

## 9. Testing `/me` with a Bearer token

You need a real Firebase ID token, which comes from a Google sign-in in a browser.

**Option A: your frontend.** After login, run `await auth.currentUser.getIdToken()`.

**Option B: a throwaway test page.** Save as `login-test.html` **outside** this project, fill in your Firebase web config (Project settings → General → Your apps), and serve it from `localhost` (e.g. `npx serve .`; `localhost` is authorized for Firebase Auth by default):

```html
<button id="login">Sign in with Google</button>
<pre id="out" style="white-space: pre-wrap; word-break: break-all"></pre>
<script type="module">
  import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js";
  import { getAuth, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";

  const app = initializeApp({ apiKey: "...", authDomain: "...", projectId: "..." });
  document.getElementById("login").onclick = async () => {
    const result = await signInWithPopup(getAuth(app), new GoogleAuthProvider());
    document.getElementById("out").textContent = await result.user.getIdToken();
  };
</script>
```

Then call the API (tokens expire after about 1 hour; just sign in again).

PowerShell:

```powershell
$token = "PASTE_ID_TOKEN_HERE"
Invoke-RestMethod http://localhost:3000/me -Headers @{ Authorization = "Bearer $token" }
```

curl:

```bash
curl http://localhost:3000/me -H "Authorization: Bearer PASTE_ID_TOKEN_HERE"
```

Without a valid token you get `401 {"error":"Unauthorized"}`:

```bash
curl -i http://localhost:3000/me
```

## 10. Game API

All game endpoints need `Authorization: Bearer <Firebase ID token>` and a player row, so the frontend must call `GET /me` once after login (it creates the player). A missing player returns `404 User not found. Call GET /me first`.

### Start a game

There is no admin API yet. The demo game is seeded as `scheduled`; players can join teams while it is `scheduled` or `active`, but every other action needs `active`:

```bash
docker exec campusquest-postgres psql -U campus -d campusquest -c "UPDATE game_sessions SET status = 'active' WHERE name = 'CampusQuest Demo';"
```

Use `paused` / `finished` the same way to stop play.

### The flow

```text
join team -> GET riddle -> POST answer (correct = +1 resonator) -> walk to the territory
-> POST deploy (1/3, 2/3, 3/3) -> three owners POST lock -> enemy POSTs attack (3/3 -> ... -> 0/3 neutral)
```

### Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/game` | Current game (latest `scheduled`/`active`) with its teams and member counts |
| POST | `/teams/:id/join` | Join a team (once; no switching) |
| GET | `/territories` | All territories of your game with derived state |
| GET | `/territories/:id` | One territory, plus your resonator and the active lock |
| GET | `/territories/:id/riddle` | Easiest riddle you have not solved here (question only) |
| POST | `/riddles/:id/answer` | Submit an answer |
| GET | `/me/resonators` | Your inventory and your active resonators |
| POST | `/territories/:id/deploy` | Deploy one resonator |
| POST | `/territories/:id/attack` | Destroy one enemy resonator |
| POST | `/territories/:id/lock` | Confirm the three-player lock |

`latitude` / `longitude` in request bodies are the player's current GPS position (degrees).

**`GET /game`** `200`

```json
{
  "id": 1, "name": "CampusQuest Demo", "status": "active", "starts_at": null, "ends_at": null,
  "teams": [
    { "id": 1, "name": "Red", "color": "#EF4444", "score": 0, "members": 2 },
    { "id": 2, "name": "Blue", "color": "#2563EB", "score": 0, "members": 1 }
  ],
  "my_team_id": 1
}
```

**`POST /teams/1/join`** `200`

```json
{ "user_id": 3, "team": { "id": 1, "name": "Red", "color": "#EF4444", "game_id": 1 } }
```

**`GET /territories`** `200` (one aggregated query; answers are never included)

```json
[
  {
    "id": 1, "name": "Central Library", "description": "The main library building.",
    "latitude": 10, "longitude": 20, "radius": 30,
    "status": "partial", "locked": false,
    "owner_team": { "id": 1, "name": "Red", "color": "#EF4444" },
    "resonators": { "total_active": 2, "by_team": { "1": 2 } }
  }
]
```

`GET /territories/:id` returns the same fields plus `my_resonator` (`{ id, deployed_at }` or `null`) and `active_lock` (`{ id, team_id, locked_by_user_id, players: [..3 ids], locked_at }` or `null`).

**`GET /territories/1/riddle`** `200` / `404 No unsolved riddles at this territory`

```json
{ "id": 1, "territory_id": 1, "question": "I have a spine but no bones...", "difficulty": "easy" }
```

**`POST /riddles/1/answer`** body `{ "answer": "book" }`

```json
{ "correct": true, "resonator_granted": true, "available_resonators": 1 }
```

A wrong answer returns `200 { "correct": false, "resonator_granted": false, "wrong_attempts_left_this_minute": 4 }`.

**`GET /me/resonators`** `200`

```json
{
  "available": 1, "solved_riddles": 2, "deployed_total": 1,
  "active": [ { "id": 7, "territory_id": 1, "territory_name": "Central Library", "status": "active", "deployed_at": "2026-10-01T10:00:00.000Z" } ]
}
```

**`POST /territories/1/deploy`** body `{ "latitude": 10.0001, "longitude": 20.0001 }` returns `201`

```json
{
  "resonator": { "id": 7, "territory_id": 1, "user_id": 3, "team_id": 1, "status": "active", "deployed_at": "..." },
  "territory": { "id": 1, "status": "partial", "owner_team_id": 1, "locked": false, "active_resonators": 1 },
  "available_resonators": 0
}
```

**`POST /territories/1/attack`** body `{ "latitude": 10.0001, "longitude": 20.0001, "target_resonator_id": 7 }` (`target_resonator_id` is optional; default is the oldest active resonator) returns `200`

```json
{
  "attack": { "id": 1, "status": "successful", "created_at": "...", "resolved_at": "..." },
  "destroyed_resonator": { "id": 7, "user_id": 3, "team_id": 1 },
  "territory": { "id": 1, "status": "partial", "owner_team_id": 1, "locked": false, "active_resonators": 2 },
  "cooldown_seconds": 60
}
```

**`POST /territories/1/lock`** body `{ "latitude": ..., "longitude": ... }`. The first and second confirmations return:

```json
{ "locked": false, "confirmed": 2, "needed": 3, "expires_in_seconds": 60 }
```

The third confirmation creates the lock:

```json
{
  "locked": true,
  "lock": { "id": 1, "territory_id": 1, "team_id": 1, "locked_by_user_id": 9, "players": [3, 5, 9], "locked_at": "..." }
}
```

### Status codes

| Code | Meaning | Examples |
|---|---|---|
| 400 | Invalid input | missing or out-of-range `latitude`, empty `answer` |
| 401 | Missing or invalid token | |
| 403 | Not allowed | no team, too far away, attacking your own team, locking a territory you do not hold |
| 404 | Not found | unknown territory, riddle, team or target resonator |
| 409 | State conflict | already on a team, already solved, game not active, no resonators left, territory held by another team or full |
| 429 | Throttled | wrong-answer limit, attack cooldown (a `Retry-After` header is sent) |

### Rules

| Rule | Value |
|---|---|
| Resonators per territory | 3 (`MAX_RESONATORS_PER_TERRITORY`) |
| Teams per territory | One team at a time |
| One active resonator | Per player per territory (also enforced by the database) |
| Capture state | 0 active = neutral, 1-2 = partial, 3 = controlled (stored in `territories`, recalculated in the same transaction as every resonator change) |
| Inventory | Derived: riddles solved correctly minus resonators ever deployed. Destroyed resonators are not refunded |
| Riddle reward | Once per riddle per player (also enforced by migration 002) |
| Wrong answers | More than 5 per riddle per player per minute -> 429 (`MAX_WRONG_ANSWERS_PER_MINUTE`) |
| Proximity | Deploy, attack and lock need you within the territory `radius` (Haversine). Riddle answers do not |
| Attack | Resolves immediately; destroys one resonator (the row is kept); one attack per player per 60 s (`ATTACK_COOLDOWN_SECONDS`) |
| Territory lost | At 0 active resonators the territory is neutral and `TERRITORY_LOST` is logged |
| Reclaim | Reaching 3/3 on a territory that has a `TERRITORY_LOST` event logs `TERRITORY_RECLAIMED` instead of `TERRITORY_CAPTURED` |
| Lock | Needs exactly 3 active resonators, all from your team. Each of the 3 owners must be within the radius and confirm within 60 s (`LOCK_CONFIRM_WINDOW_SECONDS`) |
| Lock released | Any attack that drops the territory below 3 active resonators releases the lock |

Tunable values live in `src/config/game.js`.

**Lock limits:** the pending confirmations are kept in memory. They are lost when the API restarts and only work with a single API instance. The lock itself is stored in PostgreSQL (`territory_locks`).

**Events:** every action writes to `game_events` in the same transaction: `PLAYER_JOINED`, `RIDDLE_SOLVED`, `RESONATOR_GRANTED`, `RESONATOR_DEPLOYED`, `TERRITORY_PARTIALLY_CAPTURED`, `TERRITORY_CAPTURED` / `TERRITORY_RECLAIMED`, `TERRITORY_LOCKED`, `TERRITORY_ATTACKED`, `RESONATOR_DESTROYED`, `TERRITORY_LOST`.

## 11. Tests

37 automated tests (`node:test`, no extra dependencies) run against **real PostgreSQL**; only Firebase token verification is mocked. They use their own database, `campusquest_test`, which is created and migrated automatically (the name must end in `_test`, so your dev data is never touched).

```bash
# Inside Docker (containers running; rebuild once to pick up the new script)
docker compose up --build -d
docker compose exec api npm test

# Locally (PostgreSQL on localhost:5432 and DB_HOST=localhost in .env)
npm test
```

The tests cover joining, derived territory state, riddles and throttling, deploy rules, capture events, attacks and cooldown, the three-player lock, concurrency races (`Promise.all`), and the "game not active" guard.

