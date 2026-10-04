// Admin-only management: portals, reference images, riddles.
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { query, queryMany, queryOne, withTransaction } from '../db/db.js';
import { env } from '../config/env.js';
import { httpError } from '../lib/errors.js';
import { hashAnswer } from './riddleService.js';

const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

export const listPortals = () => queryMany(
  `SELECT p.*, (SELECT COUNT(*) FROM portal_reference_images i WHERE i.portal_id = p.id)::int AS reference_images,
          (SELECT COUNT(*) FROM riddles r WHERE r.portal_id = p.id AND r.active)::int AS riddles
   FROM portals p ORDER BY p.id`);

export async function createPortal({ name, description, latitude, longitude, radius_m = 20 }) {
  try {
    return await queryOne(`INSERT INTO portals (name, description, latitude, longitude, radius_m) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name, description ?? null, latitude, longitude, radius_m]);
  } catch (err) { if (err.code === '23505') throw httpError(409, 'A portal with this name exists'); throw err; }
}

export async function updatePortal(id, f) {
  const row = await queryOne(
    `UPDATE portals SET name = COALESCE($2, name), description = COALESCE($3, description), latitude = COALESCE($4, latitude),
       longitude = COALESCE($5, longitude), radius_m = COALESCE($6, radius_m), active = COALESCE($7, active)
     WHERE id = $1 RETURNING *`,
    [id, f.name ?? null, f.description ?? null, f.latitude ?? null, f.longitude ?? null, f.radius_m ?? null, f.active ?? null]);
  if (!row) throw httpError(404, 'Portal not found');
  return row;
}

export async function addReferenceImage(portalId, { buffer, mime, primary }) {
  const ext = EXT[mime];
  if (!ext) throw httpError(415, 'Image must be JPEG, PNG or WebP');
  if (!(await queryOne('SELECT 1 AS x FROM portals WHERE id = $1', [portalId]))) throw httpError(404, 'Portal not found');
  const rel = path.join('references', String(portalId), `${randomUUID()}.${ext}`);
  await mkdir(path.dirname(path.join(env.UPLOAD_DIR, rel)), { recursive: true });
  await writeFile(path.join(env.UPLOAD_DIR, rel), buffer);
  return withTransaction(async (c) => {
    const { rows: ex } = await c.query('SELECT 1 FROM portal_reference_images WHERE portal_id = $1 AND is_primary', [portalId]);
    const makePrimary = primary || ex.length === 0;
    if (makePrimary) await c.query('UPDATE portal_reference_images SET is_primary = FALSE WHERE portal_id = $1', [portalId]);
    const { rows } = await c.query(
      'INSERT INTO portal_reference_images (portal_id, file_path, mime, is_primary) VALUES ($1, $2, $3, $4) RETURNING id, portal_id, mime, is_primary, created_at',
      [portalId, rel, mime, makePrimary]);
    return rows[0];
  });
}

export const listReferenceImages = (portalId) =>
  queryMany('SELECT id, portal_id, mime, is_primary, created_at FROM portal_reference_images WHERE portal_id = $1 ORDER BY id', [portalId]);

export async function setPrimaryImage(imageId) {
  return withTransaction(async (c) => {
    const { rows } = await c.query('SELECT portal_id FROM portal_reference_images WHERE id = $1', [imageId]);
    if (!rows[0]) throw httpError(404, 'Image not found');
    await c.query('UPDATE portal_reference_images SET is_primary = FALSE WHERE portal_id = $1', [rows[0].portal_id]);
    await c.query('UPDATE portal_reference_images SET is_primary = TRUE WHERE id = $1', [imageId]);
    return { id: imageId, is_primary: true };
  });
}

export async function deleteReferenceImage(imageId) {
  const row = await queryOne('DELETE FROM portal_reference_images WHERE id = $1 RETURNING portal_id, file_path, is_primary', [imageId]);
  if (!row) throw httpError(404, 'Image not found');
  await unlink(path.join(env.UPLOAD_DIR, row.file_path)).catch(() => {});
  if (row.is_primary) await query(`UPDATE portal_reference_images SET is_primary = TRUE WHERE id = (SELECT id FROM portal_reference_images WHERE portal_id = $1 ORDER BY id LIMIT 1)`, [row.portal_id]);
  return { deleted: true };
}

export const listRiddles = (portalId) => queryMany(
  `SELECT r.id, r.portal_id, p.name AS portal_name, r.question, r.difficulty, r.active FROM riddles r JOIN portals p ON p.id = r.portal_id
   WHERE ($1::int IS NULL OR r.portal_id = $1) ORDER BY r.portal_id, r.id`, [portalId ?? null]);

/** The answer of a riddle is always its portal's name; only the hash is stored. */
export async function createRiddle({ portal_id, question, difficulty }) {
  const p = await queryOne('SELECT name FROM portals WHERE id = $1', [portal_id]);
  if (!p) throw httpError(404, 'Portal not found');
  return queryOne(`INSERT INTO riddles (portal_id, question, answer_hash, difficulty) VALUES ($1, $2, $3, $4) RETURNING id, portal_id, question, difficulty, active`,
    [portal_id, question, hashAnswer(p.name), difficulty]);
}

export async function updateRiddle(id, { question, difficulty, active }) {
  const row = await queryOne(`UPDATE riddles SET question = COALESCE($2, question), difficulty = COALESCE($3, difficulty), active = COALESCE($4, active)
     WHERE id = $1 RETURNING id, portal_id, question, difficulty, active`, [id, question ?? null, difficulty ?? null, active ?? null]);
  if (!row) throw httpError(404, 'Riddle not found');
  return row;
}
