// Gameplay: event status, portals, riddles, verify/deploy, attack, leaderboard, activity, heatmap.
import { createReadStream } from 'node:fs';
import { access } from 'node:fs/promises';
import path from 'node:path';
import { authenticate } from '../auth/middleware.js';
import { env } from '../config/env.js';
import { httpError } from '../lib/errors.js';
import { getEventStatus } from '../services/eventService.js';
import { listPortals, getPortalDetail, getPrimaryImage } from '../services/portalService.js';
import { getTodaysRiddles, submitAnswer } from '../services/riddleService.js';
import { verifyPortal, deployResonator } from '../services/resonatorService.js';
import { attackPortal } from '../services/attackService.js';
import { getLeaderboard, getActivity, getHeatmap } from '../services/socialService.js';

const id = { type: 'object', required: ['id'], properties: { id: { type: 'integer', minimum: 1, maximum: 2147483647 } } };
const lat = { type: 'number', minimum: -90, maximum: 90 };
const lng = { type: 'number', minimum: -180, maximum: 180 };

export default async function gameRoutes(app) {
  const auth = { preValidation: authenticate };

  // ---- event / map
  app.get('/event/current', auth, async () => getEventStatus());

  app.get('/portals', { ...auth, schema: { querystring: { type: 'object', properties: { owner: { type: 'string', enum: ['red', 'blue'] } } } } },
    async (request) => listPortals(request.user.uid, { faction: request.query.owner }));

  app.get('/portals/:id', { ...auth, schema: { params: id } }, async (request) => getPortalDetail(request.user.uid, request.params.id));

  // Public on purpose: <img src> cannot send a Bearer header. Reference photos are shown to every player anyway.
  app.get('/portals/:id/image', { schema: { params: id } }, async (request, reply) => {
    const img = await getPrimaryImage(request.params.id);
    if (!img) throw httpError(404, 'No image for this portal');
    const file = path.join(env.UPLOAD_DIR, img.file_path);
    await access(file).catch(() => { throw httpError(404, 'Image file missing'); });
    return reply.header('cache-control', 'public, max-age=300').type(img.mime).send(createReadStream(file));
  });

  // ---- riddles (popup on the map; not tied to a portal)
  app.get('/riddles/today', auth, async (request) => getTodaysRiddles(request.user.uid));

  app.post('/riddles/:id/answer', { ...auth, schema: { params: id, body: { type: 'object', required: ['answer'], properties: { answer: { type: 'string', minLength: 1, maxLength: 200 } } } } },
    async (request) => submitAnswer(request.user.uid, request.params.id, request.body.answer));

  // ---- capture flow: verify (photo + GPS) -> deploy
  app.post('/portals/:id/verify', { ...auth, schema: { params: id } }, async (request) => {
    if (!request.isMultipart()) throw httpError(415, 'Send multipart/form-data with fields: photo, latitude, longitude');
    const fields = {};
    let photo = null;
    for await (const part of request.parts()) {
      if (part.type === 'file') {
        if (part.fieldname !== 'photo') { await part.toBuffer(); continue; }
        if (!/^image\/(jpeg|png|webp)$/.test(part.mimetype)) throw httpError(415, 'Photo must be JPEG, PNG or WebP');
        photo = await part.toBuffer();
      } else fields[part.fieldname] = part.value;
    }
    const latitude = Number(fields.latitude), longitude = Number(fields.longitude);
    if (!photo?.length) throw httpError(400, 'photo is required (live camera capture)');
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      throw httpError(400, 'latitude and longitude are required');
    }
    return verifyPortal(request.user.uid, request.params.id, { photo, latitude, longitude });
  });

  app.post('/portals/:id/deploy', { ...auth, schema: { params: id, body: { type: 'object', required: ['verification_id'], properties: { verification_id: { type: 'integer', minimum: 1 } } } } },
    async (request, reply) => reply.code(201).send(await deployResonator(request.user.uid, request.params.id, request.body)));

  app.post('/portals/:id/attack', { ...auth, schema: { params: id, body: { type: 'object', required: ['latitude', 'longitude'], properties: {
    latitude: lat, longitude: lng, target_resonator_id: { type: 'integer', minimum: 1, maximum: 2147483647 } } } } },
    async (request) => attackPortal(request.user.uid, request.params.id, request.body));

  // ---- social
  app.get('/leaderboard', { ...auth, schema: { querystring: { type: 'object', properties: {
    scope: { type: 'string', enum: ['global', 'red', 'blue'], default: 'global' },
    period: { type: 'string', enum: ['event', 'all'], default: 'event' },
    limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 } } } } },
    async (request) => getLeaderboard(request.user.uid, request.query));

  app.get('/activity', { ...auth, schema: { querystring: { type: 'object', properties: { limit: { type: 'integer', minimum: 1, maximum: 50, default: 20 } } } } },
    async (request) => getActivity(request.query));

  app.get('/heatmap', { ...auth, schema: { querystring: { type: 'object', properties: { hours: { type: 'integer', minimum: 1, maximum: 120, default: 24 } } } } },
    async (request) => getHeatmap(request.query));
}
