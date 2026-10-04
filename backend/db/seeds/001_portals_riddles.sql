-- CampusQuest seed: the 14 master portals and their riddles. Idempotent.
-- Riddle answer = the portal's name; answer_hash = sha256(lower(trim(answer))).
-- Reference images are uploaded through the admin API (see README), not seeded.
BEGIN;

INSERT INTO portals (name, description, latitude, longitude, radius_m) VALUES
  ('H Block Centre', 'The central spot of H Block, known for campus events, gatherings and memorable moments.', 28.546582, 77.334419, 20),
  ('Helipad', 'An open area located between E2 Block and the Library, known by a name that points to the sky.', 28.544243, 77.334365, 20),
  ('Palm Court', 'A campus court recognizable by the tall palm trees surrounding it.', 28.543837, 77.333223, 20),
  ('Sports Complex Room', 'The room inside the Sports Complex where sports equipment is stored.', 28.543981, 77.331631, 20),
  ('N Block Coffee', 'The coffee spot in N Block, the unusual white building that stands apart from the predominantly red campus buildings.', 28.547175, 77.333267, 20),
  ('Library', 'The modern Library building whose appearance can make it look more like a mall than a traditional library.', 28.543964, 77.334650, 20),
  ('Gate No. 2', 'The campus gate closest to the route toward Balli, a place many students call home.', 28.541924, 77.333188, 20),
  ('I Block Mess', 'The mess in I Block associated with the Chinese samosa, a crispy snack filled with noodles.', 28.543010, 77.333489, 20),
  ('Megabyte', 'A major campus food destination where students gather for meals and snacks.', 28.544999, 77.334564, 20),
  ('Rara''s Food Truck', 'A popular campus food truck known especially for its fries.', 28.545003, 77.334977, 20),
  ('Arcadia Pickleball Court', 'The pickleball court hidden within Arcadia, easy to overlook unless you explore the area carefully.', 28.543347, 77.332344, 20),
  ('Cafedia', 'A campus food destination especially known for its gravy momos.', 28.543347, 77.332344, 20),
  ('J2 Block Entrance', 'The entrance area of J2 Block where debates and many other campus events take place.', 28.543260, 77.332735, 20),
  ('Hidden Fruit Shop', 'A small, easy-to-miss campus fruit shop that rewards careful exploration.', 28.546266, 77.334563, 20),
  ('The Bank', 'The campus bank where students can carry out everyday banking transactions.', 28.545154, 77.332206, 20)
ON CONFLICT (name) DO NOTHING;

INSERT INTO riddles (portal_id, question, answer_hash, difficulty)
SELECT p.id, r.question, encode(sha256(convert_to(lower(btrim(p.name)), 'UTF8')), 'hex'), r.difficulty
FROM (VALUES
  ('H Block Centre', 'Where campus moments become memories, and the crowd becomes the audience.', 'easy'),
  ('H Block Centre', 'Events come and go, but this place keeps finding itself in the spotlight.', 'medium'),
  ('H Block Centre', 'When something exciting happens on campus, this is where the attention often gathers.', 'medium'),
  ('Helipad', 'I was built for something that rarely visits, yet my name still belongs to the sky.', 'easy'),
  ('Helipad', 'No wings are needed to reach me, but aviation gives me my name.', 'medium'),
  ('Helipad', 'I don''t see many landings, but I''ve been waiting for them all along.', 'medium'),
  ('Palm Court', 'My guardians are tall, green and impossible to miss.', 'easy'),
  ('Palm Court', 'Look for a place where nature stands taller than the people passing through.', 'medium'),
  ('Palm Court', 'I have no crown, yet I am surrounded by palms.', 'medium'),
  ('Sports Complex Room', 'Champions need their tools before they need the field.', 'easy'),
  ('Sports Complex Room', 'The game happens elsewhere, but everything needed to play waits with me.', 'medium'),
  ('Sports Complex Room', 'I don''t score points, but without me, the players might not either.', 'medium'),
  ('N Block Coffee', 'Among the red buildings stands one that chose to be different. Find it, then follow the aroma of coffee.', 'medium'),
  ('N Block Coffee', 'I stand apart from the usual campus colour, and somewhere within me waits a place for your next caffeine fix.', 'medium'),
  ('N Block Coffee', 'Find the building that breaks the campus colour pattern. Once you''ve found the odd one out, your next clue is brewed inside.', 'hard'),
  ('Library', 'I look like somewhere you would shop, but what I hold cannot be bought.', 'easy'),
  ('Library', 'People enter me expecting one thing, but leave carrying something entirely different.', 'medium'),
  ('Library', 'I may look like a mall, but my real treasures are made of knowledge.', 'easy'),
  ('Gate No. 2', 'The gateway to the place many students call home.', 'easy'),
  ('Gate No. 2', 'I am one of several ways out, but one destination makes me special.', 'medium'),
  ('Gate No. 2', 'When students think of the road to Balli, one gate knows the way.', 'medium'),
  ('I Block Mess', 'Find the block whose name begins with I, then look for a crispy twist on a familiar snack.', 'easy'),
  ('I Block Mess', 'Your first clue is a single letter: I. Your second is a golden shell hiding noodles inside.', 'medium'),
  ('I Block Mess', 'Start where I marks the block. There, a familiar triangular snack hides an unexpected filling of noodles.', 'medium'),
  ('Megabyte', 'When hunger becomes the biggest problem, I become the obvious solution.', 'easy'),
  ('Megabyte', 'My name sounds digital, but my real purpose is much tastier.', 'medium'),
  ('Megabyte', 'I may sound like something from a computer, but students visit me for something they can eat.', 'easy'),
  ('Rara''s Food Truck', 'I have four wheels and a reputation for something crispy.', 'easy'),
  ('Rara''s Food Truck', 'Follow the smell of golden sticks and you''ll find my name.', 'medium'),
  ('Rara''s Food Truck', 'I''m not a restaurant, but I''ve become famous for what comes out of my fryer.', 'medium'),
  ('Arcadia Pickleball Court', 'Within a place named like a mythical world, a smaller battlefield waits.', 'medium'),
  ('Arcadia Pickleball Court', 'Paddles replace rackets, and a hidden court waits inside a realm.', 'medium'),
  ('Arcadia Pickleball Court', 'Find the realm first. Then discover where the pickleball battle takes place.', 'hard'),
  ('Cafedia', 'Steam rises, gravy flows, and one campus craving keeps bringing people back.', 'easy'),
  ('Cafedia', 'Among the many places to eat, one has earned a reputation for its gravy-filled favourites.', 'medium'),
  ('Cafedia', 'If gravy momos are the answer, which place is the question?', 'easy'),
  ('J2 Block Entrance', 'Here, ideas fight without anyone throwing a punch.', 'easy'),
  ('J2 Block Entrance', 'Voices rise, opinions collide, and audiences listen.', 'medium'),
  ('J2 Block Entrance', 'Where arguments become events and students take the stage, what place am I?', 'medium'),
  ('Hidden Fruit Shop', 'Somewhere on campus, fresh fruit is waiting — but the shop isn''t easy to spot.', 'easy'),
  ('Hidden Fruit Shop', 'Not every shop announces itself. Find the one hiding fresh treasures.', 'medium'),
  ('Hidden Fruit Shop', 'I''m easy to walk past, but once you discover me, you''ll know where fresh treasures hide.', 'medium'),
  ('The Bank', 'Unlike your CampusQuest XP, my currency can actually be withdrawn.', 'easy'),
  ('The Bank', 'People come to me carrying money and leave with transactions completed.', 'medium'),
  ('The Bank', 'I protect something valuable, but I''m not a treasure chest.', 'easy')
) AS r(portal_name, question, difficulty)
JOIN portals p ON p.name = r.portal_name
WHERE NOT EXISTS (SELECT 1 FROM riddles x WHERE x.portal_id = p.id AND x.question = r.question);

COMMIT;
