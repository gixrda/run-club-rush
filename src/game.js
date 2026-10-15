import {
  W, GROUND_Y, PLAYER_X, METERS_PER_PX, FINISH_M, COLORS as C,
  PHYSICS as P, DIFFICULTY as D, OBSTACLES, STAMINA, SCORING, GEL,
  ITEMS, ITEM_BAG, LEVELS, ZONES, FEED, CLUB, MEMES, HIT_REACTIONS,
} from './config.js';

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[(Math.random() * arr.length) | 0];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
export const overlap = (a, b) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

const STEP = 1 / 120; // physics substep: no tunnelling through thin cones at low FPS

const ITEM_COLORS = {
  shoes: [C.lime, C.orange, C.white],
  gel: [C.orange, C.lime],
  water: [C.blue, C.cream],
  medal: [C.gold, C.blue, C.orange],
  bib: [C.white, C.blue],
  kudos: [C.orange, C.white],
  hyrox: [C.lime, C.slate],
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
    this.player = { y: GROUND_Y, vy: 0, onGround: true, slideT: 0, slideQueued: false, invuln: 0, phase: 0, jumpBuffer: 0 };
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
    this.prevType = null;
    this.shake = 0;
    this.flash = 0;
    this.flashColor = C.white;
    this.feedT = rand(5, 8);
    this.memeT = 3;
    this.kudosQuoteT = 0;
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
    return 330 - f * 150;
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

  obstacleBox(o) {
    switch (o.type) {
      case 'pothole': return { x: o.x + 8, y: GROUND_Y - 3, w: o.w - 16, h: 8 };
      case 'cone': return { x: o.x + 2, y: GROUND_Y - 20, w: o.w - 4, h: 20 };
      case 'runclub': return { x: o.x + 2, y: GROUND_Y - 30, w: o.w - 4, h: 30 };
      case 'banner': return { x: o.x, y: 0, w: o.w, h: GROUND_Y - 26 };
    }
  }

  underBanner() {
    return this.obstacles.some((o) => o.type === 'banner' && !o.hit && o.x < PLAYER_X + 14 && o.x + o.w > PLAYER_X - 14);
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

    let target = attract ? 150 : this.targetSpeed();
    if (!attract && this.boostT > 0) target *= GEL.speedMult;
    if (!attract && this.stamina <= 0) target *= STAMINA.exhaustedSpeedMult;
    this.speed += (target - this.speed) * Math.min(1, h * 5);
    this.traveled += this.speed * h;
    this.meters = this.traveled * METERS_PER_PX;
    p.phase += h * (7 + this.speed / 50) * (this.stamina <= 0 ? 0.8 : 1);

    this.updateZone(h, attract);
    this.updateProps(h);
    this.updateFx(h);
    if (attract) return;

    this.t += h;
    this.paceSum += this.pace * h;

    // stamina
    const before = this.stamina;
    this.stamina = Math.max(0, this.stamina - STAMINA.drainPerSec * (this.boostT > 0 ? STAMINA.boostDrainMult : 1) * h);
    if (before > 0 && this.stamina === 0) {
      this.emit('callout', { text: 'BONK! LEGS LEFT THE GROUP CHAT.', kind: 'bad' });
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
      // Keep sliding while held or still under a banner: never stand up into it.
      if (p.slideT <= 0 && (this.slideHeld || this.underBanner())) p.slideT = 0.05;
      if (Math.random() < 0.3) this.particles.push(this.particle(PLAYER_X + 8, GROUND_Y - 1, rand(-80, -20), rand(-40, -10), '#C9A26B', 0.3, 2));
    }

    // spawning
    if (this.traveled >= this.nextObstacleAt && this.meters < FINISH_M - D.finishClearM) this.spawnObstacle();

    // movement
    for (const o of this.obstacles) {
      o.x -= (this.speed + (o.extra || 0)) * h;
      if (o.knocked) o.knockT += h;
    }
    for (const it of this.items) {
      it.x -= (this.speed + (it.extra || 0)) * h;
      it.bob += h * 5;
    }
    this.obstacles = this.obstacles.filter((o) => o.x > -80);
    this.items = this.items.filter((it) => it.x > -30 && !it.taken);

    // hints the first time each obstacle family appears
    for (const o of this.obstacles) {
      const kind = o.type === 'banner' ? 'slide' : 'jump';
      if (!this.hintsShown[kind] && o.x < W - 60) {
        this.hintsShown[kind] = true;
        this.emit('callout', {
          text: kind === 'slide' ? 'SLIDE UNDER IT! ↓ / S / TAP RIGHT' : 'JUMP! SPACE / ↑ / TAP LEFT',
          kind: 'info',
        });
      }
    }

    // collisions
    const pr = this.playerRect();
    for (const o of this.obstacles) {
      if (!o.hit && overlap(pr, this.obstacleBox(o))) this.onHit(o);
      if (this.mode !== 'run') return;
    }
    for (const it of this.items) {
      if (!it.taken && overlap(pr, { x: it.x - 8, y: it.y - 8, w: 16, h: 16 })) this.collect(it);
    }

    // social feed
    if (this.meters >= this.nextKm * 1000 && this.nextKm < FINISH_M / 1000) {
      this.emit('toast', { title: `KM ${this.nextKm} SPLIT`, body: `${formatPace(this.pace)} /km. Your watch beeped judgmentally.` });
      this.nextKm++;
    }
    this.feedT -= h;
    if (this.feedT <= 0) {
      this.feedT = rand(9, 14);
      const club = Math.random() < 0.4;
      this.emit('toast', { title: club ? 'RUN CLUB GROUP CHAT' : 'ACTIVITY FEED', body: pick(club ? CLUB : FEED) });
    }
    if (this.level >= 5) {
      this.memeT -= h;
      if (this.memeT <= 0) {
        this.memeT = rand(5, 8);
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
      if (!attract) this.emit('toast', { title: 'NOW ENTERING', body: `${ZONES[z].name}. Segment hunting enabled.` });
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
      tx.y -= 28 * h;
      tx.life -= h;
    }
    this.texts = this.texts.filter((tx) => tx.life > 0);
    this.shake = Math.max(0, this.shake - h * 30);
    this.flash = Math.max(0, this.flash - h);
  }

  // ---------- spawning ----------
  pickType() {
    const avail = Object.entries(OBSTACLES).filter(([, o]) => this.meters >= o.minM);
    let r = Math.random() * avail.reduce((s, [, o]) => s + o.weight, 0);
    for (const [type, o] of avail) {
      r -= o.weight;
      if (r <= 0) return type;
    }
    return avail[0][0];
  }

  scheduleNext(afterW) {
    const type = this.pickType();
    const prog = clamp(this.meters / D.rampMeters, 0, 1);
    const secs = Math.max(D.minGapSeconds, lerp(D.gapStart, D.gapEnd, prog) - (this.level - 1) * D.gapPerLevel)
      * (1 + Math.random() * D.gapJitter);
    // Gap uses the un-boosted speed so it stays fair once the boost ends.
    let gap = this.targetSpeed() * secs + afterW;
    gap += OBSTACLES[type].extraGap || 0;
    if (this.prevType === 'banner') gap += OBSTACLES.banner.extraGap;
    this.nextType = type;
    this.nextObstacleAt = this.traveled + gap;
    return gap;
  }

  spawnObstacle() {
    const type = this.nextType;
    const cfg = OBSTACLES[type];
    const o = { type, x: W + 20, w: cfg.w, extra: cfg.extraSpeed || 0, hit: false, knocked: false, knockT: 0, seed: Math.random() * 10 };
    this.obstacles.push(o);
    this.prevType = type;

    // Reward over/under the obstacle: kudos follow the path you need to take anyway.
    if (type === 'banner') {
      if (Math.random() < 0.7) for (let i = 0; i < 3; i++) this.addItem('kudos', o.x + 10 + i * 14, GROUND_Y - 8, o.extra);
    } else if (Math.random() < 0.5) {
      const cx = o.x + o.w / 2;
      [[-16, 50], [0, 62], [16, 50]].forEach(([dx, dy]) => this.addItem('kudos', cx + dx, GROUND_Y - dy, o.extra));
    }

    const gap = this.scheduleNext(o.w);
    const mid = o.x + o.w + (gap - o.w) / 2;
    if (Math.random() < 0.65) {
      this.addItem(this.nextBagItem(), mid, GROUND_Y - 12);
    } else if (Math.random() < 0.6) {
      for (let i = -1; i <= 1; i++) this.addItem('kudos', mid + i * 16, GROUND_Y - 12);
    }
  }

  nextBagItem() {
    if (this.stamina < STAMINA.low && Math.random() < 0.45) return 'water';
    if (!this.bag.length) {
      this.bag = [...ITEM_BAG];
      for (let i = this.bag.length - 1; i > 0; i--) {
        const j = (Math.random() * (i + 1)) | 0;
        [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]];
      }
    }
    return this.bag.pop();
  }

  addItem(type, x, y, extra = 0) {
    this.items.push({ type, x, y, extra, bob: Math.random() * 6, taken: false });
  }

  // ---------- events ----------
  onHit(o) {
    const p = this.player;
    if (this.boostT > 0) {
      o.hit = true;
      o.knocked = true;
      this.burst(o.x + o.w / 2, GROUND_Y - 12, [C.orange, C.lime, C.cream], 14, 160);
      this.emit('callout', { text: 'SUGAR RUSH! OBSTACLE DELETED.', kind: 'good' });
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
    this.emit('callout', { text: pick(HIT_REACTIONS[o.type]), kind: 'bad' });
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
    if (it.type === 'gel') this.boostT = GEL.boostTime;
    if (it.type === 'bib') this.multT = SCORING.multiplierTime;
    if (cfg.stamina) this.stamina = Math.min(STAMINA.max, this.stamina + cfg.stamina);

    const label = it.type === 'water' ? '+30 STAMINA' : it.type === 'bib' ? `x${SCORING.multiplier} SCORE` : `+${pts}`;
    this.texts.push({ x: it.x, y: it.y - 10, text: label, life: 0.9, color: it.type === 'kudos' ? C.orange : C.lime });
    this.burst(it.x, it.y, ITEM_COLORS[it.type], it.type === 'kudos' ? 6 : 12, 110);
    this.emit('sfx', it.type === 'kudos' ? 'kudos' : 'pickup');

    if (it.type === 'kudos') {
      if (this.firstKudos) {
        this.firstKudos = false;
        this.emit('toast', { title: 'ACTIVITY FEED', body: 'Someone gave you 1 kudos. You can sleep now.' });
      }
      if (this.kudosQuoteT <= 0) {
        this.kudosQuoteT = 8;
        this.emit('callout', { text: cfg.quote, kind: 'good' });
      }
    } else {
      this.emit('callout', { text: cfg.quote, kind: 'good' });
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
      this.emit('callout', { text: 'NEW PB? (PROBABLY NOT)', kind: 'level' });
    } else if (r < 0.4) {
      this.emit('callout', { text: `PACE CHECK: ${formatPace(this.pace)}/KM. SUSPICIOUS.`, kind: 'info' });
    } else {
      this.emit('toast', pick(MEMES));
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
    this.result = {
      finished,
      score: this.score,
      meters: Math.min(this.meters, FINISH_M),
      time: this.t,
      pace: this.t > 0 ? this.paceSum / this.t : 0,
      kudos: this.kudos,
      shoes: this.shoes,
      maxLevel: this.maxLevel,
      maxLevelTitle: LEVELS[this.maxLevel - 1].title,
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
