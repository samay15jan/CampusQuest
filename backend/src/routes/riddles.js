// POST /riddles/:id/answer and GET /me/resonators
import { authenticate } from '../auth/middleware.js';
import { submitAnswer } from '../game/riddleService.js';
import { getMyResonators } from '../game/resonatorService.js';

const idParams = {
  type: 'object',
  required: ['id'],
  properties: { id: { type: 'integer', minimum: 1, maximum: 2147483647 } },
};

const answerBody = {
  type: 'object',
  required: ['answer'],
  properties: { answer: { type: 'string', minLength: 1, maxLength: 200 } },
};

export default async function riddleRoutes(app) {
  app.post('/riddles/:id/answer', { preValidation: authenticate, schema: { params: idParams, body: answerBody } }, async (request) => {
    return submitAnswer(request.user.uid, request.params.id, request.body.answer);
  });

  app.get('/me/resonators', { preValidation: authenticate }, async (request) => {
    return getMyResonators(request.user.uid);
  });
}
