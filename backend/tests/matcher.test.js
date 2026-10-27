// Unit tests for the ML matcher adapter (no database needed): `npm run test:matcher`
import test from 'node:test';
import assert from 'node:assert/strict';

Object.assign(process.env, { IMAGE_MATCHER: 'http', IMAGE_MATCHER_URL: 'https://ml.example.test', IMAGE_MATCHER_TOKEN: 'secret-token' });
const { compareImages, normalizeName } = await import('../src/matcher/index.js');

const photo = Buffer.from('fake-jpeg');
const stub = (impl) => { globalThis.fetch = impl; };
const reply = (body, status = 200) => async () => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

test('normalizeName ignores case, punctuation, spaces and a leading "The"', () => {
  assert.equal(normalizeName("Rara's Food Truck"), normalizeName('Raras Foodtruck'));
  assert.equal(normalizeName('The Bank'), normalizeName('Bank'));
  assert.notEqual(normalizeName('Library'), normalizeName('H Block Centre'));
});

test('sends raw bytes with bearer token to /v1/predict', async () => {
  let seen;
  stub(async (url, init) => { seen = { url: String(url), init }; return reply({ predictions: [{ label: 'Library', similarity: 0.6 }] })(); });
  await compareImages({ photo, contentType: 'image/jpeg', portal: { name: 'Library' } });
  assert.equal(seen.url, 'https://ml.example.test/v1/predict');
  assert.equal(seen.init.headers.authorization, 'Bearer secret-token');
  assert.equal(seen.init.headers['content-type'], 'image/jpeg');
  assert.equal(seen.init.body, photo);
});

test("the user's real response: Library at 62% is a match for Library (service said accepted:false)", async () => {
  stub(reply({ predictedTerritory: null, accepted: false, similarity: 0.6246, margin: 0.309, predictions: [
    { label: 'Library', similarity: 0.6246 }, { label: 'H Block Centre', similarity: 0.3154 }, { label: 'Raras Foodtruck', similarity: 0.3115 }] }));
  const r = await compareImages({ photo, portal: { name: 'Library' } });
  assert.equal(r.matches, true);
  assert.equal(r.label, 'Library');
  assert.ok(Math.abs(r.similarity - 0.6246) < 1e-9);
});

test('best guess is another place: no match, reports this portal\'s own score', async () => {
  stub(reply({ predictions: [{ label: 'Library', similarity: 0.62 }, { label: 'H Block Centre', similarity: 0.31 }] }));
  const r = await compareImages({ photo, portal: { name: 'H Block Centre' } });
  assert.equal(r.matches, false);
  assert.equal(r.label, 'Library');
  assert.equal(r.similarity, 0.31);
});

test('portal outside the top guesses scores 0; unsorted predictions are re-ranked; label aliases match', async () => {
  stub(reply({ predictions: [{ label: 'Library', similarity: 0.2 }, { label: 'Raras Foodtruck', similarity: 0.7 }] }));
  const hit = await compareImages({ photo, portal: { name: "Rara's Food Truck" } });
  assert.equal(hit.matches, true);
  assert.equal(hit.similarity, 0.7);
  const miss = await compareImages({ photo, portal: { name: 'Cafedia' } });
  assert.deepEqual([miss.matches, miss.similarity], [false, 0]);
});

test('upstream errors become 503 and never leak the token', async () => {
  for (const impl of [reply({ error: { code: 'unauthorized' } }, 401), reply({ predictions: [] }), async () => { throw new Error('down'); }]) {
    stub(impl);
    await assert.rejects(compareImages({ photo, portal: { name: 'Library' } }), (e) => e.statusCode === 503 && !/secret-token/.test(e.message));
  }
});
