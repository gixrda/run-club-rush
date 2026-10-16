// HYROX station visuals: equipment around the runner, the runner's pose, and the station panel.
// The panel (meters only) sits under the DOM station banner, clear of the runner and the equipment.
import { GROUND_Y, PLAYER_X, COLORS as C } from './config.js';
import { STATIONS, STATION_TIMING, MECHANICS } from './stations.js';
import { INK, text, outlined, fillPath, line } from './draw.js';

const RUN = ['runner/run1', 'runner/run2', 'runner/run3', 'runner/run4'];
const lerp = (a, b, t) => a + (b - a) * t;
const active = (st) => st.phase === 'intro' || st.phase === 'active' || st.phase === 'outro';
// During approach nothing has started; after the station everything shows as done.
const progressOf = (st) => (st.phase === 'done' ? 100 : st.progress);

// Runner sprite + transform for the current station state (feet-anchored).
export function stationPose(st, t) {
  const pose = { frame: 'runner/idle', dx: 0, dy: 0, rot: 0, sy: 1 };
  if (!active(st)) return null;
  switch (st.def.id) {
    case 'skierg':
      if (st.pullT > 0) pose.sy = 0.86 + (1 - Math.sin((st.pullT / 0.28) * Math.PI)) * 0.14;
      break;
    case 'sledpush':
      if (st.pushing) pose.frame = RUN[Math.floor(t * 6) % 4];
      pose.rot = 0.18;
      break;
    case 'sledpull':
      pose.rot = st.pullT > 0 ? -0.16 : st.charging ? -0.06 : 0;
      break;
    case 'bbj':
      if (st.jumpT > 0) {
        pose.frame = 'runner/jump';
        pose.dy = -Math.sin((1 - st.jumpT / 0.3) * Math.PI) * 16;
      } else if (st.down) pose.frame = 'runner/slide';
      break;
    case 'row':
      pose.frame = 'runner/slide';
      pose.dx = seatX(st) - PLAYER_X;
      pose.dy = -4;
      break;
    case 'farmers':
      pose.frame = st.drop > 0 ? 'runner/idle' : RUN[Math.floor(t * 4) % 4];
      pose.rot = (st.b ?? 0) * 0.3;
      break;
    case 'lunges':
      pose.frame = st.dipT > 0 ? 'runner/slide' : 'runner/run2';
      break;
    case 'wallballs':
      if (st.squatT > 0) pose.frame = 'runner/slide';
      else if (st.ball && st.ball.t < 0.15) pose.frame = 'runner/jump';
      break;
  }
  return pose;
}

const seatX = (st) => st.x + 8 - (st.seat ?? 0) * 24;

// ---------- equipment ----------
function plates(ctx, x, y) {
  for (const [dx, col] of [[0, '#2A2F3D'], [5, C.orange], [10, '#2A2F3D']]) outlined(ctx, col, () => ctx.roundRect(x + dx, y - 12, 4, 12, 1.5), 0.7);
}

function sled(ctx, x) {
  outlined(ctx, '#5C6B8A', () => ctx.roundRect(x, GROUND_Y - 5, 28, 4, 1.5), 0.8);
  outlined(ctx, '#2A2F3D', () => ctx.roundRect(x + 2, GROUND_Y - 9, 24, 4, 1), 0.8);
  plates(ctx, x + 6, GROUND_Y - 9);
}

function kettlebell(ctx, x, y) {
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.arc(x, y - 6, 3.2, Math.PI * 1.05, Math.PI * 1.95);
  ctx.stroke();
  outlined(ctx, '#2A2F3D', () => ctx.arc(x, y - 2.5, 4.5, 0, Math.PI * 2), 0.8);
}

// Drawn behind the runner.
export function drawStationBack(ctx, st) {
  const bx = st.x;
  const prog = progressOf(st);
  // rubber mat
  fillPath(ctx, 'rgba(11,22,48,0.55)', () => ctx.roundRect(bx - 34, GROUND_Y - 2, 110, 6, 2));
  ctx.fillStyle = C.lime;
  ctx.fillRect(bx - 34, GROUND_Y - 2, 110, 1.2);
  switch (st.def.id) {
    case 'skierg': {
      const pull = st.pullT > 0 ? Math.sin((st.pullT / 0.28) * Math.PI) : 0;
      outlined(ctx, '#2A2F3D', () => ctx.roundRect(bx + 14, GROUND_Y - 3, 22, 4, 1.5), 0.8);
      outlined(ctx, '#2A2F3D', () => ctx.roundRect(bx + 21, GROUND_Y - 62, 7, 60, 2), 0.9);
      outlined(ctx, '#5C6B8A', () => ctx.arc(bx + 24.5, GROUND_Y - 58, 6, 0, Math.PI * 2), 0.9);
      fillPath(ctx, C.lime, () => ctx.arc(bx + 24.5, GROUND_Y - 58, 2.2, 0, Math.PI * 2));
      const hy = GROUND_Y - 50 + pull * 24;
      line(ctx, bx + 22, GROUND_Y - 56, bx + 13, hy, '#9AA5B8', 0.8);
      outlined(ctx, C.orange, () => ctx.roundRect(bx + 10, hy - 1, 5, 4, 1), 0.7);
      break;
    }
    case 'sledpush':
      for (const px of [bx + 13, bx + 19]) outlined(ctx, '#9AA5B8', () => ctx.roundRect(px, GROUND_Y - 30, 2.5, 22, 1), 0.7);
      sled(ctx, bx + 12);
      break;
    case 'sledpull': {
      const sx = bx + 140 - prog * 1.05;
      ctx.strokeStyle = '#C8955A';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(bx + 9, GROUND_Y - 27);
      ctx.quadraticCurveTo((bx + sx) / 2, GROUND_Y - 4, sx, GROUND_Y - 7);
      ctx.stroke();
      // the pulled rope piles up behind the runner
      fillPath(ctx, '#C8955A', () => ctx.ellipse(bx - 16, GROUND_Y - 2, 6 + prog * 0.08, 2.5, 0, 0, Math.PI * 2));
      sled(ctx, sx);
      break;
    }
    case 'bbj':
      ctx.fillStyle = C.cream;
      for (let k = 0; k < 6; k++) ctx.fillRect(bx - 20 + k * 16, GROUND_Y + 4, 8, 1.2);
      break;
    case 'row': {
      const seat = seatX(st);
      outlined(ctx, '#5C6B8A', () => ctx.roundRect(bx - 30, GROUND_Y - 5, 66, 3, 1.5), 0.8);
      outlined(ctx, '#2A2F3D', () => ctx.arc(bx + 40, GROUND_Y - 10, 9, 0, Math.PI * 2), 0.9);
      fillPath(ctx, C.lime, () => ctx.arc(bx + 40, GROUND_Y - 10, 3, 0, Math.PI * 2));
      outlined(ctx, '#2A2F3D', () => ctx.roundRect(bx + 25, GROUND_Y - 13, 4, 10, 1), 0.7);
      outlined(ctx, C.orange, () => ctx.roundRect(seat - 6, GROUND_Y - 8, 12, 3.5, 1.5), 0.8);
      // handle chain: pulled towards the chest at the finish
      const hx = lerp(bx + 22, seat + 6, st.seat ?? 0);
      line(ctx, bx + 34, GROUND_Y - 12, hx, GROUND_Y - 20, '#9AA5B8', 0.8);
      outlined(ctx, '#2A2F3D', () => ctx.roundRect(hx - 1.5, GROUND_Y - 23, 3, 6, 1), 0.6);
      break;
    }
    case 'wallballs':
      outlined(ctx, '#2A2F3D', () => ctx.roundRect(bx + 62, GROUND_Y - 104, 5, 104, 1), 0.8);
      outlined(ctx, C.lime, () => ctx.arc(bx + 58, GROUND_Y - 96, 8, 0, Math.PI * 2), 1);
      fillPath(ctx, '#1F2638', () => ctx.arc(bx + 58, GROUND_Y - 96, 4, 0, Math.PI * 2));
      break;
  }
  if (!active(st)) stationSign(ctx, st);
}

// Drawn in front of the runner.
export function drawStationFront(ctx, st, poseRot = 0) {
  const bx = st.x;
  switch (st.def.id) {
    case 'farmers': {
      if (st.drop > 0 || !active(st)) {
        kettlebell(ctx, bx - 8, GROUND_Y);
        kettlebell(ctx, bx + 12, GROUND_Y);
        break;
      }
      const lean = poseRot * 22;
      kettlebell(ctx, bx - 5 + lean, GROUND_Y - 13);
      kettlebell(ctx, bx + 8 + lean, GROUND_Y - 15);
      break;
    }
    case 'lunges': {
      const y = active(st) ? (st.dipT > 0 ? GROUND_Y - 33 : GROUND_Y - 47) : GROUND_Y - 4;
      outlined(ctx, '#3A5A40', () => ctx.roundRect(bx - 11, y - 5, 22, 8, 4), 0.9);
      ctx.fillStyle = '#C8955A';
      ctx.fillRect(bx - 2, y - 5, 4, 8);
      break;
    }
    case 'wallballs': {
      const p = st.def.params;
      if (st.ball) {
        const u = st.ball.t / p.flight;
        const endY = GROUND_Y - 96 + ((p.lo + p.hi) / 2 - st.ball.p) * 120;
        const x = lerp(bx + 8, bx + 52, u);
        const y = lerp(GROUND_Y - 44, endY, u) - Math.sin(u * Math.PI) * 18;
        outlined(ctx, '#2A2F3D', () => ctx.arc(x, y, 5, 0, Math.PI * 2), 0.9);
      } else {
        const y = st.squatT > 0 ? GROUND_Y - 30 : GROUND_Y - 42;
        outlined(ctx, '#2A2F3D', () => ctx.arc(bx + 8, active(st) ? y : GROUND_Y - 5, 5, 0, Math.PI * 2), 0.9);
      }
      break;
    }
  }
}

function stationSign(ctx, st) {
  const x = st.x + 44;
  ctx.fillStyle = '#5C6B8A';
  ctx.fillRect(x + 30, GROUND_Y - 72, 2.5, 72);
  outlined(ctx, INK, () => ctx.roundRect(x, GROUND_Y - 92, 64, 21, 4), 1);
  text(ctx, `HYROX ${st.index + 1}/${STATIONS.length}`, x + 32, GROUND_Y - 86.5, C.lime, 6.5, { outline: null });
  text(ctx, st.def.name, x + 32, GROUND_Y - 77.5, C.cream, st.def.name.length > 12 ? 5 : 6.5, { outline: null });
}

// ---------- panel ----------
// Below the DOM station banner (title, hint, timer: see ui.js), right of the equipment.
const PANEL = { x: 160, y: 100, w: 308, h: 42 };

// Horizontal meter: zones [from, to, colour] in 0..1, an optional fill and a marker.
function meter(ctx, x, y, w, h, { zones = [], fill = null, marker = null, labels = null }) {
  outlined(ctx, TRACK, () => ctx.roundRect(x, y, w, h, 3), 1);
  for (const [a, b, col] of zones) {
    ctx.fillStyle = col;
    ctx.fillRect(x + a * w, y + 1, (b - a) * w, h - 2);
  }
  if (fill != null) {
    ctx.fillStyle = 'rgba(255,245,230,0.75)';
    ctx.fillRect(x + 1, y + h * 0.3, Math.max(0, Math.min(1, fill)) * (w - 2), h * 0.4);
  }
  if (marker != null) {
    const mx = x + Math.max(0, Math.min(1, marker)) * w;
    outlined(ctx, C.cream, () => ctx.roundRect(mx - 2, y - 3, 4, h + 6, 2), 1);
  }
  if (labels) {
    for (const [at, str, col] of labels) text(ctx, str, x + at * w, y + h + 6, col, 6.5, { outline: null });
  }
}

const TRACK = '#2A3552';
const GREEN = 'rgba(43,182,115,0.8)';
const BRIGHT = 'rgba(213,255,82,0.9)';
const RED = 'rgba(229,56,59,0.75)';

function keyBox(ctx, x, y, label, on) {
  outlined(ctx, on ? C.lime : '#2A3349', () => ctx.roundRect(x, y, 34, 18, 4), 1);
  text(ctx, label, x + 17, y + 9.5, on ? INK : '#9AA5B8', 8, { outline: null });
}

function widget(ctx, st, x, y, w) {
  const p = st.def.params;
  switch (st.def.mech) {
    case 'rhythm': {
      const zone = p.window / p.period;
      const frac = MECHANICS.rhythm.ring(st);
      meter(ctx, x, y + 4, w, 10, {
        zones: [[1 - zone, 1, GREEN], [1 - p.perfect / p.period, 1, BRIGHT], [0, zone * 0.5, GREEN]],
        marker: frac,
        labels: [[0.97, '↑', C.lime]],
      });
      break;
    }
    case 'band':
      meter(ctx, x, y + 4, w, 10, {
        zones: [[p.lo / 100, p.hi / 100, GREEN], [p.over / 100, 1, RED]],
        fill: st.power / 100,
        marker: st.power / 100,
        labels: [[0.08, st.stuck > 0 ? 'FERMA!' : 'TIENI ↓', st.stuck > 0 ? '#FF8A5B' : C.cream]],
      });
      break;
    case 'charge':
      meter(ctx, x, y + 4, w, 10, {
        zones: [[p.lo / p.max, p.hi / p.max, GREEN], [p.perfectLo / p.max, p.perfectHi / p.max, BRIGHT], [p.hi / p.max, 1, RED]],
        fill: st.charge / p.max,
        marker: st.charging ? st.charge / p.max : null,
        labels: [[0.1, st.charging ? 'RILASCIA ↓' : 'TIENI ↓', C.cream]],
      });
      break;
    case 'alternate':
      keyBox(ctx, x, y + 1, '↓ GIÙ', st.expect === 'B' && st.stun <= 0);
      keyBox(ctx, x + 40, y + 1, '↑ SALTA', st.expect === 'A' && st.stun <= 0);
      text(ctx, `REP ${st.hits}`, x + 120, y + 10, C.cream, 9, { outline: null });
      break;
    case 'stroke':
      meter(ctx, x, y + 4, w, 10, {
        zones: [[0, p.zone, st.expect === 'A' ? BRIGHT : GREEN], [1 - p.zone, 1, st.expect === 'B' ? BRIGHT : GREEN]],
        marker: st.seat,
        labels: [[0.06, '↑ AVANTI', st.expect === 'A' ? C.lime : '#9AA5B8'], [0.9, '↓ DIETRO', st.expect === 'B' ? C.lime : '#9AA5B8']],
      });
      break;
    case 'balance':
      meter(ctx, x, y + 4, w, 10, {
        zones: [[0, 0.06, RED], [0.5 - p.safe / 2, 0.5 + p.safe / 2, GREEN], [0.94, 1, RED]],
        marker: st.drop > 0 ? null : 0.5 + st.b / 2,
        labels: [[0.05, '← ↑', C.cream], [0.95, '↓ →', C.cream]],
      });
      break;
    case 'sequence': {
      const hitX = x + 18;
      outlined(ctx, TRACK, () => ctx.roundRect(x, y + 1, w, 18, 3), 1);
      ctx.fillStyle = C.lime;
      ctx.fillRect(hitX - 1, y - 1, 2, 22);
      for (const pr of st.prompts) {
        const px = hitX + (pr.at - st.t) * 70;
        if (px < x + 4 || px > x + w - 6) continue;
        const col = pr.done === 'hit' ? GREEN : pr.done === 'miss' ? RED : C.cream;
        outlined(ctx, col, () => ctx.roundRect(px - 6, y + 3, 12, 14, 3), 0.8);
        text(ctx, pr.key === 'A' ? '↑' : '↓', px, y + 10.5, INK, 8, { outline: null });
      }
      break;
    }
    case 'throw':
      meter(ctx, x, y + 4, w, 10, {
        zones: [[p.lo, p.hi, GREEN], [p.perfectLo, p.perfectHi, BRIGHT]],
        fill: st.power,
        marker: st.power,
        labels: [[0.08, st.ball ? 'IN VOLO...' : 'LANCIA ↑', C.cream]],
      });
      break;
  }
}

export function drawStationPanel(ctx, st) {
  if (!active(st)) return;
  const { x, y, w, h } = PANEL;
  outlined(ctx, '#0B1630', () => ctx.roundRect(x, y, w, h, 8), 1.4);
  ctx.strokeStyle = C.lime;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x + 1.5, y + 1.5, w - 3, h - 3, 7);
  ctx.stroke();

  const wx = x + 9;
  const wy = y + 5;
  if (st.phase === 'intro') {
    const go = st.t > STATION_TIMING.intro - 0.3;
    text(ctx, go ? 'VIA!' : 'PRONTI...', x + w / 2, wy + 11, go ? C.lime : C.cream, 14);
  } else if (st.phase === 'outro') {
    const r = st.result;
    text(ctx, r.done ? `COMPLETATA! +${r.points}` : `TEMPO SCADUTO · +${r.points}`, x + w / 2, wy + 11, r.done ? C.lime : '#FF8A5B', 13);
  } else {
    widget(ctx, st, wx, wy, 200);
    if (st.fb) text(ctx, st.fb.text, x + 260, wy + 9, st.fb.good ? C.lime : '#FF8A5B', st.fb.text.length > 14 ? 7 : 9, { outline: null });
  }

  // progress
  const py = y + h - 10;
  const pw = w - 18;
  outlined(ctx, TRACK, () => ctx.roundRect(x + 9, py, pw, 5, 2.5), 1);
  ctx.fillStyle = C.lime;
  ctx.beginPath();
  ctx.roundRect(x + 10, py + 1, Math.max(0, (pw - 2) * (st.progress / 100)), 3, 1.5);
  ctx.fill();
}
