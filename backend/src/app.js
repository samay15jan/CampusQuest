// Builds the Fastify instance (no listening here).
import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import { env } from './config/env.js';
import postgresPlugin from './plugins/postgres.js';
import healthRoutes from './routes/health.js';
import meRoutes from './routes/me.js';
import gameRoutes from './routes/game.js';
import adminRoutes from './routes/admin.js';

export async function buildApp() {
  const app = Fastify({ logger: { level: process.env.LOG_LEVEL || 'info' }, trustProxy: true });
  app.decorateRequest('user', null);

  app.setNotFoundHandler((request, reply) => reply.code(404).send({ error: 'Not found' }));

  app.setErrorHandler((err, request, reply) => {
    if (err.code === '23505') return reply.code(409).send({ error: 'Conflict: this record already exists' });
    if (err.code === '23514') return reply.code(409).send({ error: err.message });      // e.g. faction is locked
    if (err.retryAfter) reply.header('Retry-After', err.retryAfter);
    const status = err.statusCode && err.statusCode < 500 ? err.statusCode : 500;
    if (status >= 500) request.log.error(err);
    const { statusCode, retryAfter, name, ...extra } = err.name === 'GameError' ? err : {};
    reply.code(status).send({ error: status >= 500 ? 'Internal Server Error' : err.message, ...(extra.locked_until ? { locked_until: extra.locked_until } : {}) });
  });

  await app.register(cors, { origin: env.CORS_ORIGIN.length ? env.CORS_ORIGIN : true, methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'] });
  await app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024, files: 2, fields: 10 } });
  await app.register(postgresPlugin);

  await app.register(healthRoutes);
  await app.register(meRoutes);
  await app.register(gameRoutes);
  await app.register(adminRoutes);
  return app;
}
