import { describe, it, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import {
  reset, setupGame, mkUser, giveResonators, get, post, deployAll, skipCooldown, countEvents,
  q, pool, handshake, closeAll, NEAR_T1, NEAR_T2, FAR,
} from './helpers.js';

let g; // fixture ids for the current test
beforeEach(async () => {
  await reset();
  g = await setupGame('active');
});
after(closeAll);

/** Three red players each deploy one resonator on T1 (3/3). */
async function redHoldsT1(names = ['a', 'b', 'c']) {
  const users = [];
  for (const name of names) users.push(await mkUser(name, g.red));
  assert.deepEqual(await deployAll(users, g.t1), [201, 201, 201]);
  return users;
}
const territory = (id) => q('SELECT status, owner_team_id, locked FROM territories WHERE id = $1', [id]);
const resonatorCounts = (territoryId) =>
  q(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status = 'active')::int AS active,
            COUNT(*) FILTER (WHERE status = 'destroyed')::int AS destroyed
     FROM resonators WHERE territory_id = $1`, [territoryId]);

// ---------------------------------------------------------------------------
describe('1. Join a team', () => {
  it('joins a team and logs PLAYER_JOINED', async () => {
    const alice = await mkUser('alice');
    const res = await post(alice, `/teams/${g.red}/join`);
    assert.equal(res.status, 200);
    assert.equal(res.body.team.name, 'Red');
    assert.equal((await q('SELECT team_id FROM users WHERE id = $1', [alice.id])).team_id, g.red);
    assert.equal(await countEvents('PLAYER_JOINED'), 1);
  });

  it('joining twice -> 409 and the team does not change', async () => {
    const alice = await mkUser('alice');
    await post(alice, `/teams/${g.red}/join`);
    const again = await post(alice, `/teams/${g.blue}/join`);
    assert.equal(again.status, 409);
    assert.ok(again.body.error);
    assert.equal((await q('SELECT team_id FROM users WHERE id = $1', [alice.id])).team_id, g.red);
  });

  it('team from another game -> 403, unknown team -> 404', async () => {
    const old = await q(`INSERT INTO game_sessions (name, status) VALUES ('Old', 'finished') RETURNING id`);
    const oldTeam = await q(`INSERT INTO teams (game_id, name, color) VALUES ($1, 'Green', '#00FF00') RETURNING id`, [old.id]);
    const alice = await mkUser('alice');
    assert.equal((await post(alice, `/teams/${oldTeam.id}/join`)).status, 403);
    assert.equal((await post(alice, '/teams/99999/join')).status, 404);
  });

  it('is allowed while the game is only scheduled', async () => {
    await pool.query(`UPDATE game_sessions SET status = 'scheduled'`);
    const alice = await mkUser('alice');
    assert.equal((await post(alice, `/teams/${g.blue}/join`)).status, 200);
  });

  it('GET /game returns teams with member counts', async () => {
    await mkUser('a', g.red);
    await mkUser('b', g.red);
    const c = await mkUser('c', g.blue);
    const res = await get(c, '/game');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'active');
    assert.equal(res.body.my_team_id, g.blue);
    const members = Object.fromEntries(res.body.teams.map((t) => [t.name, t.members]));
    assert.deepEqual(members, { Red: 2, Blue: 1 });
  });

  it('every game route requires login (401)', async () => {
    for (const [method, url] of [
      ['GET', '/game'], ['POST', `/teams/${g.red}/join`], ['GET', '/territories'], ['GET', `/territories/${g.t1}`],
      ['GET', `/territories/${g.t1}/riddle`], ['POST', `/riddles/${g.riddles.book}/answer`],
      ['GET', '/me/resonators'], ['POST', `/territories/${g.t1}/deploy`], ['POST', `/territories/${g.t1}/attack`],
      ['POST', `/territories/${g.t1}/lock`],
    ]) {
      const res = method === 'GET' ? await get(null, url) : await post(null, url, {});
      assert.equal(res.status, 401, `${method} ${url}`);
      assert.deepEqual(res.body, { error: 'Unauthorized' });
    }
  });
});

// ---------------------------------------------------------------------------
describe('2. Territories', () => {
  it('shows derived state and never exposes answers', async () => {
    const alice = await mkUser('alice', g.red);
    await deployAll([alice], g.t1);

    const list = await get(alice, '/territories');
    assert.equal(list.status, 200);
    assert.equal(list.body.length, 3);
    const t1 = list.body.find((t) => t.id === g.t1);
    assert.equal(t1.status, 'partial');
    assert.equal(t1.owner_team.name, 'Red');
    assert.equal(t1.resonators.total_active, 1);
    assert.deepEqual(t1.resonators.by_team, { [g.red]: 1 });
    const t2 = list.body.find((t) => t.id === g.t2);
    assert.equal(t2.status, 'neutral');
    assert.equal(t2.owner_team, null);
    assert.equal(t2.resonators.total_active, 0);

    const text = JSON.stringify(list.body);
    assert.ok(!text.includes('answer_hash') && !text.includes('book') && !text.includes('answer'));

    const detail = await get(alice, `/territories/${g.t1}`);
    assert.ok(detail.body.my_resonator);
    assert.equal(detail.body.active_lock, null);
    const bob = await mkUser('bob', g.blue);
    assert.equal((await get(bob, `/territories/${g.t1}`)).body.my_resonator, null);
    assert.equal((await get(alice, '/territories/99999')).status, 404);
  });
});

// ---------------------------------------------------------------------------
describe('3. Riddles and resonator grants', () => {
  it('serves the easiest unsolved riddle, question only', async () => {
    const alice = await mkUser('alice', g.red);
    const first = await get(alice, `/territories/${g.t1}/riddle`);
    assert.equal(first.body.id, g.riddles.book);
    assert.deepEqual(Object.keys(first.body).sort(), ['difficulty', 'id', 'question', 'territory_id']);

    await post(alice, `/riddles/${g.riddles.book}/answer`, { answer: 'book' });
    assert.equal((await get(alice, `/territories/${g.t1}/riddle`)).body.id, g.riddles.egg);
    await post(alice, `/riddles/${g.riddles.egg}/answer`, { answer: 'egg' });
    assert.equal((await get(alice, `/territories/${g.t1}/riddle`)).status, 404);
  });

  it('a correct answer grants exactly one resonator', async () => {
    const alice = await mkUser('alice', g.red);
    const ok = await post(alice, `/riddles/${g.riddles.book}/answer`, { answer: '  BOOK ' }); // normalised
    assert.equal(ok.status, 200);
    assert.deepEqual(ok.body, { correct: true, resonator_granted: true, available_resonators: 1 });
    assert.equal((await get(alice, '/me/resonators')).body.available, 1);
    assert.equal(await countEvents('RIDDLE_SOLVED'), 1);
    assert.equal(await countEvents('RESONATOR_GRANTED'), 1);

    const again = await post(alice, `/riddles/${g.riddles.book}/answer`, { answer: 'book' });
    assert.equal(again.status, 409);
    assert.equal((await get(alice, '/me/resonators')).body.available, 1);
    assert.equal((await q('SELECT COUNT(*)::int AS n FROM riddle_attempts WHERE correct')).n, 1);
  });

  it('wrong answers are stored; the 6th wrong answer in a minute -> 429', async () => {
    const alice = await mkUser('alice', g.red);
    const url = `/riddles/${g.riddles.book}/answer`;
    for (let i = 1; i <= 5; i++) {
      const res = await post(alice, url, { answer: `wrong${i}` });
      assert.equal(res.status, 200);
      assert.equal(res.body.correct, false);
      assert.equal(res.body.wrong_attempts_left_this_minute, 5 - i);
    }
    assert.equal((await q('SELECT COUNT(*)::int AS n FROM riddle_attempts WHERE NOT correct')).n, 5);

    const sixth = await post(alice, url, { answer: 'wrong6' });
    assert.equal(sixth.status, 429);
    assert.ok(sixth.headers['retry-after']);
    // even the right answer is blocked while throttled, and nothing extra is stored
    assert.equal((await post(alice, url, { answer: 'book' })).status, 429);
    assert.equal((await q('SELECT COUNT(*)::int AS n FROM riddle_attempts')).n, 5);
    // the throttle is per riddle
    assert.equal((await post(alice, `/riddles/${g.riddles.egg}/answer`, { answer: 'egg' })).status, 200);
  });

  it('unknown riddle -> 404, no team -> 403, bad body -> 400', async () => {
    const alice = await mkUser('alice', g.red);
    const loner = await mkUser('loner');
    assert.equal((await post(alice, '/riddles/99999/answer', { answer: 'x' })).status, 404);
    assert.equal((await post(loner, `/riddles/${g.riddles.book}/answer`, { answer: 'book' })).status, 403);
    const bad = await post(alice, `/riddles/${g.riddles.book}/answer`, {});
    assert.equal(bad.status, 400);
    assert.ok(bad.body.error);
  });
});

// ---------------------------------------------------------------------------
describe('4. Deploy', () => {
  it('deploys inside the radius', async () => {
    const alice = await mkUser('alice', g.red);
    await giveResonators(alice.id, 1);
    const res = await post(alice, `/territories/${g.t1}/deploy`, NEAR_T1);
    assert.equal(res.status, 201);
    assert.equal(res.body.territory.status, 'partial');
    assert.equal(res.body.territory.active_resonators, 1);
    assert.equal(res.body.available_resonators, 0);
    const mine = await get(alice, '/me/resonators');
    assert.equal(mine.body.active.length, 1);
    assert.equal(mine.body.active[0].territory_name, 'T1');
    assert.equal(mine.body.deployed_total, 1);
  });

  it('too far -> 403 and nothing is spent', async () => {
    const alice = await mkUser('alice', g.red);
    await giveResonators(alice.id, 1);
    const res = await post(alice, `/territories/${g.t1}/deploy`, FAR);
    assert.equal(res.status, 403);
    assert.match(res.body.error, /Too far/);
    assert.equal((await resonatorCounts(g.t1)).total, 0);
    assert.equal((await get(alice, '/me/resonators')).body.available, 1);
  });

  it('no resonator available -> 409', async () => {
    const alice = await mkUser('alice', g.red);
    assert.equal((await post(alice, `/territories/${g.t1}/deploy`, NEAR_T1)).status, 409);
  });

  it('same player twice on a territory -> 409', async () => {
    const alice = await mkUser('alice', g.red);
    await giveResonators(alice.id, 2);
    assert.equal((await post(alice, `/territories/${g.t1}/deploy`, NEAR_T1)).status, 201);
    assert.equal((await post(alice, `/territories/${g.t1}/deploy`, NEAR_T1)).status, 409);
    assert.equal((await resonatorCounts(g.t1)).active, 1);
  });

  it('enemy-held territory -> 409', async () => {
    const alice = await mkUser('alice', g.red);
    const bob = await mkUser('bob', g.blue);
    await deployAll([alice], g.t1);
    await giveResonators(bob.id, 1);
    assert.equal((await post(bob, `/territories/${g.t1}/deploy`, NEAR_T1)).status, 409);
  });

  it('a 4th resonator -> 409', async () => {
    await redHoldsT1();
    const d = await mkUser('d', g.red);
    await giveResonators(d.id, 1);
    assert.equal((await post(d, `/territories/${g.t1}/deploy`, NEAR_T1)).status, 409);
    assert.equal((await resonatorCounts(g.t1)).active, 3);
  });

  it('no team -> 403; bad body -> 400; 401 comes before validation', async () => {
    const loner = await mkUser('loner');
    assert.equal((await post(loner, `/territories/${g.t1}/deploy`, NEAR_T1)).status, 403);
    const alice = await mkUser('alice', g.red);
    assert.equal((await post(alice, `/territories/${g.t1}/deploy`, {})).status, 400);
    assert.equal((await post(alice, `/territories/${g.t1}/deploy`, { latitude: 200, longitude: 0 })).status, 400);
    assert.equal((await post(null, `/territories/${g.t1}/deploy`, {})).status, 401);
    assert.equal((await post(alice, '/territories/99999/deploy', NEAR_T1)).status, 404);
  });
});

// ---------------------------------------------------------------------------
describe('5. Three players capture a territory', () => {
  it('3/3 -> controlled, with the right events', async () => {
    await redHoldsT1();
    const t = await territory(g.t1);
    assert.equal(t.status, 'controlled');
    assert.equal(t.owner_team_id, g.red);
    assert.equal(t.locked, false);
    assert.equal(await countEvents('RESONATOR_DEPLOYED'), 3);
    assert.equal(await countEvents('TERRITORY_PARTIALLY_CAPTURED'), 1);
    assert.equal(await countEvents('TERRITORY_CAPTURED'), 1);
    assert.equal(await countEvents('TERRITORY_RECLAIMED'), 0);
    const ev = await q(`SELECT event_data FROM game_events WHERE event_type = 'RESONATOR_DEPLOYED' ORDER BY id LIMIT 1`);
    assert.ok(ev.event_data.resonator_id);
  });
});

// ---------------------------------------------------------------------------
describe('6. Attack', () => {
  let zed; // blue attacker standing at T1
  beforeEach(async () => {
    await redHoldsT1();
    zed = await mkUser('zed', g.blue);
  });
  const attack = (user, body = NEAR_T1, id = g.t1) => post(user, `/territories/${id}/attack`, body);

  it('destroys one resonator and keeps the row', async () => {
    const first = await q('SELECT id FROM resonators ORDER BY deployed_at, id LIMIT 1');
    const res = await attack(zed);
    assert.equal(res.status, 200);
    assert.equal(res.body.destroyed_resonator.id, first.id); // oldest by default
    assert.equal(res.body.territory.status, 'partial');
    assert.equal(res.body.territory.active_resonators, 2);

    assert.deepEqual(await resonatorCounts(g.t1), { total: 3, active: 2, destroyed: 1 });
    const row = await q('SELECT status, destroyed_at FROM resonators WHERE id = $1', [first.id]);
    assert.equal(row.status, 'destroyed');
    assert.ok(row.destroyed_at);
    const att = await q('SELECT status, resolved_at, target_resonator_id FROM attacks');
    assert.equal(att.status, 'successful');
    assert.ok(att.resolved_at);
    assert.equal(att.target_resonator_id, first.id);
    assert.equal(await countEvents('TERRITORY_ATTACKED'), 1);
    assert.equal(await countEvents('RESONATOR_DESTROYED'), 1);
  });

  it('cooldown -> 429', async () => {
    assert.equal((await attack(zed)).status, 200);
    const again = await attack(zed);
    assert.equal(again.status, 429);
    assert.ok(again.headers['retry-after']);
    assert.deepEqual(await resonatorCounts(g.t1), { total: 3, active: 2, destroyed: 1 });
  });

  it('3 -> 2 -> 1 -> 0 ends neutral with TERRITORY_LOST', async () => {
    const seen = [];
    for (let i = 0; i < 3; i++) {
      if (i > 0) await skipCooldown();
      const res = await attack(zed);
      assert.equal(res.status, 200);
      seen.push(res.body.territory.active_resonators);
    }
    assert.deepEqual(seen, [2, 1, 0]);
    const t = await territory(g.t1);
    assert.equal(t.status, 'neutral');
    assert.equal(t.owner_team_id, null);
    assert.deepEqual(await resonatorCounts(g.t1), { total: 3, active: 0, destroyed: 3 });
    assert.equal(await countEvents('TERRITORY_LOST'), 1);
    assert.equal(await countEvents('TERRITORY_ATTACKED'), 3);
    assert.equal(await countEvents('RESONATOR_DESTROYED'), 3);
  });

  it('then the other team can reclaim it (TERRITORY_RECLAIMED)', async () => {
    for (let i = 0; i < 3; i++) { if (i > 0) await skipCooldown(); await attack(zed); }
    const y = await mkUser('y', g.blue);
    const x = await mkUser('x', g.blue);
    assert.deepEqual(await deployAll([zed, y, x], g.t1), [201, 201, 201]);
    const t = await territory(g.t1);
    assert.equal(t.status, 'controlled');
    assert.equal(t.owner_team_id, g.blue);
    assert.equal(await countEvents('TERRITORY_CAPTURED'), 1); // red's original capture
    assert.equal(await countEvents('TERRITORY_RECLAIMED'), 1); // blue taking it back
  });

  it('can target a specific resonator; a foreign target -> 404', async () => {
    const c = await q(`SELECT id FROM resonators WHERE user_id = (SELECT id FROM users WHERE name = 'c')`);
    assert.equal((await attack(zed, { ...NEAR_T1, target_resonator_id: 999999 })).status, 404);
    const res = await attack(zed, { ...NEAR_T1, target_resonator_id: c.id });
    assert.equal(res.status, 200);
    assert.equal(res.body.destroyed_resonator.id, c.id);
  });

  it('own team -> 403, neutral territory -> 409, too far -> 403', async () => {
    const e = await mkUser('e', g.red);
    assert.equal((await attack(e)).status, 403);
    assert.equal((await attack(zed, NEAR_T2, g.t2)).status, 409);
    assert.equal((await attack(zed, FAR)).status, 403);
    assert.deepEqual(await resonatorCounts(g.t1), { total: 3, active: 3, destroyed: 0 });
  });
});

// ---------------------------------------------------------------------------
describe('7. Lock', () => {
  const lock = (user, id = g.t1) => post(user, `/territories/${id}/lock`, NEAR_T1);

  it('the 3rd confirmation creates the lock', async () => {
    const [a, b, c] = await redHoldsT1();
    const d = await mkUser('d', g.red); // red, but owns no resonator here

    assert.deepEqual((await lock(a)).body, { locked: false, confirmed: 1, needed: 3, expires_in_seconds: 60 });
    assert.equal((await lock(b)).body.confirmed, 2);
    assert.equal((await lock(d)).status, 403); // not an owner
    assert.equal((await territory(g.t1)).locked, false);

    const done = await lock(c);
    assert.equal(done.status, 200);
    assert.equal(done.body.locked, true);
    assert.deepEqual([...done.body.lock.players].sort(), [a.id, b.id, c.id].sort());

    const row = await q('SELECT locked_by_user_id, unlocked_at FROM territory_locks');
    assert.equal(row.locked_by_user_id, c.id); // the 3rd confirmer
    assert.equal(row.unlocked_at, null);
    assert.equal((await territory(g.t1)).locked, true);
    assert.equal(await countEvents('TERRITORY_LOCKED'), 1);

    assert.equal((await lock(a)).status, 409); // already locked
    const detail = await get(a, `/territories/${g.t1}`);
    assert.equal(detail.body.active_lock.players.length, 3);
  });

  it('the same player confirming twice counts once', async () => {
    const [a] = await redHoldsT1();
    assert.equal((await lock(a)).body.confirmed, 1);
    assert.equal((await lock(a)).body.confirmed, 1);
  });

  it('confirmations expire after the window', async () => {
    const [a, b, c] = await redHoldsT1();
    const t0 = Date.now();
    assert.equal((await lock(a)).body.confirmed, 1);
    handshake.clock.now = () => t0 + 61_000; // a's confirmation is now stale
    assert.equal((await lock(b)).body.confirmed, 1);
    const third = await lock(c);
    assert.equal(third.body.locked, false);
    assert.equal(third.body.confirmed, 2);
    assert.equal((await q('SELECT COUNT(*)::int AS n FROM territory_locks')).n, 0);
  });

  it('needs 3/3 of your own team: 2 resonators -> 409, enemy-held -> 403', async () => {
    const a = await mkUser('a', g.red);
    const b = await mkUser('b', g.red);
    await deployAll([a, b], g.t1);
    assert.equal((await lock(a)).status, 409);
    const zed = await mkUser('zed', g.blue);
    assert.equal((await lock(zed)).status, 403);
    assert.equal((await post(a, `/territories/${g.t2}/lock`, NEAR_T2)).status, 409); // neutral territory
  });

  it('too far -> 403', async () => {
    const [a] = await redHoldsT1();
    assert.equal((await post(a, `/territories/${g.t1}/lock`, FAR)).status, 403);
  });

  it('an attack on a locked territory releases the lock', async () => {
    const [a, b, c] = await redHoldsT1();
    await lock(a); await lock(b); await lock(c);
    assert.equal((await territory(g.t1)).locked, true);

    const zed = await mkUser('zed', g.blue);
    const res = await post(zed, `/territories/${g.t1}/attack`, NEAR_T1);
    assert.equal(res.status, 200);
    assert.equal(res.body.territory.locked, false);
    assert.equal(res.body.territory.status, 'partial');

    const row = await q('SELECT unlocked_at FROM territory_locks');
    assert.ok(row.unlocked_at);
    assert.equal((await territory(g.t1)).locked, false);
    const ev = await q(`SELECT event_data FROM game_events WHERE event_type = 'TERRITORY_ATTACKED'`);
    assert.equal(ev.event_data.lock_released, true);
  });
});

// ---------------------------------------------------------------------------
describe('8. Concurrency', () => {
  it('the same player cannot spend one resonator twice', async () => {
    const alice = await mkUser('alice', g.red);
    await giveResonators(alice.id, 1);
    const results = await Promise.all([
      post(alice, `/territories/${g.t1}/deploy`, NEAR_T1),
      post(alice, `/territories/${g.t2}/deploy`, NEAR_T2),
    ]);
    assert.deepEqual(results.map((r) => r.status).sort(), [201, 409]);
    assert.equal((await q('SELECT COUNT(*)::int AS n FROM resonators WHERE user_id = $1', [alice.id])).n, 1);
    assert.equal((await get(alice, '/me/resonators')).body.available, 0);
  });

  it('the same riddle answered twice at once grants one resonator', async () => {
    const alice = await mkUser('alice', g.red);
    const url = `/riddles/${g.riddles.book}/answer`;
    const results = await Promise.all([post(alice, url, { answer: 'book' }), post(alice, url, { answer: 'book' })]);
    assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
    assert.equal((await q('SELECT COUNT(*)::int AS n FROM riddle_attempts WHERE correct')).n, 1);
    assert.equal((await get(alice, '/me/resonators')).body.available, 1);
  });

  it('four players racing for 3 slots: exactly 3 win', async () => {
    const users = [];
    for (const name of ['a', 'b', 'c', 'd']) {
      const u = await mkUser(name, g.red);
      await giveResonators(u.id, 1);
      users.push(u);
    }
    const results = await Promise.all(users.map((u) => post(u, `/territories/${g.t1}/deploy`, NEAR_T1)));
    assert.deepEqual(results.map((r) => r.status).sort(), [201, 201, 201, 409]);
    assert.equal((await resonatorCounts(g.t1)).active, 3);
    assert.equal((await territory(g.t1)).status, 'controlled');
  });
});

// ---------------------------------------------------------------------------
describe('9. Game not active', () => {
  for (const status of ['paused', 'scheduled', 'finished']) {
    it(`blocks deploy, attack, lock and answers while ${status}`, async () => {
      const [a] = await redHoldsT1();
      const zed = await mkUser('zed', g.blue);
      await giveResonators(zed.id, 1);
      await pool.query('UPDATE game_sessions SET status = $1', [status]);

      const results = await Promise.all([
        post(zed, `/territories/${g.t2}/deploy`, NEAR_T2),
        post(zed, `/territories/${g.t1}/attack`, NEAR_T1),
        post(a, `/territories/${g.t1}/lock`, NEAR_T1),
        post(zed, `/riddles/${g.riddles.future}/answer`, { answer: 'future' }),
      ]);
      for (const res of results) {
        assert.equal(res.status, 409);
        assert.equal(res.body.error, 'Game is not active');
      }
      assert.deepEqual(await resonatorCounts(g.t1), { total: 3, active: 3, destroyed: 0 });
      assert.equal((await resonatorCounts(g.t2)).total, 0);
      assert.equal((await q('SELECT COUNT(*)::int AS n FROM attacks')).n, 0);
    });
  }
});
