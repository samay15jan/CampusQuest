// Image-recognition adapter. The vision model is built separately by the team;
// the backend only needs "how similar is this photo to the portal's reference images?".
//   compare({ photo: Buffer, references: [{ id, buffer }] }) -> { similarity: 0..1, reference_id }
import { env } from '../config/env.js';
import { httpError } from '../lib/errors.js';

async function mockCompare({ references }) {
  return { similarity: env.MATCHER_MOCK_SIMILARITY, reference_id: references[0]?.id ?? null };
}

// HTTP contract (see README):
//   POST IMAGE_MATCHER_URL  { photo_base64, references: [{ id, image_base64 }] }
//   -> 200 { similarity: 0..1, reference_id?: number }
async function httpCompare({ photo, references }) {
  if (!env.IMAGE_MATCHER_URL) throw httpError(503, 'Image matcher is not configured');
  let res;
  try {
    res = await fetch(env.IMAGE_MATCHER_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        photo_base64: photo.toString('base64'),
        references: references.map((r) => ({ id: r.id, image_base64: r.buffer.toString('base64') })),
      }),
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw httpError(503, 'Image matcher is unavailable');
  }
  if (!res.ok) throw httpError(503, 'Image matcher failed');
  const body = await res.json();
  const similarity = Number(body.similarity);
  if (!Number.isFinite(similarity) || similarity < 0 || similarity > 1) throw httpError(503, 'Image matcher returned an invalid score');
  return { similarity, reference_id: body.reference_id ?? null };
}

export const matcherMode = env.IMAGE_MATCHER;
export const compareImages = env.IMAGE_MATCHER === 'http' ? httpCompare : mockCompare;
