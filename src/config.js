// All gameplay tuning and copy lives here. Units: logical world pixels (480x270) and seconds.
// HYROX stations live in stations.js, billboard copy in billboards.js.

export const W = 480;
export const H = 270;
export const GROUND_Y = 222; // the player's lane
export const PATH_TOP = GROUND_Y - 16; // the path has depth: a back lane runs behind the player
export const BACK_LANE_Y = GROUND_Y - 10;
export const PLAYER_X = 84;
export const METERS_PER_PX = 0.2;
export const FINISH_M = 5000; // arcade 5K

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
  slideTime: 0.6,
  // Hitboxes are independent of the sprites (standing sprite ≈ 50px, slide sprite ≈ 32px).
  standW: 14,
  standH: 40,
  slideW: 24,
  slideH: 22,
  hitInvuln: 1.5,
};

export const DIFFICULTY = {
  baseSpeed: 140, // -30% vs the first version (200)
  maxSpeed: 330,
  speedPerKm: 30,
  speedPerSecond: 0.35,
  speedPerLevel: 6,
  // Seconds of reaction time between consecutive obstacles, shrinking with distance.
  gapStart: 2.2, // ≈ -25% obstacle frequency at the start
  gapEnd: 1.45,
  rampShare: 0.9, // the gap reaches gapEnd at this share of the course
  gapPerLevel: 0.03,
  minGapSeconds: 1.25, // always well above jump airtime (0.64s) + reaction
  gapJitter: 0.4,
  firstObstaclePx: 420, // ≈ 3s of free running at the start
  finishClearM: 120, // no spawns right before the finish line
  imminentSeconds: 1.1, // low-priority messages wait while an obstacle is this close
};

// Logical size of each sheet sprite (native files are downsampled at device resolution).
export const RUNNER_HEIGHT = 50; // idle pose height; every runner frame shares the same scale
export const ITEM_SIZE = 24; // default max side of a pickup

// ---------- environments ----------
// Index order matters: the renderer keeps one set of background tiles per zone, in this order.
// billboards: categories (billboards.js) shown on that zone's posters.
export const ZONES = [
  { id: 'park', name: 'CITTÀ E PARCO', intro: 'Panchine, piccioni e run club in agguato.', billboards: ['running', 'runclub', 'garmin', 'recovery'] },
  { id: 'forest', name: 'BOSCO E MONTAGNA', intro: 'Radici, rocce e rami bassi. Occhio alle caviglie.', billboards: ['trail', 'garmin', 'nutrition', 'recovery'] },
  { id: 'beach', name: 'SPIAGGIA', intro: 'La sabbia rallenta: saltala. Palloni in arrivo.', billboards: ['triathlon', 'ironman', 'nutrition', 'running'] },
  { id: 'arena', name: 'HYROX ARENA', intro: 'Kettlebell abbandonati e wall ball vaganti.', billboards: ['hyrox', 'gym', 'lifting', 'nutrition'] },
  { id: 'marathon', name: 'MARATHON CITY', intro: 'Transenne, pubblico e ristori. Si va al traguardo.', billboards: ['running', 'marathon', 'garmin', 'ironman'] },
];
export const ZONE = Object.fromEntries(ZONES.map((z, i) => [z.id, i]));

// Arcade 5K: one environment per km (≈ 25-40s each, stations included).
// The park opens, Marathon City hosts the finish line, the three in between are shuffled per run.
export const ARCADE = {
  finishM: FINISH_M,
  zoneLenM: 1000,
  first: 'park',
  middle: ['forest', 'beach', 'arena'],
  last: 'marathon',
  stationsAt: [450, 1000, 1550, 2100, 2650, 3200, 3750, 4300], // one HYROX station each, in race order
};

// MARATONA BRAINROT: unlocked once a single arcade run reaches unlockScore points.
// The distance is symbolic: finishM game meters are shown as 42,195 km.
export const MARATHON = {
  unlockScore: 10000,
  finishM: 8440,
  km: 42.195,
  timeFactor: 60, // 1 second of play = 1 symbolic minute
  baseSpeed: 150,
  speedPerKm: 12, // per game km
  boostDrainMult: 2.6, // turbo burns energy fast: pacing matters
  gelStamina: 28, // in the marathon a gel refuels instead of boosting
  stomach: { perGel: 40, perGalletta: 15, decayPerSec: 6, crisisTime: 3, crisisSpeedMult: 0.8 },
  sprintKudos: 0.6, // final stage: crowd kudos give a short sprint (seconds)
  sprintMult: 1.08,
  ghostDefaultTime: 190, // seconds; the ghost then replays your best time
  finishBonus: 2000,
  ghostBonus: 1000,
  lifeBonus: 500,
  stages: [
    {
      name: 'PARTENZA CONTROLLATA', toKm: 10, zone: 'marathon', drain: 1.3,
      intro: 'Km 0: partenza controllata. I turbo costano energia: non bruciarti subito.',
      bag: ['boost', 'boost', 'boost', 'water', 'shoes', 'exp', 'bib', 'streak'],
    },
    {
      name: 'FUELING', toKm: 21.1, zone: 'park', drain: 2.4,
      intro: 'Km 10: fueling. I gel ricaricano, ma lo stomaco ha un limite.',
      bag: ['gel', 'gel', 'gel', 'water', 'galletta', 'shoes', 'health', 'gel'],
    },
    {
      name: 'IL MURO', toKm: 35, zone: 'beach', drain: 3.4, choice: true,
      intro: 'Km 21: il muro. Scegli: acqua a terra o power-up in alto (salta).',
      bag: ['water', 'gel', 'galletta'],
    },
    {
      name: 'FINALE', toKm: 42.195, zone: 'marathon', drain: 2, sprint: 1.1,
      intro: 'Km 35: finale! I kudos del pubblico danno lo sprint. Batti il fantasma.',
      bag: ['boost', 'shoes', 'medal', 'streak', 'water', 'bib'],
    },
  ],
};

// Gel + collision within the window = special gut joke (once per gel).
export const GUT = { window: 10 };
// Beach sand: running through it slows you briefly. Jump it to keep the pace.
export const SAND = { slowTime: 0.9, speedMult: 0.72 };

// w: footprint used for spacing and sprite centring.
// box: [horizontal inset, hitbox top, hitbox bottom], heights in px above the ground line.
// fly: floating obstacle, slide under it. lift: sprite bottom above the ground line.
// v: own speed in px/s (negative = coming towards the runner). size: drawn sprite size.
// zones: environments where it spawns (all when omitted). No sprite = vector art (render.js).
// soft: no damage, slows the runner instead.
const FLY_BOX = [2, 52, 30];
export const OBSTACLES = {
  puddle: { w: 50, weight: 3, minM: 0, zones: ['park', 'forest'], box: [11, 3, -5], lift: -9, sprite: 'obstacles/puddle', size: { w: 52 } },
  cone: { w: 22, weight: 3, minM: 0, zones: ['park', 'arena', 'marathon'], box: [5, 25, 0], lift: -1, sprite: 'obstacles/cone', size: { h: 28 } },
  poop: { w: 17, weight: 2, minM: 150, zones: ['park'], box: [3, 12, 0], lift: -1, sprite: 'obstacles/poop', size: { h: 16 } },
  runclub: { weight: 2.2, minM: 300, group: true },
  nonna: { weight: 2, minM: 500, zones: ['park', 'beach', 'marathon'], group: true },
  dogwalk: { weight: 1.4, minM: 300, zones: ['park', 'beach'], group: true },
  pigeon: { w: 20, weight: 1.6, minM: 400, zones: ['park', 'beach', 'marathon'], box: FLY_BOX, lift: 35, fly: true, v: -15, extraGap: 20, sprite: 'obstacles/pigeon', size: { h: 22 } },
  dog: { w: 36, weight: 1.6, minM: 700, zones: ['park', 'forest'], box: [6, 20, 0], lift: -1, v: -35, extraGap: 60, sprite: 'obstacles/dog', size: { h: 28 } },
  barrier: { w: 46, weight: 1.6, minM: 1000, zones: ['park', 'marathon'], box: [4, 25, 0], lift: -1, sprite: 'obstacles/barrier', size: { h: 30 } },
  bee: { w: 22, weight: 1.3, minM: 1400, zones: ['park', 'forest'], box: FLY_BOX, lift: 35, fly: true, v: -15, extraGap: 20, sprite: 'obstacles/bee', size: { h: 21 } },
  stairs: { w: 39, weight: 1.2, minM: 1900, zones: ['park'], box: [4, 26, 0], lift: -1, sprite: 'obstacles/stairs', size: { h: 30 } },
  notification: { w: 25, weight: 1.2, minM: 2400, box: [2, 54, 30], lift: 35, fly: true, extraGap: 20, sprite: 'obstacles/notification', size: { h: 27 } },
  brainwall: { w: 26, weight: 1.6, minM: 0, minLevel: 4, box: [3, 25, 0], lift: -1, sprite: 'obstacles/brainwall', size: { h: 28 } },
  // trail
  root: { w: 44, weight: 3, minM: 0, zones: ['forest'], box: [6, 10, 0] },
  rock: { w: 30, weight: 2.5, minM: 0, zones: ['forest'], box: [4, 20, 0] },
  branch: { w: 40, weight: 1.4, minM: 0, zones: ['forest'], box: FLY_BOX, lift: 35, fly: true, extraGap: 20 },
  // beach
  ball: { w: 22, weight: 2.6, minM: 0, zones: ['beach'], box: [3, 20, 0], v: -30, extraGap: 50 },
  sand: { w: 64, weight: 2, minM: 0, zones: ['beach'], box: [8, 3, -5], soft: true },
  frisbee: { w: 24, weight: 1.4, minM: 0, zones: ['beach'], box: [2, 52, 32], lift: 37, fly: true, v: -40, extraGap: 30 },
  // HYROX arena
  kettlebell: { w: 22, weight: 3, minM: 0, zones: ['arena'], box: [3, 20, 0] },
  wallball: { w: 22, weight: 1.6, minM: 0, zones: ['arena'], box: FLY_BOX, lift: 35, fly: true, v: -35, extraGap: 30 },
  // marathon
  cups: { w: 34, weight: 2, minM: 0, zones: ['marathon'], box: [5, 9, 0] },
};

// Run-club archetypes: each member of a group is a different one (see characters.js).
// height/girth: body proportions, cadence/stride/bob: running style.
export const ARCHETYPES = {
  carbon: {
    label: 'Carbon runner', height: 1.06, girth: 0.85, cadence: 1.2, stride: 1.15, bob: 0.7,
    top: 'singlet', bottom: 'split', sole: 'carbon', sunglasses: true, headband: 0.5,
    shirts: ['#FF4FD8', '#D5FF52', '#FF6B35'], shorts: ['#0B1630', '#172B4D'], shoes: ['#D5FF52', '#FF4FD8', '#FFC93C'],
  },
  sunday: {
    label: 'Runner della domenica', height: 0.94, girth: 1.3, cadence: 0.8, stride: 0.75, bob: 1.6,
    top: 'tee', bottom: 'long', sole: 'old', headphones: true,
    shirts: ['#C9CED8', '#FFFFFF', '#E5383B'], shorts: ['#3A4766', '#5C6B8A'], shoes: ['#FFFFFF', '#9AA5B8'],
  },
  trail: {
    label: 'Trail addicted', height: 1, girth: 1, cadence: 0.95, stride: 0.95, bob: 1.1,
    top: 'tee', bottom: 'short', sole: 'trail', vest: true, cap: 'front',
    shirts: ['#2BB673', '#8C5A3C', '#FF6B35'], shorts: ['#2B2B2B', '#3A4766'], shoes: ['#FF6B35', '#E5383B'],
  },
  hybrid: {
    label: 'Hybrid athlete', height: 1.02, girth: 1.45, cadence: 0.95, stride: 0.9, bob: 1,
    top: 'tank', bottom: 'tights', sole: 'daily', cap: 'back', wristbands: true,
    shirts: ['#0B1630', '#E5383B', '#356BFF'], shorts: ['#14213D', '#2B2B2B'], shoes: ['#FFFFFF', '#D5FF52'],
  },
  marathoner: {
    label: 'Maratoneta esperto', height: 0.98, girth: 0.82, cadence: 1.05, stride: 1.05, bob: 0.6,
    top: 'singlet', bottom: 'split', sole: 'race', bib: true, belt: true, headband: 1, grey: true,
    shirts: ['#356BFF', '#FFC93C', '#FFF5E6'], shorts: ['#0B1630', '#E5383B'], shoes: ['#FF6B35', '#356BFF'],
  },
  filmer: {
    label: 'Runner che filma tutto', height: 1, girth: 1.05, cadence: 1, stride: 0.95, bob: 1,
    top: 'tee', bottom: 'short', sole: 'daily', phone: true, cap: 'front', sunglasses: true,
    shirts: ['#9B5DE5', '#FF6B35', '#00B4D8'], shorts: ['#0B1630', '#172B4D'], shoes: ['#D5FF52', '#FFFFFF'],
  },
};
export const SKINS = ['#F1B58C', '#8D5A3B', '#E8C39E', '#C98A62', '#6E4329', '#F6CBA5'];
export const HAIR = ['#4A2C1A', '#1A1A1A', '#C98A3A', '#2B1B12', '#8A5A2B', '#E0B04A'];

// Run club: 3-6 runners, 1-3 of them in the player's lane (jump them), the rest in the back lane.
// They run the same way as the player but slower, so the player overtakes them.
export const RUN_CLUB = {
  size: [3, 6],
  inLane: [1, 3],
  speedFactor: [0.3, 0.45], // their speed as a fraction of the scroll speed
  memberW: 12,
  memberH: 34, // hitbox height
  laneGapMin: 34, // extra px between in-lane runners on top of one jump's footprint
  passBonus: 120,
  passKudos: 1,
  passBrainrot: 3, // the club's influence
  names: ['BRAINROT RC', 'Z2 GANG', 'NEGATIVE SPLIT CREW', 'CAFFÈ & LAP RC', 'PACE CLUB 4:05', 'RUN & SPRITZ'],
  colors: ['#D5FF52', '#FF6B35', '#356BFF', '#FF4FD8', '#FFC93C', '#2BB673'],
};

// Grannies: slow, predictable, always jumpable. Crossing ones finish crossing far before the runner.
export const NONNA = {
  walkSpeed: 20, // px/s, along the path
  boxH: 30,
  crossEndX: PLAYER_X + 170, // a crossing granny is fully in the lane by this x
  crossLen: 110,
  looks: [
    { coat: '#7B4B94', hair: '#D9D9D9', scarf: null, bag: '#2BB673' },
    { coat: '#2E7D7A', hair: '#BDBDBD', scarf: '#E5383B', bag: '#FFC93C' },
    { coat: '#8C5A3C', hair: '#E6E6E6', scarf: '#356BFF', bag: '#FF6B35' },
    { coat: '#B23A48', hair: '#CFCFCF', scarf: null, bag: '#356BFF' },
  ],
};

// Dog on a leash: the dog trots in the runner's lane, the owner walks in the back lane.
export const DOGWALK = { speed: 28, dogW: 30, dogH: 20, leash: 22 };

// Runner animation controller. frameTime in seconds at base speed; faster scroll = faster cycle.
export const ANIMATIONS = {
  idle: { frames: ['runner/idle'], frameTime: 1 },
  run: { frames: ['runner/run1', 'runner/run2', 'runner/run3', 'runner/run4'], frameTime: 0.1, minFrameTime: 0.055 },
  jump: { frames: ['runner/jump'], frameTime: 1 },
  slide: { frames: ['runner/slide'], frameTime: 1 },
  hit: { frames: ['runner/hit'], frameTime: 1, hold: 0.35 },
};

export const STAMINA = {
  max: 100,
  drainPerSec: 1.8,
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
  comboWindow: 2.6,
  comboMax: 5,
};

export const BOOST = { speedMult: 1.25 };

const S = (dir, names) => names.map((n) => `${dir}/${n}`);

// sprites: one is picked at random per pickup, all from the reference sheet (none = vector art).
// jokes: key into JOKES for the message shown on pickup.
export const ITEMS = {
  shoes: { points: 100, brainrot: 5, jokes: 'shoes', sprites: S('shoes', ['daily', 'tempo', 'race', 'trail', 'super']), size: 28 },
  gel: { points: 50, brainrot: 1.5, boost: 3, jokes: 'gel', sprites: S('nutrition', ['gel', 'caffeine', 'bar']) },
  water: { points: 0, brainrot: 0, stamina: 30, jokes: 'water', sprites: [...S('hydration', ['bottle', 'softflask', 'thermos', 'cup']), ...S('nutrition', ['iso', 'salts'])] },
  medal: { points: 250, brainrot: 13, jokes: 'race', sprites: S('medals', ['5k', '10k', '21k', '42k', 'ultra', 'finisher']), size: 26 },
  bib: { points: 0, brainrot: 7, jokes: 'race', sprites: S('bibs', ['5k', '10k', '21k', '42k', 'ultra']), size: 28 },
  kudos: { points: 25, brainrot: 0.7, jokes: 'kudos', sprites: ['collectibles/coin'], size: 18 },
  hyrox: { points: 150, brainrot: 9, jokes: 'hyrox', sprites: ['collectibles/strength', 'medals/hyrox'] },
  exp: { points: 75, brainrot: 3, jokes: 'exp', sprites: ['collectibles/exp'], size: 22 },
  health: { points: 0, brainrot: 0, life: 1, jokes: 'health', sprites: ['collectibles/health'], size: 22 },
  boost: { points: 25, brainrot: 1.5, boost: 4, jokes: 'boost', sprites: ['collectibles/boost', 'collectibles/speed'] },
  brainrot: { points: 0, brainrot: 12, jokes: 'brainrot', sprites: ['collectibles/brainrot'] },
  streak: { points: 50, brainrot: 4, streak: true, jokes: 'streak', sprites: ['collectibles/streak'], size: 22 },
  galletta: { points: 60, brainrot: 2, stamina: 15, jokes: 'gallette', sprites: [], size: 20 },
};

// Shuffled bag of gap items: every type shows up at least once per bag.
export const ITEM_BAG = ['shoes', 'shoes', 'shoes', 'gel', 'gel', 'water', 'water', 'water', 'medal', 'bib', 'hyrox', 'exp', 'health', 'boost', 'brainrot', 'streak', 'galletta'];

export const LEVELS = [
  { min: 0, title: 'RUNNER DELLA DOMENICA', rank: 'PRINCIPIANTE', variant: 'runner/lv1', quote: 'Corro solo per divertimento.' },
  { min: 20, title: 'DROGATO DI PACE', rank: 'AMATORE', variant: 'runner/lv2', quote: 'Aspetta, com\'era quello split?' },
  { min: 40, title: 'COLLEZIONISTA DI SCARPE', rank: 'DEDICATO', variant: 'runner/lv3', quote: 'Mi serve un altro paio.' },
  { min: 60, title: 'EVANGELISTA DELLA Z2', rank: 'IBRIDO', variant: 'runner/lv4', quote: 'Stai andando troppo forte per essere un easy.' },
  { min: 80, title: 'BOSS FINALE DI STRAVA', rank: 'LEGGENDA', variant: 'runner/lv5', quote: 'Se non ci sono kudos, è successo davvero?' },
];

export const LEGEND_TITLE = 'LEGGENDA DELL\'ASFALTO';

// Joke pools, picked at random without immediate repeats (see jokes.js).
export const JOKES = {
  shoes: [
    'Un altro paio? Sì, ma queste hanno la piastra.',
    'Rotazione scarpe aggiornata. Saldo bancario peggiorato.',
    'Non sono scarpe nuove, è ricerca e sviluppo.',
    'Daily trainer? No, queste sono per il medio progressivo.',
    'Il problema non è il pace. Sono le scarpe sbagliate.',
    'Scarpa numero 14 della rotazione. Questa è per i giorni pari.',
  ],
  gel: [
    'Gel al km 4. Il nutrizionista è fiero di te.',
    'Fueling strategy da UTMB per un giro al parco.',
    'Hai assunto più carboidrati di quanti km farai.',
    'Il gel entra. Il PB si avvicina. Forse.',
    'Maurten in tasca, mutuo in banca.',
    'Carbo loading iniziato. Sono le 7 del mattino.',
  ],
  // Gel picked up, then a collision within GUT.window seconds: these win over every other hit line.
  gut: [
    'Gel al km 5. Panico intestinale al km 6.',
    'Il fueling plan era perfetto. L\'intestino aveva altri piani.',
    'Maurten preso. Decisioni discutibili.',
    'Problemi al pit stop. La gara continua.',
    'Il gel era veloce. La digestione no.',
    'Cercasi bagno chimico. Con urgenza.',
  ],
  gallette: [
    'Gallette di riso e miele: il nuovo doping legale.',
    'Due gallette al miele e improvvisamente sei Kipchoge.',
    'Carboidrati semplici, ego complesso.',
    'Gallette ingerite. Ritmo inspiegabilmente migliorato.',
    'La nutrizione sportiva è un\'arte.',
    'Non è un gel: è una galletta con ambizioni.',
  ],
  water: [
    'Idratazione impeccabile. Ritmo discutibile.',
    'Hai portato 500 ml per un easy da 30 minuti.',
    'Hydration vest caricato. Si parte per l\'ultra.',
    'Bevi prima di avere sete. E controlla il GPS.',
    'Sali minerali assunti. Ora sei un atleta d\'élite.',
  ],
  race: [
    'Adesso puoi parlarne per i prossimi sei mesi.',
    '42K completati. Personalità sbloccata.',
    'Non chiedermi il tempo. Chiedimi il dislivello.',
    'Race week: improvvisamente tutti nutrizionisti.',
    'PB conquistato. Domani easy run a 4:30.',
    'Pettorina appesa in camera. Accanto alle altre 37.',
  ],
  kudos: [
    'Tre kudos. La tua autostima è tornata.',
    'La mamma ha messo like. Allenamento riuscito.',
    'Nessun kudos dal run club. Prestazione annullata.',
    'Hai controllato Strava prima ancora del defaticamento.',
    'Il PB non conta se nessuno lo vede.',
    'Nuovo follower. Ora puoi aumentare il ritmo.',
  ],
  brainrot: [
    'Hai detto easy e sei partito a ritmo mezza.',
    'Z2 teorica. Z4 emotiva.',
    'Il cardio dice recupero. L\'ego dice ripetute.',
    'Hai fatto un progressivo senza volerlo.',
    'Negative split? Hai solo sbagliato a leggere il GPS.',
    'Il tuo coach ha visto il lap al km 1.',
    'Se non hai controllato il pace, sei davvero uscito?',
    'Il recupero attivo è diventato un test soglia.',
    'Il Garmin vibra. Il tuo sistema nervoso no.',
    'Oggi solo 5K. Sono già 14K.',
    'Hai detto "ultimo km" tre chilometri fa.',
  ],
  // Watch notifications in the feed (the Garmin billboards are in billboards.js).
  garmin: [
    'Allenamento non produttivo. Eppure eri felice.',
    'Il Garmin suggerisce riposo. Suggerimento ignorato.',
    'Carico acuto: alto. Carico cronico: anche.',
    'Sincronizzazione fallita. La corsa non è avvenuta.',
    'Stress: 86. Stai solo guardando il passo.',
    'Previsione maratona: 2:59. Realtà: discutibile.',
    'Batteria al 3%. Corri più veloce.',
    'Il GPS ha tagliato la curva. Il PB non vale.',
  ],
  hyrox: [
    'Sei un runner. E pure un palestrato.',
    'Wall ball al km 3. Nessuno te l\'ha chiesto.',
    'Sled push mentale completato.',
  ],
  exp: ['+EXP. Conosci ogni segmento del quartiere.', 'Esperienza acquisita: ora sai cos\'è il lattato.'],
  health: ['Vita extra. Frequenza a riposo: arrogante.', 'Cuore ricaricato. Il cardiofrequenzimetro approva.'],
  boost: ['Aerodinamica sbloccata. Il vento ti teme.', 'Turbo attivo. Il pace è illegale.'],
  streak: ['Streak: giorno 412. Le ginocchia sono preoccupate.', 'Streak salvata. Anche oggi, anche col raffreddore.'],
  sand: [
    'Sabbia! Il passo affonda.',
    'Allenamento in sabbia: polpacci in fiamme.',
    'La spiaggia non perdona i talloni.',
    'Pace crollato. Colpa della sabbia, ovviamente.',
  ],
  runclub: [
    'Easy run del club: 4:05/km.',
    'Ragazzi, oggi Z2. Parte la progressione.',
    'Aspetta, facciamo una foto prima del defaticamento.',
    'Il gruppo si ferma. Parte il segmento.',
    'Ci vediamo alle 6:00. Ritrovo alle 5:45.',
    'Nessuno ha detto ripetute, ma eccoci qua.',
    'Il runner davanti ha detto che è piano.',
    'Run club finito. Ora caffè e analisi dei lap.',
  ],
  nonna: [
    'Signora, sto facendo il progressivo!',
    'La nonna è in Z2. Tu sei fuori soglia.',
    'Sorpasso tecnico non riuscito.',
    'La signora ha un passo più costante del tuo.',
    'Attenzione: attraversamento a passo endurance.',
    'PB rimandato. Priorità alla sicurezza.',
    'La nonna ha chiuso il segmento.',
    'Negative split? La signora ha negative pace.',
  ],
  dogwalk: [
    'Il cane ha fatto più strappi di te.',
    'Guinzaglio lungo, segmento rovinato.',
    'Il cane è in Z1. Il padrone in Z0.',
    'Bravo cane. Pessimo split.',
  ],
  feed: [
    'Qualcuno ti ha dato 1 kudos. Ora puoi dormire.',
    'Il tuo easy è più veloce del tuo passo gara.',
    'GPS agganciato. Ego ripristinato.',
    'Attività caricata. Convalida in corso.',
    'Il tuo amico ha corso 0,01 km in più.',
    'Uno sconosciuto ha commentato "grande" una tua corsa del 2019.',
    'L\'orologio consiglia 72 ore di recupero.',
  ],
  club: [
    'I membri del run club ti stanno guardando.',
    'Easy 5K. Passo obbligatorio 4:00/km.',
    'Il gruppo aveva detto "lento".',
    'Il caffè dopo la corsa è il vero traguardo.',
    'Nuova regola del club: niente foto, niente corsa.',
  ],
  memes: [
    { title: 'TEMPESTA DI KUDOS', body: '47 sconosciuti ti hanno dato kudos.' },
    { title: 'CONTROLLO PACE', body: 'Il tuo passo somiglia sospettosamente a un\'auto.' },
    { title: 'NUOVO PB?', body: 'Analisi dei segmenti in corso... inconcludente.' },
    { title: 'AVVISO OROLOGIO', body: 'Il tuo orologio dice che sei improduttivo.' },
    { title: 'STATO ALLENAMENTO', body: 'Improduttivo. Sovraccarico. Iconico.' },
    { title: 'CORONA SEGMENTO', body: 'Sei Local Legend di questo lampione.' },
  ],
  loading: [
    'Allacciamo le carbon...',
    'Calibrazione del GPS in corso.',
    'Preparazione della Z2 teorica.',
    'Caricamento dei kudos immaginari...',
    'Controllo delle scarpe: ne hai già troppe.',
  ],
  dnf: [
    'DNF. Ma la foto pre-gara è venuta benissimo.',
    'Niente PB. Però è crescita personale.',
    'Il tuo easy è stato segnalato per indagini.',
    'Caricamento fallito. Forse è meglio così.',
    'Ritirato. Il gel era ancora in tasca.',
  ],
  finish: [
    'Il tuo orologio è fiero di te.',
    'Hai corso 20 minuti e comprato 300 euro di scarpe.',
    '5K completata. Personalità non trovata.',
    'Foto con la medaglia pubblicata prima del traguardo.',
  ],
  marathonFinish: [
    '42,195 km. Ora puoi dirlo a ogni cena per sempre.',
    'Medaglia al collo, gambe in garanzia.',
    'Maratona finita. Iscrizione alla prossima già fatta.',
    'Hai corso una maratona per una foto. Ne è valsa la pena.',
  ],
  marathonDnf: [
    'DNF. Il muro ha vinto, ma la foto al via spacca.',
    'Ritirato al ristoro. Le banane erano buone.',
    'Maratona rimandata. Il carbo loading ricomincia lunedì.',
    'Le gambe hanno firmato le dimissioni.',
  ],
};

export const HIT_REACTIONS = {
  puddle: ['Pozzanghera presa in pieno. Calze nuove rovinate.', 'Record di profondità della pozzanghera.'],
  cone: ['Birillo centrato. Umiliante.', 'Quel cono aveva un taper migliore del tuo.'],
  poop: ['Pestata. Letteralmente.', 'Erano le super shoes.'],
  runclub: ['Scontro col run club. Non hanno nemmeno rallentato.', 'Dovevi passare a sinistra. Troppo tardi.'],
  dogwalk: ['Guinzaglio teso. Sorpasso fallito.', 'Il cane voleva giocare. Tu volevi il PB.'],
  pigeon: ['Colpito da un piccione. Dovevi abbassarti.', 'Il piccione aveva la precedenza.'],
  dog: ['Bravo cane. Pessimo split.', 'Il cane è più veloce. Accettalo.'],
  barrier: ['Strada chiusa. Ego aperto.', 'Transenna 1 - Tu 0.'],
  bee: ['Punto da una vespa. Frequenza cardiaca: sì.', 'Dritto dal fisioterapista.'],
  stairs: ['Scalini. Leg day attivato.', 'Dislivello positivo: doloroso.'],
  notification: ['Hai guardato il telefono. Schianto.', 'Notifica > sopravvivenza.'],
  brainwall: ['Hai sbattuto contro il muro del brainrot.', 'Il muro esiste. Ed è pure rosso.'],
  root: ['Radice presa in pieno. Il trail ti saluta.', 'La radice era lì da 200 anni. Tu da 2 secondi.'],
  rock: ['Sasso centrato. Le caviglie prendono nota.', 'Roccia 1 - Scarpe da trail 0.'],
  branch: ['Ramo in fronte. Dovevi abbassarti.', 'Il bosco ti ha dato una lezione.'],
  ball: ['Pallonata. Il bagnante chiede scusa. Forse.', 'Il pallone ha vinto il contrasto.'],
  frisbee: ['Frisbee in faccia. Abbassati la prossima volta.', 'Hai intercettato il frisbee. Con la testa.'],
  kettlebell: ['Kettlebell lasciato in mezzo. Classico.', 'Hai dato un calcio a 24 kg.'],
  wallball: ['Wall ball fuori bersaglio. Su di te.', 'No rep: la palla ti ha colpito.'],
  cups: ['Bicchieri del ristoro ovunque. Scivolata.', 'Hai calciato 40 bicchieri. Il volontario piange.'],
};
