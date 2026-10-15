import {
  W, GROUND_Y, PLAYER_X, METERS_PER_PX, FINISH_M, COLORS as C,
  PHYSICS as P, DIFFICULTY as D, OBSTACLES, RUN_CLUB, NONNA, STAMINA, SCORING, BOOST,
  ITEMS, ITEM_BAG, LEVELS, ZONES, HIT_REACTIONS, ANIMATIONS,
} from './config.js';
import { joke } from './jokes.js';

const rand = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(rand(a, b + 1));
const pick = (arr) => arr[(Math.random() * arr.length) | 0];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
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
};

export function formatPace(secPerKm) {
  const s = Math.round(secPerKm);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export class Game {
  constructor(emit, reducedMotion = false) {
    this.emit = emit;
    this.reducedMotion = reducedMotion;
    this.toAttract();
  }

  toAttract() {
    this.reset();
    this.mode = 'attract';
  }

  reset() {
    this.mode = 'run';
    this.t = 0;
    this.paceSum = 0;
    this.traveled = 0;
    this.meters = 0;
    this.speed = D.baseSpeed;
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
    this.zone = 0;
    this.prevZone = 0;
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
    this.slideHeld = held;
    if (!held || this.mode !== 'run') return;
    const p = this.player;
    if (p.onGround) {
      if (p.slideT <= 0) this.emit('sfx', 'slide');
      p.slideT = P.slideTime;
    } else {
      p.vy = Math.max(p.vy, P.fastFall);
      p.slideQueued = true;
    }
  }

  // ---------- derived values ----------
  get score() {
    return Math.floor(Math.min(this.meters, FINISH_M)) * SCORING.pointsPerMeter + this.itemScore + this.finishBonus;
  }

  get levelInfo() {
    return LEVELS[this.level - 1];
  }

  get pace() {
    // Map scroll speed to a believable (and increasingly delusional) pace in sec/km.
    const f = clamp((this.speed - D.baseSpeed) / (D.maxSpeed - D.baseSpeed), -0.3, 1.4);
    return 360 - f * 165;
  }

  // An obstacle is about to reach the runner: the UI holds back low-priority chatter.
  get imminent() {
    const reach = this.speed * D.imminentSeconds;
    return this.obstacles.some((o) => !o.hit && o.x + (o.span || o.w) > PLAYER_X - 10 && o.x - PLAYER_X < reach);
  }

  targetSpeed() {
    return Math.min(
      D.maxSpeed,
      D.baseSpeed + (this.meters / 1000) * D.speedPerKm + this.t * D.speedPerSecond + (this.level - 1) * D.speedPerLevel,
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

    let target = attract ? 110 : this.targetSpeed();
    if (!attract && this.boostT > 0) target *= BOOST.speedMult;
    if (!attract && this.stamina <= 0) target *= STAMINA.exhaustedSpeedMult;
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
    this.paceSum += this.pace * h;

    // stamina
    const before = this.stamina;
    this.stamina = Math.max(0, this.stamina - STAMINA.drainPerSec * (this.boostT > 0 ? STAMINA.boostDrainMult : 1) * h);
    if (before > 0 && this.stamina === 0) {
      this.say('Crisi! Le gambe hanno abbandonato il gruppo WhatsApp.', 'bad', PRIO.high);
      this.emit('sfx', 'bonk');
    }

    // timers
    if (p.invuln > 0) p.invuln -= h;
    this.boostT = Math.max(0, this.boostT - h);
    this.multT = Math.max(0, this.multT - h);
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

    // spawning
    if (this.traveled >= this.nextObstacleAt && this.meters < FINISH_M - D.finishClearM) this.spawnObstacle();

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

    // hints the first time each obstacle family shows up
    for (const o of this.obstacles) {
      const kind = o.type === 'runclub' ? 'club' : OBSTACLES[o.type].fly ? 'slide' : 'jump';
      if (!this.hintsShown[kind] && o.x < W - 40) {
        this.hintsShown[kind] = true;
        const text = {
          jump: 'Salta! SPAZIO / ↑ / tocca a sinistra',
          slide: 'Scivola sotto! ↓ / S / tocca a destra',
          club: 'Run club! Salta solo chi corre nella tua corsia',
        }[kind];
        this.say(text, 'info', PRIO.high);
      }
    }

    // collisions
    const pr = this.playerRect();
    for (const o of this.obstacles) {
      if (!o.hit && this.obstacleBoxes(o).some((b) => overlap(pr, b))) this.onHit(o);
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
        this.say(joke('nonna'), 'good', PRIO.low);
      }
    }
    this.obstacles = this.obstacles.filter((o) => o.x + (o.span || o.w) > -60);
    this.items = this.items.filter((it) => it.x > -30 && !it.taken);

    // social feed
    if (this.meters >= this.nextKm * 1000 && this.nextKm < FINISH_M / 1000) {
      this.emit('toast', { title: `SPLIT KM ${this.nextKm}`, body: `${formatPace(this.pace)}/km. L'orologio ha vibrato con disapprovazione.` });
      this.nextKm++;
    }
    this.feedT -= h;
    if (this.feedT <= 0) {
      this.feedT = rand(12, 18);
      if (this.level >= 3 && Math.random() < 0.4) {
        this.say(joke('brainrot'), 'good', PRIO.low);
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

    if (this.meters >= FINISH_M) this.end(true);
  }

  updateZone(h, attract) {
    let z = 0;
    ZONES.forEach((zone, i) => { if (this.meters >= zone.fromM) z = i; });
    if (attract) z = Math.floor(this.meters / 400) % ZONES.length;
    if (z !== this.zone) {
      this.prevZone = this.zone;
      this.zone = z;
      this.zoneBlend = 0;
      if (!attract) this.emit('toast', { title: 'NUOVA ZONA', body: `${ZONES[z].name}. Caccia ai segmenti aperta.` });
    }
    this.zoneBlend = Math.min(1, this.zoneBlend + h / 1.2);
  }

  updateProps(h) {
    if (this.traveled >= this.nextPropAt) {
      const r = Math.random();
      const type = r < 0.45 ? 'club' : r < 0.75 ? 'hyrox' : 'coffee';
      this.props.push({ type, x: W + 10, variant: (Math.random() * 3) | 0 });
      this.nextPropAt = this.traveled + rand(700, 1200);
    }
    for (const pr of this.props) pr.x -= this.speed * 0.55 * h;
    this.props = this.props.filter((pr) => pr.x > -140);
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

  // ---------- spawning ----------
  pickType() {
    const avail = Object.entries(OBSTACLES).filter(([, o]) => this.meters >= o.minM && this.level >= (o.minLevel || 0));
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
    const prog = clamp(this.meters / D.rampMeters, 0, 1);
    const secs = Math.max(D.minGapSeconds, lerp(D.gapStart, D.gapEnd, prog) - (this.level - 1) * D.gapPerLevel)
      * (1 + Math.random() * D.gapJitter);
    const span = o.span || o.w;
    let gap = S * secs + span;
    if (o.v > 0) {
      // Slower than the world (run club, grannies): the next obstacle must not catch up with
      // them before they are past the runner, plus the usual reaction time.
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
    const o = type === 'runclub' ? this.makeRunClub(base) : type === 'nonna' ? this.makeNonna(base) : base;
    this.obstacles.push(o);

    // Rewards along the path you have to take anyway.
    if (type === 'runclub') {
      for (const m of o.members) if (m.lane === 'front') this.addItem('kudos', o.x + m.dx, GROUND_Y - 58, o.v);
    } else if (cfg.fly) {
      if (Math.random() < 0.7) for (let i = -1; i <= 1; i++) this.addItem('kudos', o.x + o.w / 2 + i * 14, GROUND_Y - 9, o.v);
    } else if (!cfg.group && Math.random() < 0.5) {
      const cx = o.x + o.w / 2;
      [[-16, 50], [0, 62], [16, 50]].forEach(([dx, dy]) => this.addItem('kudos', cx + dx, GROUND_Y - dy, o.v));
    }

    const gap = this.scheduleNext(o);
    // Gap items only between static/fast obstacles: slow groups would drift through them.
    if (cfg.group || OBSTACLES[this.nextType].group) return;
    const mid = o.x + o.w + (gap - o.w) / 2;
    if (Math.random() < 0.65) {
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
    const looks = [...RUN_CLUB.looks].sort(() => Math.random() - 0.5);
    const total = randInt(...RUN_CLUB.size);
    const inLane = Math.min(total, randInt(...RUN_CLUB.inLane));
    const members = [];
    let dx = 0;
    for (let i = 0; i < inLane; i++) {
      members.push({ dx, lane: 'front', w: RUN_CLUB.memberW, h: RUN_CLUB.memberH, look: looks[i], phase: rand(0, 6), scale: rand(0.96, 1.04) });
      // Room to land and jump again: one airtime of relative travel + both bodies + slack.
      dx += rel * (P.jumpVelocity * 2 / P.gravity) + RUN_CLUB.memberW + P.standW + RUN_CLUB.laneGapMin + rand(0, 25);
    }
    const laneEnd = members[members.length - 1].dx + RUN_CLUB.memberW / 2;
    for (let i = inLane; i < total; i++) {
      members.push({ dx: rand(-18, laneEnd + 18), lane: 'back', w: RUN_CLUB.memberW, h: RUN_CLUB.memberH, look: looks[i % looks.length], phase: rand(0, 6), scale: rand(0.84, 0.9) });
    }
    return Object.assign(o, { members, laneEnd, span: laneEnd + 24, w: RUN_CLUB.memberW });
  }

  makeNonna(o) {
    const variant = pick(['bag', 'cart', 'pair', 'cross']);
    const towards = variant !== 'cross' && Math.random() < 0.35;
    o.v = towards ? -NONNA.walkSpeed : NONNA.walkSpeed;
    const facing = towards ? -1 : 1;
    const look = pick(NONNA.looks);
    const prop = variant === 'cart' ? 'cart' : 'bag';
    const w = prop === 'cart' ? 30 : 20;
    const members = [{ dx: 0, lane: 'front', w, h: NONNA.boxH, look, prop, facing, cross: variant === 'cross' }];
    if (variant === 'pair') {
      members.push({ dx: 10, lane: 'back', w: 20, h: NONNA.boxH, look: pick(NONNA.looks.filter((l) => l !== look)), prop: 'bag', facing });
    }
    return Object.assign(o, { members, laneEnd: w / 2, span: w / 2 + 14, w });
  }

  nextBagItem() {
    if (this.stamina < STAMINA.low && Math.random() < 0.45) return 'water';
    if (this.lives < 3 && Math.random() < 0.08) return 'health';
    if (!this.bag.length) {
      this.bag = [...ITEM_BAG];
      for (let i = this.bag.length - 1; i > 0; i--) {
        const j = (Math.random() * (i + 1)) | 0;
        [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]];
      }
    }
    const next = this.bag.pop();
    return next === 'health' && this.lives >= 3 ? 'exp' : next;
  }

  addItem(type, x, y, v = 0) {
    this.items.push({ type, x, y, v, sprite: pick(ITEMS[type].sprites), bob: Math.random() * 6, taken: false });
  }

  // ---------- events ----------
  onHit(o) {
    const p = this.player;
    if (this.boostT > 0) {
      o.hit = true;
      o.knocked = true;
      this.burst(o.x + (o.w || 20) / 2, GROUND_Y - 12, [C.orange, C.lime, C.cream], 14, 160);
      this.say('Turbo zuccherino! Ostacolo eliminato.', 'good', PRIO.normal);
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
    this.say(o.type === 'nonna' ? joke('nonna') : pick(HIT_REACTIONS[o.type]), 'bad', PRIO.high);
    this.emit('sfx', 'hit');
    if (this.lives <= 0) this.end(false);
  }

  collect(it) {
    it.taken = true;
    const cfg = ITEMS[it.type];
    let pts = cfg.points;
    if (it.type === 'kudos') {
      this.combo = this.comboT > 0 ? Math.min(this.combo + 1, SCORING.comboMax) : 1;
      this.comboT = SCORING.comboWindow;
      pts *= this.combo;
      this.kudos++;
    }
    if (this.multT > 0) pts *= SCORING.multiplier;
    this.itemScore += pts;

    if (it.type === 'shoes') this.shoes++;
    if (it.type === 'bib') this.multT = SCORING.multiplierTime;
    if (cfg.boost) this.boostT = Math.max(this.boostT, cfg.boost);
    if (cfg.stamina) this.stamina = Math.min(STAMINA.max, this.stamina + cfg.stamina);
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
    if (it.type === 'water') label = `+${cfg.stamina} ENERGIA`;
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
    if (finished) {
      this.meters = FINISH_M;
      this.finishBonus = SCORING.finishBonus + this.lives * SCORING.lifeBonus;
      this.confetti(this.reducedMotion ? 10 : 60);
    }
    const peak = LEVELS[this.maxLevel - 1];
    this.result = {
      finished,
      score: this.score,
      meters: Math.min(this.meters, FINISH_M),
      time: this.t,
      pace: this.t > 0 ? this.paceSum / this.t : 0,
      kudos: this.kudos,
      shoes: this.shoes,
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
