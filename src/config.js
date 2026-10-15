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
  standW: 14,
  standH: 32,
  slideW: 22,
  slideH: 15,
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

export const OBSTACLES = {
  pothole: { w: 40, weight: 3, minM: 0 },
  cone: { w: 14, weight: 3, minM: 0 },
  runclub: { w: 36, weight: 2.2, minM: 150, extraSpeed: 30, extraGap: 50 },
  banner: { w: 48, weight: 2, minM: 350, extraGap: 20 },
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

export const GEL = { boostTime: 3, speedMult: 1.25 };

export const ITEMS = {
  shoes: { points: 100, brainrot: 4, quote: 'ROTATION UPDATE: FINANCIALLY IRRESPONSIBLE.' },
  gel: { points: 50, brainrot: 1, quote: 'FUELING STRATEGY FOR A 5K.' },
  water: { points: 0, brainrot: 0, stamina: 30, quote: 'HYDRATION IS NON-NEGOTIABLE.' },
  medal: { points: 250, brainrot: 10, quote: 'NEW PERSONALITY UNLOCKED: MARATHON FINISHER.' },
  bib: { points: 0, brainrot: 5, quote: 'RACE WEEK PERSONALITY ACTIVATED.' },
  kudos: { points: 25, brainrot: 0.5, quote: 'MOM LIKED YOUR ACTIVITY.' },
  hyrox: { points: 150, brainrot: 7, quote: "YOU'RE A RUNNER NOW. AND A GYM BRO." },
};

// Shuffled bag of gap items: every type shows up at least once per bag (~9 obstacles).
export const ITEM_BAG = ['shoes', 'shoes', 'gel', 'gel', 'water', 'water', 'medal', 'bib', 'hyrox'];

export const LEVELS = [
  { min: 0, title: 'CASUAL RUNNER', quote: 'I just run for fun.' },
  { min: 20, title: 'PACE ADDICT', quote: 'Wait, what was that split?' },
  { min: 40, title: 'GEAR COLLECTOR', quote: 'I need another pair.' },
  { min: 60, title: 'ZONE 2 EVANGELIST', quote: "You're running too fast for your easy run." },
  { min: 80, title: 'STRAVA FINAL BOSS', quote: 'If there are no kudos, did it even happen?' },
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
  pothole: ['POTHOLE! ANKLE SAYS NO.', 'THE CITY BUDGET WINS AGAIN.'],
  cone: ['CONED. HUMILIATING.', 'THAT CONE HAD A BETTER TAPER.'],
  runclub: ["RUN CLUB COLLISION. THEY DIDN'T SLOW DOWN.", 'ON YOUR LEFT. TOO LATE.'],
  banner: ["BANNERED. SHOULD'VE DUCKED, CHAMP.", 'SLIDE NEXT TIME. FOR THE CONTENT.'],
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
