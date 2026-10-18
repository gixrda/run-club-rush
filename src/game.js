import {
  W, GROUND_Y, PLAYER_X, METERS_PER_PX, COLORS as C,
  PHYSICS as P, DIFFICULTY as D, OBSTACLES, RUN_CLUB, NONNA, DOGWALK, STAMINA, SCORING, BOOST,
  ITEMS, ITEM_BAG, LEVELS, ZONES, ZONE, ARCADE, MARATHON, GUT, SAND, HIT_REACTIONS, ANIMATIONS,
  ARCHETYPES, SKINS, HAIR,
} from './config.js';
import { joke } from './jokes.js';
import { nextBillboard, billboardLine } from './billboards.js';
import { STATIONS, STATION_TIMING as ST, MECHANICS, createStation, stationPoints, stationAccuracy, stationJoke } from './stations.js';

const rand = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(rand(a, b + 1));
const pick = (arr) => arr[(Math.random() * arr.length) | 0];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
export const overlap = (a, b) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

const STEP = 1 / 120; // physics substep: no tunnelling through thin cones at low FPS

// Message priorities for the notification queue (ui.js): higher preempts lower.
export const PRIO = { low: 1, normal: 2, high: 3 };

const ITEM_COLORS = {
  shoes: [C.lime, C.orange, C.white],
  gel: [C.orange, C.lime],
  water: [C.blue, C.cream],
  medal: [C.gold, C.blue, C.orange],
  bib: [C.white, C.blue],
  kudos: [C.gold, C.orange],
  hyrox: [C.lime, C.slate],
  exp: [C.gold, C.cream],
  health: [C.red, C.cream],
  boost: [C.blue, C.orange, C.white],
  brainrot: ['#F48FB1', C.cream],
  streak: [C.gold, C.orange],
  galletta: ['#E8C98A', C.gold],
};

export function formatPace(secPerKm) {
  const s = Math.round(secPerKm);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// Zone sequence of a course: [{ zone (index into ZONES), fromM }].
function arcadePlan() {
  const ids = [ARCADE.first, ...shuffle(ARCADE.middle), ARCADE.last];
  return ids.map((id, i) => ({ zone: ZONE[id], fromM: i * ARCADE.zoneLenM }));
}
function marathonPlan() {
  let from = 0;
  return MARATHON.stages.map((s) => {
    const entry = { zone: ZONE[s.zone], fromM: from };
    from = (s.toKm / MARATHON.km) * MARATHON.finishM;
    return entry;
  });
}

// A run-club member: archetype proportions + randomised colours, plus the club's colour patch.
function makeLook(kind, club) {
  const a = ARCHETYPES[kind];
  return {
    kind,
    height: a.height, girth: a.girth, cadence: a.cadence, stride: a.stride, bob: a.bob,
    top: a.top, bottom: a.bottom, sole: a.sole,
    shirt: pick(a.shirts), shorts: pick(a.shorts), shoe: pick(a.shoes),
    skin: pick(SKINS),
    hair: a.grey ? pick(['#D9D9D9', '#BDBDBD', '#E6E6E6']) : pick(HAIR),
    ponytail: !a.grey && kind !== 'hybrid' && Math.random() < 0.35,
    cap: a.cap ?? null,
    capColor: pick([C.lime, C.cream, C.orange, C.blue, '#2B2B2B']),
    sunglasses: Boolean(a.sunglasses),
    headband: Math.random() < (a.headband ?? 0),
    headphones: Boolean(a.headphones),
    vest: Boolean(a.vest),
    bib: Boolean(a.bib),
    belt: Boolean(a.belt),
    phone: Boolean(a.phone),
    wristbands: Boolean(a.wristbands),
    club,
  };
}

export class Game {
  constructor(emit, reducedMotion = false) {
    this.emit = emit;
    this.reducedMotion = reducedMotion;
    // Progress handed over by main.js (persisted there), never reset between runs.
    this.marathonUnlocked = false;
    this.ghostTime = MARATHON.ghostDefaultTime;
    this.toAttract();
  }

  toAttract() {
    this.reset('arcade');
    this.mode = 'attract';
  }

  reset(course = 'arcade') {
    this.course = course;
    const marathon = course === 'marathon';
    this.mode = 'run';
    this.finishM = marathon ? MARATHON.finishM : ARCADE.finishM;
    this.zonePlan = marathon ? marathonPlan() : arcadePlan();
    const picks = shuffle(STATIONS.map((_, i) => i)).slice(0, ARCADE.stationsAt.length).sort((a, b) => a - b);
    this.stationQueue = marathon ? [] : ARCADE.stationsAt.map((m, k) => ({ m, i: picks[k], n: k + 1 }));
    this.station = null;
    this.stationsDone = 0;
    this.stage = -1; // marathon stage, announced on the first step
    this.stomach = 0;
    this.crisisT = 0;
    this.sprintT = 0;
    this.gutT = 0;
    this.sandT = 0;
    this.unlockedNow = false;
    this.t = 0;
    this.runT = 0; // time spent running (stations excluded), for the average pace
    this.paceSum = 0;
    this.traveled = 0;
    this.meters = 0;
    this.speed = this.baseSpeed;
    this.player = {
      y: GROUND_Y, vy: 0, onGround: true, slideT: 0, slideQueued: false, invuln: 0, phase: 0, jumpBuffer: 0,
      anim: { state: 'run', frame: 0, t: 0 },
    };
    this.slideHeld = false;
    this.lives = 3;
    this.stamina = STAMINA.max;
    this.itemScore = 0;
    this.finishBonus = 0;
    this.kudos = 0;
    this.shoes = 0;
    this.combo = 0;
    this.comboT = 0;
    this.multT = 0;
    this.boostT = 0;
    this.brainrot = 0;
    this.level = 1;
    this.maxLevel = 1;
    this.obstacles = [];
    this.items = [];
    this.particles = [];
    this.texts = [];
    this.props = [];
    this.bag = [];
    this.shake = 0;
    this.flash = 0;
    this.flashColor = C.white;
    this.feedT = rand(8, 11);
    this.memeT = 4;
    this.kudosQuoteT = 4;
    this.nextKm = 1;
    this.zone = this.zonePlan[0].zone;
    this.prevZone = this.zone;
    this.zoneBlend = 1;
    this.nextPropAt = 150;
    this.firstKudos = true;
    this.hintsShown = {};
    this.result = null;
    this.nextObstacleAt = D.firstObstaclePx;
    this.nextType = 'cone';
  }

  say(text, kind = 'good', priority = PRIO.normal) {
    this.emit('callout', { text, kind, priority });
  }

  // ---------- input ----------
  jump() {
    if (this.mode !== 'run') return;
    if (this.inStation) return this.stationInput('A', true);
    const p = this.player;
    p.jumpBuffer = P.jumpBuffer;
    if (p.onGround) this.doJump();
  }

  doJump() {
    const p = this.player;
    p.vy = -P.jumpVelocity;
    p.onGround = false;
    p.slideT = 0;
    p.slideQueued = false;
    p.jumpBuffer = 0;
    this.emit('sfx', 'jump');
  }

  slide(held) {
    const was = this.slideHeld;
    this.slideHeld = held;
    if (this.mode !== 'run') return;
    if (this.inStation) {
      if (held !== was) this.stationInput('B', held);
      return;
    }
    if (!held) return;
    const p = this.player;
    if (p.onGround) {
      if (p.slideT <= 0) this.emit('sfx', 'slide');
      p.slideT = P.slideTime;
    } else {
      p.vy = Math.max(p.vy, P.fastFall);
      p.slideQueued = true;
    }
  }

  stationInput(key, down) {
    const st = this.station;
    if (st.phase !== 'active') return;
    const m = MECHANICS[st.def.mech];
    const [hits, misses] = [st.hits, st.misses];
    if (down) m.press?.(st, key);
    else m.release?.(st, key);
    if (st.hits > hits) this.emit('sfx', 'kudos');
    else if (st.misses > misses) this.emit('sfx', 'slide');
  }

  // ---------- derived values ----------
  get marathon() {
    return this.course === 'marathon';
  }

  get baseSpeed() {
    return this.course === 'marathon' ? MARATHON.baseSpeed : D.baseSpeed;
  }

  get score() {
    return Math.floor(Math.min(this.meters, this.finishM)) * SCORING.pointsPerMeter + this.itemScore + this.finishBonus;
  }

  // Distance shown to the player: real km in the arcade, symbolic km in the marathon.
  get displayKm() {
    const m = Math.min(this.meters, this.finishM);
    return this.marathon ? (m / this.finishM) * MARATHON.km : m / 1000;
  }

  get totalKm() {
    return this.marathon ? MARATHON.km : this.finishM / 1000;
  }

  get stageInfo() {
    return this.marathon ? MARATHON.stages[Math.max(0, this.stage)] : null;
  }

  // Ghost runner of the marathon: replays the best time (or the default one) with an accelerating
  // profile, like the player's own run. Gap in symbolic metres (> 0 = you are ahead).
  get ghostMeters() {
    const u = clamp(this.t / this.ghostTime, 0, 1);
    return this.finishM * ((u + 0.35 * u * u) / 1.35);
  }

  get ghostGap() {
    return ((this.meters - this.ghostMeters) / this.finishM) * MARATHON.km * 1000;
  }

  get levelInfo() {
    return LEVELS[this.level - 1];
  }

  get pace() {
    // Map scroll speed to a believable (and increasingly delusional) pace in sec/km.
    const f = clamp((this.speed - D.baseSpeed) / (D.maxSpeed - D.baseSpeed), -0.3, 1.4);
    return 360 - f * 165;
  }

  get inStation() {
    const ph = this.station?.phase;
    return ph === 'intro' || ph === 'active' || ph === 'outro';
  }

  // An obstacle is about to reach the runner: the UI holds back low-priority chatter.
  get imminent() {
    if (this.inStation) return false;
    const reach = this.speed * D.imminentSeconds;
    return this.obstacles.some((o) => !o.hit && o.x + (o.span || o.w) > PLAYER_X - 10 && o.x - PLAYER_X < reach);
  }

  targetSpeed() {
    const perKm = this.marathon ? MARATHON.speedPerKm : D.speedPerKm;
    return Math.min(
      D.maxSpeed,
      this.baseSpeed + (this.meters / 1000) * perKm + this.runT * D.speedPerSecond + (this.level - 1) * D.speedPerLevel,
    );
  }

  playerRect() {
    const p = this.player;
    return p.slideT > 0
      ? { x: PLAYER_X - P.slideW / 2, y: p.y - P.slideH, w: P.slideW, h: P.slideH }
      : { x: PLAYER_X - P.standW / 2, y: p.y - P.standH, w: P.standW, h: P.standH };
  }

  // Hitboxes of an obstacle. Groups only collide through members in the player's lane.
  obstacleBoxes(o) {
    if (o.members) {
      return o.members.filter((m) => m.lane === 'front').map((m) => ({
        x: o.x + m.dx - m.w / 2 + 2, y: GROUND_Y - m.h, w: m.w - 4, h: m.h,
      }));
    }
    const [inset, top, bottom] = OBSTACLES[o.type].box;
    return [{ x: o.x + inset, y: GROUND_Y - top, w: o.w - inset * 2, h: top - bottom }];
  }

  underFlyer() {
    return this.obstacles.some((o) => OBSTACLES[o.type].fly && !o.hit && o.x < PLAYER_X + 14 && o.x + o.w > PLAYER_X - 14);
  }

  // Current sprite key of the runner animation controller.
  get playerFrame() {
    const a = this.player.anim;
    return ANIMATIONS[a.state].frames[a.frame];
  }

  zoneAt(meters) {
    let z = this.zonePlan[0].zone;
    for (const entry of this.zonePlan) if (meters >= entry.fromM) z = entry.zone;
    return z;
  }

  updateAnim(h) {
    const p = this.player;
    const a = p.anim;
    const state = this.mode === 'attract' ? 'run'
      : p.invuln > P.hitInvuln - ANIMATIONS.hit.hold ? 'hit'
        : p.slideT > 0 ? 'slide'
          : !p.onGround ? 'jump' : 'run';
    if (state !== a.state) {
      a.state = state;
      a.frame = 0;
      a.t = 0;
    }
    const cfg = ANIMATIONS[state];
    let ft = cfg.frameTime;
    if (state === 'run') {
      ft = Math.max(cfg.minFrameTime, ft * (D.baseSpeed / Math.max(this.speed, 1))) * (this.stamina <= 0 ? 1.2 : 1);
    }
    a.t += h;
    while (a.t >= ft) {
      a.t -= ft;
      a.frame = (a.frame + 1) % cfg.frames.length;
    }
  }

  // ---------- update ----------
  update(dt) {
    const steps = Math.ceil(dt / STEP);
    const h = dt / steps;
    for (let i = 0; i < steps; i++) {
      if (this.mode !== 'run' && this.mode !== 'attract') break;
      this.step(h);
    }
  }

  step(h) {
    const p = this.player;
    const attract = this.mode === 'attract';
    if (!attract && this.inStation) {
      this.stepStation(h);
      return;
    }
    const st = this.station;

    let target = attract ? 110 : this.targetSpeed();
    if (!attract) {
      if (this.boostT > 0) target *= BOOST.speedMult;
      if (this.stamina <= 0) target *= STAMINA.exhaustedSpeedMult;
      if (this.sandT > 0) target *= SAND.speedMult;
      if (this.crisisT > 0) target *= MARATHON.stomach.crisisSpeedMult;
      if (this.marathon) {
        target *= this.stageInfo.sprint ?? 1;
        if (this.sprintT > 0) target *= MARATHON.sprintMult;
      }
      // Ease into the station instead of stopping dead.
      if (st?.phase === 'approach') {
        const d = st.x - PLAYER_X;
        if (d < ST.approachPx) target = Math.max(45, (target * d) / ST.approachPx);
      }
    }
    this.speed += (target - this.speed) * Math.min(1, h * 5);
    this.traveled += this.speed * h;
    this.meters = this.traveled * METERS_PER_PX;
    p.phase += h * (6 + this.speed / 40);

    this.updateZone(h, attract);
    this.updateProps(h);
    this.updateFx(h);
    this.updateAnim(h);
    if (attract) return;

    this.t += h;
    this.runT += h;
    this.paceSum += this.pace * h;
    if (this.marathon) this.updateStage();

    // stamina
    const before = this.stamina;
    const drain = this.marathon ? this.stageInfo.drain : STAMINA.drainPerSec;
    const boostMult = this.marathon ? MARATHON.boostDrainMult : STAMINA.boostDrainMult;
    this.stamina = Math.max(0, this.stamina - drain * (this.boostT > 0 ? boostMult : 1) * h);
    if (before > 0 && this.stamina === 0) {
      this.say(this.marathon && this.stageInfo.choice
        ? 'Il muro! Le gambe hanno abbandonato il gruppo WhatsApp.'
        : 'Crisi! Le gambe hanno abbandonato il gruppo WhatsApp.', 'bad', PRIO.high);
      this.emit('sfx', 'bonk');
    }

    // timers
    if (p.invuln > 0) p.invuln -= h;
    this.boostT = Math.max(0, this.boostT - h);
    this.multT = Math.max(0, this.multT - h);
    this.sandT = Math.max(0, this.sandT - h);
    this.crisisT = Math.max(0, this.crisisT - h);
    this.sprintT = Math.max(0, this.sprintT - h);
    this.gutT = Math.max(0, this.gutT - h); // the gel joke window simply expires
    if (this.marathon) this.stomach = Math.max(0, this.stomach - MARATHON.stomach.decayPerSec * h);
    this.comboT -= h;
    if (this.comboT <= 0) this.combo = 0;
    this.kudosQuoteT -= h;

    // player physics
    p.jumpBuffer -= h;
    if (p.jumpBuffer > 0 && p.onGround) this.doJump();
    if (!p.onGround) {
      p.vy += P.gravity * h;
      p.y += p.vy * h;
      if (p.y >= GROUND_Y) {
        p.y = GROUND_Y;
        p.vy = 0;
        p.onGround = true;
        this.burst(PLAYER_X, GROUND_Y, [C.cream, '#C9A26B'], 5, 60, 0.3);
        if (p.slideQueued) {
          p.slideQueued = false;
          p.slideT = P.slideTime;
          this.emit('sfx', 'slide');
        }
      }
    }
    if (p.slideT > 0) {
      p.slideT -= h;
      // Keep sliding while held or still under a flyer: never stand up into it.
      if (p.slideT <= 0 && (this.slideHeld || this.underFlyer())) p.slideT = 0.05;
      if (Math.random() < 0.3) this.particles.push(this.particle(PLAYER_X + 8, GROUND_Y - 1, rand(-80, -20), rand(-40, -10), '#C9A26B', 0.3, 2));
    }

    // spawning: a due HYROX station takes the next obstacle slot (so it inherits its fair gap)
    if (this.traveled >= this.nextObstacleAt && this.meters < this.finishM - D.finishClearM) {
      if (!this.station && this.stationQueue.length && this.meters >= this.stationQueue[0].m) this.spawnStation();
      else this.spawnObstacle();
    }

    // movement: everything scrolls with the world, minus its own speed v
    for (const o of this.obstacles) {
      o.x -= (this.speed - o.v) * h;
      o.anim += h;
      if (o.knocked) o.knockT += h;
    }
    for (const it of this.items) {
      it.x -= (this.speed - it.v) * h;
      it.bob += h * 4;
    }
    if (st) {
      st.x -= this.speed * h;
      if (st.phase === 'approach' && st.x <= PLAYER_X) this.beginStation();
      else if (st.phase === 'done' && st.x < -170) this.station = null;
      if (this.inStation) return;
    }

    // hints the first time each obstacle family shows up
    for (const o of this.obstacles) {
      const cfg = OBSTACLES[o.type];
      const kind = o.type === 'runclub' ? 'club' : cfg.soft ? 'sand' : cfg.fly ? 'slide' : 'jump';
      if (!this.hintsShown[kind] && o.x < W - 40) {
        this.hintsShown[kind] = true;
        const text = {
          jump: 'Salta! SPAZIO / ↑ / tocca a sinistra',
          slide: 'Scivola sotto! ↓ / S / tocca a destra',
          club: 'Run club! Salta solo chi corre nella tua corsia',
          sand: 'Sabbia! Saltala per non rallentare',
        }[kind];
        this.say(text, 'info', PRIO.high);
      }
    }

    // collisions
    const pr = this.playerRect();
    for (const o of this.obstacles) {
      if (o.hit || !this.obstacleBoxes(o).some((b) => overlap(pr, b))) continue;
      if (OBSTACLES[o.type].soft) {
        if (p.onGround) this.onSand(o);
        continue;
      }
      this.onHit(o);
      if (this.mode !== 'run') return;
    }
    for (const it of this.items) {
      if (!it.taken && overlap(pr, { x: it.x - 9, y: it.y - 9, w: 18, h: 18 })) this.collect(it);
    }

    // overtaken groups: bonus + joke
    for (const o of this.obstacles) {
      if (!o.members || o.passed || o.x + o.laneEnd >= PLAYER_X - 12) continue;
      o.passed = true;
      if (o.hit) continue;
      if (o.type === 'runclub') {
        this.itemScore += RUN_CLUB.passBonus;
        this.kudos += RUN_CLUB.passKudos;
        this.texts.push({ x: PLAYER_X + 24, y: GROUND_Y - 58, text: `+${RUN_CLUB.passBonus} SORPASSO`, life: 1.2, color: C.lime });
        this.say(joke('runclub'), 'good', PRIO.normal);
        this.addBrainrot(RUN_CLUB.passBrainrot);
      } else if (Math.random() < 0.4) {
        this.say(joke(o.type === 'dogwalk' ? 'dogwalk' : 'nonna'), 'good', PRIO.low);
      }
    }
    this.obstacles = this.obstacles.filter((o) => o.x + (o.span || o.w) > -60);
    this.items = this.items.filter((it) => it.x > -30 && !it.taken);

    // social feed
    if (!this.marathon && this.meters >= this.nextKm * 1000 && this.nextKm < this.finishM / 1000) {
      this.emit('toast', { title: `SPLIT KM ${this.nextKm}`, body: `${formatPace(this.pace)}/km. L'orologio ha vibrato con disapprovazione.` });
      this.nextKm++;
    }
    this.feedT -= h;
    if (this.feedT <= 0) {
      this.feedT = rand(12, 18);
      const r = Math.random();
      if (this.level >= 3 && r < 0.3) {
        this.say(joke('brainrot'), 'good', PRIO.low);
      } else if (r < 0.55) {
        this.emit('toast', { title: 'NOTIFICA GARMIN', body: joke('garmin') });
      } else if (r < 0.68) {
        this.emit('toast', { title: 'DIARIO ALIMENTARE', body: joke('gallette') });
      } else {
        const club = Math.random() < 0.4;
        this.emit('toast', { title: club ? 'CHAT DEL RUN CLUB' : 'FEED ATTIVITÀ', body: joke(club ? 'club' : 'feed') });
      }
    }
    if (this.level >= 5) {
      this.memeT -= h;
      if (this.memeT <= 0) {
        this.memeT = rand(8, 12);
        this.memeEffect();
      }
    }

    this.checkUnlock();
    if (this.meters >= this.finishM) this.end(true);
  }

  updateZone(h, attract) {
    const z = attract ? Math.floor(this.meters / 400) % ZONES.length : this.zoneAt(this.meters);
    if (z !== this.zone) {
      this.prevZone = this.zone;
      this.zone = z;
      this.zoneBlend = 0;
      // In the marathon the stage announcement already says where you are.
      if (!attract && !this.marathon) this.emit('toast', { title: `NUOVA ZONA · ${ZONES[z].name}`, body: ZONES[z].intro });
    }
    this.zoneBlend = Math.min(1, this.zoneBlend + h / 1.2);
  }

  updateStage() {
    const km = this.displayKm;
    let s = MARATHON.stages.findIndex((x) => km < x.toKm);
    if (s < 0) s = MARATHON.stages.length - 1;
    if (s === this.stage) return;
    this.stage = s;
    this.bag = [];
    const info = MARATHON.stages[s];
    this.emit('stage', { index: s, total: MARATHON.stages.length, name: info.name, intro: info.intro });
  }

  updateProps(h) {
    if (this.traveled >= this.nextPropAt) {
      const zone = ZONES[this.zone];
      const crowd = this.marathon || zone.id === 'marathon';
      const r = Math.random();
      const x = W + 10;
      if (crowd && r < 0.35) {
        this.props.push({ type: 'crowd', x, n: randInt(3, 5), sign: billboardLine('marathon'), seed: Math.random() * 100 });
      } else if (crowd && r < 0.5) {
        this.props.push({ type: 'ristoro', x });
      } else {
        this.props.push({ type: 'billboard', x, zone: zone.id, ...nextBillboard(zone.billboards) });
      }
      this.nextPropAt = this.traveled + rand(620, 1000);
    }
    for (const pr of this.props) pr.x -= this.speed * 0.55 * h;
    this.props = this.props.filter((pr) => pr.x > -150);
  }

  updateFx(h) {
    for (const pt of this.particles) {
      pt.vy += pt.g * h;
      pt.x += pt.vx * h;
      pt.y += pt.vy * h;
      pt.life -= h;
    }
    this.particles = this.particles.filter((pt) => pt.life > 0);
    for (const tx of this.texts) {
      tx.y -= 24 * h;
      tx.life -= h;
    }
    this.texts = this.texts.filter((tx) => tx.life > 0);
    this.shake = Math.max(0, this.shake - h * 30);
    this.flash = Math.max(0, this.flash - h);
  }

  // ---------- HYROX stations ----------
  spawnStation() {
    const q = this.stationQueue.shift();
    this.station = Object.assign(createStation(q.i), { n: q.n, phase: 'approach', x: W + 40 });
    this.nextObstacleAt = Infinity; // nothing else until the station is over
  }

  beginStation() {
    const st = this.station;
    const p = this.player;
    Object.assign(st, { phase: 'intro', t: 0, x: PLAYER_X });
    this.speed = 0;
    Object.assign(p, { y: GROUND_Y, vy: 0, onGround: true, slideT: 0, slideQueued: false, jumpBuffer: 0 });
    this.emit('sfx', 'pickup');
  }

  stepStation(h) {
    const st = this.station;
    this.t += h;
    st.t += h;
    if (st.fb && (st.fb.t -= h) <= 0) st.fb = null;
    this.updateFx(h);
    this.updateAnim(h);
    if (st.phase === 'intro') {
      if (st.t >= ST.intro) {
        Object.assign(st, { phase: 'active', t: 0 });
        if (this.slideHeld && MECHANICS[st.def.mech].holdStart) MECHANICS[st.def.mech].press(st, 'B');
      }
    } else if (st.phase === 'active') {
      MECHANICS[st.def.mech].update(st, h, this.slideHeld);
      if (st.progress >= 100 || st.t >= st.def.time) this.finishStation();
    } else if (st.t >= ST.outro) {
      st.phase = 'done';
      this.nextObstacleAt = this.traveled + ST.resumeGapPx;
      this.nextType = this.pickType();
    }
  }

  finishStation() {
    const st = this.station;
    const done = st.progress >= 100;
    const points = stationPoints(st);
    st.result = { done, points, accuracy: stationAccuracy(st) };
    st.phase = 'outro';
    st.t = 0;
    this.itemScore += points;
    if (done) {
      this.stationsDone++;
      this.confetti(this.reducedMotion ? 6 : 18);
    }
    this.texts.push({ x: PLAYER_X + 34, y: GROUND_Y - 66, text: `+${points}`, life: 1.3, color: C.lime });
    this.say(done ? stationJoke(st.def.id) : `${st.def.name}: tempo scaduto. La Roxzone ti aspetta.`, done ? 'good' : 'bad', PRIO.normal);
    this.emit('sfx', done ? 'levelup' : 'bonk');
    this.addBrainrot(done ? st.def.brainrot : 1);
    this.checkUnlock();
  }

  // ---------- spawning ----------
  pickType() {
    const zoneId = ZONES[this.zone].id;
    const avail = Object.entries(OBSTACLES).filter(([, o]) =>
      this.meters >= o.minM && this.level >= (o.minLevel || 0) && (!o.zones || o.zones.includes(zoneId)));
    let r = Math.random() * avail.reduce((s, [, o]) => s + o.weight, 0);
    for (const [type, o] of avail) {
      r -= o.weight;
      if (r <= 0) return type;
    }
    return avail[0][0];
  }

  // Schedules the next spawn after obstacle `o` (just spawned at x = W + 20).
  scheduleNext(o) {
    const type = this.pickType();
    const S = this.targetSpeed(); // un-boosted, so gaps stay fair once a boost ends
    const prog = clamp(this.meters / (this.finishM * D.rampShare), 0, 1);
    const secs = Math.max(D.minGapSeconds, lerp(D.gapStart, D.gapEnd, prog) - (this.level - 1) * D.gapPerLevel)
      * (1 + Math.random() * D.gapJitter);
    const span = o.span || o.w;
    let gap = S * secs + span;
    if (o.v > 0) {
      // Slower than the world (run club, grannies, dog walkers): the next obstacle must not catch up
      // with them before they are past the runner, plus the usual reaction time.
      const tailArrives = (o.x + span - PLAYER_X) / (S - o.v);
      gap = Math.max(gap, S * (tailArrives + secs) - (W + 20 - PLAYER_X));
    }
    // Something walking/flying towards the runner arrives early: give that time back.
    const towards = type === 'nonna' ? NONNA.walkSpeed : Math.max(0, -(OBSTACLES[type].v || 0));
    gap += ((W + 20 - PLAYER_X) * towards) / S;
    gap += OBSTACLES[type].extraGap || 0;
    if (OBSTACLES[o.type].fly) gap += OBSTACLES[o.type].extraGap;
    if (OBSTACLES[type].group) gap += 30;
    this.nextType = type;
    this.nextObstacleAt = this.traveled + gap;
    return gap;
  }

  spawnObstacle() {
    const type = this.nextType;
    const cfg = OBSTACLES[type];
    const base = { type, x: W + 20, v: cfg.v || 0, w: cfg.w || 0, hit: false, knocked: false, knockT: 0, anim: Math.random() * 10 };
    const make = { runclub: this.makeRunClub, nonna: this.makeNonna, dogwalk: this.makeDogwalk }[type];
    const o = make ? make.call(this, base) : base;
    this.obstacles.push(o);

    // Rewards along the path you have to take anyway.
    if (type === 'runclub') {
      for (const m of o.members) if (m.lane === 'front') this.addItem('kudos', o.x + m.dx, GROUND_Y - 58, o.v);
    } else if (cfg.fly) {
      if (Math.random() < 0.7) for (let i = -1; i <= 1; i++) this.addItem('kudos', o.x + o.w / 2 + i * 14, GROUND_Y - 9, o.v);
    } else if (!cfg.group && !cfg.soft && Math.random() < 0.5) {
      const cx = o.x + o.w / 2;
      [[-16, 50], [0, 62], [16, 50]].forEach(([dx, dy]) => this.addItem('kudos', cx + dx, GROUND_Y - dy, o.v));
    }

    const gap = this.scheduleNext(o);
    // Gap items only between static/fast obstacles: slow groups would drift through them.
    if (cfg.group || OBSTACLES[this.nextType].group) return;
    const mid = o.x + o.w + (gap - o.w) / 2;
    if (this.marathon && this.stageInfo.choice) {
      // The wall: water on the ground, or jump for the power-up. Not both.
      this.addItem('water', mid, GROUND_Y - 13);
      this.addItem(pick(['boost', 'galletta', 'gel']), mid, GROUND_Y - 62);
    } else if (Math.random() < 0.65) {
      this.addItem(this.nextBagItem(), mid, GROUND_Y - 13);
    } else if (Math.random() < 0.6) {
      for (let i = -1; i <= 1; i++) this.addItem('kudos', mid + i * 16, GROUND_Y - 13);
    }
  }

  makeRunClub(o) {
    const S = this.targetSpeed();
    o.v = S * rand(...RUN_CLUB.speedFactor);
    // Worst-case relative speed by the time they arrive (speed creep, boost), with margin.
    const rel = (Math.min(D.maxSpeed, S * 1.1) - o.v) * BOOST.speedMult;
    const kinds = shuffle(Object.keys(ARCHETYPES));
    const club = this.marathon
      ? { name: pick(['PACER 3:00', 'PACER 3:30', 'PACER 2:59*', 'PACER 4:00']), color: C.orange }
      : { name: pick(RUN_CLUB.names), color: pick(RUN_CLUB.colors) };
    const total = randInt(...RUN_CLUB.size);
    const inLane = Math.min(total, randInt(...RUN_CLUB.inLane));
    const members = [];
    let dx = 0;
    for (let i = 0; i < inLane; i++) {
      members.push({ dx, lane: 'front', w: RUN_CLUB.memberW, h: RUN_CLUB.memberH, look: makeLook(kinds[i], club.color), phase: rand(0, 6), scale: rand(0.96, 1.04) });
      // Room to land and jump again: one airtime of relative travel + both bodies + slack.
      dx += rel * (P.jumpVelocity * 2 / P.gravity) + RUN_CLUB.memberW + P.standW + RUN_CLUB.laneGapMin + rand(0, 25);
    }
    const laneEnd = members[members.length - 1].dx + RUN_CLUB.memberW / 2;
    for (let i = inLane; i < total; i++) {
      members.push({ dx: rand(-18, laneEnd + 18), lane: 'back', w: RUN_CLUB.memberW, h: RUN_CLUB.memberH, look: makeLook(kinds[i], club.color), phase: rand(0, 6), scale: rand(0.84, 0.9) });
    }
    return Object.assign(o, { members, laneEnd, span: laneEnd + 24, w: RUN_CLUB.memberW, club });
  }

  makeNonna(o) {
    const variant = pick(['bag', 'cart', 'pair', 'cross']);
    const towards = variant !== 'cross' && variant !== 'pair' && Math.random() < 0.35;
    o.v = towards ? -NONNA.walkSpeed : NONNA.walkSpeed;
    const facing = towards ? -1 : 1;
    const look = pick(NONNA.looks);
    const prop = variant === 'cart' ? 'cart' : 'bag';
    const w = prop === 'cart' ? 30 : 20;
    // A couple can also cross slowly together: the front one steps into the lane.
    const cross = variant === 'cross' || (variant === 'pair' && Math.random() < 0.5);
    const members = [{ dx: 0, lane: 'front', w, h: NONNA.boxH, look, prop, facing, cross }];
    if (variant === 'pair') {
      members.push({ dx: 10, lane: 'back', w: 20, h: NONNA.boxH, look: pick(NONNA.looks.filter((l) => l !== look)), prop: 'bag', facing });
    }
    return Object.assign(o, { members, laneEnd: w / 2, span: w / 2 + 14, w });
  }

  makeDogwalk(o) {
    o.v = DOGWALK.speed;
    const members = [
      { dx: 0, lane: 'front', w: DOGWALK.dogW, h: DOGWALK.dogH, kind: 'dog' },
      { dx: -DOGWALK.leash, lane: 'back', w: 20, h: NONNA.boxH, kind: 'owner', look: pick(NONNA.looks), prop: 'bag', facing: 1 },
    ];
    return Object.assign(o, { members, laneEnd: DOGWALK.dogW / 2, span: DOGWALK.dogW / 2 + 14, w: DOGWALK.dogW });
  }

  nextBagItem() {
    if (this.stamina < STAMINA.low && Math.random() < 0.45) return 'water';
    if (this.lives < 3 && Math.random() < 0.08) return 'health';
    if (!this.bag.length) this.bag = shuffle(this.marathon ? this.stageInfo.bag : ITEM_BAG);
    const next = this.bag.pop();
    return next === 'health' && this.lives >= 3 ? 'exp' : next;
  }

  addItem(type, x, y, v = 0) {
    const sprites = ITEMS[type].sprites;
    this.items.push({ type, x, y, v, sprite: sprites.length ? pick(sprites) : null, bob: Math.random() * 6, taken: false });
  }

  // ---------- events ----------
  // A gel picked up shortly before a collision turns the hit line into a gut joke, once per gel.
  takeGutJoke() {
    if (this.gutT <= 0) return null;
    this.gutT = 0;
    return joke('gut');
  }

  onHit(o) {
    const p = this.player;
    if (this.boostT > 0) {
      o.hit = true;
      o.knocked = true;
      this.burst(o.x + (o.w || 20) / 2, GROUND_Y - 12, [C.orange, C.lime, C.cream], 14, 160);
      const gut = this.takeGutJoke();
      this.say(gut ?? 'Turbo zuccherino! Ostacolo eliminato.', gut ? 'bad' : 'good', gut ? PRIO.high : PRIO.normal);
      this.emit('sfx', 'smash');
      return;
    }
    if (p.invuln > 0) return;
    o.hit = true;
    this.lives--;
    p.invuln = P.hitInvuln;
    this.combo = 0;
    this.comboT = 0;
    this.shake = 7;
    this.flash = 0.25;
    this.flashColor = C.red;
    this.burst(PLAYER_X, p.y - 16, [C.red, C.cream, C.orange], 16, 150);
    const line = this.takeGutJoke() ?? (o.type === 'nonna' ? joke('nonna') : pick(HIT_REACTIONS[o.type]));
    this.say(line, 'bad', PRIO.high);
    this.emit('sfx', 'hit');
    if (this.lives <= 0) this.end(false);
  }

  onSand(o) {
    if (!o.touched) {
      o.touched = true;
      if (this.sandT <= 0) this.say(joke('sand'), 'info', PRIO.low);
      this.burst(PLAYER_X + 6, GROUND_Y - 2, ['#F2D59B', '#E2BF85'], 8, 70, 0.4);
    }
    this.sandT = SAND.slowTime;
  }

  feedStomach(v) {
    this.stomach += v;
    if (this.stomach >= 100 && this.crisisT <= 0) {
      this.stomach = 60;
      this.crisisT = MARATHON.stomach.crisisTime;
      this.say(joke('gut'), 'bad', PRIO.high);
      this.emit('sfx', 'bonk');
    }
  }

  collect(it) {
    it.taken = true;
    const cfg = ITEMS[it.type];
    const fuel = this.marathon && it.type === 'gel'; // marathon gel: energy, not turbo
    let pts = cfg.points;
    if (it.type === 'kudos') {
      this.combo = this.comboT > 0 ? Math.min(this.combo + 1, SCORING.comboMax) : 1;
      this.comboT = SCORING.comboWindow;
      pts *= this.combo;
      this.kudos++;
      if (this.marathon && this.stageInfo.sprint) this.sprintT = MARATHON.sprintKudos;
    }
    if (this.multT > 0) pts *= SCORING.multiplier;
    this.itemScore += pts;

    if (it.type === 'shoes') this.shoes++;
    if (it.type === 'bib') this.multT = SCORING.multiplierTime;
    if (it.type === 'gel') this.gutT = GUT.window;
    if (cfg.boost && !fuel) this.boostT = Math.max(this.boostT, cfg.boost);
    const stamina = fuel ? MARATHON.gelStamina : cfg.stamina;
    if (stamina) this.stamina = Math.min(STAMINA.max, this.stamina + stamina);
    if (cfg.streak) {
      this.combo = SCORING.comboMax;
      this.comboT = SCORING.comboWindow * 2;
    }
    let label = `+${pts}`;
    if (cfg.life) {
      if (this.lives < 3) {
        this.lives++;
        label = '+1 VITA';
      } else {
        this.itemScore += 100;
        label = '+100';
      }
    }
    if (it.type === 'water' || fuel) label = `+${stamina} ENERGIA`;
    if (it.type === 'bib') label = `PUNTI x${SCORING.multiplier}`;
    if (it.type === 'brainrot') label = '+BRAINROT';
    this.texts.push({ x: it.x, y: it.y - 10, text: label, life: 1.1, color: it.type === 'kudos' ? C.gold : C.lime });
    this.burst(it.x, it.y, ITEM_COLORS[it.type], it.type === 'kudos' ? 6 : 12, 110);
    this.emit('sfx', it.type === 'kudos' ? 'kudos' : 'pickup');

    if (it.type === 'kudos') {
      if (this.firstKudos) {
        this.firstKudos = false;
        this.emit('toast', { title: 'FEED ATTIVITÀ', body: 'Qualcuno ti ha dato 1 kudos. Ora puoi dormire.' });
      } else if (this.kudosQuoteT <= 0) {
        this.kudosQuoteT = 14;
        this.say(joke('kudos'), 'good', PRIO.low);
      }
    } else {
      this.say(joke(cfg.jokes), 'good', PRIO.normal);
    }
    if (this.marathon) {
      if (it.type === 'gel') this.feedStomach(MARATHON.stomach.perGel);
      if (it.type === 'galletta') this.feedStomach(MARATHON.stomach.perGalletta);
    }
    this.addBrainrot(cfg.brainrot);
  }

  addBrainrot(v) {
    this.brainrot = Math.min(100, this.brainrot + v);
    let lv = 1;
    LEVELS.forEach((L, i) => { if (this.brainrot >= L.min) lv = i + 1; });
    if (lv > this.level) {
      this.level = lv;
      this.maxLevel = Math.max(this.maxLevel, lv);
      this.flash = 0.35;
      this.flashColor = C.lime;
      this.confetti(this.reducedMotion ? 10 : 40);
      this.emit('levelup', { level: lv, ...LEVELS[lv - 1] });
      this.emit('sfx', 'levelup');
    }
  }

  // MARATONA BRAINROT unlocks the moment one arcade run reaches the threshold (single-run score).
  checkUnlock() {
    if (this.course !== 'arcade' || this.marathonUnlocked || this.score < MARATHON.unlockScore) return;
    this.marathonUnlocked = true;
    this.unlockedNow = true;
    this.emit('unlock', { score: this.score });
  }

  memeEffect() {
    const r = Math.random();
    if (r < 0.25) {
      this.confetti(this.reducedMotion ? 8 : 30);
      this.say('NUOVO PB? (Probabilmente no)', 'level', PRIO.low);
    } else if (r < 0.4) {
      this.say(`Controllo pace: ${formatPace(this.pace)}/km. Sospetto.`, 'info', PRIO.low);
    } else if (r < 0.65) {
      this.say(joke('brainrot'), 'good', PRIO.low);
    } else {
      this.emit('toast', joke('memes'));
    }
  }

  end(finished) {
    if (this.mode !== 'run') return;
    this.mode = 'over';
    const ghostBeaten = this.marathon && finished && this.t < this.ghostTime;
    if (finished) {
      this.meters = this.finishM;
      this.finishBonus = this.marathon
        ? MARATHON.finishBonus + this.lives * MARATHON.lifeBonus + (ghostBeaten ? MARATHON.ghostBonus : 0)
        : SCORING.finishBonus + this.lives * SCORING.lifeBonus;
      this.confetti(this.reducedMotion ? 10 : 60);
    }
    this.checkUnlock();
    const peak = LEVELS[this.maxLevel - 1];
    this.result = {
      course: this.course,
      finished,
      score: this.score,
      meters: Math.min(this.meters, this.finishM),
      km: this.displayKm,
      time: this.t,
      symbolicTime: this.t * MARATHON.timeFactor,
      pace: this.runT > 0 ? this.paceSum / this.runT : 0,
      kudos: this.kudos,
      shoes: this.shoes,
      stations: this.stationsDone,
      stationsTotal: ARCADE.stationsAt.length,
      ghostBeaten,
      unlocked: this.unlockedNow,
      maxLevel: this.maxLevel,
      maxLevelTitle: peak.title,
      maxLevelRank: peak.rank,
      maxLevelVariant: peak.variant,
      lives: this.lives,
    };
    this.emit('sfx', finished ? 'finish' : 'gameover');
    this.emit('gameover', this.result);
  }

  // ---------- fx ----------
  particle(x, y, vx, vy, color, life, size = 2, g = 300) {
    return { x, y, vx, vy, color, life, max: life, size, g };
  }

  burst(x, y, colors, n, power = 100, life = 0.6) {
    if (this.reducedMotion) n = Math.ceil(n / 3);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = rand(0.3, 1) * power;
      this.particles.push(this.particle(x, y, Math.cos(a) * v, Math.sin(a) * v - power * 0.3, pick(colors), rand(life * 0.6, life), Math.random() < 0.3 ? 3 : 2));
    }
  }

  confetti(n) {
    const colors = [C.orange, C.lime, C.blue, C.cream, C.gold];
    for (let i = 0; i < n; i++) {
      this.particles.push(this.particle(rand(0, W), rand(-20, 0), rand(-30, 30), rand(20, 80), pick(colors), rand(1.2, 2.2), 3, 60));
    }
  }
}
