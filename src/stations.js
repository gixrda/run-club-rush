// The eight HYROX stations: central tuning + one small arcade mechanic each.
// Inputs reuse the run controls: A = jump (SPAZIO / ↑ / ← / tap left), B = slide (↓ / → / tap right).
// Every station: intro (ready), active (max `time` seconds, ends early at 100% progress), outro (result).
import { makePicker } from './jokes.js';

export const STATION_TIMING = {
  intro: 0.9,
  outro: 1.1,
  timeBonusPerSec: 25, // seconds left when completed
  partialFactor: 0.6, // timeout: share of `points` earned per progress
  approachPx: 100, // the runner slows down over this distance before the station
  resumeGapPx: 320, // free running after a station
};

// mech: rhythm | band | charge | alternate | stroke | balance | sequence | throw (see MECHANICS).
// points: completion reward; bonus: × accuracy (0..1); params: mechanic tuning.
export const STATIONS = [
  {
    id: 'skierg', name: 'SKIERG', mech: 'rhythm', time: 6.5, points: 250, bonus: 200, brainrot: 3,
    hint: 'SALTA (↑) quando il cursore arriva nel verde',
    params: { period: 0.7, window: 0.14, perfect: 0.06, gain: 15, perfectGain: 20, missGain: 2 },
    jokes: ['SkiErg completato. Sciare senza neve è un talento.', 'Braccia finite. Ora 1 km di corsa, tranquillo.', '1000 metri di SkiErg. Le spalle chiedono il divorzio.'],
  },
  {
    id: 'sledpush', name: 'SLED PUSH', mech: 'band', time: 6.5, points: 250, bonus: 200, brainrot: 3,
    hint: 'Tieni SCIVOLA (↓) e rilascia: resta nel verde',
    params: { rise: 95, fall: 85, lo: 50, hi: 82, over: 97, rate: 25, stuck: 0.6 },
    jokes: ['La slitta pesa meno del tuo ego.', 'Sled push completato. Quadricipiti in sciopero.', 'Spinta da manuale. Il pavimento ricorda ancora.'],
  },
  {
    id: 'sledpull', name: 'SLED PULL', mech: 'charge', time: 7, points: 250, bonus: 200, brainrot: 3,
    hint: 'Tieni SCIVOLA (↓) per caricare, rilascia nel verde',
    params: { rate: 100, lo: 58, hi: 88, perfectLo: 67, perfectHi: 80, max: 118, gain: 20, perfectGain: 26, weakGain: 6 },
    jokes: ['Corda tirata, avambracci distrutti.', 'Sled pull: la pesca d\'altura dei palestrati.', 'La slitta è arrivata. Le mani no.'],
  },
  {
    id: 'bbj', name: 'BURPEE BROAD JUMPS', mech: 'alternate', time: 7, points: 250, bonus: 200, brainrot: 3,
    hint: 'Alterna SCIVOLA (↓) e SALTA (↑), più veloce che puoi',
    params: { gain: 14.3, stun: 0.35 },
    jokes: ['8 km di corsa per poter fare burpee.', 'Burpee completati. Dignità a terra, letteralmente.', 'Salto in lungo da sdraiato: disciplina olimpica dal 2030.'],
  },
  {
    id: 'row', name: 'ROWING', mech: 'stroke', time: 7, points: 250, bonus: 200, brainrot: 3,
    hint: 'SALTA (↑) col carrello avanti, SCIVOLA (↓) indietro',
    params: { period: 1, zone: 0.3, gain: 12.5 },
    jokes: ['1000 metri di remoergometro. Il mare è lontano.', 'Remata perfetta. Il Garmin non ha capito niente.', 'Rowing finito. Ora correre sembra riposo.'],
  },
  {
    id: 'farmers', name: 'FARMER\'S CARRY', mech: 'balance', time: 7, points: 250, bonus: 200, brainrot: 3,
    hint: 'Equilibrio: SALTA (↑/←) a sinistra, SCIVOLA (↓/→) a destra',
    params: { wind: 2.2, windEvery: 0.55, tip: 3, impulse: 0.5, damping: 1.5, safe: 0.32, rate: 24, drop: 0.7, dropLoss: 15 },
    jokes: ['Farmer\'s carry: anche la spesa conta.', 'Due kettlebell e la presa di un nonno coi sacchetti.', 'Avambracci sbloccati. Ora porti tutta la spesa in un viaggio.'],
  },
  {
    id: 'lunges', name: 'SANDBAG LUNGES', mech: 'sequence', time: 7, points: 250, bonus: 200, brainrot: 3,
    hint: 'Premi il tasto indicato quando arriva sulla linea',
    params: { count: 12, approach: 1, spacing: 0.5, window: 0.16, gain: 12.5 },
    jokes: ['Lunges col sacco: le scale di casa ti temono.', 'Affondi completati. Sedersi domani: impossibile.', 'Sacco in spalla, ginocchia in pensione.'],
  },
  {
    id: 'wallballs', name: 'WALL BALLS', mech: 'throw', time: 7.5, points: 300, bonus: 200, brainrot: 4,
    hint: 'SALTA (↑) per lanciare quando la forza è nel verde',
    params: { period: 1.25, lo: 0.7, hi: 0.92, perfectLo: 0.77, perfectHi: 0.87, flight: 0.45, gain: 25, perfectGain: 30 },
    jokes: ['No pain, no wall balls.', 'Ultima stazione. Il traguardo è a una palla di distanza.', 'Wall balls finite. Il soffitto ringrazia.'],
  },
];

export const stationJoke = makePicker(Object.fromEntries(STATIONS.map((s) => [s.id, s.jokes])));

// ---------- shared helpers ----------
function feedback(st, text, good) {
  st.fb = { text, good, t: 0.7 };
}
function gain(st, amount, text) {
  st.hits++;
  st.progress = Math.min(100, st.progress + amount);
  feedback(st, text, true);
}
function miss(st, text, amount = 0) {
  st.misses++;
  st.progress = Math.min(100, st.progress + amount);
  feedback(st, text, false);
}
const wave = (t, period) => (1 - Math.cos((2 * Math.PI * t) / period)) / 2; // 0..1..0

// Each mechanic: init(st), update(st, h, heldB), press(st, key), release(st, key).
// Time-based ones add seconds to hits/misses, so accuracy = hits / (hits + misses) everywhere.
export const MECHANICS = {
  // SkiErg: a ring shrinks onto the target once per period; press A on the beat.
  rhythm: {
    init(st) { st.beat = 0; st.pullT = 0; },
    update(st, h) { st.pullT = Math.max(0, st.pullT - h); },
    press(st, key) {
      if (key !== 'A') return;
      const p = st.def.params;
      const n = Math.round(st.t / p.period);
      const d = Math.abs(st.t - n * p.period);
      st.pullT = 0.28;
      if (n < 1 || n === st.beat) return miss(st, 'TROPPO PRESTO');
      if (d <= p.perfect) { st.beat = n; return gain(st, p.perfectGain, 'PERFETTO!'); }
      if (d <= p.window) { st.beat = n; return gain(st, p.gain, 'BUONO'); }
      miss(st, 'FUORI TEMPO', p.missGain);
    },
    ring: (st) => (st.t % st.def.params.period) / st.def.params.period,
  },

  // Sled push: hold B to build force, release to drop it; progress only inside the band.
  band: {
    init(st) { st.power = 0; st.stuck = 0; st.pushing = false; },
    update(st, h, held) {
      const p = st.def.params;
      if (st.stuck > 0) {
        st.stuck -= h;
        st.power = Math.max(0, st.power - p.fall * 1.5 * h);
        st.misses += h;
        st.pushing = false;
        return;
      }
      st.power = Math.min(100, Math.max(0, st.power + (held ? p.rise : -p.fall) * h));
      if (st.power >= p.over) {
        st.stuck = p.stuck;
        return feedback(st, 'SLITTA FERMA!', false);
      }
      st.pushing = st.power >= p.lo && st.power <= p.hi;
      if (st.pushing) {
        st.progress = Math.min(100, st.progress + p.rate * h);
        st.hits += h;
      } else {
        if (st.power > 25) st.progress = Math.min(100, st.progress + p.rate * 0.15 * h);
        st.misses += h;
      }
    },
    press() {},
    release() {},
  },

  // Sled pull: hold B to charge the pull, release inside the green zone.
  charge: {
    holdStart: true, // ↓ already held when the station starts counts as a press
    init(st) { st.charge = 0; st.charging = false; st.pullT = 0; },
    update(st, h) {
      st.pullT = Math.max(0, st.pullT - h);
      if (!st.charging) return;
      st.charge += st.def.params.rate * h;
      if (st.charge >= st.def.params.max) {
        st.charging = false;
        st.charge = 0;
        miss(st, 'CORDA SCIVOLATA');
      }
    },
    press(st, key) {
      if (key !== 'B') return;
      st.charging = true;
      st.charge = 0;
    },
    release(st, key) {
      if (key !== 'B' || !st.charging) return;
      const p = st.def.params;
      const c = st.charge;
      st.charging = false;
      st.charge = 0;
      st.pullT = 0.35;
      if (c >= p.perfectLo && c <= p.perfectHi) gain(st, p.perfectGain, 'TIRATA PERFETTA!');
      else if (c >= p.lo && c <= p.hi) gain(st, p.gain, 'BUONA TIRATA');
      else if (c < p.lo) miss(st, 'TROPPO DEBOLE', p.weakGain);
      else miss(st, 'TROPPO TARDI', 2);
    },
  },

  // Burpee broad jumps: B (down) then A (jump), as fast as you can.
  alternate: {
    init(st) { st.expect = 'B'; st.stun = 0; st.jumpT = 0; st.down = false; },
    update(st, h) {
      st.stun = Math.max(0, st.stun - h);
      st.jumpT = Math.max(0, st.jumpT - h);
    },
    press(st, key) {
      if (st.stun > 0) return;
      if (key !== st.expect) {
        st.stun = st.def.params.stun;
        st.expect = 'B';
        st.down = false;
        return miss(st, 'SEQUENZA SBAGLIATA');
      }
      if (key === 'B') {
        st.down = true;
        st.expect = 'A';
      } else {
        st.down = false;
        st.jumpT = 0.3;
        st.expect = 'B';
        gain(st, st.def.params.gain, 'REP!');
      }
    },
  },

  // Rowing: the seat slides back and forth; A at the catch (front), B at the finish (back).
  stroke: {
    init(st) { st.expect = 'A'; st.seat = 0; },
    update(st) { st.seat = wave(st.t, st.def.params.period); },
    press(st, key) {
      const p = st.def.params;
      if (key !== st.expect) return miss(st, key === 'A' ? 'PRIMA SPINGI (↓)' : 'PRIMA AGGANCIA (↑)');
      const inZone = key === 'A' ? st.seat <= p.zone : st.seat >= 1 - p.zone;
      if (!inZone) return miss(st, 'FUORI TEMPO');
      st.expect = key === 'A' ? 'B' : 'A';
      gain(st, p.gain, key === 'A' ? 'AGGANCIO' : 'SPINTA!');
    },
  },

  // Farmer's carry: the load sways; A nudges left, B nudges right. Keep the needle centred.
  balance: {
    init(st) { st.b = 0; st.v = 0; st.drop = 0; st.wind = 0; st.windT = 0; },
    update(st, h) {
      const p = st.def.params;
      if (st.drop > 0) {
        st.drop -= h;
        st.misses += h;
        return;
      }
      st.windT -= h;
      if (st.windT <= 0) {
        st.windT = p.windEvery;
        st.wind = (Math.random() * 2 - 1) * p.wind;
      }
      st.v += (st.wind + st.b * p.tip) * h;
      st.v -= st.v * Math.min(1, p.damping * h);
      st.b += st.v * h;
      if (Math.abs(st.b) >= 1) {
        st.drop = p.drop;
        st.progress = Math.max(0, st.progress - p.dropLoss);
        st.b = 0;
        st.v = 0;
        return feedback(st, 'PRESA PERSA!', false);
      }
      if (Math.abs(st.b) <= p.safe) {
        st.progress = Math.min(100, st.progress + p.rate * h);
        st.hits += h;
      } else {
        // wobbling: slow progress; about to drop: none
        if (Math.abs(st.b) < 0.6) st.progress = Math.min(100, st.progress + p.rate * 0.15 * h);
        st.misses += h;
      }
    },
    press(st, key) {
      if (st.drop > 0) return;
      st.v += key === 'A' ? -st.def.params.impulse : st.def.params.impulse;
    },
  },

  // Sandbag lunges: prompts slide towards a line; press the shown key as each one reaches it.
  sequence: {
    init(st) {
      const p = st.def.params;
      st.prompts = Array.from({ length: p.count }, (_, i) => ({ key: Math.random() < 0.5 ? 'A' : 'B', at: p.approach + i * p.spacing, done: null }));
      // never three of the same key in a row
      for (let i = 2; i < st.prompts.length; i++) {
        const [a, b, c] = [st.prompts[i - 2], st.prompts[i - 1], st.prompts[i]];
        if (a.key === b.key && b.key === c.key) c.key = c.key === 'A' ? 'B' : 'A';
      }
      st.dipT = 0;
    },
    update(st, h) {
      st.dipT = Math.max(0, st.dipT - h);
      for (const pr of st.prompts) {
        if (!pr.done && st.t > pr.at + st.def.params.window) {
          pr.done = 'miss';
          miss(st, 'MANCATO');
        }
      }
    },
    press(st, key) {
      const w = st.def.params.window;
      const pr = st.prompts.find((x) => !x.done && Math.abs(st.t - x.at) <= w);
      if (!pr) return miss(st, 'FUORI TEMPO');
      if (pr.key !== key) {
        pr.done = 'miss';
        return miss(st, 'TASTO SBAGLIATO');
      }
      pr.done = 'hit';
      st.dipT = 0.3;
      gain(st, st.def.params.gain, 'AFFONDO!');
    },
  },

  // Wall balls: the force meter oscillates; press A to throw, hit the target band.
  throw: {
    init(st) { st.power = 0; st.ball = null; st.squatT = 0; },
    update(st, h) {
      const p = st.def.params;
      st.power = wave(st.t, p.period);
      st.squatT = Math.max(0, st.squatT - h);
      if (!st.ball) return;
      st.ball.t += h;
      if (st.ball.t >= p.flight) {
        const b = st.ball;
        st.ball = null;
        if (b.perfect) gain(st, p.perfectGain, 'CENTRO PERFETTO!');
        else if (b.good) gain(st, p.gain, 'BUONA!');
        else miss(st, b.p < p.lo ? 'NO REP: TROPPO BASSA' : 'NO REP: TROPPO ALTA');
      }
    },
    press(st, key) {
      if (key !== 'A' || st.ball) return;
      const p = st.def.params;
      const v = st.power;
      st.squatT = 0.25;
      st.ball = { t: 0, p: v, good: v >= p.lo && v <= p.hi, perfect: v >= p.perfectLo && v <= p.perfectHi };
    },
  },
};

export function createStation(index) {
  const def = STATIONS[index];
  const st = { def, index, phase: 'intro', t: 0, progress: 0, hits: 0, misses: 0, fb: null, result: null };
  MECHANICS[def.mech].init(st);
  return st;
}

export function stationAccuracy(st) {
  const n = st.hits + st.misses;
  return n > 0 ? st.hits / n : 0;
}

// Points for a finished station: completion + accuracy bonus + time left, or a share on timeout.
export function stationPoints(st) {
  const d = st.def;
  if (st.progress >= 100) {
    return Math.round(d.points + stationAccuracy(st) * d.bonus + Math.max(0, d.time - st.t) * STATION_TIMING.timeBonusPerSec);
  }
  return Math.round((st.progress / 100) * d.points * STATION_TIMING.partialFactor);
}
