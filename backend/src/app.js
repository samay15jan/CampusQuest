// Builds and configures the Fastify instance (no listening here).
import Fastify from 'fastify';
import postgresPlugin from './plugins/postgres.js';
import healthRoutes from './routes/health.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import gameRoutes from './routes/game.js';
import territoryRoutes from './routes/territories.js';
import riddleRoutes from './routes/riddles.js';

export async function buildApp() {
  const app = Fastify({ logger: { level: process.env.LOG_LEVEL || 'info' } });

  // Filled in by the auth middleware on protected routes.
  app.decorateRequest('user', null);

  // Consistent JSON errors: { "error": "..." }
  app.setNotFoundHandler((request, reply) => {
    reply.code(404).send({ error: 'Not found' });
  });

  app.setErrorHandler((err, request, reply) => {
    // Unique-constraint violations that no service translated already.
    if (err.code === '23505') {
      const error =
        err.constraint === 'uq_users_email'
          ? 'User already exists with this email'
          : 'Conflict: this record already exists';
      return reply.code(409).send({ error });
    }
    if (err.retryAfter) reply.header('Retry-After', err.retryAfter);

    const status = err.statusCode && err.statusCode < 500 ? err.statusCode : 500;
    if (status >= 500) request.log.error(err);

    reply.code(status).send({ error: status >= 500 ? 'Internal Server Error' : err.message });
  });

  // Plugins
  await app.register(postgresPlugin);

  // Routes
  await app.register(healthRoutes);
  await app.register(authRoutes);
  await app.register(userRoutes);
  await app.register(gameRoutes);
  await app.register(territoryRoutes);
  await app.register(riddleRoutes);

  return app;
}
