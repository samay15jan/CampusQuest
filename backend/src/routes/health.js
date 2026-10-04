import { query } from '../db/db.js';

export default async function healthRoutes(app) {
  app.get('/health', async (request, reply) => {
    try { await query('SELECT 1'); return { status: 'ok', database: 'up' }; }
    catch { return reply.code(503).send({ status: 'degraded', database: 'down' }); }
  });
}
