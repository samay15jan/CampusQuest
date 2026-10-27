// Adapter for the CampusQuest EfficientNet embedding service.
import { env } from '../config/env.js';
import { httpError } from '../lib/errors.js';

export const matcherMode = env.IMAGE_MATCHER;

export async function compareImages({ photo, mimeType = 'image/jpeg' }) {
  if (matcherMode !== 'http') throw httpError(503, 'Image recognition is not configured for live matching');
  if (!env.IMAGE_MATCHER_URL || !env.IMAGE_MATCHER_TOKEN) throw httpError(503, 'Image recognition service URL or token is not configured');
  let res;
  try {
    res = await fetch(env.IMAGE_MATCHER_URL, {
      method: 'POST',
      headers: { 'content-type': mimeType, authorization: `Bearer ${env.IMAGE_MATCHER_TOKEN}` },
      body: photo,
      signal: AbortSignal.timeout(env.IMAGE_MATCHER_TIMEOUT_MS),
    });
  } catch { throw httpError(503, 'Image recognition service is unavailable'); }
  if (!res.ok) throw httpError(503, 'Image recognition service failed');
  let body;
  try { body = await res.json(); } catch { throw httpError(503, 'Image recognition service returned invalid JSON'); }
  const similarity = Number(body.similarity);
  const margin = Number(body.margin);
  if (!Number.isFinite(similarity) || similarity < -1 || similarity > 1 || !Number.isFinite(margin) || margin < 0 || margin > 2 || typeof body.accepted !== 'boolean') {
    throw httpError(503, 'Image recognition service returned an invalid result');
  }
  if (body.accepted && typeof body.predictedTerritory !== 'string') throw httpError(503, 'Image recognition service returned an invalid territory');
  return {
    accepted: body.accepted,
    predictedTerritory: body.accepted ? body.predictedTerritory : null,
    similarity, margin, status: body.status ?? (body.accepted ? 'matched' : 'uncertain'),
  };
}
