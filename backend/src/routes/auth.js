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
  RETURNING id, name, email, team_id, avatar_url, created_at, last_seen
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
}