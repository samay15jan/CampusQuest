// Test harness: real PostgreSQL (a dedicated *_test database), Firebase token
// verification mocked. Tokens look like "uid:<name>".
//
// SAFETY: tests TRUNCATE all game tables, so the database name must end in "_test".
import { mock } from 'node:test';
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import pg from 'pg';

const TEST_DB = process.env.TEST_DB_NAME || 'campusquest_test';
if (!/_test$/.test(TEST_DB)) {
  throw new Error(`Refusing to run: TEST_DB_NAME must end with "_test" (got "${TEST_DB}")`);
}
process.env.DB_NAME = TEST_DB; // must be set BEFORE src/config/env.js is imported
process.env.LOG_LEVEL = process.env.LOG_LEVEL || 'silent';

const src = (file) => new URL(`../src/${file}`, import.meta.url).href;

// Replace Firebase verification before anything imports it.
mock.module(src('auth/firebase.js'), {
  namedExports: {
    AuthNotConfiguredError: class AuthNotConfiguredError extends Error {},
    verifyIdToken: async (token) => {
      const match = /^uid:(.+)$/.exec(token);
      if (!match) throw new Error('invalid token');
      return { uid: match[1], email: `${match[1]}@test.local`, name: match[1], picture: null };
    },
  },
});

const { env } = await import(src('config/env.js'));
const { pool } = await import(src('db/db.js'));
const { buildApp } = await import(src('app.js'));
export const handshake = await import(src('game/lockHandshake.js'));
export { pool };

// --- database bootstrap -------------------------------------------------
async function ensureDatabase() {
  const admin = new pg.Client({
    host: env.DB_HOST, port: env.DB_PORT, user: env.DB_USER, password: env.DB_PASSWORD, database: 'postgres',
  });
  await admin.connect();
  try {
    const exists = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [TEST_DB]);
    if (exists.rowCount === 0) await admin.query(`CREATE DATABASE "${TEST_DB}"`);
  } finally {
    await admin.end();
  }
}

async function applyMigrations() {
  const dir = new URL('../db/migrations/', import.meta.url);
  const files = (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort();
  for (const file of files) await pool.query(await readFile(new URL(file, dir), 'utf8'));
}

await ensureDatabase();
await applyMigrations();

export const app = await buildApp();
await app.ready();

// --- fixtures -------------------------------------------------------------
export const sha = (text) => createHash('sha256').update(text.trim().toLowerCase()).digest('hex');
const one = async (text, params = []) => (await pool.query(text, params)).rows[0];

/** Wipes all game data and the in-memory lock handshake. */
export async function reset() {
  await pool.query(
    `TRUNCATE game_events, attacks, territory_locks, resonators, riddle_attempts, riddles,
              territories, users, teams, game_sessions RESTART IDENTITY CASCADE`
  );
  handshake.reset();
}

// Territories sit around (10, 20); all radii are in metres.
export const NEAR_T1 = { latitude: 10.0001, longitude: 20.0001 }; // ~16 m from T1
export const NEAR_T2 = { latitude: 10.001, longitude: 20.0001 }; // ~11 m from T2
export const FAR = { latitude: 10.05, longitude: 20.0 }; // ~5.5 km away

/** One game with teams Red/Blue, territories T1-T3 and six riddles. */
export async function setupGame(status = 'active') {
  const game = await one(`INSERT INTO game_sessions (name, status) VALUES ('Test Game', $1) RETURNING id`, [status]);
  const red = await one(`INSERT INTO teams (game_id, name, color) VALUES ($1, 'Red', '#EF4444') RETURNING id`, [game.id]);
  const blue = await one(`INSERT INTO teams (game_id, name, color) VALUES ($1, 'Blue', '#2563EB') RETURNING id`, [game.id]);

  const terr = async (name, lat, lng, radius) =>
    (await one(
      `INSERT INTO territories (game_id, name, latitude, longitude, radius) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [game.id, name, lat, lng, radius]
    )).id;
  const t1 = await terr('T1', 10.0, 20.0, 30);
  const t2 = await terr('T2', 10.001, 20.0, 30);
  const t3 = await terr('T3', 10.0, 20.001, 40);

  const riddle = async (territoryId, question, answer, difficulty) =>
    (await one(
      `INSERT INTO riddles (territory_id, question, answer_hash, difficulty) VALUES ($1, $2, $3, $4) RETURNING id`,
      [territoryId, question, sha(answer), difficulty]
    )).id;
  const riddles = {
    book: await riddle(t1, 'Spine but no bones?', 'book', 'easy'),
    egg: await riddle(t1, 'Break before use?', 'egg', 'medium'),
    future: await riddle(t2, 'Always ahead?', 'future', 'easy'),
    fire: await riddle(t3, 'Grows but not alive?', 'fire', 'easy'),
    stamp: await riddle(t3, 'Travels while staying put?', 'stamp', 'hard'),
    steps: await riddle(t3, 'Take more, leave more?', 'footsteps', 'medium'),
  };

  return { gameId: game.id, red: red.id, blue: blue.id, t1, t2, t3, riddles };
}

/** Creates a player through the real GET /me path; optionally puts them on a team. */
export async function mkUser(name, teamId = null) {
  const res = await app.inject({ url: '/me', headers: { authorization: `Bearer uid:${name}` } });
  if (res.statusCode !== 200) throw new Error(`could not create user ${name}: ${res.body}`);
  const user = { id: res.json().id, name };
  if (teamId) await pool.query('UPDATE users SET team_id = $1 WHERE id = $2', [teamId, user.id]);
  return user;
}

/** Gives a player n resonators to spend by recording correct riddle attempts. */
export async function giveResonators(userId, n) {
  await pool.query(
    `INSERT INTO riddle_attempts (riddle_id, user_id, answer, correct)
     SELECT id, $1, 'x', true FROM riddles
     WHERE id NOT IN (SELECT riddle_id FROM riddle_attempts WHERE user_id = $1 AND correct)
     ORDER BY id LIMIT $2`,
    [userId, n]
  );
}

// --- HTTP helpers ---------------------------------------------------------
export async function call(user, method, url, payload) {
  const res = await app.inject({
    method,
    url,
    headers: user ? { authorization: `Bearer uid:${user.name}` } : {},
    payload,
  });
  let body = null;
  try { body = res.json(); } catch { /* empty body */ }
  return { status: res.statusCode, body, headers: res.headers };
}
export const get = (user, url) => call(user, 'GET', url);
export const post = (user, url, payload) => call(user, 'POST', url, payload);

/** Each user gets a resonator and deploys it near the territory. Returns the HTTP statuses. */
export async function deployAll(users, territoryId, coords = NEAR_T1) {
  const statuses = [];
  for (const user of users) {
    await giveResonators(user.id, 1);
    statuses.push((await post(user, `/territories/${territoryId}/deploy`, coords)).status);
  }
  return statuses;
}

/** Makes the cooldown elapse by ageing every attack by two minutes. */
export const skipCooldown = () => pool.query(`UPDATE attacks SET created_at = created_at - INTERVAL '2 minutes'`);

export const countEvents = async (type) =>
  (await one('SELECT COUNT(*)::int AS n FROM game_events WHERE event_type = $1', [type])).n;
export const q = one;

export async function closeAll() {
  await app.close(); // also ends the pg pool
}
