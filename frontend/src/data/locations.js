// Generated from CampusQuest_Final_Locations_Missions_Riddles.docx + the map's coordinates.
// `riddles` always resolve to `name` (the answer). Edit this file to tweak copy.

/* Marker icons: 24x24 stroke icons, keyed by LOCATIONS[].icon. */
export const ICONS = {
  mic: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v4M8 22h8"/>',
  helipad: '<circle cx="12" cy="12" r="10"/><path d="M9 7v10M15 7v10M9 12h6"/>',
  palm: '<path d="M12 22V11M12 11C9 9 6 10 4 13M12 11c3-2 6-1 8 2M12 11C11 8 9 6 6 6M12 11c1-3 3-5 6-5"/>',
  ball: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2c3 3 3 17 0 20M12 2c-3 3-3 17 0 20"/>',
  coffee: '<path d="M17 8h1a4 4 0 0 1 0 8h-1M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4ZM6 2v3M10 2v3M14 2v3"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
  gate: '<path d="M5 21V9a7 7 0 0 1 14 0v12M3 21h18M12 2v19"/>',
  food: '<path d="M3 2v7a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V2M7 2v20M21 15V2a5 5 0 0 0-5 5v6a2 2 0 0 0 2 2h3zM21 15v7"/>',
  burger: '<path d="M4 11a8 8 0 0 1 16 0zM3 15h18M5 19h14"/>',
  truck: '<path d="M1 3h15v13H1zM16 8h4l3 3v5h-7z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>',
  paddle: '<circle cx="12" cy="9" r="6"/><path d="M12 15v7M10 22h4"/>',
  bowl: '<path d="M3 12h18a9 9 0 0 1-18 0zM8 4c0 2 2 2 2 4M14 4c0 2 2 2 2 4"/>',
  fruit: '<path d="M12 7c-1-3-4-3-5-1-2 3-1 9 2 12 1 1 2 1 3 0 1 1 2 1 3 0 3-3 4-9 2-12-1-2-4-2-5 1zM12 7c0-2 1-4 3-5"/>',
  bank: '<path d="M3 22h18M6 18v-7M10 18v-7M14 18v-7M18 18v-7M12 2l8 5H4z"/>',
};

export const LOCATIONS = [
  {
    "id": 1,
    "icon": "mic",
    "name": "H Block Centre",
    "mission": "The Spotlight",
    "lat": 28.546582,
    "lng": 77.334419,
    "description": "The central spot of H Block, known for campus events, gatherings and memorable moments.",
    "riddles": [
      "Where campus moments become memories, and the crowd becomes the audience.",
      "Events come and go, but this place keeps finding itself in the spotlight.",
      "When something exciting happens on campus, this is where the attention often gathers."
    ]
  },
  {
    "id": 2,
    "icon": "helipad",
    "name": "Helipad",
    "mission": "The Landing Zone",
    "lat": 28.544243,
    "lng": 77.334365,
    "description": "An open area located between E2 Block and the Library, known by a name that points to the sky.",
    "riddles": [
      "I was built for something that rarely visits, yet my name still belongs to the sky.",
      "No wings are needed to reach me, but aviation gives me my name.",
      "I don't see many landings, but I've been waiting for them all along."
    ]
  },
  {
    "id": 3,
    "icon": "palm",
    "name": "Palm Court",
    "mission": "Palm Pursuit",
    "lat": 28.543837,
    "lng": 77.333223,
    "description": "A campus court recognizable by the tall palm trees surrounding it.",
    "riddles": [
      "My guardians are tall, green and impossible to miss.",
      "Look for a place where nature stands taller than the people passing through.",
      "I have no crown, yet I am surrounded by palms."
    ]
  },
  {
    "id": 4,
    "icon": "ball",
    "name": "Sports Complex Room",
    "mission": "The Arsenal",
    "lat": 28.543981,
    "lng": 77.331631,
    "description": "The room inside the Sports Complex where sports equipment is stored.",
    "riddles": [
      "Champions need their tools before they need the field.",
      "The game happens elsewhere, but everything needed to play waits with me.",
      "I don't score points, but without me, the players might not either."
    ]
  },
  {
    "id": 5,
    "icon": "coffee",
    "name": "N Block Coffee",
    "mission": "The Odd One Out",
    "lat": 28.547175,
    "lng": 77.333267,
    "description": "The coffee spot in N Block, the unusual white building that stands apart from the predominantly red campus buildings.",
    "riddles": [
      "Among the red buildings stands one that chose to be different. Find it, then follow the aroma of coffee.",
      "I stand apart from the usual campus colour, and somewhere within me waits a place for your next caffeine fix.",
      "Find the building that breaks the campus colour pattern. Once you've found the odd one out, your next clue is brewed inside."
    ]
  },
  {
    "id": 6,
    "icon": "book",
    "name": "Library",
    "mission": "The False Mall",
    "lat": 28.543964,
    "lng": 77.33465,
    "description": "The modern Library building whose appearance can make it look more like a mall than a traditional library.",
    "riddles": [
      "I look like somewhere you would shop, but what I hold cannot be bought.",
      "People enter me expecting one thing, but leave carrying something entirely different.",
      "I may look like a mall, but my real treasures are made of knowledge."
    ]
  },
  {
    "id": 7,
    "icon": "gate",
    "name": "Gate No. 2",
    "mission": "The Balli Route",
    "lat": 28.541924,
    "lng": 77.333188,
    "description": "The campus gate closest to the route toward Balli, a place many students call home.",
    "riddles": [
      "The gateway to the place many students call home.",
      "I am one of several ways out, but one destination makes me special.",
      "When students think of the road to Balli, one gate knows the way."
    ]
  },
  {
    "id": 8,
    "icon": "food",
    "name": "I Block Mess",
    "mission": "The Crispy Secret",
    "lat": 28.54301,
    "lng": 77.333489,
    "description": "The mess in I Block associated with the Chinese samosa, a crispy snack filled with noodles.",
    "riddles": [
      "Find the block whose name begins with I, then look for a crispy twist on a familiar snack.",
      "Your first clue is a single letter: I. Your second is a golden shell hiding noodles inside.",
      "Start where I marks the block. There, a familiar triangular snack hides an unexpected filling of noodles."
    ]
  },
  {
    "id": 9,
    "icon": "burger",
    "name": "Megabyte",
    "mission": "The Mega Feast",
    "lat": 28.544999,
    "lng": 77.334564,
    "description": "A major campus food destination where students gather for meals and snacks.",
    "riddles": [
      "When hunger becomes the biggest problem, I become the obvious solution.",
      "My name sounds digital, but my real purpose is much tastier.",
      "I may sound like something from a computer, but students visit me for something they can eat."
    ]
  },
  {
    "id": 10,
    "icon": "truck",
    "name": "Rara's Food Truck",
    "mission": "The Fry Trail",
    "lat": 28.545003,
    "lng": 77.334977,
    "description": "A popular campus food truck known especially for its fries.",
    "riddles": [
      "I have four wheels and a reputation for something crispy.",
      "Follow the smell of golden sticks and you'll find my name.",
      "I'm not a restaurant, but I've become famous for what comes out of my fryer."
    ]
  },
  {
    "id": 11,
    "icon": "paddle",
    "name": "Arcadia Pickleball Court",
    "mission": "The Lost Realm",
    "lat": 28.543347,
    "lng": 77.332344,
    "description": "The pickleball court hidden within Arcadia, easy to overlook unless you explore the area carefully.",
    "riddles": [
      "Within a place named like a mythical world, a smaller battlefield waits.",
      "Paddles replace rackets, and a hidden court waits inside a realm.",
      "Find the realm first. Then discover where the pickleball battle takes place."
    ]
  },
  {
    "id": 12,
    "icon": "bowl",
    "name": "Cafedia",
    "mission": "The Momo Hunt",
    "lat": 28.543347,
    "lng": 77.332344,
    "description": "A campus food destination especially known for its gravy momos.",
    "riddles": [
      "Steam rises, gravy flows, and one campus craving keeps bringing people back.",
      "Among the many places to eat, one has earned a reputation for its gravy-filled favourites.",
      "If gravy momos are the answer, which place is the question?"
    ]
  },
  {
    "id": 13,
    "icon": "mic",
    "name": "J2 Block Entrance",
    "mission": "The Debate Ground",
    "lat": 28.54326,
    "lng": 77.332735,
    "description": "The entrance area of J2 Block where debates and many other campus events take place.",
    "riddles": [
      "Here, ideas fight without anyone throwing a punch.",
      "Voices rise, opinions collide, and audiences listen.",
      "Where arguments become events and students take the stage, what place am I?"
    ]
  },
  {
    "id": 14,
    "icon": "fruit",
    "name": "Hidden Fruit Shop",
    "mission": "The Hidden Harvest",
    "lat": 28.546266,
    "lng": 77.334563,
    "description": "A small, easy-to-miss campus fruit shop that rewards careful exploration.",
    "riddles": [
      "Somewhere on campus, fresh fruit is waiting — but the shop isn't easy to spot.",
      "Not every shop announces itself. Find the one hiding fresh treasures.",
      "I'm easy to walk past, but once you discover me, you'll know where fresh treasures hide."
    ]
  },
  {
    "id": 15,
    "icon": "bank",
    "name": "The Bank",
    "mission": "The Vault",
    "lat": 28.545154,
    "lng": 77.332206,
    "description": "The campus bank where students can carry out everyday banking transactions.",
    "riddles": [
      "Unlike your CampusQuest XP, my currency can actually be withdrawn.",
      "People come to me carrying money and leave with transactions completed.",
      "I protect something valuable, but I'm not a treasure chest."
    ]
  }
];

/** Bonus discovery near Cafedia (not on the map yet). */
export const SECRET_DISCOVERY = {
  "riddle": "You've probably sat here before. But did you ever look closely enough to notice what was hiding nearby?",
  "hints": [
    "Think about where you eat.",
    "Look around Cafedia."
  ],
  "answer": "Hidden Pickleball Court near Cafedia"
};

/** Adapts a map location to the "portal" shape used by the Intel / capture screens. */
export const toPortal = (loc) => ({
  id: `loc-${loc.id}`,
  locationId: loc.id,
  name: loc.name,
  mission: loc.mission,
  description: loc.description,
  icon: loc.icon,
  owner: "neutral",
  lvl: 1,
  xp: 300,
  dist: "",
  img: "", // add a photo URL per location to replace the icon placeholder
  capture: { done: 0, total: 3 },
  resonators: [null, null, null],
  activity: [],
  coords: { lat: loc.lat, lng: loc.lng }, // enables the real GPS check in the capture flow
});