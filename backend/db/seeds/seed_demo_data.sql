-- CampusQuest demo-data seed
-- Adds presentation activity for existing users without creating fake Firebase accounts.
-- Intended for a DEMO/STAGING database. Review before running on production.
-- Idempotent for the demo records created by this script.
--
-- Run from the host:
--   docker exec -i campusquest-postgres psql -U campus -d campusquest \
--     -v ON_ERROR_STOP=1 < seed_demo_data.sql
--
-- The script reuses the currently active event if one exists; otherwise it creates
-- a demo event. If you want strict isolation, run this against a restored/staging DB.

BEGIN;

-- Use the current active event if available; otherwise create one.
CREATE TEMP TABLE _cq_demo_event (id INTEGER PRIMARY KEY) ON COMMIT DROP;

DO $$
DECLARE
  v_event_id INTEGER;
BEGIN
  SELECT id INTO v_event_id
  FROM events
  WHERE status = 'active'
  ORDER BY id DESC
  LIMIT 1;

  IF v_event_id IS NULL THEN
    INSERT INTO events (name, status, starts_at, ends_at)
    VALUES (
      'CampusQuest Demo Week',
      'active',
      date_trunc('week', now()) + interval '9 hours',
      date_trunc('week', now()) + interval '4 days 17 hours'
    )
    RETURNING id INTO v_event_id;
  END IF;

  INSERT INTO _cq_demo_event(id) VALUES (v_event_id);
END $$;

-- Make all known portals available in this event without overwriting live control state.
INSERT INTO event_portals (event_id, portal_id)
SELECT de.id, p.id
FROM _cq_demo_event de
CROSS JOIN portals p
ON CONFLICT (event_id, portal_id) DO NOTHING;

-- Add a few daily riddles for every onboarded user, using existing active riddles.
-- Slots are chosen deterministically and don't overwrite existing assignments.
WITH eligible AS (
  SELECT u.id AS user_id, de.id AS event_id,
         (now() AT TIME ZONE 'Asia/Kolkata')::date AS game_day
  FROM users u
  CROSS JOIN _cq_demo_event de
  WHERE u.username IS NOT NULL AND u.faction IS NOT NULL
),
ranked_riddles AS (
  SELECT r.id AS riddle_id,
         row_number() OVER (ORDER BY r.portal_id, r.id) AS rn
  FROM riddles r
  WHERE r.active = TRUE
),
assignments AS (
  SELECT e.user_id, e.event_id, e.game_day,
         ((e.user_id + rr.rn - 1) % 2 + 1)::smallint AS slot,
         rr.riddle_id,
         row_number() OVER (PARTITION BY e.user_id ORDER BY rr.rn) AS pick
  FROM eligible e
  CROSS JOIN ranked_riddles rr
)
INSERT INTO daily_riddles (user_id, event_id, day, slot, riddle_id)
SELECT user_id, event_id, game_day, slot, riddle_id
FROM assignments
WHERE pick <= 2
ON CONFLICT DO NOTHING;

-- Add plausible leaderboard XP for every onboarded player.
-- XP ledger is the score source; users.xp is deliberately not modified.
WITH eligible AS (
  SELECT u.id AS user_id, u.faction, de.id AS event_id
  FROM users u
  CROSS JOIN _cq_demo_event de
  WHERE u.username IS NOT NULL AND u.faction IS NOT NULL
),
rewards AS (
  SELECT user_id, faction, event_id, 25 AS amount, 'RIDDLE_SOLVED'::varchar AS reason
  FROM eligible
  UNION ALL
  SELECT user_id, faction, event_id, 10, 'RESONATOR_DEPLOYED'::varchar
  FROM eligible
)
INSERT INTO xp_ledger (user_id, event_id, faction, amount, reason, created_at)
SELECT r.user_id, r.event_id, r.faction, r.amount, r.reason,
       now() - ((r.user_id % 6) || ' hours')::interval
FROM rewards r
WHERE NOT EXISTS (
  SELECT 1
  FROM xp_ledger x
  WHERE x.user_id = r.user_id
    AND x.event_id = r.event_id
    AND x.faction = r.faction
    AND x.amount = r.amount
    AND x.reason = r.reason
);

-- Create a believable activity feed for every onboarded player.
-- event_data includes a seed marker so reruns won't duplicate these entries.
INSERT INTO game_events
  (event_id, user_id, faction, portal_id, event_type, event_data, created_at)
SELECT de.id, u.id, u.faction, p.id, 'PLAYER_JOINED',
       jsonb_build_object('source', 'demo_seed', 'message', u.username || ' joined the event'),
       now() - ((u.id % 12) || ' hours')::interval
FROM users u
CROSS JOIN _cq_demo_event de
JOIN portals p ON p.id = (
  SELECT p2.id FROM portals p2 ORDER BY p2.id LIMIT 1
)
WHERE u.username IS NOT NULL AND u.faction IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM game_events ge
    WHERE ge.event_id = de.id
      AND ge.user_id = u.id
      AND ge.event_type = 'PLAYER_JOINED'
      AND ge.event_data->>'source' = 'demo_seed'
  );

-- Generate resonator deployments only for users who have a faction.
-- Each portal is assigned to one faction for a clean, presentation-friendly map.
-- Requires up to three onboarded users in each faction for a fully populated demo.
WITH eligible_users AS (
  SELECT u.id AS user_id, u.faction,
         row_number() OVER (PARTITION BY u.faction ORDER BY u.id) AS faction_rank
  FROM users u
  WHERE u.username IS NOT NULL AND u.faction IS NOT NULL
),
portal_slots AS (
  SELECT p.id AS portal_id,
         row_number() OVER (ORDER BY p.id) AS portal_rank
  FROM portals p
),
candidate AS (
  SELECT de.id AS event_id, ps.portal_id, eu.user_id, eu.faction,
         (now() AT TIME ZONE 'Asia/Kolkata')::date - 1 AS deployed_day
  FROM _cq_demo_event de
  CROSS JOIN portal_slots ps
  JOIN eligible_users eu
    ON eu.faction = CASE WHEN ps.portal_rank % 2 = 0 THEN 'blue' ELSE 'red' END
   AND eu.faction_rank <= 3
)
INSERT INTO resonators
  (event_id, portal_id, user_id, faction, status, deployed_day, deployed_at)
SELECT c.event_id, c.portal_id, c.user_id, c.faction, 'active',
       c.deployed_day,
       now() - (((c.portal_id + c.user_id) % 18) || ' minutes')::interval
FROM candidate c
WHERE NOT EXISTS (
  SELECT 1 FROM resonators r
  WHERE r.event_id = c.event_id
    AND r.portal_id = c.portal_id
    AND r.user_id = c.user_id
)
AND NOT EXISTS (
  SELECT 1 FROM resonators r
  WHERE r.event_id = c.event_id
    AND r.portal_id = c.portal_id
    AND r.user_id = c.user_id
    AND r.deployed_day = c.deployed_day
)
ON CONFLICT DO NOTHING;

-- Align event portal state with the demo resonator counts.
-- This is demo data; run on a staging/demo database, not a live event.
WITH portal_counts AS (
  SELECT ep.event_id, ep.portal_id,
         count(r.id) FILTER (WHERE r.status = 'active') AS active_count,
         min(r.faction) FILTER (WHERE r.status = 'active') AS faction
  FROM event_portals ep
  LEFT JOIN resonators r
    ON r.event_id = ep.event_id AND r.portal_id = ep.portal_id
  JOIN _cq_demo_event de ON de.id = ep.event_id
  GROUP BY ep.event_id, ep.portal_id
)
UPDATE event_portals ep
SET status = CASE WHEN pc.active_count >= 3 THEN 'controlled'
                  WHEN pc.active_count > 0 THEN 'partial'
                  ELSE 'neutral' END,
    owner_faction = CASE WHEN pc.active_count > 0 THEN pc.faction ELSE NULL END,
    updated_at = now()
FROM portal_counts pc
WHERE ep.event_id = pc.event_id AND ep.portal_id = pc.portal_id;

-- Add deployment feed events for demo-seeded resonators.
INSERT INTO game_events
  (event_id, user_id, faction, portal_id, event_type, event_data, created_at)
SELECT r.event_id, r.user_id, r.faction, r.portal_id, 'RESONATOR_DEPLOYED',
       jsonb_build_object('source', 'demo_seed', 'resonator_id', r.id),
       r.deployed_at
FROM resonators r
JOIN _cq_demo_event de ON de.id = r.event_id
WHERE r.status = 'active'
  AND NOT EXISTS (
    SELECT 1 FROM game_events ge
    WHERE ge.event_id = r.event_id
      AND ge.user_id = r.user_id
      AND ge.portal_id = r.portal_id
      AND ge.event_type = 'RESONATOR_DEPLOYED'
      AND ge.event_data->>'source' = 'demo_seed'
      AND ge.event_data->>'resonator_id' = r.id::text
  );

COMMIT;

-- Quick verification queries:
-- SELECT status, count(*) FROM users GROUP BY status; -- replace with useful user fields if needed
-- SELECT faction, count(*) FROM users WHERE username IS NOT NULL GROUP BY faction;
-- SELECT reason, faction, sum(amount) FROM xp_ledger GROUP BY reason, faction ORDER BY reason, faction;
-- SELECT event_type, count(*) FROM game_events GROUP BY event_type ORDER BY event_type;
