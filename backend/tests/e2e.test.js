// End-to-end test of the whole game loop against a real PostgreSQL database.
// SAFETY: wipes data. Only runs when DB_NAME ends with "_test".
//   createdb campusquest_test && DB_HOST=localhost DB_NAME=campusquest_test npm test
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

Object.assign(process.env, { DEV_AUTH_BYPASS: 'true', DEV_IGNORE_HOURS: 'true', ADMIN_API_KEY: 'test-admin', IMAGE_MATCHER: 'mock',
  MATCHER_MOCK_SIMILARITY: '0.72', UPLOAD_DIR: '/tmp/cq-uploads', LOG_LEVEL: 'silent' });
if (!/_test$/.test(process.env.DB_NAME ?? '')) throw new Error('Refusing to run: DB_NAME must end with _test');

const { buildApp } = await import('../src/app.js');
const { pool, query } = await import('../src/db/db.js');
const { tick } = await import('../src/services/eventService.js');

let app;
const as = (name) => ({ authorization: `Bearer dev:${name}:${name}@test.dev` });
const admin = { 'x-admin-key': 'test-admin' };
const call = async (method, url, { user, body, headers } = {}) => {
  const res = await app.inject({ method, url, payload: body, headers: { ...(user ? as(user) : {}), ...headers } });
  return { status: res.statusCode, body: res.body ? JSON.parse(res.body) : null };
};

async function multipart(fields, file) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, String(v));
  if (file) fd.append(file.name, new Blob([file.buffer], { type: file.type }), 'x.png');
  const res = new Response(fd);
  return { payload: Buffer.from(await res.arrayBuffer()), headers: { 'content-type': res.headers.get('content-type') } };
}
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
const verify = async (user, portal, lat, lng) => {
  const m = await multipart({ latitude: lat, longitude: lng }, { name: 'photo', buffer: PNG, type: 'image/png' });
  const res = await app.inject({ method: 'POST', url: `/portals/${portal.id}/verify`, payload: m.payload, headers: { ...as(user), ...m.headers } });
  return { status: res.statusCode, body: JSON.parse(res.body) };
};

/** Solve one of today's riddles for `user` (looks the answer up in the DB). */
async function solveOne(user) {
  const today = (await call('GET', '/riddles/today', { user })).body;
  const open = today.riddles.find((r) => !r.solved);
  assert.ok(open, `${user} has an unsolved riddle`);
  assert.equal(open.options.length, 4);
  const { rows } = await query('SELECT p.name FROM riddles r JOIN portals p ON p.id = r.portal_id WHERE r.id = $1', [open.id]);
  assert.ok(open.options.includes(rows[0].name), 'correct answer is among the options');
  return call('POST', `/riddles/${open.id}/answer`, { user, body: { answer: rows[0].name } });
}

let portals, eventId;

before(async () => {
  execFileSync('node', ['scripts/migrate.js'], { stdio: 'ignore' });
  execFileSync('node', ['scripts/seed.js'], { stdio: 'ignore' });
  await query(`TRUNCATE game_events, xp_ledger, attacks, deploy_verifications, resonators, riddle_attempts, daily_riddles, event_portals, events, users RESTART IDENTITY CASCADE`);
  app = await buildApp();
  // A running event (now-1h .. now+1d) with all seeded portals.
  const ev = await query(`INSERT INTO events (name, status, starts_at, ends_at) VALUES ('test', 'active', NOW() - INTERVAL '1 hour', NOW() + INTERVAL '1 day') RETURNING id`);
  eventId = ev.rows[0].id;
  await query('INSERT INTO event_portals (event_id, portal_id) SELECT $1, id FROM portals', [eventId]);
  portals = (await query('SELECT id, name, latitude, longitude FROM portals ORDER BY id')).rows;
});
after(async () => { await app.close(); });

test('onboarding: faction is one-time, username/avatar rules', async () => {
  for (const [u, f] of [['r1', 'red'], ['r2', 'red'], ['r3', 'red'], ['b1', 'blue']]) {
    assert.equal((await call('GET', '/me', { user: u })).body.onboarding.needs_faction, true);
    assert.equal((await call('POST', '/me/faction', { user: u, body: { faction: f } })).status, 200);
  }
  assert.equal((await call('POST', '/me/faction', { user: 'r1', body: { faction: 'blue' } })).status, 409);
  assert.equal((await call('PATCH', '/me/profile', { user: 'r1', body: { avatar: 'blue1' } })).status, 400);
  assert.equal((await call('PATCH', '/me/profile', { user: 'r1', body: { username: 'ab' } })).status, 400);
  for (const u of ['r1', 'r2', 'r3', 'b1']) {
    const r = await call('PATCH', '/me/profile', { user: u, body: { username: `${u}_x`, bio: 'hi', avatar: `${u.startsWith('r') ? 'red' : 'blue'}3` } });
    assert.equal(r.status, 200, JSON.stringify(r.body));
  }
  assert.equal((await call('PATCH', '/me/profile', { user: 'r2', body: { username: 'R1_X' } })).status, 409);
  assert.deepEqual((await call('GET', '/usernames/r1_x/available', { user: 'r1' })).body, { valid: true, available: false });
  const me = (await call('GET', '/me', { user: 'r1' })).body;
  assert.equal(me.onboarding.complete, true);
  assert.equal(me.level, 1);
});

test('riddles: 2 per day, wrong answer rejected, correct grants a resonator + XP', async () => {
  const t = (await call('GET', '/riddles/today', { user: 'r1' })).body;
  assert.equal(t.riddles.length, 2);
  const wrong = await call('POST', `/riddles/${t.riddles[0].id}/answer`, { user: 'r1', body: { answer: 'definitely wrong' } });
  assert.equal(wrong.body.correct, false);
  const ok = await solveOne('r1');
  assert.equal(ok.body.correct, true);
  assert.equal(ok.body.available_resonators, 1);
  assert.equal(ok.body.xp.awarded, 100);
  const again = (await call('GET', '/riddles/today', { user: 'r1' })).body;
  assert.equal(again.riddles.filter((r) => r.solved).length, 1);
  assert.equal((await call('POST', '/riddles/999999/answer', { user: 'r1', body: { answer: 'x' } })).status, 404);
});

test('capture flow: too far fails, 3 players capture + lock, enemy cannot attack locked portal', async () => {
  const [A, B] = portals;
  const far = await verify('r1', A, A.latitude + 0.01, A.longitude);
  assert.equal(far.body.passed, false);
  assert.equal(far.body.location.ok, false);
  assert.equal((await call('POST', `/portals/${A.id}/deploy`, { user: 'r1', body: { verification_id: 1 } })).status, 403); // a failed verification is never usable

  await solveOne('r2'); await solveOne('r3');
  for (const u of ['r1', 'r2', 'r3']) {
    const v = await verify(u, A, A.latitude, A.longitude);
    assert.equal(v.body.passed, true, JSON.stringify(v.body));
    assert.equal(v.body.image.similarity, 72);
    const d = await call('POST', `/portals/${A.id}/deploy`, { user: u, body: { verification_id: v.body.verification_id } });
    assert.equal(d.status, 201, JSON.stringify(d.body));
    if (u === 'r3') { assert.equal(d.body.captured, true); assert.equal(d.body.xp.awarded, 150); }
    // single-use verification
    assert.equal((await call('POST', `/portals/${A.id}/deploy`, { user: u, body: { verification_id: v.body.verification_id } })).status, 409);
  }
  const detail = (await call('GET', `/portals/${A.id}`, { user: 'b1' })).body;
  assert.equal(detail.status, 'controlled'); assert.equal(detail.owner_faction, 'red'); assert.equal(detail.locked, true);
  assert.equal(detail.resonator_slots.filter((s) => s.filled).length, 3);
  const atk = await call('POST', `/portals/${A.id}/attack`, { user: 'b1', body: { latitude: A.latitude, longitude: A.longitude } });
  assert.equal(atk.status, 409);
  // enemy resonators cannot be stacked and own faction cannot attack own portal
  assert.equal((await call('POST', `/portals/${A.id}/attack`, { user: 'r1', body: { latitude: A.latitude, longitude: A.longitude } })).status, 409);
});

test('attack + replace on a partial portal; one deploy per portal per day', async () => {
  const B = portals[1];
  await solveOne('r1');
  const v = await verify('r1', B, B.latitude, B.longitude);
  assert.equal((await call('POST', `/portals/${B.id}/deploy`, { user: 'r1', body: { verification_id: v.body.verification_id } })).status, 201);

  // far-away attack rejected, nearby attack destroys it
  assert.equal((await call('POST', `/portals/${B.id}/attack`, { user: 'b1', body: { latitude: B.latitude + 0.01, longitude: B.longitude } })).status, 403);
  const hit = await call('POST', `/portals/${B.id}/attack`, { user: 'b1', body: { latitude: B.latitude, longitude: B.longitude } });
  assert.equal(hit.status, 200, JSON.stringify(hit.body));
  assert.equal(hit.body.portal.status, 'neutral');
  assert.equal((await call('POST', `/portals/${B.id}/attack`, { user: 'b1', body: { latitude: B.latitude, longitude: B.longitude } })).status, 409); // now neutral: nothing to attack

  // cooldown: r2 holds a second portal, b1 attacks again right away
  const C = portals[2];
  await solveOne('r2');
  const vc = await verify('r2', C, C.latitude, C.longitude);
  assert.equal((await call('POST', `/portals/${C.id}/deploy`, { user: 'r2', body: { verification_id: vc.body.verification_id } })).status, 201);
  assert.equal((await call('POST', `/portals/${C.id}/attack`, { user: 'b1', body: { latitude: C.latitude, longitude: C.longitude } })).status, 429);

  // blue replaces it
  await solveOne('b1');
  const vb = await verify('b1', B, B.latitude, B.longitude);
  const d = await call('POST', `/portals/${B.id}/deploy`, { user: 'b1', body: { verification_id: vb.body.verification_id } });
  assert.equal(d.status, 201);
  assert.equal(d.body.portal.owner_faction, 'blue');

  // r1 already deployed at B today (even though destroyed): no second deploy
  const t = (await call('GET', '/riddles/today', { user: 'r1' })).body;
  assert.equal(t.riddles.length, 2);
});

test('read endpoints: event, portals, leaderboard, activity, heatmap, resonators', async () => {
  const ev = (await call('GET', '/event/current', { user: 'r1' })).body;
  assert.equal(ev.event.status, 'active');
  assert.ok(ev.scores.red > ev.scores.blue);
  assert.equal((await call('GET', '/portals', { user: 'r1' })).body.length, portals.length);
  const lb = (await call('GET', '/leaderboard?scope=red', { user: 'r1' })).body;
  assert.equal(lb.entries[0].rank, 1); assert.ok(lb.me);
  assert.ok((await call('GET', '/activity', { user: 'r1' })).body.length > 0);
  assert.ok((await call('GET', '/heatmap', { user: 'r1' })).body.some((h) => h.intensity > 0));
  assert.equal((await call('GET', '/me/resonators', { user: 'r1' })).status, 200);
  assert.equal((await call('GET', '/portals', {})).status, 401);
});

test('admin + weekly finalisation awards the winner bonus', async () => {
  assert.equal((await call('GET', '/admin/portals', {})).status, 401);
  assert.equal((await call('GET', '/admin/portals', { headers: admin })).body.length, portals.length);
  const m = await multipart({ primary: 'true' }, { name: 'image', buffer: PNG, type: 'image/png' });
  const up = await app.inject({ method: 'POST', url: `/admin/portals/${portals[0].id}/images`, payload: m.payload, headers: { ...admin, ...m.headers } });
  assert.equal(up.statusCode, 201);
  const img = await app.inject({ method: 'GET', url: `/portals/${portals[0].id}/image` });
  assert.equal(img.statusCode, 200);

  const before = (await query(`SELECT xp FROM users WHERE username = 'r1_x'`)).rows[0].xp;
  const fin = await call('POST', `/admin/events/${eventId}/finalize`, { headers: admin });
  assert.equal(fin.body.winner_faction, 'red');
  const after_ = (await query(`SELECT xp FROM users WHERE username = 'r1_x'`)).rows[0].xp;
  assert.equal(after_ - before, 500);
  assert.equal((await call('POST', `/admin/events/${eventId}/finalize`, { headers: admin })).body.already_finalized, true);

  // After finishing, actions are refused and the scheduler creates the next event.
  assert.equal((await call('GET', '/riddles/today', { user: 'r2' })).status, 409);
  await tick();
  assert.equal((await query(`SELECT COUNT(*)::int AS n FROM events WHERE status = 'scheduled'`)).rows[0].n, 1);
});
