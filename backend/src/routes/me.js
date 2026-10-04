// Account + onboarding: GET /me, POST /me/faction, PATCH /me/profile, username check, public profile.
import { authenticate } from '../auth/middleware.js';
import { getMe, chooseFaction, updateProfile, usernameAvailable, getPublicProfile } from '../services/profileService.js';
import { getMyResonators } from '../services/resonatorService.js';

const id = { type: 'object', required: ['id'], properties: { id: { type: 'integer', minimum: 1, maximum: 2147483647 } } };

export default async function meRoutes(app) {
  const auth = { preValidation: authenticate };

  app.get('/me', auth, async (request, reply) => {
    if (!request.user.email) return reply.code(400).send({ error: 'Token does not contain an email' });
    return getMe(request.user);
  });

  // One-time, permanent.
  app.post('/me/faction', { ...auth, schema: { body: { type: 'object', required: ['faction'], properties: { faction: { type: 'string', enum: ['red', 'blue'] } } } } },
    async (request) => chooseFaction(request.user.uid, request.body.faction));

  app.patch('/me/profile', { ...auth, schema: { body: { type: 'object', minProperties: 1, additionalProperties: false, properties: {
    username: { type: 'string', maxLength: 40 }, bio: { type: 'string', maxLength: 200 }, avatar: { type: 'string', maxLength: 10 } } } } },
    async (request) => updateProfile(request.user.uid, request.body));

  app.get('/me/resonators', auth, async (request) => getMyResonators(request.user.uid));

  app.get('/usernames/:username/available', { ...auth, schema: { params: { type: 'object', properties: { username: { type: 'string', maxLength: 40 } } } } },
    async (request) => usernameAvailable(request.params.username));

  app.get('/users/:id', { ...auth, schema: { params: id } }, async (request) => getPublicProfile(request.params.id));
}
