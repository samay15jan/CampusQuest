import { authenticate } from '../auth/middleware.js';
import { queryOne } from '../db/db.js';

const UPSERT_USER_SQL = `
  INSERT INTO users (firebase_uid, name, email, avatar_url, last_seen)
  VALUES ($1, COALESCE($2::text, split_part($3, '@', 1)), $3, $4, NOW())
  ON CONFLICT (firebase_uid) DO UPDATE
    SET name       = COALESCE($2::text, users.name),
        email      = EXCLUDED.email,
        avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url),
        last_seen  = NOW()
  RETURNING id, name, username, bio, avatar, email, team_id, avatar_url, created_at, last_seen
`;

const AVATARS = ['red1', 'red2', 'red3', 'red4', 'blue1', 'blue2', 'blue3', 'blue4'];
const DEFAULT_BIO = 'New to CampusQuest. Ready to capture some territory!';
const USERNAME_RE = /^[A-Za-z0-9_]{3,20}$/;
const BIO_MAX = 160;

const UPDATE_SQL = `
  UPDATE users
  SET username = COALESCE($2, username),
      bio      = COALESCE($3, bio),
      avatar   = COALESCE($4, avatar)
  WHERE firebase_uid = $1
  RETURNING id, name, username, bio, avatar, team_id
`;

const TEAM_SQL = `
  SELECT t.name AS team_name
  FROM users u
  LEFT JOIN teams t ON t.id = u.team_id
  WHERE u.firebase_uid = $1
`;

export default async function authRoutes(app) {
  app.get('/me', { preHandler: authenticate }, async (request, reply) => {
    const { uid, email, name, picture } = request.user;

    if (!email) {
      return reply.code(400).send({ error: 'Token does not contain an email' });
    }

    return queryOne(UPSERT_USER_SQL, [uid, name, email, picture]);
  });

  app.post('/me/team', { preHandler: authenticate }, async (request, reply) => {
    const { email } = request.user;
    const { team_id } = request.body ?? {};

    if (team_id !== 'Red' && team_id !== 'Blue') {
      return reply.code(400).send({
        error: 'team_id must be either Red or Blue'
      });
    }

    const user = await queryOne(
      `SELECT id FROM users WHERE email = $1`,
      [email]
    );

    if (!user) {
      return reply.code(404).send({
        error: 'User profile not found. Call GET /me first.'
      });
    }

    const team = await queryOne(
      `SELECT id FROM teams WHERE name = $1`,
      [team_id]
    );

    if (!team) {
      return reply.code(404).send({
        error: 'Team not found'
      });
    }

    await queryOne(
      `
      UPDATE users
      SET team_id = $1
      WHERE id = $2
    `,
      [team.id, user.id]
    );

    return reply.code(204).send();
  });

  app.patch('/me/profile', { preHandler: authenticate }, async (request, reply) => {
    const { uid } = request.user;
    const body = request.body ?? {};
    let { username, bio, avatar } = body;

    if (username === undefined && bio === undefined && avatar === undefined) {
      return reply.code(400).send({ error: 'Nothing to update' });
    }

    if (username !== undefined) {
      if (typeof username !== 'string' || !USERNAME_RE.test(username.trim())) {
        return reply.code(400).send({
          error: 'Username must be 3-20 characters: letters, numbers, underscore',
        });
      }
      username = username.trim();
    } else username = null;

    if (bio !== undefined) {
      if (typeof bio !== 'string') {
        return reply.code(400).send({ error: 'Invalid bio' });
      }
      bio = bio.trim();
      if (bio.length > BIO_MAX) {
        return reply.code(400).send({ error: `Bio must be ${BIO_MAX} characters or fewer` });
      }
      if (bio === '') bio = DEFAULT_BIO;
    } else bio = null;

    if (avatar !== undefined) {
      if (!AVATARS.includes(avatar)) {
        return reply.code(400).send({ error: `Avatar must be one of: ${AVATARS.join(', ')}` });
      }
      const row = await queryOne(TEAM_SQL, [uid]);
      const team = row?.team_name?.toLowerCase();
      if (team && !avatar.startsWith(team)) {
        return reply.code(400).send({ error: `Your team can only use ${team}1-${team}4` });
      }
    } else avatar = null;

    try {
      const updated = await queryOne(UPDATE_SQL, [uid, username, bio, avatar]);
      if (!updated) {
        return reply.code(404).send({ error: 'User profile not found. Call GET /me first.' });
      }
      return reply.code(204).send();
    } catch (err) {
      if (err.code === '23505' && err.constraint === 'uq_users_username_lower') {
        return reply.code(409).send({ error: 'Username already taken' });
      }
      throw err;
    }
  });
}