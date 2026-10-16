// Environments: background tiles (far + mid parallax layers), skies, grounds, posters and props.
// Tiles are painted once per resize at device resolution; each painter draws one W-wide tile and
// repeats elements near an edge so the tile wraps seamlessly.
import { W, H, GROUND_Y, PATH_TOP, COLORS as C } from './config.js';
import { BILLBOARDS } from './billboards.js';
import { INK, rng, text, outlined, fillPath, line, wrap } from './draw.js';

function wrapX(x, w, draw) {
  draw(x);
  if (x + w > W) draw(x - W);
  if (x < 0) draw(x + W);
}

// ---------- far layer (112px tall, bottom = horizon) ----------
export function paintClouds(g) {
  const r = rng(3);
  for (let x = 20; x < W; x += 95 + r() * 70) {
    const y = 14 + r() * 40;
    const s = 0.8 + r() * 0.6;
    wrapX(x, 50 * s, (cx) => {
      g.fillStyle = 'rgba(255,255,255,0.92)';
      for (const [dx, dy, rr] of [[0, 8, 8], [10, 2, 11], [22, 5, 9], [32, 9, 7], [16, 10, 9]]) {
        g.beginPath();
        g.arc(cx + dx * s, y + dy * s, rr * s, 0, Math.PI * 2);
        g.fill();
      }
      g.fillStyle = 'rgba(53,107,255,0.12)';
      g.beginPath();
      g.ellipse(cx + 17 * s, y + 15 * s, 22 * s, 3 * s, 0, 0, Math.PI * 2);
      g.fill();
    });
  }
}

function paintSkyline(g, warm = false) {
  const r = rng(warm ? 9 : 7);
  let x = 0;
  while (x < W) {
    const bw = 20 + r() * 30;
    const bh = 35 + r() * 60;
    const top = 110 - bh;
    const col = warm ? (r() < 0.5 ? '#B4655A' : '#9C5A63') : r() < 0.5 ? '#3E5A9A' : '#34508C';
    g.fillStyle = col;
    g.beginPath();
    g.roundRect(x, top, bw - 2, bh, [3, 3, 0, 0]);
    g.fill();
    g.fillStyle = 'rgba(255,255,255,0.08)';
    g.fillRect(x + bw * 0.55, top, bw * 0.45 - 2, bh);
    g.fillStyle = 'rgba(255,245,230,0.45)';
    for (let wy = top + 6; wy < 104; wy += 8) {
      for (let wx = x + 4; wx < x + bw - 6; wx += 6) if (r() < 0.4) g.fillRect(wx, wy, 2.5, 3.5);
    }
    if (r() < 0.25) {
      g.fillStyle = col;
      g.fillRect(x + bw / 2 - 1, top - 10, 2, 10);
    }
    x += bw;
  }
}

function paintMountains(g) {
  const r = rng(17);
  const ridge = (base, color, snow, step, hMin, hMax) => {
    let x = -40;
    while (x < W + 40) {
      const w = step + r() * step;
      const h = hMin + r() * (hMax - hMin);
      const px = x + w / 2;
      wrapX(x, w, (ox) => {
        fillPath(g, color, () => {
          g.moveTo(ox, base);
          g.lineTo(ox + w / 2, base - h);
          g.lineTo(ox + w, base);
          g.closePath();
        });
        if (snow) {
          fillPath(g, 'rgba(255,255,255,0.9)', () => {
            g.moveTo(ox + w / 2, base - h);
            g.lineTo(ox + w / 2 - w * 0.12, base - h + h * 0.24);
            g.lineTo(ox + w / 2 - w * 0.03, base - h + h * 0.19);
            g.lineTo(ox + w / 2 + w * 0.05, base - h + h * 0.27);
            g.lineTo(ox + w / 2 + w * 0.12, base - h + h * 0.24);
            g.closePath();
          });
        }
      });
      x = px + r() * w * 0.3;
    }
  };
  ridge(112, '#5E7FA6', true, 70, 60, 95);
  ridge(112, '#3F6B5E', false, 50, 25, 50);
}

function paintSea(g) {
  const r = rng(29);
  const horizon = 76;
  const grad = g.createLinearGradient(0, horizon, 0, 112);
  grad.addColorStop(0, '#2E86DE');
  grad.addColorStop(1, '#55C2E8');
  g.fillStyle = grad;
  g.fillRect(0, horizon, W, 112 - horizon);
  // distant island + lighthouse
  fillPath(g, '#3F8F6B', () => g.ellipse(120, horizon + 1, 46, 9, 0, Math.PI, 0));
  g.fillStyle = C.cream;
  g.fillRect(140, horizon - 22, 5, 16);
  g.fillStyle = C.red;
  g.fillRect(140, horizon - 16, 5, 3);
  g.fillRect(139, horizon - 25, 7, 3);
  // waves
  g.strokeStyle = 'rgba(255,255,255,0.55)';
  g.lineWidth = 1;
  for (let i = 0; i < 26; i++) {
    const x = r() * W;
    const y = horizon + 6 + r() * 28;
    g.beginPath();
    g.arc(x, y, 3 + r() * 3, Math.PI * 1.1, Math.PI * 1.9);
    g.stroke();
  }
  // sailboat
  outlined(g, C.cream, () => g.roundRect(330, horizon + 10, 22, 4, 2), 0.8);
  fillPath(g, C.white, () => { g.moveTo(341, horizon + 9); g.lineTo(341, horizon - 14); g.lineTo(354, horizon + 8); g.closePath(); });
  fillPath(g, C.orange, () => { g.moveTo(339, horizon + 9); g.lineTo(339, horizon - 8); g.lineTo(331, horizon + 8); g.closePath(); });
}

function paintArenaWall(g) {
  const r = rng(31);
  g.fillStyle = '#1F2638';
  g.fillRect(0, 0, W, 112);
  // stands: rows of spectators (dots) under a roof truss
  for (let row = 0; row < 4; row++) {
    const y = 56 + row * 12;
    g.fillStyle = row % 2 ? '#2A3349' : '#262E43';
    g.fillRect(0, y - 6, W, 12);
    for (let x = 4; x < W; x += 7) {
      if (r() < 0.75) {
        g.fillStyle = ['#FF6B35', '#D5FF52', '#FFF5E6', '#356BFF', '#F1B58C', '#E5383B'][(r() * 6) | 0];
        g.beginPath();
        g.arc(x + r() * 2, y - 1, 2.1, 0, Math.PI * 2);
        g.fill();
      }
    }
  }
  // truss + spotlights
  g.fillStyle = '#5C6B8A';
  g.fillRect(0, 10, W, 3);
  g.fillRect(0, 22, W, 2);
  g.strokeStyle = '#5C6B8A';
  g.lineWidth = 1;
  for (let x = 0; x < W; x += 12) {
    g.beginPath();
    g.moveTo(x, 13);
    g.lineTo(x + 6, 22);
    g.lineTo(x + 12, 13);
    g.stroke();
  }
  for (const x of [60, 180, 300, 420]) {
    outlined(g, '#2A2F3D', () => g.roundRect(x - 5, 23, 10, 7, 2), 0.8);
    const beam = g.createLinearGradient(0, 30, 0, 110);
    beam.addColorStop(0, 'rgba(255,245,230,0.22)');
    beam.addColorStop(1, 'rgba(255,245,230,0)');
    fillPath(g, beam, () => { g.moveTo(x - 4, 30); g.lineTo(x - 26, 112); g.lineTo(x + 26, 112); g.lineTo(x + 4, 30); g.closePath(); });
  }
  // arena banners
  for (const [x, label] of [[20, 'ARENA FUNZIONALE'], [250, '8 KM + 8 STAZIONI']]) {
    outlined(g, C.lime, () => g.roundRect(x, 34, 150, 12, 3), 0.8);
    text(g, label, x + 75, 40, INK, 7.5, { outline: null });
  }
}

// ---------- mid layer (92px tall, bottom hidden under the path) ----------
function paintPark(g) {
  const r = rng(11);
  for (let x = -10; x < W + 10; x += 14) {
    g.fillStyle = '#1E8F5A';
    g.beginPath();
    g.arc(x, 82, 9 + r() * 3, Math.PI, 0);
    g.fill();
  }
  for (let x = 10; x < W; x += 34 + r() * 40) {
    const th = 16 + r() * 12;
    const cw = 13 + r() * 6;
    const cy = 80 - th - cw * 0.7;
    wrapX(x, cw * 2, (tx) => {
      outlined(g, '#7A4E2D', () => g.roundRect(tx - 2, 80 - th - 4, 4, th + 6, 1.5), 0.9);
      for (const [dx, dy, s] of [[-cw * 0.55, cw * 0.25, 0.7], [cw * 0.55, cw * 0.25, 0.7], [0, -cw * 0.2, 0.85]]) {
        outlined(g, '#2BB673', () => g.arc(tx + dx, cy + dy, cw * s, 0, Math.PI * 2), 1);
      }
      g.fillStyle = 'rgba(213,255,82,0.35)';
      g.beginPath();
      g.arc(tx - cw * 0.25, cy - cw * 0.4, cw * 0.35, 0, Math.PI * 2);
      g.fill();
    });
  }
  // benches and street lamps in front of the hedge
  for (const bx of [60, 250, 400]) {
    outlined(g, '#8C5A3C', () => g.roundRect(bx, 76, 30, 4, 1), 0.8);
    outlined(g, '#8C5A3C', () => g.roundRect(bx, 69, 30, 3, 1), 0.8);
    g.fillStyle = '#2A2F3D';
    g.fillRect(bx + 3, 80, 2, 8);
    g.fillRect(bx + 25, 80, 2, 8);
  }
  for (const lx of [150, 340]) {
    g.fillStyle = '#2A2F3D';
    g.fillRect(lx, 40, 2.5, 50);
    outlined(g, C.gold, () => g.roundRect(lx - 3, 34, 8.5, 7, 2), 0.8);
  }
}

function paintForest(g) {
  const r = rng(13);
  const pine = (x, base, h, color) => {
    g.fillStyle = '#5A3B22';
    g.fillRect(x - 2, base - 8, 4, 8);
    for (let i = 0; i < 3; i++) {
      const w = h * (0.55 - i * 0.12);
      const y0 = base - 6 - i * h * 0.26;
      outlined(g, color, () => { g.moveTo(x - w / 2, y0); g.lineTo(x, y0 - h * 0.42); g.lineTo(x + w / 2, y0); g.closePath(); }, 0.9);
    }
  };
  for (let x = 6; x < W; x += 18 + r() * 16) wrapX(x, 30, (px) => pine(px, 86, 46 + r() * 22, r() < 0.5 ? '#2E7D52' : '#256B45'));
  // ferns + stumps + a trail sign
  for (let x = 0; x < W; x += 9) {
    g.fillStyle = r() < 0.5 ? '#3E8E4E' : '#4FA35E';
    g.beginPath();
    g.ellipse(x, 88, 5, 3, 0, Math.PI, 0);
    g.fill();
  }
  outlined(g, '#8C5A3C', () => g.roundRect(200, 79, 12, 9, 2), 0.8);
  g.fillStyle = '#5A3B22';
  g.fillRect(330, 56, 3, 32);
  outlined(g, '#C8955A', () => { g.moveTo(318, 56); g.lineTo(348, 56); g.lineTo(354, 61); g.lineTo(348, 66); g.lineTo(318, 66); g.closePath(); }, 0.8);
  text(g, 'VETTA 3 KM', 334, 61.5, INK, 6, { outline: null });
}

function paintBeach(g) {
  const r = rng(19);
  // dune strip
  const sand = g.createLinearGradient(0, 70, 0, 92);
  sand.addColorStop(0, '#F7E2AE');
  sand.addColorStop(1, '#EBCB88');
  g.fillStyle = sand;
  g.fillRect(0, 72, W, 20);
  // umbrellas + towels with sunbathers
  const cols = [[C.red, C.cream], [C.blue, C.cream], [C.orange, C.lime], ['#9B5DE5', C.cream]];
  for (let i = 0, x = 30; x < W; x += 82 + r() * 30, i++) {
    const [a, b] = cols[i % cols.length];
    wrapX(x, 40, (ux) => {
      g.fillStyle = '#E8E1D1';
      g.fillRect(ux - 0.8, 52, 1.6, 34);
      for (let k = 0; k < 6; k++) {
        fillPath(g, k % 2 ? a : b, () => {
          g.moveTo(ux, 46);
          g.arc(ux, 58, 17, Math.PI + (k * Math.PI) / 6, Math.PI + ((k + 1) * Math.PI) / 6);
          g.closePath();
        });
      }
      g.strokeStyle = INK;
      g.lineWidth = 0.9;
      g.beginPath();
      g.arc(ux, 58, 17, Math.PI, 0);
      g.closePath();
      g.stroke();
      // towel + bather lying down
      outlined(g, b === C.cream ? a : b, () => g.roundRect(ux + 6, 80, 26, 6, 1.5), 0.7);
      fillPath(g, C.skin, () => g.roundRect(ux + 9, 79, 18, 3.4, 1.7));
      fillPath(g, C.skin, () => g.arc(ux + 29, 80.6, 2.4, 0, Math.PI * 2));
      fillPath(g, a, () => g.roundRect(ux + 15, 78.8, 6, 3.6, 1));
    });
  }
  // lifeguard chair
  g.strokeStyle = '#E8E1D1';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(258, 88); g.lineTo(264, 54); g.moveTo(280, 88); g.lineTo(274, 54);
  g.stroke();
  outlined(g, C.red, () => g.roundRect(260, 50, 18, 6, 1.5), 0.8);
  text(g, 'BAGNINO', 269, 44, C.red, 6, { outline: C.cream });
  // beach balls resting
  for (const bx of [110, 360]) {
    outlined(g, C.cream, () => g.arc(bx, 85, 4, 0, Math.PI * 2), 0.7);
    fillPath(g, C.red, () => g.arc(bx, 85, 4, -0.6, 0.6));
    fillPath(g, C.blue, () => g.arc(bx, 85, 4, 2.5, 3.7));
  }
}

function paintArena(g) {
  const r = rng(37);
  // wall-ball targets on the back wall
  for (const x of [40, 220, 400]) {
    outlined(g, '#2A2F3D', () => g.roundRect(x, 12, 4, 76, 1), 0.8);
    outlined(g, C.lime, () => g.arc(x + 2, 18, 7, 0, Math.PI * 2), 0.9);
    fillPath(g, '#1F2638', () => g.arc(x + 2, 18, 3.5, 0, Math.PI * 2));
  }
  // rigs (squat racks)
  for (const x of [90, 300]) {
    for (const px of [x, x + 46]) outlined(g, '#5C6B8A', () => g.roundRect(px, 22, 4, 66, 1), 0.8);
    outlined(g, '#5C6B8A', () => g.roundRect(x, 22, 50, 4, 1), 0.8);
    outlined(g, '#9AA5B8', () => g.roundRect(x - 6, 52, 62, 2.5, 1), 0.6);
    for (const px of [x - 4, x + 50]) outlined(g, '#2A2F3D', () => g.roundRect(px, 46, 4, 14, 1.5), 0.7);
  }
  // rowers and kettlebell rack on the floor line
  for (const x of [150, 360]) {
    outlined(g, '#2A2F3D', () => g.roundRect(x, 84, 40, 3, 1.5), 0.7);
    outlined(g, '#2A2F3D', () => g.arc(x + 40, 80, 6, 0, Math.PI * 2), 0.8);
    fillPath(g, C.lime, () => g.arc(x + 40, 80, 2.2, 0, Math.PI * 2));
  }
  outlined(g, '#5C6B8A', () => g.roundRect(240, 76, 46, 3, 1), 0.7);
  for (let k = 0; k < 4; k++) {
    outlined(g, k % 2 ? C.orange : '#2A2F3D', () => g.arc(246 + k * 11, 72, 3.6, 0, Math.PI * 2), 0.7);
    g.strokeStyle = INK;
    g.lineWidth = 0.8;
    g.beginPath();
    g.arc(246 + k * 11, 68, 2, Math.PI, 0);
    g.stroke();
  }
  // lime floor signage
  g.fillStyle = 'rgba(213,255,82,0.85)';
  for (let x = 0; x < W; x += 60 + r() * 20) g.fillRect(x, 89, 30, 2);
}

function paintMarathon(g) {
  const r = rng(41);
  const signs = ['GEL & CO', 'SCARPE -0%', 'PB CAFFÈ', 'TAPER BAR', 'CARBO LOAD'];
  let x = 0;
  let i = 0;
  while (x < W) {
    let bw = 78 + r() * 26;
    if (W - x - bw < 70) bw = W - x + 4; // the last building fills the tile: no cut sign at the seam
    const col = r() < 0.5 ? '#E07A4F' : '#4C6FBF';
    const bx = x;
    const w = bw - 4;
    outlined(g, col, () => g.roundRect(bx, 6, w, 80, [4, 4, 0, 0]), 1);
    g.fillStyle = 'rgba(255,255,255,0.12)';
    g.fillRect(bx + w * 0.6, 7, w * 0.4 - 1, 78);
    for (let wy = 14; wy < 40; wy += 13) {
      for (let wx = bx + 7; wx < bx + w - 14; wx += 17) {
        outlined(g, '#BFE3FF', () => g.roundRect(wx, wy, 10, 9, 1.5), 0.8);
      }
    }
    for (let s = 0; s < w - 8; s += 8) {
      g.fillStyle = s % 16 ? '#FFF5E6' : '#E5383B';
      g.fillRect(bx + 4 + s, 42, Math.min(8, w - 8 - s), 6);
    }
    outlined(g, INK, () => g.roundRect(bx + 6, 50, w - 12, 12, 3), 0.8);
    text(g, signs[i++ % signs.length], bx + w / 2, 56.5, C.lime, 7.5, { outline: null });
    x += bw;
  }
  // the crowd behind the barriers
  for (let px = 2; px < W; px += 7 + r() * 3) {
    const h = 14 + r() * 6;
    const shirt = ['#FF6B35', '#D5FF52', '#356BFF', '#FFF5E6', '#E5383B', '#9B5DE5', '#FFC93C'][(r() * 7) | 0];
    fillPath(g, shirt, () => g.roundRect(px - 3, 90 - h + 6, 6.5, h, 2.5));
    fillPath(g, [C.skin, C.skinDark, '#8D5A3B', '#F6CBA5'][(r() * 4) | 0], () => g.arc(px + 0.2, 90 - h + 3, 3, 0, Math.PI * 2));
    if (r() < 0.3) line(g, px + 2, 90 - h + 7, px + 5, 90 - h - 3, shirt, 1.6); // waving arm
  }
  // barriers
  g.fillStyle = C.cream;
  g.fillRect(0, 80, W, 3);
  for (let bx = 0; bx < W; bx += 24) {
    g.fillStyle = '#9AA5B8';
    g.fillRect(bx + 2, 80, 1.5, 10);
    g.fillStyle = (bx / 24) % 2 ? C.blue : C.orange;
    g.fillRect(bx + 4, 83, 18, 4);
  }
}

// One entry per zone (same order as config ZONES): sky, far + mid painters, ground painter.
export const SCENES = {
  park: { sky: ['#4F9DFF', '#BFE2FF'], sun: '#FFC93C', sunY: 48, clouds: 1, far: (g) => paintSkyline(g), mid: paintPark, ground: groundPark },
  forest: { sky: ['#5FA8C9', '#D9F0E3'], sun: '#FFE38A', sunY: 40, clouds: 0.9, far: paintMountains, mid: paintForest, ground: groundForest },
  beach: { sky: ['#2F9BEF', '#FFE9B8'], sun: '#FFC93C', sunY: 34, clouds: 0.6, far: paintSea, mid: paintBeach, ground: groundBeach },
  arena: { sky: ['#11172A', '#1F2638'], sun: null, clouds: 0, far: paintArenaWall, mid: paintArena, ground: groundArena },
  marathon: { sky: ['#FF8A5B', '#FFE3B8'], sun: '#FFF5E6', sunY: 95, clouds: 0.8, far: (g) => paintSkyline(g, true), mid: paintMarathon, ground: groundMarathon },
};

export function drawSky(ctx, scene, alpha, t) {
  if (alpha <= 0) return;
  ctx.globalAlpha = alpha;
  const grad = ctx.createLinearGradient(0, 0, 0, PATH_TOP);
  grad.addColorStop(0, scene.sky[0]);
  grad.addColorStop(1, scene.sky[1]);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, PATH_TOP + 2);
  if (scene.sun) {
    ctx.fillStyle = 'rgba(255,201,60,0.3)';
    ctx.beginPath();
    ctx.arc(380, scene.sunY, 26 + Math.sin(t * 2) * 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = scene.sun;
    ctx.beginPath();
    ctx.arc(380, scene.sunY, 17, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ---------- grounds (scroll with the world) ----------
const scrollX = (traveled, period) => -(traveled % period);

function groundPark(ctx, traveled) {
  ctx.fillStyle = '#2BB673';
  ctx.fillRect(0, PATH_TOP - 5, W, 6);
  const grad = ctx.createLinearGradient(0, PATH_TOP, 0, H);
  grad.addColorStop(0, '#E2BF85');
  grad.addColorStop(1, '#C99A5B');
  ctx.fillStyle = grad;
  ctx.fillRect(0, PATH_TOP, W, H - PATH_TOP);
  ctx.fillStyle = 'rgba(122,78,45,0.35)';
  for (let x = scrollX(traveled, 29); x < W; x += 29) {
    ctx.beginPath();
    ctx.ellipse(x, GROUND_Y + 10 + ((x * 7) & 15), 2.2, 1.2, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#1E8F5A';
  ctx.fillRect(0, GROUND_Y + 30, W, H - GROUND_Y - 30);
  ctx.fillStyle = '#2BB673';
  for (let x = scrollX(traveled, 12); x < W; x += 12) {
    ctx.beginPath();
    ctx.moveTo(x, GROUND_Y + 31);
    ctx.lineTo(x + 3, GROUND_Y + 25);
    ctx.lineTo(x + 6, GROUND_Y + 31);
    ctx.fill();
  }
}

function groundForest(ctx, traveled) {
  ctx.fillStyle = '#3E8E4E';
  ctx.fillRect(0, PATH_TOP - 5, W, 6);
  const grad = ctx.createLinearGradient(0, PATH_TOP, 0, H);
  grad.addColorStop(0, '#A8774A');
  grad.addColorStop(1, '#7A5230');
  ctx.fillStyle = grad;
  ctx.fillRect(0, PATH_TOP, W, H - PATH_TOP);
  // pebbles and little roots in the dirt
  for (let x = scrollX(traveled, 23); x < W; x += 23) {
    ctx.fillStyle = 'rgba(232,225,209,0.5)';
    ctx.beginPath();
    ctx.ellipse(x, GROUND_Y + 8 + ((x * 5) & 11), 1.8, 1.1, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(70,42,20,0.45)';
  ctx.lineWidth = 1.2;
  for (let x = scrollX(traveled, 71); x < W; x += 71) {
    ctx.beginPath();
    ctx.moveTo(x, GROUND_Y + 20);
    ctx.quadraticCurveTo(x + 10, GROUND_Y + 15, x + 22, GROUND_Y + 21);
    ctx.stroke();
  }
  ctx.fillStyle = '#2E6B3E';
  ctx.fillRect(0, GROUND_Y + 32, W, H - GROUND_Y - 32);
  ctx.fillStyle = '#3E8E4E';
  for (let x = scrollX(traveled, 10); x < W; x += 10) {
    ctx.beginPath();
    ctx.moveTo(x, GROUND_Y + 33);
    ctx.lineTo(x + 2.5, GROUND_Y + 27);
    ctx.lineTo(x + 5, GROUND_Y + 33);
    ctx.fill();
  }
}

function groundBeach(ctx, traveled) {
  ctx.fillStyle = '#EBCB88';
  ctx.fillRect(0, PATH_TOP - 5, W, H - PATH_TOP + 5);
  // boardwalk
  ctx.fillStyle = '#C8955A';
  ctx.fillRect(0, PATH_TOP, W, GROUND_Y + 12 - PATH_TOP);
  ctx.fillStyle = 'rgba(90,59,34,0.55)';
  for (let x = scrollX(traveled, 13); x < W; x += 13) ctx.fillRect(x, PATH_TOP, 1.2, GROUND_Y + 12 - PATH_TOP);
  ctx.fillStyle = '#9C6B3F';
  ctx.fillRect(0, GROUND_Y + 12, W, 2.5);
  // sand ripples below
  ctx.strokeStyle = 'rgba(176,132,70,0.5)';
  ctx.lineWidth = 1;
  for (let x = scrollX(traveled, 37); x < W; x += 37) {
    for (const dy of [24, 36]) {
      ctx.beginPath();
      ctx.arc(x + dy, GROUND_Y + dy, 6, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
    }
  }
}

function groundArena(ctx, traveled) {
  ctx.fillStyle = '#2A2F3D';
  ctx.fillRect(0, PATH_TOP - 5, W, 5);
  ctx.fillStyle = '#20242D';
  ctx.fillRect(0, PATH_TOP, W, H - PATH_TOP);
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  for (let x = scrollX(traveled, 40); x < W; x += 40) ctx.fillRect(x, PATH_TOP, 1, H - PATH_TOP);
  ctx.fillStyle = C.lime;
  ctx.fillRect(0, PATH_TOP + 1, W, 1.4);
  ctx.fillRect(0, GROUND_Y + 14, W, 1.4);
  for (let x = scrollX(traveled, 220); x < W; x += 220) text(ctx, 'ROXZONE', x + 40, GROUND_Y + 30, 'rgba(213,255,82,0.55)', 9, { outline: null });
}

function groundMarathon(ctx, traveled) {
  ctx.fillStyle = '#C9CED8';
  ctx.fillRect(0, PATH_TOP - 5, W, 5);
  ctx.fillStyle = '#8D95A6';
  for (let x = scrollX(traveled, 26); x < W; x += 26) ctx.fillRect(x, PATH_TOP - 5, 1, 5);
  ctx.fillStyle = '#495266';
  ctx.fillRect(0, PATH_TOP, W, H - PATH_TOP);
  // the blue line of the marathon
  ctx.fillStyle = '#4FA3FF';
  ctx.fillRect(0, GROUND_Y + 6, W, 2.2);
  ctx.fillStyle = '#FFC93C';
  for (let x = scrollX(traveled, 52); x < W; x += 52) {
    ctx.beginPath();
    ctx.roundRect(x, GROUND_Y + 24, 26, 3, 1.5);
    ctx.fill();
  }
}

export function drawGround(ctx, scene, traveled, alpha) {
  if (alpha <= 0) return;
  ctx.globalAlpha = alpha;
  scene.ground(ctx, traveled);
  ctx.globalAlpha = 1;
}

// ---------- posters and props (parallax 0.55, behind the lane) ----------
// Look of the poster per zone. All posters keep their bottom edge above the path.
const POSTER = {
  park: { w: 122, top: PATH_TOP - 82, body: C.cream, ink: INK, frame: INK, posts: '#5C6B8A' },
  forest: { w: 112, top: PATH_TOP - 76, body: '#8C5A3C', ink: C.cream, frame: '#5A3B22', posts: '#5A3B22', single: true },
  beach: { w: 118, top: PATH_TOP - 80, body: C.white, ink: INK, frame: C.red, posts: '#E8E1D1', stripes: true },
  arena: { w: 128, top: PATH_TOP - 106, body: '#0B1630', ink: C.lime, frame: '#5C6B8A', hung: true },
  marathon: { w: 126, top: PATH_TOP - 74, body: C.cream, ink: INK, frame: null, posts: '#9AA5B8', banner: true },
};

export function drawBillboard(ctx, pr) {
  const cat = BILLBOARDS[pr.category];
  const s = POSTER[pr.zone] ?? POSTER.park;
  const x = pr.x;
  pr.wrapped ??= wrap(ctx, pr.text, s.w - 12, 7.4, 3);
  const { lines, size } = pr.wrapped;
  const headH = 12;
  const h = headH + lines.length * (size + 2) + 6;
  const top = s.top + (3 - lines.length) * (size + 2); // fewer lines: same bottom edge
  const bottom = top + h;
  const body = s.body;
  const accentHead = s.hung || s.banner; // accent strip with dark label, instead of dark strip with accent label

  if (s.hung) {
    line(ctx, x + 14, 0, x + 14, top, '#5C6B8A', 1);
    line(ctx, x + s.w - 14, 0, x + s.w - 14, top, '#5C6B8A', 1);
  } else if (s.single) {
    ctx.fillStyle = s.posts;
    ctx.fillRect(x + s.w / 2 - 2, bottom - 2, 4, PATH_TOP - bottom + 2);
  } else {
    ctx.fillStyle = s.posts;
    ctx.fillRect(x + 16, bottom - 2, 3, PATH_TOP - bottom + 2);
    ctx.fillRect(x + s.w - 19, bottom - 2, 3, PATH_TOP - bottom + 2);
  }
  outlined(ctx, s.stripes ? C.red : s.frame ?? cat.accent, () => ctx.roundRect(x - 2, top - 2, s.w + 4, h + 4, 6), 1);
  if (s.stripes) {
    ctx.fillStyle = C.cream;
    for (let k = 0; k < s.w + 4; k += 10) ctx.fillRect(x - 2 + k, top - 2, 5, 2);
  }
  outlined(ctx, body, () => ctx.roundRect(x, top, s.w, h, 5), 1);
  // header strip: category in its accent colour, readable on dark ink
  outlined(ctx, accentHead ? cat.accent : INK, () => ctx.roundRect(x, top, s.w, headH, [5, 5, 0, 0]), 1);
  text(ctx, cat.label, x + s.w / 2, top + headH / 2 + 0.5, accentHead ? INK : cat.accent, 7, { outline: null });
  lines.forEach((l, i) => text(ctx, l, x + s.w / 2, top + headH + 4 + size / 2 + i * (size + 2), s.ink, size, { outline: null }));
  if (s.hung) {
    ctx.fillStyle = 'rgba(213,255,82,0.06)';
    for (let yy = top + headH + 1; yy < bottom; yy += 2) ctx.fillRect(x + 1, yy, s.w - 2, 0.8);
  }
}

// Spectators with a hand-written sign. Feet just behind the path.
export function drawCrowd(ctx, pr, t) {
  const r = rng(Math.floor(pr.seed * 1000));
  const base = PATH_TOP - 1;
  for (let i = 0; i < pr.n; i++) {
    const x = pr.x + i * 15 + r() * 4;
    const hgt = 22 + r() * 6;
    const shirt = ['#FF6B35', '#D5FF52', '#356BFF', '#E5383B', '#9B5DE5', '#FFC93C'][(r() * 6) | 0];
    const skin = [C.skin, C.skinDark, '#8D5A3B', '#F6CBA5'][(r() * 4) | 0];
    const jump = Math.max(0, Math.sin(t * 7 + i * 1.7)) * 2.5;
    ctx.fillStyle = '#2A2F3D';
    ctx.fillRect(x - 3, base - 9 - jump, 2.4, 9);
    ctx.fillRect(x + 0.6, base - 9 - jump, 2.4, 9);
    outlined(ctx, shirt, () => ctx.roundRect(x - 4, base - hgt + 5 - jump, 8, hgt - 13, 3), 0.8);
    outlined(ctx, skin, () => ctx.arc(x, base - hgt + 1 - jump, 3.6, 0, Math.PI * 2), 0.8);
    const wave = Math.sin(t * 9 + i) * 0.5;
    line(ctx, x + 3, base - hgt + 8 - jump, x + 7 + wave * 2, base - hgt - 2 - jump, skin, 2);
  }
  // sign held up by the middle spectator
  pr.wrapped ??= wrap(ctx, pr.sign, 74, 6.8, 2);
  const { lines, size } = pr.wrapped;
  const sx = pr.x + ((pr.n - 1) * 15) / 2 - 40;
  const sh = 6 + lines.length * (size + 1.5);
  const sy = base - 42 - sh;
  line(ctx, sx + 40, sy + sh, sx + 40, base - 26, '#8C5A3C', 1.4);
  outlined(ctx, C.cream, () => ctx.roundRect(sx, sy, 80, sh, 2), 1);
  lines.forEach((l, i) => text(ctx, l, sx + 40, sy + 3 + size / 2 + i * (size + 1.5), C.red, size, { outline: null }));
}

// Aid station: table with cups, banner, a volunteer.
export function drawRistoro(ctx, pr) {
  const x = pr.x;
  const base = PATH_TOP - 1;
  for (const px of [x + 4, x + 64]) {
    ctx.fillStyle = '#9AA5B8';
    ctx.fillRect(px, base - 44, 2, 44);
  }
  outlined(ctx, C.blue, () => ctx.roundRect(x, base - 52, 70, 11, 3), 1);
  text(ctx, 'RISTORO', x + 35, base - 46.5, C.cream, 7, { outline: null });
  outlined(ctx, C.cream, () => ctx.roundRect(x + 2, base - 16, 66, 4, 1), 0.8);
  ctx.fillStyle = '#5C6B8A';
  ctx.fillRect(x + 8, base - 12, 2, 12);
  ctx.fillRect(x + 60, base - 12, 2, 12);
  for (let k = 0; k < 7; k++) outlined(ctx, k % 3 ? C.white : C.orange, () => ctx.roundRect(x + 8 + k * 8, base - 22, 5, 6, 1), 0.6);
  // volunteer behind the table
  outlined(ctx, C.lime, () => ctx.roundRect(x + 30, base - 34, 9, 18, 3), 0.8);
  outlined(ctx, C.skin, () => ctx.arc(x + 34.5, base - 37, 3.6, 0, Math.PI * 2), 0.8);
}

// Start / finish arch over the lane.
export function drawArch(ctx, x, label, color = C.orange) {
  const top = GROUND_Y - 92;
  for (const px of [x - 8, x + 62]) outlined(ctx, color, () => ctx.roundRect(px, top + 8, 10, GROUND_Y - top - 6, 5), 1.2);
  outlined(ctx, color, () => ctx.roundRect(x - 12, top, 88, 20, 10), 1.2);
  text(ctx, label, x + 32, top + 10, C.cream, 9);
  for (let i = 0; i < 9; i++) {
    ctx.fillStyle = i % 2 ? INK : C.cream;
    ctx.fillRect(x + 4 + i * 6, GROUND_Y - 1, 6, 3);
    ctx.fillStyle = i % 2 ? C.cream : INK;
    ctx.fillRect(x + 4 + i * 6, GROUND_Y + 2, 6, 3);
  }
}

// ---------- vector obstacles (no art for them on the sheet) ----------
// Drawn with the bottom on the ground line (flyers at their lift), x = left edge, w = footprint.
export const VECTOR_OBSTACLES = {
  root(ctx, o) {
    const y = GROUND_Y;
    ctx.lineCap = 'round';
    for (const [w, col] of [[6.5, INK], [4.5, '#7A4E2D']]) {
      ctx.strokeStyle = col;
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.moveTo(o.x + 2, y + 1);
      ctx.quadraticCurveTo(o.x + o.w * 0.3, y - 13, o.x + o.w * 0.55, y - 4);
      ctx.quadraticCurveTo(o.x + o.w * 0.75, y + 2, o.x + o.w - 2, y - 2);
      ctx.stroke();
    }
    fillPath(ctx, 'rgba(255,245,230,0.3)', () => ctx.ellipse(o.x + o.w * 0.32, y - 8, 4, 1.2, -0.4, 0, Math.PI * 2));
  },
  rock(ctx, o) {
    const y = GROUND_Y + 1;
    outlined(ctx, '#8D95A6', () => {
      ctx.moveTo(o.x + 2, y);
      ctx.lineTo(o.x + 6, y - 15);
      ctx.lineTo(o.x + 15, y - 21);
      ctx.lineTo(o.x + 25, y - 14);
      ctx.lineTo(o.x + o.w - 1, y);
      ctx.closePath();
    }, 1.1);
    fillPath(ctx, 'rgba(255,255,255,0.3)', () => { ctx.moveTo(o.x + 8, y - 14); ctx.lineTo(o.x + 15, y - 19); ctx.lineTo(o.x + 14, y - 12); ctx.closePath(); });
    fillPath(ctx, '#4FA35E', () => ctx.ellipse(o.x + 20, y - 1, 6, 2, 0, Math.PI, 0));
  },
  branch(ctx, o) {
    const y = GROUND_Y - 41;
    line(ctx, o.x - 6, y - 26, o.x + o.w * 0.4, y, INK, 5.5);
    line(ctx, o.x - 6, y - 26, o.x + o.w * 0.4, y, '#7A4E2D', 3.6);
    line(ctx, o.x + o.w * 0.4, y, o.x + o.w, y + 2, INK, 4.5);
    line(ctx, o.x + o.w * 0.4, y, o.x + o.w, y + 2, '#7A4E2D', 2.8);
    for (const [dx, dy] of [[6, 2], [18, 5], [30, 4], [38, 6]]) outlined(ctx, '#2BB673', () => ctx.ellipse(o.x + dx, y + dy, 5, 3, 0.4, 0, Math.PI * 2), 0.8);
  },
  ball(ctx, o) {
    const r = 10;
    const cx = o.x + o.w / 2;
    const cy = GROUND_Y - r - Math.abs(Math.sin(o.anim * 6)) * 2;
    const spin = -o.anim * 5;
    outlined(ctx, C.white, () => ctx.arc(cx, cy, r, 0, Math.PI * 2), 1.1);
    [C.red, C.blue, C.gold].forEach((col, k) => {
      fillPath(ctx, col, () => { ctx.moveTo(cx, cy); ctx.arc(cx, cy, r - 0.6, spin + k * 2.09, spin + k * 2.09 + 0.9); ctx.closePath(); });
    });
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  },
  sand(ctx, o) {
    fillPath(ctx, '#F2D59B', () => ctx.ellipse(o.x + o.w / 2, GROUND_Y + 1, o.w / 2, 5, 0, 0, Math.PI * 2));
    fillPath(ctx, '#E2BF85', () => ctx.ellipse(o.x + o.w / 2 + 6, GROUND_Y - 1, o.w / 3, 3, 0, Math.PI, 0));
    ctx.fillStyle = 'rgba(176,132,70,0.6)';
    for (const dx of [10, 22, 36, 48]) ctx.fillRect(o.x + dx, GROUND_Y - 1 + (dx % 3), 2, 1);
  },
  frisbee(ctx, o) {
    const cx = o.x + o.w / 2;
    const cy = GROUND_Y - 43 + Math.sin(o.anim * 8) * 1.2;
    outlined(ctx, '#FF4FD8', () => ctx.ellipse(cx, cy, 11, 3.6, -0.15, 0, Math.PI * 2), 1);
    fillPath(ctx, 'rgba(255,255,255,0.5)', () => ctx.ellipse(cx - 2, cy - 1, 5, 1.2, -0.15, 0, Math.PI * 2));
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 1;
    for (const k of [1, 2]) {
      ctx.beginPath();
      ctx.moveTo(cx + 13 + k * 4, cy - 1 + k);
      ctx.lineTo(cx + 19 + k * 4, cy - 1 + k);
      ctx.stroke();
    }
  },
  kettlebell(ctx, o) {
    const cx = o.x + o.w / 2;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 4.4;
    ctx.beginPath();
    ctx.arc(cx, GROUND_Y - 14, 5.5, Math.PI * 1.05, Math.PI * 1.95);
    ctx.stroke();
    ctx.strokeStyle = '#B8C0CF';
    ctx.lineWidth = 2.6;
    ctx.stroke();
    // light steel + orange band: readable on the dark arena floor
    outlined(ctx, '#B8C0CF', () => ctx.arc(cx, GROUND_Y - 8, 8.5, 0, Math.PI * 2), 1.1);
    fillPath(ctx, 'rgba(255,255,255,0.45)', () => ctx.arc(cx - 3, GROUND_Y - 11, 2.5, 0, Math.PI * 2));
    outlined(ctx, C.orange, () => ctx.roundRect(cx - 5, GROUND_Y - 9, 10, 5, 1), 0.6);
    text(ctx, '24', cx, GROUND_Y - 6.5, INK, 4.5, { outline: null });
  },
  wallball(ctx, o) {
    const cx = o.x + o.w / 2;
    const cy = GROUND_Y - 42 + Math.sin(o.anim * 7) * 1.5;
    outlined(ctx, C.orange, () => ctx.arc(cx, cy, 9, 0, Math.PI * 2), 1.1);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(cx, cy, 9, -0.5 + o.anim * 6, 1.2 + o.anim * 6);
    ctx.stroke();
    text(ctx, '9', cx, cy, INK, 7, { outline: null });
  },
  cups(ctx, o) {
    fillPath(ctx, 'rgba(79,163,255,0.45)', () => ctx.ellipse(o.x + o.w / 2, GROUND_Y + 1, o.w / 2, 3, 0, 0, Math.PI * 2));
    for (const [dx, rot, up] of [[3, 1.4, 0], [12, 0, 1], [21, -1.3, 0], [27, 0, 1]]) {
      ctx.save();
      ctx.translate(o.x + dx + 3, GROUND_Y - (up ? 4 : 2.5));
      ctx.rotate(rot);
      outlined(ctx, C.white, () => { ctx.moveTo(-3, -4); ctx.lineTo(3, -4); ctx.lineTo(2.2, 4); ctx.lineTo(-2.2, 4); ctx.closePath(); }, 0.8);
      ctx.fillStyle = C.orange;
      ctx.fillRect(-2.6, -1, 5.2, 1.6);
      ctx.restore();
    }
  },
};
