// All gameplay tuning lives here. Units: logical canvas pixels and seconds.

export const W = 480;
export const H = 270;
export const GROUND_Y = 222;
export const PLAYER_X = 84;
export const METERS_PER_PX = 0.2;
export const FINISH_M = 5000;

export const COLORS = {
  navy: '#172B4D',
  ink: '#0B1630',
  blue: '#356BFF',
  orange: '#FF6B35',
  lime: '#D5FF52',
  cream: '#FFF5E6',
  white: '#FFFFFF',
  red: '#E5383B',
  green: '#2BB673',
  gold: '#FFC93C',
  goldDark: '#D99A1C',
  slate: '#3A4766',
  skin: '#F1B58C',
  skinDark: '#C98A62',
};

export const PHYSICS = {
  gravity: 1500,
  jumpVelocity: 480, // peak ≈ 77px, airtime ≈ 0.64s
  fastFall: 700,
  jumpBuffer: 0.12,
  slideTime: 0.55,
  // Hitboxes are independent of the sprites (standing sprite ≈ 43px, slide sprite ≈ 28px).
  standW: 14,
  standH: 38,
  slideW: 24,
  slideH: 20,
  hitInvuln: 1.5,
};

export const DIFFICULTY = {
  baseSpeed: 200,
  maxSpeed: 420,
  speedPerKm: 40,
  speedPerSecond: 0.6,
  speedPerLevel: 8,
  // Seconds of reaction time between consecutive obstacles, shrinking with distance.
  gapStart: 1.7,
  gapEnd: 1.05,
  rampMeters: 4500,
  gapPerLevel: 0.03,
  minGapSeconds: 0.95, // always longer than jump airtime (0.64s)
  gapJitter: 0.45,
  firstObstaclePx: 520,
  finishClearM: 120, // no spawns right before the finish line
};

// w: footprint used for spacing and sprite centring.
// box: [horizontal inset, hitbox top, hitbox bottom], heights in px above the ground line.
// fly: floating obstacle, slide under it. lift: sprite bottom above the ground line.
export const OBSTACLES = {
  puddle: { w: 46, weight: 3, minM: 0, box: [9, 3, -5], lift: -8, sprite: 'obstacles/puddle' },
  cone: { w: 20, weight: 3, minM: 0, box: [4, 24, 0], lift: -1, sprite: 'obstacles/cone' },
  poop: { w: 15, weight: 2, minM: 100, box: [2, 12, 0], lift: -1, sprite: 'obstacles/poop' },
  runclub: { w: 40, weight: 2, minM: 250, box: [4, 32, 0], extraSpeed: 30, extraGap: 50 },
  pigeon: { w: 17, weight: 2, minM: 350, box: [1, 48, 28], lift: 31, fly: true, extraSpeed: 20, extraGap: 20, sprite: 'obstacles/pigeon' },
  dog: { w: 32, weight: 2, minM: 500, box: [4, 20, 0], lift: -1, extraSpeed: 45, extraGap: 70, sprite: 'obstacles/dog' },
  barrier: { w: 42, weight: 2, minM: 800, box: [2, 24, 0], lift: -1, sprite: 'obstacles/barrier' },
  bee: { w: 19, weight: 1.5, minM: 1200, box: [1, 48, 28], lift: 31, fly: true, extraSpeed: 20, extraGap: 20, sprite: 'obstacles/bee' },
  stairs: { w: 36, weight: 1.5, minM: 1600, box: [3, 26, 0], lift: -1, sprite: 'obstacles/stairs' },
  notification: { w: 22, weight: 1.5, minM: 2200, box: [1, 50, 28], lift: 31, fly: true, extraGap: 20, sprite: 'obstacles/notification' },
  brainwall: { w: 25, weight: 2, minM: 0, minLevel: 4, box: [2, 24, 0], lift: -1, sprite: 'obstacles/brainwall' },
};

// Runner animation controller. frameTime in seconds; the run cycle speeds up with scroll speed.
export const ANIMATIONS = {
  idle: { frames: ['runner/idle'], frameTime: 1 },
  run: { frames: ['runner/run1', 'runner/run2', 'runner/run3', 'runner/run4'], frameTime: 0.11 },
  jump: { frames: ['runner/jump'], frameTime: 1 },
  slide: { frames: ['runner/slide'], frameTime: 1 },
  hit: { frames: ['runner/hit'], frameTime: 1, hold: 0.35 },
};

export const STAMINA = {
  max: 100,
  drainPerSec: 2.6,
  boostDrainMult: 1.6,
  exhaustedSpeedMult: 0.85,
  low: 30,
};

export const SCORING = {
  pointsPerMeter: 1,
  finishBonus: 1000,
  lifeBonus: 500,
  multiplier: 2,
  multiplierTime: 8,
  comboWindow: 2.2,
  comboMax: 5,
};

export const BOOST = { speedMult: 1.25 };

const S = (dir, names) => names.map((n) => `${dir}/${n}`);

// sprites: one is picked at random per pickup, all from the reference sheet.
export const ITEMS = {
  shoes: { points: 100, brainrot: 4, quote: 'ROTATION UPDATE: FINANCIALLY IRRESPONSIBLE.', sprites: S('shoes', ['daily', 'tempo', 'race', 'trail', 'super']) },
  gel: { points: 50, brainrot: 1, boost: 3, quote: 'FUELING STRATEGY FOR A 5K.', sprites: S('nutrition', ['gel', 'caffeine', 'bar']) },
  water: { points: 0, brainrot: 0, stamina: 30, quote: 'HYDRATION IS NON-NEGOTIABLE.', sprites: [...S('hydration', ['bottle', 'softflask', 'thermos', 'cup']), ...S('nutrition', ['iso', 'salts'])] },
  medal: { points: 250, brainrot: 10, quote: 'NEW PERSONALITY UNLOCKED: MARATHON FINISHER.', sprites: S('medals', ['5k', '10k', '21k', '42k', 'ultra', 'finisher']) },
  bib: { points: 0, brainrot: 5, quote: 'RACE WEEK PERSONALITY ACTIVATED.', sprites: S('bibs', ['5k', '10k', '21k', '42k', 'ultra']) },
  kudos: { points: 25, brainrot: 0.5, quote: 'MOM LIKED YOUR ACTIVITY.', sprites: ['collectibles/coin'] },
  hyrox: { points: 150, brainrot: 7, quote: "YOU'RE A RUNNER NOW. AND A GYM BRO.", sprites: ['collectibles/strength', 'medals/hyrox'] },
  exp: { points: 75, brainrot: 2, quote: '+EXP. SEGMENT KNOWLEDGE ACQUIRED.', sprites: ['collectibles/exp'] },
  health: { points: 0, brainrot: 0, life: 1, quote: 'EXTRA LIFE. RESTING HEART RATE: SMUG.', sprites: ['collectibles/health'] },
  boost: { points: 25, brainrot: 1, boost: 4, quote: 'AERO GAINS UNLOCKED.', sprites: ['collectibles/boost', 'collectibles/speed'] },
  brainrot: { points: 0, brainrot: 9, quote: 'BRAINROT INTENSIFIES.', sprites: ['collectibles/brainrot'] },
  streak: { points: 50, brainrot: 3, streak: true, quote: 'STREAK: DAY 412. KNEES: CONCERNED.', sprites: ['collectibles/streak'] },
};

// Shuffled bag of gap items: every type shows up at least once per bag (~15 obstacles).
export const ITEM_BAG = ['shoes', 'shoes', 'shoes', 'gel', 'gel', 'water', 'water', 'medal', 'bib', 'hyrox', 'exp', 'health', 'boost', 'brainrot', 'streak'];

export const LEVELS = [
  { min: 0, title: 'CASUAL RUNNER', rank: 'BEGINNER', variant: 'runner/lv1', quote: 'I just run for fun.' },
  { min: 20, title: 'PACE ADDICT', rank: 'AMATEUR', variant: 'runner/lv2', quote: 'Wait, what was that split?' },
  { min: 40, title: 'GEAR COLLECTOR', rank: 'DEDICATED', variant: 'runner/lv3', quote: 'I need another pair.' },
  { min: 60, title: 'ZONE 2 EVANGELIST', rank: 'HYBRID', variant: 'runner/lv4', quote: "You're running too fast for your easy run." },
  { min: 80, title: 'STRAVA FINAL BOSS', rank: 'LEGEND', variant: 'runner/lv5', quote: 'If there are no kudos, did it even happen?' },
];

export const ZONES = [
  { name: 'CITY PARK', fromM: 0 },
  { name: 'THE TRACK', fromM: 1700 },
  { name: 'URBAN ROAD', fromM: 3400 },
];

export const FEED = [
  'Someone gave you 1 kudos. You can sleep now.',
  "Your easy run is faster than your race pace.",
  'GPS SIGNAL ACQUIRED. EGO RESTORED.',
  'Activity uploaded. Validation pending.',
  'Your friend ran 0.01 km farther.',
  'A stranger commented "nice" on your 2019 run.',
  'Your watch suggests 72 hours of recovery.',
];

export const CLUB = [
  'RUN CLUB MEMBERS ARE WATCHING.',
  'Easy 5K. Mandatory 4:00/km pace.',
  'The group said recovery run.',
  'Coffee after the run is the real finish line.',
  'New club rule: no photo, no run.',
];

export const MEMES = [
  { title: 'KUDOS STORM', body: '47 people you have never met gave you kudos.' },
  { title: 'PACE CHECK', body: 'Current pace looks suspiciously like a car.' },
  { title: 'NEW PB?', body: 'Scanning all your segments... inconclusive.' },
  { title: 'WATCH ALERT', body: "YOUR WATCH SAYS YOU'RE UNPRODUCTIVE." },
  { title: 'TRAINING STATUS', body: 'Unproductive. Overreaching. Iconic.' },
  { title: 'SEGMENT CROWN', body: 'You are now Local Legend of this lamppost.' },
];

export const HIT_REACTIONS = {
  puddle: ['SOAKED. NEW SOCKS RUINED.', 'PUDDLE PB: DEEPEST EVER.'],
  cone: ['CONED. HUMILIATING.', 'THAT CONE HAD A BETTER TAPER.'],
  poop: ['STEPPED IN IT. LITERALLY.', 'THOSE WERE THE SUPER SHOES.'],
  runclub: ["RUN CLUB COLLISION. THEY DIDN'T SLOW DOWN.", 'ON YOUR LEFT. TOO LATE.'],
  pigeon: ['PIGEON STRIKE. DUCK NEXT TIME.', 'THE PIGEON HAD RIGHT OF WAY.'],
  dog: ['GOOD BOY. BAD SPLIT.', 'THE DOG IS FASTER. ACCEPT IT.'],
  barrier: ['ROAD CLOSED. EGO OPEN.', 'BARRIER 1 - YOU 0.'],
  bee: ['STUNG. HEART RATE: YES.', 'BEE-LINE TO THE PHYSIO.'],
  stairs: ['STAIRS. LEG DAY ACTIVATED.', 'ELEVATION GAIN: PAINFUL.'],
  notification: ['CHECKED YOUR PHONE. CRASHED.', 'NOTIFICATION > SURVIVAL.'],
  brainwall: ['HIT THE BRAINROT WALL.', 'THE WALL IS REAL. AND PIXELATED.'],
};

export const DNF_MESSAGES = [
  '5K COMPLETED. PERSONALITY NOT FOUND.',
  'NO PB. CHARACTER DEVELOPMENT.',
  'YOUR EASY RUN HAS BEEN FLAGGED FOR INVESTIGATION.',
  'DNF. DID NOT FILTER THE SELFIE EITHER.',
  'UPLOAD FAILED. PROBABLY FOR THE BEST.',
];

export const FINISH_MESSAGES = [
  'YOUR WATCH IS PROUD OF YOU.',
  'YOU RAN FOR 20 MINUTES AND BOUGHT €300 OF SHOES.',
  '5K COMPLETED. PERSONALITY NOT FOUND.',
  'FINISHER MEDAL POSTED BEFORE CROSSING THE LINE.',
];
