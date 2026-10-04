// GET /users/:id - public profile of any player.
import { authenticate } from '../auth/middleware.js';
import { queryOne } from '../db/db.js';

// Public fields only: no email, firebase_uid, or last_seen.
const PUBLIC_USER_SQL = `
  SELECT id, name, username, bio, avatar, avatar_url, team_id, created_at
  FROM users
  WHERE id = $1
`;

export default async function userRoutes(app) {
  app.get('/users/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params;

    // IDs are 32-bit integers; reject anything else before it reaches the database.
    if (!/^\d{1,9}$/.test(id)) {
      return reply.code(400).send({ error: 'Invalid user id' });
    }

    const user = await queryOne(PUBLIC_USER_SQL, [id]);
    if (!user) {
      return reply.code(404).send({ error: 'User not found' });
    }

    return user;
  });
}