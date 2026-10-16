// Headless self-check of the game rules (no browser): environments, the eight HYROX stations,
// gel + collision joke, marathon unlock threshold, marathon stages, run-club archetypes, billboards.
// Run: npm run check
import { Game } from '../src/game.js';
import { STATIONS, STATION_TIMING, createStation } from '../src/stations.js';
import { BILLBOARDS, nextBillboard } from '../src/billboards.js';
import { ZONES, OBSTACLES, MARATHON, JOKES, GUT, PLAYER_X, GROUND_Y, ARCHETYPES } from '../src/config.js';

let failures = 0;
function check(cond, msg) {
  if (cond) return;
  failures++;
  console.error(`FAIL: ${msg}`);
}
const DT = 1 / 60;

function newGame(course = 'arcade') {
  const events = [];
  const g = new Game((type, data) => events.push({ type, data, t: g.t }));
  g.reset(course);
  return { g, events };
}

// Perfect-input bot for the active station (one decision per frame).
function stationBot(g, mem) {
  const st = g.station;
  const pressB = () => { g.slide(true); g.slide(false); };
  const p = st.def.params;
  const cool = (s) => { if (st.t - (mem.last ?? -9) < s) return false; mem.last = st.t; return true; };
  switch (st.def.mech) {
    case 'rhythm': {
      const n = Math.round(st.t / p.period);
      if (n >= 1 && n !== st.beat && Math.abs(st.t - n * p.period) < 0.02) g.jump();
      break;
    }
    case 'band': g.slide(st.power < 66); break;
    case 'charge':
      if (!st.charging) { if (cool(0.1)) g.slide(!g.slideHeld); } else if (st.charge >= 74) g.slide(false);
      break;
    case 'alternate': if (cool(0.15)) (st.expect === 'A' ? g.jump() : pressB()); break;
    case 'stroke':
      if (st.expect === 'A' && st.seat <= 0.1) g.jump();
      else if (st.expect === 'B' && st.seat >= 0.9) pressB();
      break;
    case 'balance':
      if (cool(0.12)) {
        if (st.b > 0.08 && st.v > -0.4) g.jump();
        else if (st.b < -0.08 && st.v < 0.4) pressB();
      }
      break;
    case 'sequence': {
      const pr = st.prompts.find((x) => !x.done && Math.abs(st.t - x.at) < 0.03);
      if (pr) (pr.key === 'A' ? g.jump() : pressB());
      break;
    }
    case 'throw': if (!st.ball && st.power >= 0.8 && st.power <= 0.84) g.jump(); break;
  }
}

// Plays a whole course; god mode removes obstacles before they reach the runner.
function play(g, { god = true, bot = true, maxT = 600 } = {}) {
  const mem = {};
  const stationLog = [];
  let cur = null;
  while (g.mode === 'run' && g.t < maxT) {
    if (god) g.obstacles = g.obstacles.filter((o) => o.x > PLAYER_X + 70);
    if (g.inStation) {
      if (cur !== g.station) {
        cur = g.station;
        stationLog.push({ st: cur, start: g.t });
        mem.last = undefined;
      }
      if (bot && g.station.phase === 'active') stationBot(g, mem);
      if (g.station.phase === 'done' || g.station.phase === 'outro') stationLog.at(-1).end ??= g.t;
    }
    g.update(DT);
  }
  return stationLog;
}

// ---------- 1. arcade: environments + stations ----------
{
  const { g, events } = newGame('arcade');
  const ids = g.zonePlan.map((z) => ZONES[z.zone].id);
  check(ids.length === 5 && new Set(ids).size === 5, `arcade plan has 5 distinct zones: ${ids}`);
  check(ids[0] === 'park' && ids[4] === 'marathon', 'park opens, marathon city closes');
  const zoneTimes = [];
  let lastZone = g.zone;
  const origUpdate = g.updateZone.bind(g);
  g.updateZone = (h, a) => { origUpdate(h, a); if (g.zone !== lastZone) { zoneTimes.push(g.t); lastZone = g.zone; } };
  const log = play(g);
  check(g.result?.finished, 'arcade run reaches the finish');
  check(log.length === 8, `8 stations met (got ${log.length})`);
  check(g.stationsDone === 8, `bot completes all 8 stations (got ${g.stationsDone})`);
  const durations = [0, ...zoneTimes, g.t].map((t, i, a) => (i ? t - a[i - 1] : null)).slice(1);
  console.log(`arcade: ${g.t.toFixed(1)}s, score ${g.score}, zones ${ids.join(' > ')}`);
  console.log(`  zone durations (s): ${durations.map((d) => d.toFixed(1)).join(', ')}`);
  for (const d of durations) check(d >= 15 && d <= 45, `zone duration ${d.toFixed(1)}s within 15-45s`);
  for (const s of log) {
    const len = s.end - s.start;
    check(len >= 3 && len <= 10, `${s.st.def.name}: ${len.toFixed(1)}s within 3-10s`);
    console.log(`  ${s.st.def.name.padEnd(20)} ${len.toFixed(1)}s  +${s.st.result.points}  acc ${(s.st.result.accuracy * 100).toFixed(0)}%`);
  }
  const unlock = events.filter((e) => e.type === 'unlock');
  check(unlock.length === (g.score >= MARATHON.unlockScore ? 1 : 0), 'unlock fires once iff the run reached the threshold');
  check(events.some((e) => e.type === 'toast' && /NUOVA ZONA/.test(e.data.title)), 'zone change toasts');
}

// ---------- 2. stations without input: timeout, partial points, the run continues ----------
{
  const { g } = newGame('arcade');
  const log = play(g, { bot: false });
  check(g.result?.finished, 'run continues after failed stations');
  for (const s of log) {
    const max = STATION_TIMING.intro + s.st.def.time + STATION_TIMING.outro;
    check(s.end - s.start <= max + 0.05 && max <= 10, `${s.st.def.name} idle station lasts ≤ ${max}s (≤ 10s)`);
    if (s.st.def.mech !== 'balance') check(!s.st.result.done, `${s.st.def.name} not completed without input`);
  }
  // The farmer's carry sways at random: idle very rarely survives, never reliably.
  let idleDone = 0;
  for (let r = 0; r < 100; r++) {
    const { g: f } = newGame('arcade');
    f.station = Object.assign(createStation(STATIONS.findIndex((s) => s.mech === 'balance')), { x: PLAYER_X });
    while (f.station.phase !== 'outro') f.stepStation(DT);
    if (f.station.result.done) idleDone++;
  }
  check(idleDone <= 15, `farmer's carry idle completion ${idleDone}% (≤ 15%)`);
}

// ---------- 3. gel + collision ----------
{
  const { g, events } = newGame('arcade');
  const hitWith = () => {
    const cone = { type: 'cone', x: PLAYER_X - 10, v: 0, w: 22, hit: false, knocked: false, knockT: 0, anim: 0 };
    g.obstacles.push(cone);
    g.update(DT);
    g.obstacles = g.obstacles.filter((o) => o !== cone);
    return events.filter((e) => e.type === 'callout').at(-1).data;
  };
  const advance = (s) => { const end = g.t + s; while (g.t < end) { g.obstacles = []; g.items = []; g.nextObstacleAt = Infinity; g.update(DT); } };
  g.nextObstacleAt = Infinity;
  g.collect({ type: 'gel', x: PLAYER_X, y: GROUND_Y - 13, taken: false });
  advance(5); // past the 3s turbo: a real hit
  g.player.invuln = 0;
  let msg = hitWith();
  check(JOKES.gut.includes(msg.text) && msg.priority === 3, `gel + hit within ${GUT.window}s gives a gut joke (got "${msg.text}")`);
  advance(2);
  g.player.invuln = 0;
  msg = hitWith();
  check(!JOKES.gut.includes(msg.text), 'gut joke does not repeat without a new gel');
  g.lives = 3;
  g.collect({ type: 'gel', x: PLAYER_X, y: GROUND_Y - 13, taken: false });
  advance(GUT.window + 0.5);
  g.player.invuln = 0;
  msg = hitWith();
  check(!JOKES.gut.includes(msg.text), 'window expired: generic hit line');
  check(g.gutT === 0, 'gut state cleared after the window');
  g.lives = 3;
  g.collect({ type: 'gel', x: PLAYER_X, y: GROUND_Y - 13, taken: false });
  msg = hitWith(); // inside the 3s turbo: smash still counts as a collision
  check(JOKES.gut.includes(msg.text), 're-armed by a new gel (turbo smash)');
}

// ---------- 4. marathon unlock threshold ----------
{
  const { g, events } = newGame('arcade');
  g.nextObstacleAt = Infinity;
  g.itemScore = MARATHON.unlockScore - 1;
  g.checkUnlock();
  check(!events.some((e) => e.type === 'unlock'), `${MARATHON.unlockScore - 1} points: still locked`);
  g.itemScore = MARATHON.unlockScore;
  g.checkUnlock();
  g.checkUnlock();
  check(events.filter((e) => e.type === 'unlock').length === 1, `${MARATHON.unlockScore} points: unlocked exactly once`);
  const { g: m, events: me } = newGame('marathon');
  m.itemScore = 50000;
  m.checkUnlock();
  check(!me.some((e) => e.type === 'unlock'), 'marathon runs never count for the unlock');
}

// ---------- 5. marathon: 4 stages, finish, duration ----------
{
  const { g, events } = newGame('marathon');
  play(g);
  const stages = events.filter((e) => e.type === 'stage').map((e) => e.data.index);
  check(stages.join() === '0,1,2,3', `marathon stages in order (got ${stages})`);
  check(g.result?.finished, 'marathon reaches the finish');
  check(g.t >= 120 && g.t <= 240, `marathon lasts 2-4 min (got ${g.t.toFixed(0)}s)`);
  check(g.station === null && g.stationsDone === 0, 'no HYROX stations in the marathon');
  const h = Math.floor(g.result.symbolicTime / 3600);
  console.log(`marathon: ${g.t.toFixed(1)}s real, ${h}h${String(Math.floor((g.result.symbolicTime % 3600) / 60)).padStart(2, '0')} symbolic, score ${g.score}, ghost beaten ${g.result.ghostBeaten}`);
}

// ---------- 6. run clubs: distinct archetypes ----------
{
  const { g } = newGame('arcade');
  const seen = new Set();
  for (let i = 0; i < 60; i++) {
    g.meters = 600;
    const o = g.makeRunClub({ type: 'runclub', x: 500, v: 0, w: 0 });
    const kinds = o.members.map((m) => m.look.kind);
    check(o.members.length >= 3 && o.members.length <= 6, 'groups of 3-6');
    check(new Set(kinds).size === kinds.length, 'no two identical archetypes in one group');
    kinds.forEach((k) => seen.add(k));
  }
  check(seen.size === Object.keys(ARCHETYPES).length, `all ${Object.keys(ARCHETYPES).length} archetypes appear`);
}

// ---------- 7. zone obstacle pools ----------
{
  const { g } = newGame('arcade');
  g.meters = 3000;
  ZONES.forEach((zone, zi) => {
    g.zone = zi;
    const types = new Set(Array.from({ length: 400 }, () => g.pickType()));
    for (const t of types) check(!OBSTACLES[t].zones || OBSTACLES[t].zones.includes(zone.id), `${t} allowed in ${zone.id}`);
    check([...types].some((t) => OBSTACLES[t].fly), `${zone.id} has something to slide under`);
    console.log(`  ${zone.id.padEnd(9)} ${[...types].join(', ')}`);
  });
}

// ---------- 8. billboards ----------
{
  for (const [k, c] of Object.entries(BILLBOARDS)) check(c.lines.length >= 8, `billboard "${k}" has ≥ 8 lines`);
  for (const zone of ZONES) {
    let prev = null;
    for (let i = 0; i < 300; i++) {
      const b = nextBillboard(zone.billboards);
      check(!prev || (b.category !== prev.category && b.text !== prev.text), `${zone.id}: no consecutive repeats`);
      prev = b;
    }
  }
  check(BILLBOARDS.garmin && BILLBOARDS.nutrition.lines.some((l) => /[Gg]allette/.test(l)), 'Garmin and rice-cake posters exist');
}

// ---------- 9. fair play: a simple reactive bot on the real obstacles ----------
{
  let hits = 0;
  let finished = 0;
  const runs = 6;
  for (let r = 0; r < runs; r++) {
    const { g } = newGame('arcade');
    const mem = {};
    while (g.mode === 'run' && g.t < 600) {
      if (g.inStation) {
        if (g.station.phase === 'active') stationBot(g, mem);
      } else {
        const lead = g.speed * 0.2;
        for (const o of g.obstacles) {
          if (o.hit || OBSTACLES[o.type].soft) continue;
          for (const b of g.obstacleBoxes(o)) {
            const dist = b.x - (PLAYER_X + 7);
            if (dist < -b.w || dist > lead + 20) continue;
            if (OBSTACLES[o.type].fly) { if (g.player.onGround) g.slide(true); } else if (dist < lead && dist > -4) g.jump();
          }
        }
        if (!g.underFlyer()) g.slide(false);
      }
      const lives = g.lives;
      g.update(DT);
      if (g.lives < lives) hits++;
    }
    if (g.result?.finished) finished++;
  }
  console.log(`fair-play bot: ${finished}/${runs} finished, ${(hits / runs).toFixed(1)} hits per run`);
}

console.log(failures ? `\n${failures} check(s) failed` : '\ngame ok');
process.exit(failures ? 1 : 0);
