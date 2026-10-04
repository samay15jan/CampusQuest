// Admin API (header x-admin-key). Manages the master portal list, reference images, riddles and weekly events.
import { requireAdmin } from '../auth/middleware.js';
import { httpError } from '../lib/errors.js';
import { query, queryMany } from '../db/db.js';
import { createWeeklyEvent, finalizeEvent, tick } from '../services/eventService.js';
import * as admin from '../services/adminService.js';

const id = { type: 'object', required: ['id'], properties: { id: { type: 'integer', minimum: 1, maximum: 2147483647 } } };
const lat = { type: 'number', minimum: -90, maximum: 90 };
const lng = { type: 'number', minimum: -180, maximum: 180 };
const diff = { type: 'string', enum: ['easy', 'medium', 'hard'] };

export default async function adminRoutes(app) {
  const guard = { preValidation: requireAdmin };

  // ---- events
  app.get('/admin/events', guard, async () => queryMany('SELECT id, name, status, starts_at, ends_at, winner_faction, finalized_at FROM events ORDER BY starts_at DESC LIMIT 20'));

  // Creates the Mon-Fri event for a week with 10 random portals (or the ones you pass).
  app.post('/admin/events', { ...guard, schema: { body: { type: 'object', properties: {
    week_of: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' }, name: { type: 'string', maxLength: 255 },
    portal_ids: { type: 'array', items: { type: 'integer' }, minItems: 1, maxItems: 20 } } } } },
    async (request, reply) => {
      const b = request.body ?? {};
      const ev = await createWeeklyEvent({ weekOf: b.week_of, name: b.name, portalIds: b.portal_ids });
      await tick();     // activate immediately if its start time has already passed
      return reply.code(201).send(ev);
    });

  app.post('/admin/events/:id/finalize', { ...guard, schema: { params: id } }, async (request) => {
    const { rows } = await query('SELECT ends_at FROM events WHERE id = $1', [request.params.id]);
    if (!rows[0]) throw httpError(404, 'Event not found');
    return finalizeEvent(request.params.id);        // ends the event now, awards the winner bonus
  });

  // ---- portals
  app.get('/admin/portals', guard, async () => admin.listPortals());
  app.post('/admin/portals', { ...guard, schema: { body: { type: 'object', required: ['name', 'latitude', 'longitude'], properties: {
    name: { type: 'string', minLength: 1, maxLength: 255 }, description: { type: 'string' }, latitude: lat, longitude: lng, radius_m: { type: 'number', exclusiveMinimum: 0 } } } } },
    async (request, reply) => reply.code(201).send(await admin.createPortal(request.body)));
  app.patch('/admin/portals/:id', { ...guard, schema: { params: id, body: { type: 'object', minProperties: 1, properties: {
    name: { type: 'string', minLength: 1, maxLength: 255 }, description: { type: 'string' }, latitude: lat, longitude: lng,
    radius_m: { type: 'number', exclusiveMinimum: 0 }, active: { type: 'boolean' } } } } },
    async (request) => admin.updatePortal(request.params.id, request.body));

  // ---- reference images (multipart: image [, primary=true])
  app.get('/admin/portals/:id/images', { ...guard, schema: { params: id } }, async (request) => admin.listReferenceImages(request.params.id));
  app.post('/admin/portals/:id/images', { ...guard, schema: { params: id } }, async (request, reply) => {
    let file = null, primary = false;
    for await (const part of request.parts()) {
      if (part.type === 'file' && part.fieldname === 'image') file = { buffer: await part.toBuffer(), mime: part.mimetype };
      else if (part.type === 'file') await part.toBuffer();
      else if (part.fieldname === 'primary') primary = part.value === 'true';
    }
    if (!file?.buffer.length) throw httpError(400, 'image file is required');
    return reply.code(201).send(await admin.addReferenceImage(request.params.id, { ...file, primary }));
  });
  app.post('/admin/images/:id/primary', { ...guard, schema: { params: id } }, async (request) => admin.setPrimaryImage(request.params.id));
  app.delete('/admin/images/:id', { ...guard, schema: { params: id } }, async (request) => admin.deleteReferenceImage(request.params.id));

  // ---- riddles (answer is always the portal's name)
  app.get('/admin/riddles', { ...guard, schema: { querystring: { type: 'object', properties: { portal_id: { type: 'integer' } } } } },
    async (request) => admin.listRiddles(request.query.portal_id));
  app.post('/admin/riddles', { ...guard, schema: { body: { type: 'object', required: ['portal_id', 'question', 'difficulty'], properties: {
    portal_id: { type: 'integer', minimum: 1 }, question: { type: 'string', minLength: 5 }, difficulty: diff } } } },
    async (request, reply) => reply.code(201).send(await admin.createRiddle(request.body)));
  app.patch('/admin/riddles/:id', { ...guard, schema: { params: id, body: { type: 'object', minProperties: 1, properties: {
    question: { type: 'string', minLength: 5 }, difficulty: diff, active: { type: 'boolean' } } } } },
    async (request) => admin.updateRiddle(request.params.id, request.body));

  // ---- quick stats
  app.get('/admin/stats', guard, async () => {
    const [u] = await queryMany(`SELECT COUNT(*)::int AS players, COUNT(*) FILTER (WHERE faction = 'red')::int AS red, COUNT(*) FILTER (WHERE faction = 'blue')::int AS blue FROM users`);
    return u;
  });
}
