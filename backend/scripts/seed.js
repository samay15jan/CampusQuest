// Runs db/seeds/*.sql (all idempotent). Safe to run repeatedly.
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from '../src/db/db.js';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'db', 'seeds');
try {
  for (const file of (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort()) {
    console.log(`> seeding ${file}`);
    await pool.query(await readFile(path.join(dir, file), 'utf8'));
  }
  console.log('✓ seed complete');
} catch (err) {
  console.error(`x seed failed: ${err.message}`);
  process.exitCode = 1;
} finally {
  await pool.end();
}
