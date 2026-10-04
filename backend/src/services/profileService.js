// Player profile: upsert on login, onboarding (faction lock, username, bio, avatar), public profile.
import { queryOne } from '../db/db.js';
import { httpError } from '../lib/errors.js';
import { levelInfo } from '../lib/levels.js';
import { getCurrentEvent, logEvent } from '../lib/context.js';
import { withTransaction } from '../db/db.js';

export const USERNAME_RE = /^[A-Za-z0-9_]{3,16}$/;
export const BIO_MAX = 60;
export const AVATARS = { red: Array.from({ length: 8 }, (_, i) => `red${i + 1}`), blue: Array.from({ length: 8 }, (_, i) => `blue${i + 1}`) };

const STATS_SQL = `
  SELECT (SELECT COUNT(*) FROM resonators WHERE user_id = u.id)::int AS resonators_deployed,
         (SELECT COUNT(*) FROM attacks WHERE attacker_user_id = u.id)::int AS resonators_destroyed,
         (SELECT COUNT(*) FROM riddle_attempts WHERE user_id = u.id AND correct)::int AS riddles_solved,
         (SELECT COUNT(*) FROM game_events WHERE user_id = u.id AND event_type = 'PORTAL_CAPTURED')::int AS portals_captured,
         (SELECT COUNT(*) FROM users x WHERE x.xp > u.xp AND x.username IS NOT NULL)::int + 1 AS global_rank`;

function shape(u, extra = {}) {
  return {
    id: u.id, username: u.username, bio: u.bio, avatar: u.avatar, faction: u.faction,
    xp: u.xp, ...levelInfo(u.xp), ...extra,
  };
}

/** GET /me: creates the user on first login, returns profile + onboarding state. */
export async function getMe({ uid, email, name, picture }) {
  const u = await queryOne(
    `INSERT INTO users (firebase_uid, email, name, google_photo, last_seen)
     VALUES ($1, $2::varchar, COALESCE($3::text, split_part($2::text, '@', 1)), $4, NOW())
     ON CONFLICT (firebase_uid) DO UPDATE
       SET email = EXCLUDED.email, google_photo = COALESCE(EXCLUDED.google_photo, users.google_photo), last_seen = NOW()
     RETURNING *`,
    [uid, email, name, picture]
  );
  const stats = await queryOne(`${STATS_SQL} FROM users u WHERE u.id = $1`, [u.id]);
  const ev = await getCurrentEvent();
  const evXp = ev ? (await queryOne(`SELECT COALESCE(SUM(amount), 0)::int AS xp FROM xp_ledger WHERE user_id = $1 AND event_id = $2 AND reason <> 'WEEKLY_WIN'`, [u.id, ev.id])).xp : 0;
  return shape(u, {
    email: u.email,
    event_xp: evXp,
    stats,
    onboarding: {
      needs_faction: !u.faction,
      needs_profile: !!u.faction && !u.username,
      complete: !!u.faction && !!u.username,
    },
  });
}

/** POST /me/faction: allowed exactly once. */
export async function chooseFaction(uid, faction) {
  return withTransaction(async (client) => {
    const { rows } = await client.query('UPDATE users SET faction = $2 WHERE firebase_uid = $1 AND faction IS NULL RETURNING id, faction', [uid, faction]);
    if (!rows[0]) {
      const { rows: ex } = await client.query('SELECT faction FROM users WHERE firebase_uid = $1', [uid]);
      if (!ex[0]) throw httpError(404, 'User not found. Call GET /me first');
      throw httpError(409, `Your faction is locked to ${ex[0].faction} and cannot be changed`);
    }
    await logEvent(client, { userId: rows[0].id, faction, type: 'PLAYER_JOINED', data: {} });
    return { faction };
  });
}

/** PATCH /me/profile: username, bio, avatar (avatar must match the faction). */
export async function updateProfile(uid, { username, bio, avatar }) {
  const me = await queryOne('SELECT id, faction, username FROM users WHERE firebase_uid = $1', [uid]);
  if (!me) throw httpError(404, 'User not found. Call GET /me first');
  if (!me.faction) throw httpError(403, 'Choose a faction first');

  if (username !== undefined) {
    username = String(username).trim();
    if (!USERNAME_RE.test(username)) throw httpError(400, 'Username must be 3-16 characters: letters, numbers, underscore');
  }
  if (bio !== undefined) {
    bio = String(bio).trim();
    if (bio.length > BIO_MAX) throw httpError(400, `Bio must be ${BIO_MAX} characters or fewer`);
  }
  if (avatar !== undefined && !AVATARS[me.faction].includes(avatar)) {
    throw httpError(400, `Avatar must be one of: ${AVATARS[me.faction].join(', ')}`);
  }
  try {
    const u = await queryOne(
      `UPDATE users SET username = COALESCE($2, username), bio = COALESCE($3, bio), avatar = COALESCE($4, avatar)
       WHERE id = $1 RETURNING *`,
      [me.id, username ?? null, bio ?? null, avatar ?? null]
    );
    return shape(u);
  } catch (err) {
    if (err.code === '23505') throw httpError(409, 'Username already taken');
    throw err;
  }
}

export async function usernameAvailable(username) {
  if (!USERNAME_RE.test(username)) return { valid: false, available: false };
  const row = await queryOne('SELECT 1 AS taken FROM users WHERE lower(username) = lower($1)', [username]);
  return { valid: true, available: !row };
}

/** GET /users/:id: public profile (no email). */
export async function getPublicProfile(id) {
  const u = await queryOne('SELECT * FROM users WHERE id = $1 AND username IS NOT NULL', [id]);
  if (!u) throw httpError(404, 'User not found');
  const stats = await queryOne(`${STATS_SQL} FROM users u WHERE u.id = $1`, [u.id]);
  return shape(u, { stats });
}
