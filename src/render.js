import {
  W, H, GROUND_Y, PATH_TOP, BACK_LANE_Y, PLAYER_X, METERS_PER_PX, FINISH_M, COLORS as C,
  OBSTACLES, ANIMATIONS, RUNNER_HEIGHT, ITEM_SIZE, ITEMS, NONNA,
} from './config.js';
import { drawClubRunner, drawNonna, shadow } from './characters.js';

export const FONT = '"Segoe UI", system-ui, -apple-system, Roboto, "Helvetica Neue", Arial, sans-serif';
const INK = '#14213D';

// Seeded RNG so background tiles look the same every run.
function rng(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function text(ctx, str, x, y, color, size = 9, { align = 'center', outline = INK, weight = 800 } = {}) {
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  if (outline) {
    ctx.lineJoin = 'round';
    ctx.lineWidth = size * 0.28;
    ctx.strokeStyle = outline;
    ctx.strokeText(str, x, y);
  }
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
}

function outlined(ctx, fill, path, lw = 1) {
  ctx.beginPath();
  path();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = lw;
  ctx.strokeStyle = INK;
  ctx.stroke();
}

// ---------- background tiles (vector, rasterised once per resize at device resolution) ----------
// Each painter draws one 480px-wide tile; elements near an edge are drawn twice so the tile wraps.
function wrap(x, w, draw) {
  draw(x);
  if (x + w > W) draw(x - W);
  if (x < 0) draw(x + W);
}

function paintClouds(g) {
  const r = rng(3);
  for (let x = 20; x < W; x += 95 + r() * 70) {
    const y = 14 + r() * 40;
    const s = 0.8 + r() * 0.6;
    wrap(x, 50 * s, (cx) => {
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

function paintSkyline(g) {
  const r = rng(7);
  let x = 0;
  while (x < W) {
    const bw = 20 + r() * 30;
    const bh = 35 + r() * 60;
    const top = 110 - bh;
    const col = r() < 0.5 ? '#3E5A9A' : '#34508C';
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

function paintPark(g) {
  const r = rng(11);
  // hedge row
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
    wrap(x, cw * 2, (tx) => {
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
}

function paintTrack(g) {
  const r = rng(23);
  outlined(g, '#2A3F73', () => g.roundRect(-2, 26, W + 4, 60, 4), 1);
  for (let row = 0; row < 6; row++) {
    g.fillStyle = row % 2 ? '#356BFF' : '#2C5AD6';
    g.fillRect(0, 32 + row * 9, W, 7);
    for (let x = 3; x < W; x += 5) {
      if (r() < 0.6) {
        g.fillStyle = ['#FF6B35', '#D5FF52', '#FFF5E6', '#F1B58C', '#E5383B', '#FFC93C'][(r() * 6) | 0];
        g.beginPath();
        g.arc(x, 31 + row * 9, 1.6, 0, Math.PI * 2);
        g.fill();
      }
    }
  }
  for (const fx of [70, 310]) {
    g.fillStyle = '#5C6B8A';
    g.fillRect(fx, 0, 3, 28);
    outlined(g, '#FFF5E6', () => g.roundRect(fx - 8, 0, 19, 7, 2), 0.8);
  }
}

function paintRoad(g) {
  const r = rng(41);
  const signs = ['GEL & CO', 'SCARPE -0%', 'PB CAFFÈ', 'TAPER BAR', 'CARBO LOAD'];
  let x = 0;
  let i = 0;
  while (x < W) {
    const bw = 78 + r() * 26;
    const col = r() < 0.5 ? '#E07A4F' : '#4C6FBF';
    const bx = x;
    const w = Math.min(bw - 4, W - x);
    outlined(g, col, () => g.roundRect(bx, 6, w, 80, [4, 4, 0, 0]), 1);
    g.fillStyle = 'rgba(255,255,255,0.12)';
    g.fillRect(bx + w * 0.6, 7, w * 0.4 - 1, 78);
    for (let wy = 14; wy < 46; wy += 14) {
      for (let wx = bx + 7; wx < bx + w - 14; wx += 17) {
        outlined(g, '#BFE3FF', () => g.roundRect(wx, wy, 10, 9, 1.5), 0.8);
      }
    }
    // awning + shop sign
    for (let s = 0; s < w - 8; s += 8) {
      g.fillStyle = s % 16 ? '#FFF5E6' : '#E5383B';
      g.fillRect(bx + 4 + s, 52, Math.min(8, w - 8 - s), 6);
    }
    outlined(g, INK, () => g.roundRect(bx + 6, 62, w - 12, 14, 3), 0.8);
    g.font = `800 8px ${FONT}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = '#D5FF52';
    g.fillText(signs[i++ % signs.length], bx + w / 2, 69.5);
    x += bw;
  }
}

// ---------- renderer ----------
// `atlas.images` maps sprite keys ('runner/run1', 'obstacles/dog', ...) to native-resolution images.
// Keys missing from it fall back to vector shapes, so the game stays playable.
export function createRenderer(canvas, atlas = {}) {
  const ctx = canvas.getContext('2d');
  const images = atlas.images ?? new Map();
  let scale = canvas.width / W;
  let tiles = {};
  const skies = [
    ['#4F9DFF', '#BFE2FF'],
    ['#FF8A5B', '#FFE3B8'],
    ['#24346E', '#7A8FD0'],
  ];

  function tile(h, paint) {
    const c = document.createElement('canvas');
    c.width = Math.ceil(W * scale);
    c.height = Math.ceil(h * scale);
    const g = c.getContext('2d');
    g.scale(scale, scale);
    paint(g);
    return c;
  }

  function resize(width, height) {
    canvas.width = width;
    canvas.height = height;
    scale = width / W;
    tiles = {
      clouds: tile(80, paintClouds),
      skyline: tile(112, paintSkyline),
      mids: [tile(92, paintPark), tile(92, paintTrack), tile(92, paintRoad)],
    };
  }
  resize(canvas.width, canvas.height);

  // Logical size of a sheet sprite from its native image and a size spec.
  function sizeOf(img, spec) {
    const f = spec.scale ?? (spec.h ? spec.h / img.height : spec.w ? spec.w / img.width : spec.fit / Math.max(img.width, img.height));
    return [img.width * f, img.height * f];
  }

  // Draw a sheet sprite with its bottom at `bottom`, anchored horizontally at x.
  function sprite(key, x, bottom, spec, { flip = false, anchor = 0.5 } = {}) {
    const img = images.get(key);
    if (!img) return false;
    const [w, h] = sizeOf(img, spec);
    const left = x - (flip ? 1 - anchor : anchor) * w;
    const top = bottom - h;
    if (flip) {
      ctx.save();
      ctx.translate(left + w, top);
      ctx.scale(-1, 1);
      ctx.drawImage(img, 0, 0, w, h);
      ctx.restore();
    } else {
      ctx.drawImage(img, left, top, w, h);
    }
    return true;
  }

  const runnerScale = () => {
    const idle = images.get('runner/idle');
    return idle ? RUNNER_HEIGHT / idle.height : 0.26;
  };

  function scroll(img, factor, y, traveled, alpha = 1) {
    if (alpha <= 0) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = alpha;
    const off = -Math.floor(((traveled * factor) % W) * scale);
    const py = Math.round(y * scale);
    ctx.drawImage(img, off, py);
    ctx.drawImage(img, off + img.width, py);
    ctx.restore();
  }

  function sky(zone, alpha, t) {
    if (alpha <= 0) return;
    ctx.globalAlpha = alpha;
    const [top, bottom] = skies[zone];
    const grad = ctx.createLinearGradient(0, 0, 0, PATH_TOP);
    grad.addColorStop(0, top);
    grad.addColorStop(1, bottom);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, PATH_TOP + 2);
    // sun / moon
    const sun = zone === 2 ? '#FFF5E6' : '#FFC93C';
    ctx.fillStyle = zone === 2 ? 'rgba(255,245,230,0.25)' : 'rgba(255,201,60,0.3)';
    ctx.beginPath();
    ctx.arc(380, zone === 1 ? 95 : 48, 26 + Math.sin(t * 2) * 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = sun;
    ctx.beginPath();
    ctx.arc(380, zone === 1 ? 95 : 48, 17, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  function ground(zone, traveled, alpha) {
    if (alpha <= 0) return;
    ctx.globalAlpha = alpha;
    const scrollX = (period) => -(traveled % period);
    if (zone === 0) {
      ctx.fillStyle = '#2BB673';
      ctx.fillRect(0, PATH_TOP - 5, W, 6);
      const grad = ctx.createLinearGradient(0, PATH_TOP, 0, H);
      grad.addColorStop(0, '#E2BF85');
      grad.addColorStop(1, '#C99A5B');
      ctx.fillStyle = grad;
      ctx.fillRect(0, PATH_TOP, W, H - PATH_TOP);
      ctx.fillStyle = 'rgba(122,78,45,0.35)';
      for (let x = scrollX(29); x < W; x += 29) {
        ctx.beginPath();
        ctx.ellipse(x, GROUND_Y + 10 + ((x * 7) & 15), 2.2, 1.2, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#1E8F5A';
      ctx.fillRect(0, GROUND_Y + 30, W, H - GROUND_Y - 30);
      ctx.fillStyle = '#2BB673';
      for (let x = scrollX(12); x < W; x += 12) {
        ctx.beginPath();
        ctx.moveTo(x, GROUND_Y + 31);
        ctx.lineTo(x + 3, GROUND_Y + 25);
        ctx.lineTo(x + 6, GROUND_Y + 31);
        ctx.fill();
      }
    } else if (zone === 1) {
      ctx.fillStyle = '#2BB673';
      ctx.fillRect(0, PATH_TOP - 4, W, 5);
      ctx.fillStyle = '#D9572B';
      ctx.fillRect(0, PATH_TOP, W, H - PATH_TOP);
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      for (const ly of [PATH_TOP + 1, GROUND_Y + 5, GROUND_Y + 22, GROUND_Y + 39]) ctx.fillRect(0, ly, W, 1.4);
      for (let x = scrollX(160); x < W; x += 160) {
        ctx.fillRect(x, GROUND_Y + 5, 1.4, 34);
        text(ctx, '100m', x + 16, GROUND_Y + 14, 'rgba(255,255,255,0.9)', 8, { outline: null });
      }
    } else {
      ctx.fillStyle = '#C9CED8';
      ctx.fillRect(0, PATH_TOP - 5, W, 5);
      ctx.fillStyle = '#8D95A6';
      for (let x = scrollX(26); x < W; x += 26) ctx.fillRect(x, PATH_TOP - 5, 1, 5);
      ctx.fillStyle = '#495266';
      ctx.fillRect(0, PATH_TOP, W, H - PATH_TOP);
      ctx.fillStyle = '#FFC93C';
      for (let x = scrollX(52); x < W; x += 52) {
        ctx.beginPath();
        ctx.roundRect(x, GROUND_Y + 22, 26, 3, 1.5);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  function billboard(x, lines, accent) {
    const by = PATH_TOP - 80;
    ctx.fillStyle = '#5C6B8A';
    ctx.fillRect(x + 18, by + 38, 3, 44);
    ctx.fillRect(x + 92, by + 38, 3, 44);
    outlined(ctx, accent, () => ctx.roundRect(x, by, 113, 40, 5), 1.2);
    outlined(ctx, INK, () => ctx.roundRect(x, by, 113, 13, [5, 5, 0, 0]), 1.2);
    text(ctx, lines[0], x + 56.5, by + 7, accent, 7.5, { outline: null });
    lines.slice(1).forEach((l, i) => text(ctx, l, x + 56.5, by + 20 + i * 10, INK, 7.5, { outline: null }));
  }

  function prop(pr) {
    if (pr.type === 'club') {
      const variants = [
        ['BRAINROT RUN CLUB', 'EASY 5K A 4:00/KM', 'NO FOTO, NO CORSA'],
        ['RUN CLUB STASERA', 'PASSO TRANQUILLO*', '*NON TRANQUILLO'],
        ['BRAINROT RUN CLUB', 'DAL MARTEDÌ SCORSO', 'SINGLE BENVENUTI'],
      ];
      billboard(pr.x, variants[pr.variant], C.lime);
    } else if (pr.type === 'coffee') {
      billboard(pr.x, ['CAFFÈ POST-CORSA', 'IL VERO', 'TRAGUARDO'], C.orange);
    } else {
      // HYROX station: rower + dumbbells on a mat
      const bx = pr.x;
      const by = PATH_TOP + 1;
      outlined(ctx, '#2A2F3D', () => ctx.roundRect(bx, by - 4, 100, 5, 2), 0.8);
      outlined(ctx, '#5C6B8A', () => ctx.roundRect(bx + 8, by - 10, 48, 3, 1.5), 0.8);
      outlined(ctx, '#2A2F3D', () => ctx.arc(bx + 12, by - 13, 7, 0, Math.PI * 2), 0.8);
      ctx.fillStyle = C.lime;
      ctx.beginPath();
      ctx.arc(bx + 12, by - 13, 3, 0, Math.PI * 2);
      ctx.fill();
      outlined(ctx, C.orange, () => ctx.roundRect(bx + 32, by - 14, 9, 4, 1.5), 0.8);
      for (const dx of [66, 84]) {
        outlined(ctx, '#2A2F3D', () => ctx.roundRect(bx + dx, by - 11, 4, 7, 1), 0.8);
        outlined(ctx, '#2A2F3D', () => ctx.roundRect(bx + dx + 10, by - 11, 4, 7, 1), 0.8);
        ctx.fillStyle = '#9AA5B8';
        ctx.fillRect(bx + dx + 4, by - 8.5, 6, 2);
      }
      ctx.fillStyle = '#5C6B8A';
      ctx.fillRect(bx + 49, by - 52, 3, 48);
      outlined(ctx, INK, () => ctx.roundRect(bx + 14, by - 70, 74, 21, 4), 1);
      text(ctx, 'STAZIONE HYROX', bx + 51, by - 64, C.lime, 7.5, { outline: null });
      text(ctx, `${pr.variant + 3}/8 · ROWING`, bx + 51, by - 55, C.cream, 7, { outline: null });
    }
  }

  function finishArch(x) {
    const top = GROUND_Y - 92;
    for (const px of [x - 8, x + 62]) outlined(ctx, C.orange, () => ctx.roundRect(px, top + 8, 10, GROUND_Y - top - 6, 5), 1.2);
    outlined(ctx, C.orange, () => ctx.roundRect(x - 12, top, 88, 20, 10), 1.2);
    text(ctx, 'TRAGUARDO', x + 32, top + 10, C.cream, 9);
    for (let i = 0; i < 9; i++) {
      ctx.fillStyle = i % 2 ? INK : C.cream;
      ctx.fillRect(x + 4 + i * 6, GROUND_Y - 1, 6, 3);
      ctx.fillStyle = i % 2 ? C.cream : INK;
      ctx.fillRect(x + 4 + i * 6, GROUND_Y + 2, 6, 3);
    }
  }

  // ---------- obstacles ----------
  function groupMembers(o, lane) {
    for (const m of o.members) {
      if (m.lane !== lane) continue;
      const mx = o.x + m.dx;
      if (o.type === 'runclub') {
        const back = lane === 'back';
        drawClubRunner(ctx, mx, back ? BACK_LANE_Y : GROUND_Y, o.anim * 9 + m.phase, m.look, { facing: 1, scale: m.scale });
        continue;
      }
      // Granny crossing: walks from the back lane into the runner's lane long before reaching it.
      let y = lane === 'back' ? BACK_LANE_Y : GROUND_Y;
      if (m.cross) y = GROUND_Y - (GROUND_Y - PATH_TOP + 2) * Math.min(1, Math.max(0, (mx - NONNA.crossEndX) / NONNA.crossLen));
      drawNonna(ctx, mx, y, o.anim * 3.2 + m.dx, m.look, { facing: m.facing, scale: lane === 'back' ? 0.9 : 1, prop: m.prop });
    }
  }

  function obstacle(o) {
    const cfg = OBSTACLES[o.type];
    if (o.knocked) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - o.knockT * 1.5);
      ctx.translate(0, -o.knockT * 180 + o.knockT * o.knockT * 300);
    }
    if (o.members) {
      groupMembers(o, 'front');
      if (o.type === 'runclub' && !o.hit && Math.sin(o.anim * 2) > -0.3) text(ctx, 'A SINISTRA!', o.x + 6, GROUND_Y - 74, C.cream, 7.5);
    } else if (cfg.sprite && images.has(cfg.sprite)) {
      // Small idle motion: flyers bob, the dog hops. Hitboxes don't move.
      const bob = cfg.fly ? Math.sin(o.anim * 9) * 1.5 : o.type === 'dog' ? -Math.abs(Math.sin(o.anim * 11) * 2) : 0;
      if (!cfg.fly) shadow(ctx, o.x + o.w / 2, GROUND_Y, o.w * 0.45);
      sprite(cfg.sprite, o.x + o.w / 2, GROUND_Y - cfg.lift + bob, cfg.size, { flip: o.type === 'dog' });
    } else {
      // Missing sprite: draw the hitbox as a hazard block so the game stays playable.
      const [inset, top, bottom] = cfg.box;
      outlined(ctx, C.orange, () => ctx.roundRect(o.x + inset, GROUND_Y - top, o.w - inset * 2, top - bottom, 3), 1);
    }
    if (o.knocked) ctx.restore();
  }

  function item(it) {
    const bob = Math.sin(it.bob) * 1.8;
    const cfg = ITEMS[it.type];
    if (it.y > GROUND_Y - 20) shadow(ctx, it.x, GROUND_Y, 6);
    const img = images.get(it.sprite);
    if (img) {
      const [, h] = sizeOf(img, { fit: cfg.size ?? ITEM_SIZE });
      // soft light halo keeps pickups readable on busy backgrounds
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath();
      ctx.arc(it.x, it.y + bob, (cfg.size ?? ITEM_SIZE) * 0.55, 0, Math.PI * 2);
      ctx.fill();
      sprite(it.sprite, it.x, it.y + h / 2 + bob, { fit: cfg.size ?? ITEM_SIZE });
      return;
    }
    outlined(ctx, C.gold, () => ctx.arc(it.x, it.y + bob, 6, 0, Math.PI * 2), 1);
  }

  function fallbackRunner(x, y) {
    drawClubRunner(ctx, x, y, performance.now() / 90, { shirt: C.orange, shorts: C.navy, shoe: C.lime, skin: C.skin, hair: '#4A2C1A', cap: C.blue });
  }

  function draw(game) {
    const p = game.player;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.save();
    if (game.shake > 0 && !game.reducedMotion) {
      ctx.translate((Math.random() - 0.5) * game.shake, (Math.random() - 0.5) * game.shake);
    }

    // background layers (cross-fade between zones)
    const zb = game.zoneBlend;
    sky(game.prevZone, 1, game.t);
    sky(game.zone, zb, game.t);
    if (game.level >= 5 && !game.reducedMotion) {
      ctx.fillStyle = `hsla(${(game.t * 50) % 360}, 90%, 60%, 0.15)`;
      ctx.fillRect(0, 0, W, PATH_TOP);
    }
    scroll(tiles.clouds, 0.04, 6, game.traveled + game.t * 160);
    scroll(tiles.skyline, 0.1, PATH_TOP - 118, game.traveled);
    scroll(tiles.mids[game.prevZone], 0.35, PATH_TOP - 88, game.traveled, 1 - zb);
    scroll(tiles.mids[game.zone], 0.35, PATH_TOP - 88, game.traveled, zb);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    for (const pr of game.props) prop(pr);
    ground(game.prevZone, game.traveled, 1);
    ground(game.zone, game.traveled, zb);

    const finishX = PLAYER_X + (FINISH_M / METERS_PER_PX - game.traveled);
    if (game.mode !== 'attract' && finishX < W + 60 && finishX > -100) finishArch(finishX);

    // back lane first (behind the runner), then the runner's lane
    for (const o of game.obstacles) if (o.members) groupMembers(o, 'back');
    for (const o of game.obstacles) obstacle(o);
    for (const it of game.items) item(it);

    // player: animation-controller frame from the sheet (a missing frame borrows another one)
    const blink = p.invuln > 0 && p.anim.state !== 'hit' && Math.floor(p.invuln * 12) % 2 === 0;
    const frame = [game.playerFrame, ...ANIMATIONS[p.anim.state].frames, ...ANIMATIONS.run.frames].find((f) => images.has(f));
    const rs = { scale: runnerScale() };
    const drawPlayer = (x) => (frame ? sprite(frame, x, p.y + 1, rs, { anchor: atlas.anchors?.[frame] ?? 0.5 }) : fallbackRunner(x, p.y));
    shadow(ctx, PLAYER_X, GROUND_Y, p.onGround ? 10 : Math.max(4, 10 - (GROUND_Y - p.y) / 10));
    if (game.boostT > 0) {
      ctx.globalAlpha = 0.22;
      drawPlayer(PLAYER_X - 14);
      ctx.globalAlpha = 0.4;
      drawPlayer(PLAYER_X - 7);
      ctx.globalAlpha = 1;
    }
    if (!blink) drawPlayer(PLAYER_X);
    if (game.stamina <= 0 && !blink) {
      ctx.fillStyle = '#8FC8FF';
      for (const [dx, dy, k] of [[-10, -46, 2], [9, -42, 3]]) {
        ctx.beginPath();
        ctx.ellipse(PLAYER_X + dx, p.y + dy + ((p.phase * k) % 5), 1.1, 1.8, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (game.multT > 0 && !blink) text(ctx, 'x2', PLAYER_X, p.y - 60, C.lime, 10);

    for (const pt of game.particles) {
      ctx.globalAlpha = Math.min(1, pt.life / pt.max + 0.2);
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (const tx of game.texts) {
      ctx.globalAlpha = Math.min(1, tx.life * 2);
      text(ctx, tx.text, tx.x, tx.y, tx.color, 10);
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    if (game.flash > 0 && !game.reducedMotion) {
      ctx.globalAlpha = Math.min(0.3, game.flash);
      ctx.fillStyle = game.flashColor;
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }
  }

  return { draw, resize };
}
