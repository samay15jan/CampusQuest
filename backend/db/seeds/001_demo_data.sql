-- CampusQuest development seed
-- Idempotent: running it again adds nothing.
-- No users, resonators, attacks, or other gameplay state is created.
-- Run AFTER migrations.
--
-- Riddle answers are the exact territory names.
-- answer_hash = SHA-256 (hex) of the trimmed, lower-cased answer.
-- The game engine must normalise and hash submitted answers the same way.
--
-- All territories use a common 30 metre capture radius.

BEGIN;

-- ============================================================
-- Game
-- ============================================================

INSERT INTO game_sessions (name, status)
SELECT 'CampusQuest', 'scheduled'
WHERE NOT EXISTS (
    SELECT 1
    FROM game_sessions
    WHERE name = 'CampusQuest'
);


-- ============================================================
-- Teams
-- ============================================================

INSERT INTO teams (game_id, name, color)
SELECT g.id, t.name, t.color
FROM game_sessions g
CROSS JOIN (
    VALUES
        ('Red',  '#EF4444'),
        ('Blue', '#2563EB')
) AS t(name, color)
WHERE g.name = 'CampusQuest'
ON CONFLICT (game_id, name) DO NOTHING;


-- ============================================================
-- Territories
-- ============================================================
-- All territories use radius = 30 metres.

INSERT INTO territories (
    game_id,
    name,
    description,
    latitude,
    longitude,
    radius
)
SELECT
    g.id,
    t.name,
    t.description,
    t.latitude,
    t.longitude,
    30
FROM game_sessions g
CROSS JOIN (
    VALUES
        (
            'H Block Centre',
            'The central spot of H Block, known for campus events, gatherings and memorable moments.',
            28.546582,
            77.334419
        ),
        (
            'Helipad',
            'An open area located between E2 Block and the Library, known by a name that points to the sky.',
            28.544243,
            77.334365
        ),
        (
            'Palm Court',
            'A campus court recognizable by the tall palm trees surrounding it.',
            28.543837,
            77.333223
        ),
        (
            'Sports Complex Room',
            'The room inside the Sports Complex where sports equipment is stored.',
            28.543981,
            77.331631
        ),
        (
            'N Block Coffee',
            'The coffee spot in N Block, the unusual white building that stands apart from the predominantly red campus buildings.',
            28.547175,
            77.333267
        ),
        (
            'Library',
            'The modern Library building whose appearance can make it look more like a mall than a traditional library.',
            28.543964,
            77.334650
        ),
        (
            'Gate No. 2',
            'The campus gate closest to the route toward Balli, a place many students call home.',
            28.541924,
            77.333188
        ),
        (
            'I Block Mess',
            'The mess in I Block associated with the Chinese samosa, a crispy snack filled with noodles.',
            28.543010,
            77.333489
        ),
        (
            'Megabyte',
            'A major campus food destination where students gather for meals and snacks.',
            28.544999,
            77.334564
        ),
        (
            'Rara''s Food Truck',
            'A popular campus food truck known especially for its fries.',
            28.545003,
            77.334977
        ),
        (
            'Arcadia Pickleball Court',
            'The pickleball court hidden within Arcadia, easy to overlook unless you explore the area carefully.',
            28.543347,
            77.332344
        ),
        (
            'Cafedia',
            'A campus food destination especially known for its gravy momos.',
            28.543347,
            77.332344
        ),
        (
            'J2 Block Entrance',
            'The entrance area of J2 Block where debates and many other campus events take place.',
            28.543260,
            77.332735
        ),
        (
            'Hidden Fruit Shop',
            'A small, easy-to-miss campus fruit shop that rewards careful exploration.',
            28.546266,
            77.334563
        ),
        (
            'The Bank',
            'The campus bank where students can carry out everyday banking transactions.',
            28.545154,
            77.332206
        )
) AS t(name, description, latitude, longitude)
WHERE g.name = 'CampusQuest'
  AND NOT EXISTS (
      SELECT 1
      FROM territories x
      WHERE x.game_id = g.id
        AND x.name = t.name
  );


-- ============================================================
-- Riddles
-- ============================================================
-- Three riddles per territory.
--
-- The answer to each riddle is the exact territory name.
-- Answers are hashed and are therefore not stored as plaintext.
--
-- The game engine should:
--   1. trim submitted answer
--   2. convert it to lowercase
--   3. UTF-8 encode it
--   4. SHA-256 hash it
--   5. compare against answer_hash


INSERT INTO riddles (
    territory_id,
    question,
    answer_hash,
    difficulty
)
SELECT
    tr.id,
    r.question,
    encode(
        sha256(
            convert_to(
                lower(btrim(r.answer)),
                'UTF8'
            )
        ),
        'hex'
    ),
    r.difficulty
FROM (
    VALUES

    -- --------------------------------------------------------
    -- H Block Centre
    -- --------------------------------------------------------

    (
        'H Block Centre',
        'Where campus moments become memories, and the crowd becomes the audience.',
        'H Block Centre',
        'easy'
    ),
    (
        'H Block Centre',
        'Events come and go, but this place keeps finding itself in the spotlight.',
        'H Block Centre',
        'medium'
    ),
    (
        'H Block Centre',
        'When something exciting happens on campus, this is where the attention often gathers.',
        'H Block Centre',
        'medium'
    ),


    -- --------------------------------------------------------
    -- Helipad
    -- --------------------------------------------------------

    (
        'Helipad',
        'I was built for something that rarely visits, yet my name still belongs to the sky.',
        'Helipad',
        'easy'
    ),
    (
        'Helipad',
        'No wings are needed to reach me, but aviation gives me my name.',
        'Helipad',
        'medium'
    ),
    (
        'Helipad',
        'I don''t see many landings, but I''ve been waiting for them all along.',
        'Helipad',
        'medium'
    ),


    -- --------------------------------------------------------
    -- Palm Court
    -- --------------------------------------------------------

    (
        'Palm Court',
        'My guardians are tall, green and impossible to miss.',
        'Palm Court',
        'easy'
    ),
    (
        'Palm Court',
        'Look for a place where nature stands taller than the people passing through.',
        'Palm Court',
        'medium'
    ),
    (
        'Palm Court',
        'I have no crown, yet I am surrounded by palms.',
        'Palm Court',
        'medium'
    ),


    -- --------------------------------------------------------
    -- Sports Complex Room
    -- --------------------------------------------------------

    (
        'Sports Complex Room',
        'Champions need their tools before they need the field.',
        'Sports Complex Room',
        'easy'
    ),
    (
        'Sports Complex Room',
        'The game happens elsewhere, but everything needed to play waits with me.',
        'Sports Complex Room',
        'medium'
    ),
    (
        'Sports Complex Room',
        'I don''t score points, but without me, the players might not either.',
        'Sports Complex Room',
        'medium'
    ),


    -- --------------------------------------------------------
    -- N Block Coffee
    -- --------------------------------------------------------

    (
        'N Block Coffee',
        'Among the red buildings stands one that chose to be different. Find it, then follow the aroma of coffee.',
        'N Block Coffee',
        'medium'
    ),
    (
        'N Block Coffee',
        'I stand apart from the usual campus colour, and somewhere within me waits a place for your next caffeine fix.',
        'N Block Coffee',
        'medium'
    ),
    (
        'N Block Coffee',
        'Find the building that breaks the campus colour pattern. Once you''ve found the odd one out, your next clue is brewed inside.',
        'N Block Coffee',
        'hard'
    ),


    -- --------------------------------------------------------
    -- Library
    -- --------------------------------------------------------

    (
        'Library',
        'I look like somewhere you would shop, but what I hold cannot be bought.',
        'Library',
        'easy'
    ),
    (
        'Library',
        'People enter me expecting one thing, but leave carrying something entirely different.',
        'Library',
        'medium'
    ),
    (
        'Library',
        'I may look like a mall, but my real treasures are made of knowledge.',
        'Library',
        'easy'
    ),


    -- --------------------------------------------------------
    -- Gate No. 2
    -- --------------------------------------------------------

    (
        'Gate No. 2',
        'The gateway to the place many students call home.',
        'Gate No. 2',
        'easy'
    ),
    (
        'Gate No. 2',
        'I am one of several ways out, but one destination makes me special.',
        'Gate No. 2',
        'medium'
    ),
    (
        'Gate No. 2',
        'When students think of the road to Balli, one gate knows the way.',
        'Gate No. 2',
        'medium'
    ),


    -- --------------------------------------------------------
    -- I Block Mess
    -- --------------------------------------------------------

    (
        'I Block Mess',
        'Find the block whose name begins with I, then look for a crispy twist on a familiar snack.',
        'I Block Mess',
        'easy'
    ),
    (
        'I Block Mess',
        'Your first clue is a single letter: I. Your second is a golden shell hiding noodles inside.',
        'I Block Mess',
        'medium'
    ),
    (
        'I Block Mess',
        'Start where I marks the block. There, a familiar triangular snack hides an unexpected filling of noodles.',
        'I Block Mess',
        'medium'
    ),


    -- --------------------------------------------------------
    -- Megabyte
    -- --------------------------------------------------------

    (
        'Megabyte',
        'When hunger becomes the biggest problem, I become the obvious solution.',
        'Megabyte',
        'easy'
    ),
    (
        'Megabyte',
        'My name sounds digital, but my real purpose is much tastier.',
        'Megabyte',
        'medium'
    ),
    (
        'Megabyte',
        'I may sound like something from a computer, but students visit me for something they can eat.',
        'Megabyte',
        'easy'
    ),


    -- --------------------------------------------------------
    -- Rara's Food Truck
    -- --------------------------------------------------------

    (
        'Rara''s Food Truck',
        'I have four wheels and a reputation for something crispy.',
        'Rara''s Food Truck',
        'easy'
    ),
    (
        'Rara''s Food Truck',
        'Follow the smell of golden sticks and you''ll find my name.',
        'Rara''s Food Truck',
        'medium'
    ),
    (
        'Rara''s Food Truck',
        'I''m not a restaurant, but I''ve become famous for what comes out of my fryer.',
        'Rara''s Food Truck',
        'medium'
    ),


    -- --------------------------------------------------------
    -- Arcadia Pickleball Court
    -- --------------------------------------------------------

    (
        'Arcadia Pickleball Court',
        'Within a place named like a mythical world, a smaller battlefield waits.',
        'Arcadia Pickleball Court',
        'medium'
    ),
    (
        'Arcadia Pickleball Court',
        'Paddles replace rackets, and a hidden court waits inside a realm.',
        'Arcadia Pickleball Court',
        'medium'
    ),
    (
        'Arcadia Pickleball Court',
        'Find the realm first. Then discover where the pickleball battle takes place.',
        'Arcadia Pickleball Court',
        'hard'
    ),


    -- --------------------------------------------------------
    -- Cafedia
    -- --------------------------------------------------------

    (
        'Cafedia',
        'Steam rises, gravy flows, and one campus craving keeps bringing people back.',
        'Cafedia',
        'easy'
    ),
    (
        'Cafedia',
        'Among the many places to eat, one has earned a reputation for its gravy-filled favourites.',
        'Cafedia',
        'medium'
    ),
    (
        'Cafedia',
        'If gravy momos are the answer, which place is the question?',
        'Cafedia',
        'easy'
    ),


    -- --------------------------------------------------------
    -- J2 Block Entrance
    -- --------------------------------------------------------

    (
        'J2 Block Entrance',
        'Here, ideas fight without anyone throwing a punch.',
        'J2 Block Entrance',
        'easy'
    ),
    (
        'J2 Block Entrance',
        'Voices rise, opinions collide, and audiences listen.',
        'J2 Block Entrance',
        'medium'
    ),
    (
        'J2 Block Entrance',
        'Where arguments become events and students take the stage, what place am I?',
        'J2 Block Entrance',
        'medium'
    ),


    -- --------------------------------------------------------
    -- Hidden Fruit Shop
    -- --------------------------------------------------------

    (
        'Hidden Fruit Shop',
        'Somewhere on campus, fresh fruit is waiting — but the shop isn''t easy to spot.',
        'Hidden Fruit Shop',
        'easy'
    ),
    (
        'Hidden Fruit Shop',
        'Not every shop announces itself. Find the one hiding fresh treasures.',
        'Hidden Fruit Shop',
        'medium'
    ),
    (
        'Hidden Fruit Shop',
        'I''m easy to walk past, but once you discover me, you''ll know where fresh treasures hide.',
        'Hidden Fruit Shop',
        'medium'
    ),


    -- --------------------------------------------------------
    -- The Bank
    -- --------------------------------------------------------

    (
        'The Bank',
        'Unlike your CampusQuest XP, my currency can actually be withdrawn.',
        'The Bank',
        'easy'
    ),
    (
        'The Bank',
        'People come to me carrying money and leave with transactions completed.',
        'The Bank',
        'medium'
    ),
    (
        'The Bank',
        'I protect something valuable, but I''m not a treasure chest.',
        'The Bank',
        'easy'
    )

) AS r(territory_name, question, answer, difficulty)

JOIN game_sessions g
    ON g.name = 'CampusQuest'

JOIN territories tr
    ON tr.game_id = g.id
   AND tr.name = r.territory_name

WHERE NOT EXISTS (
    SELECT 1
    FROM riddles x
    WHERE x.territory_id = tr.id
      AND x.question = r.question
);


COMMIT;