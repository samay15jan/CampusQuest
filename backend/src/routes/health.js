import { query } from '../db/db.js';
import { matcherStatus } from '../matcher/index.js';

export default async function healthRoutes(app) {
  app.get('/health', async (request, reply) => {
    const matcher = await matcherStatus();
    try { await query('SELECT 1'); return { status: 'ok', database: 'up', matcher }; }
    catch { return reply.code(503).send({ status: 'degraded', database: 'down', matcher }); }
  });
}
