// Fastify preValidation hooks: Firebase user auth + admin key auth.
import { timingSafeEqual } from 'node:crypto';
import { verifyIdToken, AuthNotConfiguredError } from './firebase.js';
import { env } from '../config/env.js';

/** Sets request.user = { uid, email, name, picture }. */
export async function authenticate(request, reply) {
  const match = /^Bearer\s+(\S+)$/i.exec(request.headers.authorization ?? '');
  if (!match) return reply.code(401).send({ error: 'Unauthorized' });
  const token = match[1];

  // Dev-only shortcut (never active in production): "Bearer dev:<uid>:<email>"
  if (env.DEV_AUTH_BYPASS && token.startsWith('dev:')) {
    const [, uid, email] = token.split(':');
    if (!uid || !email) return reply.code(401).send({ error: 'Unauthorized' });
    request.user = { uid: `dev-${uid}`, email, name: uid, picture: null };
    return;
  }

  try {
    const d = await verifyIdToken(token);
    request.user = { uid: d.uid, email: d.email ?? null, name: d.name ?? null, picture: d.picture ?? null };
  } catch (err) {
    if (err instanceof AuthNotConfiguredError) {
      request.log.error('Firebase Admin is not configured; cannot verify tokens');
      return reply.code(500).send({ error: 'Authentication is not configured' });
    }
    return reply.code(401).send({ error: 'Unauthorized' });
  }
}

/** Header: x-admin-key: <ADMIN_API_KEY>. */
export async function requireAdmin(request, reply) {
  if (!env.ADMIN_API_KEY) return reply.code(503).send({ error: 'Admin API is disabled (ADMIN_API_KEY not set)' });
  const given = Buffer.from(String(request.headers['x-admin-key'] ?? ''));
  const want = Buffer.from(env.ADMIN_API_KEY);
  if (given.length !== want.length || !timingSafeEqual(given, want)) {
    return reply.code(401).send({ error: 'Unauthorized' });
  }
}
