// Unit tests for the ML matcher adapter + the "best nearby guess" rule (no database needed): `npm run test:matcher`
import test from 'node:test';
import assert from 'node:assert/strict';

Object.assign(process.env, { IMAGE_MATCHER: 'http', IMAGE_MATCHER_URL: 'https://ml.example.test', IMAGE_MATCHER_TOKEN: 'secret-token' });
const { compareImages, decideMatch, normalizeName } = await import('../src/matcher/index.js');

const photo = Buffer.from('fake-jpeg');
const stub = (impl) => { globalThis.fetch = impl; };
const reply = (body, status = 200) => async () => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

test('normalizeName ignores case, punctuation, spaces and a leading "The"; Gate 2A = Gate No. 2', () => {
  assert.equal(normalizeName("Rara's Food Truck"), normalizeName('Raras Foodtruck'));
  assert.equal(normalizeName('The Bank'), normalizeName('Bank'));
  assert.equal(normalizeName('Gate 2A'), normalizeName('Gate No. 2'));
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

test('returns predictions best-first (service ordering is not trusted), ignoring the service verdict', async () => {
  stub(reply({ predictedTerritory: null, accepted: false, predictions: [{ label: 'Library', similarity: 0.2 }, { label: 'Raras Foodtruck', similarity: 0.7 }, { label: 'x', similarity: 'nope' }] }));
  const r = await compareImages({ photo, portal: { name: 'Library' } });
  assert.deepEqual(r.predictions, [{ label: 'Raras Foodtruck', score: 0.7 }, { label: 'Library', score: 0.2 }]);
});

test('upstream errors become 503 and never leak the token', async () => {
  for (const impl of [reply({ error: { code: 'unauthorized' } }, 401), reply({ predictions: [] }), async () => { throw new Error('down'); }]) {
    stub(impl);
    await assert.rejects(compareImages({ photo, portal: { name: 'Library' } }), (e) => e.statusCode === 503 && !/secret-token/.test(e.message));
  }
});

// ---- decideMatch: highest-probability guess among the portals near the player
const P = (id, name) => ({ id, name });
const portals = [P(1, 'Library'), P(2, 'H Block Centre'), P(3, "Rara's Food Truck"), P(4, 'Gate No. 2')];
const target = portals[0];
const near = (...ids) => (p) => ids.includes(p.id);
const pred = (...labels) => labels.map((label, i) => ({ label, score: 0.9 - i * 0.1 }));

test('passes when the best guess is the portal, whatever its score (even 12%)', () => {
  const r = decideMatch([{ label: 'Library', score: 0.12 }, { label: 'H Block Centre', score: 0.1 }], target, portals, near(1));
  assert.equal(r.matches, true);
  assert.equal(r.portal.id, 1);
});

test('a lookalike that is NOT nearby is ignored, so the real portal wins', () => {
  const r = decideMatch(pred('H Block Centre', 'Library'), target, portals, near(1));       // H Block is far away
  assert.equal(r.matches, true);
});

test('a lookalike that IS nearby beats the target and is reported as the best guess', () => {
  const r = decideMatch(pred('H Block Centre', 'Library'), target, portals, near(1, 2));
  assert.equal(r.matches, false);
  assert.equal(r.portal.name, 'H Block Centre');
});

test('an unknown label such as _other is a miss, not skipped', () => {
  const r = decideMatch(pred('_other', 'Library'), target, portals, near(1));
  assert.equal(r.matches, false);
  assert.equal(r.portal, null);
});

test('label aliases resolve (Gate 2A -> Gate No. 2) and empty predictions fail', () => {
  assert.equal(decideMatch(pred('Gate 2A'), portals[3], portals, near(4)).matches, true);
  assert.equal(decideMatch([], target, portals, near(1)).matches, false);
});
