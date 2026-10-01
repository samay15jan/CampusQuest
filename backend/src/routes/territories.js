// Territory endpoints: read state, fetch a riddle, deploy, attack, lock.
import { authenticate } from '../auth/middleware.js';
import { getPlayer, resolveGameId } from '../game/gameService.js';
import { listTerritories, getTerritoryDetail } from '../game/territoryService.js';
import { getNextRiddle } from '../game/riddleService.js';
import { deployResonator } from '../game/resonatorService.js';
import { attackTerritory } from '../game/attackService.js';
import { confirmLock } from '../game/lockService.js';

const idParams = {
  type: 'object',
  required: ['id'],
  properties: { id: { type: 'integer', minimum: 1, maximum: 2147483647 } },
};

const location = {
  latitude: { type: 'number', minimum: -90, maximum: 90 },
  longitude: { type: 'number', minimum: -180, maximum: 180 },
};

const locationBody = {
  type: 'object',
  required: ['latitude', 'longitude'],
  properties: location,
};

const attackBody = {
  type: 'object',
  required: ['latitude', 'longitude'],
  properties: { ...location, target_resonator_id: { type: 'integer', minimum: 1, maximum: 2147483647 } },
};

export default async function territoryRoutes(app) {
  const auth = { preValidation: authenticate };

  app.get('/territories', auth, async (request) => {
    const player = await getPlayer(request.user.uid);
    return listTerritories(await resolveGameId(player));
  });

  app.get('/territories/:id', { ...auth, schema: { params: idParams } }, async (request) => {
    const player = await getPlayer(request.user.uid);
    return getTerritoryDetail(await resolveGameId(player), request.params.id, player.id);
  });

  app.get('/territories/:id/riddle', { ...auth, schema: { params: idParams } }, async (request) => {
    return getNextRiddle(request.user.uid, request.params.id);
  });

  app.post('/territories/:id/deploy', { ...auth, schema: { params: idParams, body: locationBody } }, async (request, reply) => {
    const result = await deployResonator(request.user.uid, request.params.id, request.body);
    return reply.code(201).send(result);
  });

  app.post('/territories/:id/attack', { ...auth, schema: { params: idParams, body: attackBody } }, async (request) => {
    return attackTerritory(request.user.uid, request.params.id, request.body);
  });

  app.post('/territories/:id/lock', { ...auth, schema: { params: idParams, body: locationBody } }, async (request) => {
    return confirmLock(request.user.uid, request.params.id, request.body);
  });
}
