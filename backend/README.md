# CampusQuest Backend

Fastify + PostgreSQL + Firebase Auth API for CampusQuest, a mobile-first campus territory game: **Red vs Blue**, weekly Mon-Fri events, riddles → resonators → portals.

## Game rules (as implemented)

| Rule | Behaviour |
|---|---|
| Factions | `red` / `blue`, chosen once after sign-in. **Permanent** (API + DB trigger). |
| Weekly event | Mon 09:00 → Fri 17:00 campus time. Sat/Sun off. The faction with the most XP earned in the event wins. |
| Playable hours | Mon-Fri 09:00-17:00 (`CAMPUS_TZ`). Every game action is refused outside this. |
| Portals | 14-15 in the master list; **10 random** are used per event. Open in **two windows a day** (`PORTAL_WINDOWS`). |
| Riddles | **2 per player per day**, not tied to a location. Answer = a portal name (multiple choice, 4 options). Correct = **1 resonator** + XP. |
| Deploy | Needs a free resonator **and** a passed verification (GPS within the portal radius, default 20 m, **and** live-photo similarity ≥ 70 %). |
| Limits | 1 active resonator per player per portal; **1 deployment per player per portal per day**. |
| Capture | 3 active resonators of one faction = **controlled**, and **locked until 17:00 that day** (immune to attacks). |
| Attack | Be at the portal. Destroys 1 enemy resonator on a partial / unlocked portal (60 s cooldown). Then anyone can replace it. |
| XP | Riddle +100 · deploy +50 · destroy +30 · capture bonus +100 · weekly win +500 (every participant of the winner). Tune in `src/config/game.js`. |
| Levels | Level *n* starts at `100·(n-1)²` XP. |

Removed for the MVP: links, fields, mods, portal keys, missions, achievements, display name, team switching.

## Quick start (Docker)

```bash
cp .env.example .env          # fill in the FIREBASE_* values, ADMIN_API_KEY
docker compose up --build
```

The API container runs `migrate → seed → nodemon`. API on `http://localhost:3000`, Postgres on `5432`.
First run only: create this week's event (the scheduler also does it automatically when none exists):

```bash
curl -X POST localhost:3000/admin/events -H "x-admin-key: $ADMIN_API_KEY" -H 'content-type: application/json' -d '{}'
```

### Without Docker
```bash
npm install
# Postgres running; set DB_HOST=localhost in .env
npm run migrate && npm run seed && npm run dev
```

### Testing the game at night / without Firebase
In `.env` (both are **ignored in production**, the server refuses to start with them when `NODE_ENV=production`):
```
DEV_IGNORE_HOURS=true     # skip Mon-Fri 9-5 + portal windows
DEV_AUTH_BYPASS=true      # use  Authorization: Bearer dev:<name>:<email>   instead of a Firebase token
```

## Firebase
Firebase console → Project settings → Service accounts → *Generate new private key*. Copy `project_id`, `client_email`, `private_key` into `.env` (key on one line, in quotes, `\n` kept literal). The frontend signs in with Google and sends the ID token as `Authorization: Bearer <idToken>`.

## Endpoints
All except `/health` and `/portals/:id/image` need `Authorization: Bearer <Firebase ID token>`. Errors are `{ "error": "message" }` (429s carry `Retry-After`).

### Account / onboarding
| | |
|---|---|
| `GET /me` | Creates the player on first login. Returns profile, `xp/level/xp_into_level/xp_for_next_level`, `event_xp`, `stats` (+ `global_rank`), `onboarding: { needs_faction, needs_profile, complete }` |
| `POST /me/faction` `{faction:"red"\|"blue"}` | One time only. Later calls → 409 |
| `PATCH /me/profile` `{username?, bio?, avatar?}` | Username 3-16 `[A-Za-z0-9_]`, unique case-insensitively (409). Bio ≤ 60. Avatar `red1-8` / `blue1-8`, must match faction. Needs faction first. |
| `GET /usernames/:username/available` | `{valid, available}` for the live ✓ in the form |
| `GET /users/:id` | Public profile (no email) |
| `GET /me/resonators` | `{available, earned, deployed, active[]}` for the current event |

### Event & map
| | |
|---|---|
| `GET /event/current` | Event, `scores {red, blue, red_pct, blue_pct}`, `seconds_remaining` (header countdown), `game_open`, `portals_open`, `portal_window`, `next_portal_opening`, `server_time` |
| `GET /portals?owner=red\|blue` | This week's portals: coords, `radius_m`, `status` (`neutral`=grey / `partial` / `controlled`), `owner_faction`, `locked`, `resonators {red, blue, total}`, `image_url`, `open`, `you {has_active_resonator, deployed_today}` |
| `GET /portals/:id` | Detail: the above + `resonator_slots[3]` (player/faction per slot) + recent `activity` |
| `GET /portals/:id/image` | Primary reference photo (public, for `<img>`) |
| `GET /activity?limit=` | Live-activity feed (deploy / destroy / capture / lost) |
| `GET /heatmap?hours=24` | Per-portal `{red, blue, intensity 0..1}` for the heatmap layer |
| `GET /leaderboard?scope=global\|red\|blue&period=event\|all&limit=` | `{entries[], me}` ranked by event XP (`event`) or lifetime XP (`all`) |
| `GET /public/dashboard` | **No auth.** Read-only snapshot for the desktop big-screen dashboard: `event`, `scores`, `seconds_remaining`, `portals[]` (no per-player flags), `leaderboard {red[5], blue[5]}`, `activity[8]`. Cached ~4 s server-side. |

### Riddles (left-side popup)
| | |
|---|---|
| `GET /riddles/today` | Assigns today's 2 riddles on first call. `[{slot, id, question, difficulty, solved, options[4]}]`, `available_resonators` |
| `POST /riddles/:id/answer` `{answer}` | Send the chosen option text. `{correct, resonator_granted, available_resonators, xp}`. >5 wrong/min → 429 |

### Capture flow (camera → verify → deploy)
| | |
|---|---|
| `POST /portals/:id/verify` | `multipart/form-data`: `photo` (live JPEG/PNG/WebP ≤ 10 MB), `latitude`, `longitude`. Always 200 with details: `{passed, verification_id, location:{ok, distance_m, allowed_range_m}, image:{ok, similarity, required_pct}, message}`. Drives the "Verifying" and "Verification Result" screens. |
| `POST /portals/:id/deploy` `{verification_id}` | Single-use, valid 5 min. 201 → `{resonator, portal, captured, available_resonators, xp}` |
| `POST /portals/:id/attack` `{latitude, longitude, target_resonator_id?}` | `{destroyed_resonator, portal, cooldown_seconds, xp}` |

`xp` objects look like `{awarded, total, level, leveled_up}`: show the level-up animation when `leveled_up` is true.

### Admin (header `x-admin-key: $ADMIN_API_KEY`; disabled if the key is empty)
| | |
|---|---|
| `POST /admin/events` `{week_of?, portal_ids?, name?}` | Create the Mon-Fri event with 10 random portals (or the ones given) |
| `GET /admin/events` · `POST /admin/events/:id/finalize` | List · end now + award the weekly-win bonus (idempotent) |
| `GET/POST /admin/portals` · `PATCH /admin/portals/:id` | Manage the master list (`radius_m`, `active`…) |
| `GET/POST /admin/portals/:id/images` | Reference photos. `multipart`: `image`, optional `primary=true` |
| `POST /admin/images/:id/primary` · `DELETE /admin/images/:id` | Set primary · delete |
| `GET/POST /admin/riddles` · `PATCH /admin/riddles/:id` | Riddles (answer is always the portal's name; only its hash is stored) |
| `GET /admin/stats` | Player counts |

**Reference images:** only used to display the portal's photo in the app. Image verification does not need them.

## Image recognition

The backend sends the captured image as raw bytes to the private EfficientNet recognition service after the existing GPS check. Configure `INFERENCE_API_TOKEN` once in `backend/.env`; Compose passes the same secret to both containers. `IMAGE_MATCHER_URL` is `http://campusquest-recognition:8000/v1/predict` inside Compose. Do not publish this service port or put its token in the frontend.

Capture is approved only when the service returns `accepted: true`, the predicted territory matches the selected portal, and its raw cosine score meets `IMAGE_MATCH_THRESHOLD`. The displayed score is a cosine-similarity signal in `[-1, 1]`, not a percent or probability. Only the reviewed aliases Gate 2A → Gate No. 2 and Raras Foodtruck → Rara's Food Truck are normalized; other label mismatches fail closed until their territory mapping is confirmed. The small current dataset and empty `_other` class do not support a reliable accuracy claim or a calibrated threshold.

Start the stack from this directory with Docker Desktop running:

```powershell
Copy-Item .env.example .env
# Edit .env and set INFERENCE_API_TOKEN to a long random secret.
docker compose up --build -d
docker compose logs -f campusquest-recognition
```

The first start downloads model weights and builds the gallery, which can take several minutes. Wait until the backend and recognition service report ready. Submit a real, in-range capture to test the integrated path. The backend must never approve a capture when the recognition service is unavailable.

## Event lifecycle
A scheduler (every 30 s) activates scheduled events, finalises ended ones (winner = higher event XP, tie = no winner; bonus to the winner's participants) and creates next week's event if none exists. You can also drive it manually through `/admin/events`.

## Project layout
```
db/migrations/001_schema.sql   schema        db/seeds/   14-15 portals + 45 riddles
scripts/migrate.js, seed.js    runners       tests/e2e.test.js
src/config      env + game rules             src/lib      clock, levels, shared helpers
src/auth        Firebase + admin key         src/matcher  image-matcher adapter
src/services    game logic (one file each)   src/routes   HTTP layer
```

## Tests
Real-database end-to-end test (onboarding, riddles, verify/deploy, capture + lock, attack/replace, cooldown, leaderboard, finalisation). It **wipes data**, so it refuses to run unless `DB_NAME` ends in `_test`:
```bash
createdb campusquest_test      # or create it in Docker's Postgres
DB_HOST=localhost DB_NAME=campusquest_test npm test
```

## Production notes
- Set `NODE_ENV=production`, a strong `ADMIN_API_KEY`, `CORS_ORIGIN=https://your-pwa-origin`, and persist `UPLOAD_DIR` (volume).
- Never commit `.env`. Rotate the Firebase service-account key if it was ever shared.
- Run a single API instance (the scheduler is idempotent but not distributed).
