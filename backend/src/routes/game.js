// GET /game and POST /teams/:id/join
import { authenticate } from '../auth/middleware.js';
import { queryMany, queryOne, withTransaction } from '../db/db.js';
import { httpError } from '../game/errors.js';
import { getCurrentGame, getPlayer, logEvent } from '../game/gameService.js';

const idParams = {
  type: 'object',
  required: ['id'],
  properties: { id: { type: 'integer', minimum: 1, maximum: 2147483647 } },
};

export default async function gameRoutes(app) {
  // Current game and its teams (with member counts).
  app.get('/game', { preValidation: authenticate }, async (request) => {
    const game = await getCurrentGame();
    if (!game) throw httpError(404, 'No active game');

    const teams = await queryMany(
      `SELECT t.id, t.name, t.color, t.score, COUNT(u.id)::int AS members
       FROM teams t LEFT JOIN users u ON u.team_id = t.id
       WHERE t.game_id = $1
       GROUP BY t.id
       ORDER BY t.id`,
      [game.id]
    );
    const me = await queryOne('SELECT team_id FROM users WHERE firebase_uid = $1', [request.user.uid]);

    return { ...game, teams, my_team_id: me?.team_id ?? null };
  });

  // Join a team (once; no switching).
  app.post('/teams/:id/join', { preValidation: authenticate, schema: { params: idParams } }, async (request) => {
    return withTransaction(async (client) => {
      const player = await getPlayer(request.user.uid, { client, lock: true });
      if (player.team_id) throw httpError(409, 'You are already on a team');

      const { rows } = await client.query('SELECT id, game_id, name, color FROM teams WHERE id = $1', [request.params.id]);
      const team = rows[0];
      if (!team) throw httpError(404, 'Team not found');

      const game = await getCurrentGame();
      if (!game) throw httpError(404, 'No active game');
      if (team.game_id !== game.id) throw httpError(403, 'This team does not belong to the current game');

      await client.query('UPDATE users SET team_id = $1 WHERE id = $2', [team.id, player.id]);
      await logEvent(client, {
        gameId: game.id, userId: player.id, teamId: team.id,
        type: 'PLAYER_JOINED', data: { user_id: player.id, team_id: team.id },
      });

      return { user_id: player.id, team: { id: team.id, name: team.name, color: team.color, game_id: team.game_id } };
    });
  });
}
