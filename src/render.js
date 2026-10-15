import { W, H, GROUND_Y, PLAYER_X, METERS_PER_PX, FINISH_M, COLORS as C } from './config.js';

// ---------- bitmap sprites (one char = one pixel) ----------
const PAL = {
  K: C.navy, k: C.ink, L: C.lime, O: C.orange, W: C.white, B: C.blue, C: C.cream,
  G: C.gold, Y: C.goldDark, D: C.slate, R: C.red,
};

const SPRITES = {
  shoes: [
    'KKKK..........',
    'KLLK..........',
    'KLLLKK........',
    'KLLLLOKKK.....',
    'KLLLLLOOLKK...',
    'KLLLLLLLOOLKK.',
    'KLLLLLLLLLLLLK',
    'KWWWWWWWWWWWWK',
    'KOWWOWWOWWOWWK',
    '.KKKKKKKKKKKK.',
  ],
  gel: [
    '..KKKKK..',
    '..KOOOK..',
    '.KKKKKKK.',
    '.KOOOOOK.',
    'KOOOOOOOK',
    'KOWWWWWOK',
    'KOWKWKWOK',
    'KOWWWWWOK',
    'KOOOOOOOK',
    'KOOLLLOOK',
    'KOOOOOOOK',
    '.KOOOOOK.',
    '..KKKKK..',
  ],
  water: [
    '..KKKK..',
    '..KWWK..',
    '..KKKK..',
    '.KBBBBK.',
    'KBCBBBBK',
    'KBCBBBBK',
    'KWWWWWWK',
    'KWBBBBWK',
    'KWWWWWWK',
    'KBCBBBBK',
    'KBCBBBBK',
    'KBBBBBBK',
    'KBBBBBBK',
    '.KKKKKK.',
  ],
  medal: [
    'KBBK...KOOK',
    '.KBBK.KOOK.',
    '..KBBKOOK..',
    '...KBOOK...',
    '....KKK....',
    '...KGGGK...',
    '..KGGYGGK..',
    '.KGGYYYGGK.',
    '.KGYYGYYGK.',
    '.KGGYYYGGK.',
    '..KGGYGGK..',
    '...KGGGK...',
    '....KKK....',
  ],
  bib: [
    'KKKKKKKKKKKKKK',
    'KWOWWWWWWWWOWK',
    'KBBBBBBBBBBBBK',
    'KWWWWWWWWWWWWK',
    'KWKWKWWKKKWWWK',
    'KWKWKWWWWKWWWK',
    'KWKKKWWKKKWWWK',
    'KWWWKWWKWWWWWK',
    'KWWWKWWKKKWWWK',
    'KWOWWWWWWWWOWK',
    'KKKKKKKKKKKKKK',
  ],
  kudos: [
    '...KKKKK...',
    '..KOOOOOK..',
    '.KOOOOWOOK.',
    'KOOOOWWOOOK',
    'KOOOOWOOOOK',
    'KOWWWWWWWOK',
    'KOWWWWWWWOK',
    'KOWWWWWWOOK',
    '.KOWWWWWOK.',
    '..KOOOOOK..',
    '...KKKKK...',
  ],
  hyrox: [
    '...KKKKKK...',
    '..KDDDDDDK..',
    '.KDK....KDK.',
    '.KDK....KDK.',
    '..KDKKKKDK..',
    '.KKDDDDDDKK.',
    'KDDDDDDDDDDK',
    'KDLLDDDDLLDK',
    'KDLLLLLLLLDK',
    'KDLLDDDDLLDK',
    'KDDDDDDDDDDK',
    '.KDDDDDDDDK.',
    '..KKKKKKKK..',
  ],
};

function bake(rows) {
  const c = document.createElement('canvas');
  c.width = rows[0].length;
  c.height = rows.length;
  const g = c.getContext('2d');
  rows.forEach((row, y) => [...row].forEach((ch, x) => {
    if (PAL[ch]) {
      g.fillStyle = PAL[ch];
      g.fillRect(x, y, 1, 1);
    }
  }));
  return c;
}

// Seeded RNG so background tiles look the same every run.
function rng(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function tile(w, h, paint) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  paint(g);
  return c;
}

function skylineTile() {
  const r = rng(7);
  return tile(W, 90, (g) => {
    let x = 0;
    while (x < W) {
      const bw = 18 + ((r() * 30) | 0);
      const bh = 30 + ((r() * 55) | 0);
      g.fillStyle = r() < 0.5 ? '#22396A' : '#1D3260';
      g.fillRect(x, 90 - bh, Math.min(bw, W - x), bh);
      g.fillStyle = 'rgba(255,245,230,0.55)';
      for (let wy = 90 - bh + 4; wy < 86; wy += 6) {
        for (let wx = x + 3; wx < x + bw - 3 && wx < W - 2; wx += 5) if (r() < 0.35) g.fillRect(wx, wy, 2, 2);
      }
      x += bw + ((r() * 4) | 0);
    }
  });
}

function cloudTile() {
  const r = rng(3);
  return tile(W, 70, (g) => {
    for (let x = 10; x < W - 50; x += 90 + ((r() * 60) | 0)) {
      const y = 8 + ((r() * 40) | 0);
      g.fillStyle = 'rgba(255,245,230,0.85)';
      g.fillRect(x, y + 6, 46, 8);
      g.fillRect(x + 8, y, 22, 8);
      g.fillRect(x + 24, y + 3, 14, 6);
      g.fillStyle = 'rgba(23,43,77,0.15)';
      g.fillRect(x, y + 12, 46, 2);
    }
  });
}

function parkTile() {
  const r = rng(11);
  return tile(W, 80, (g) => {
    for (let x = 0; x < W; x += 30 + ((r() * 40) | 0)) {
      const th = 18 + ((r() * 14) | 0);
      g.fillStyle = '#6B4A2B';
      g.fillRect(x + 8, 80 - th, 4, th);
      const cw = 22 + ((r() * 12) | 0);
      const cy = 80 - th - 18;
      g.fillStyle = '#13603C';
      g.fillRect(x + 10 - cw / 2, cy, cw, 22);
      g.fillStyle = '#1E8F5A';
      g.fillRect(x + 12 - cw / 2, cy - 5, cw - 4, 20);
      g.fillStyle = C.green;
      g.fillRect(x + 14 - cw / 2, cy - 8, cw - 10, 10);
    }
    g.fillStyle = '#13603C';
    for (let x = 0; x < W; x += 9) g.fillRect(x, 74 + ((r() * 3) | 0), 10, 8);
  });
}

function trackTile() {
  const r = rng(23);
  return tile(W, 80, (g) => {
    g.fillStyle = '#2A3F73';
    g.fillRect(0, 20, W, 60);
    for (let row = 0; row < 7; row++) {
      g.fillStyle = row % 2 ? '#356BFF' : '#2C5AD6';
      g.fillRect(0, 24 + row * 8, W, 6);
      for (let x = 2; x < W; x += 4) {
        if (r() < 0.55) {
          g.fillStyle = [C.orange, C.lime, C.cream, C.skin, C.red][(r() * 5) | 0];
          g.fillRect(x, 22 + row * 8, 2, 3);
        }
      }
    }
    // floodlights
    for (const fx of [60, 300]) {
      g.fillStyle = C.slate;
      g.fillRect(fx, 0, 3, 24);
      g.fillStyle = C.cream;
      g.fillRect(fx - 6, 0, 15, 5);
    }
  });
}

function roadTile() {
  const r = rng(41);
  return tile(W, 80, (g) => {
    let x = 0;
    const signs = ['GEL & CO', 'SHOES -0%', 'PB CAFE', 'TAPER BAR', 'CARB LOAD'];
    let i = 0;
    while (x < W) {
      const bw = 70 + ((r() * 30) | 0);
      g.fillStyle = r() < 0.5 ? '#C4532C' : '#2C4F9E';
      g.fillRect(x, 8, Math.min(bw - 4, W - x), 72);
      g.fillStyle = C.cream;
      for (let wy = 14; wy < 50; wy += 12) for (let wx = x + 6; wx < x + bw - 14 && wx < W - 8; wx += 14) g.fillRect(wx, wy, 8, 7);
      g.fillStyle = C.ink;
      g.fillRect(x + 6, 56, Math.min(bw - 16, W - x - 8), 14);
      g.fillStyle = C.lime;
      g.font = 'bold 8px monospace';
      g.textBaseline = 'top';
      g.fillText(signs[i++ % signs.length], x + 9, 59);
      x += bw;
    }
  });
}

// ---------- drawing helpers ----------
function line(ctx, x0, y0, x1, y1, w, color) {
  ctx.fillStyle = color;
  const dx = x1 - x0;
  const dy = y1 - y0;
  const n = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy))));
  for (let i = 0; i <= n; i++) {
    ctx.fillRect(Math.round(x0 + (dx * i) / n - w / 2), Math.round(y0 + (dy * i) / n - w / 2), w, w);
  }
}

function text(ctx, str, x, y, color, size = 8, align = 'center', outline = C.ink) {
  ctx.font = `bold ${size}px monospace`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  if (outline) {
    ctx.fillStyle = outline;
    for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) ctx.fillText(str, x + ox, y + oy);
  }
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
}

const PLAYER_LOOK = { shirt: C.orange, shorts: C.navy, cap: C.blue, shoe: C.lime, sole: C.white, skin: C.skin, skinDark: C.skinDark };
const CLUB_LOOKS = [
  { shirt: C.blue, shorts: C.ink, cap: C.lime, shoe: C.orange, sole: C.white, skin: '#8D5A3B', skinDark: '#6E4329' },
  { shirt: C.blue, shorts: C.ink, cap: C.lime, shoe: C.orange, sole: C.white, skin: '#E8C39E', skinDark: '#C49A73' },
];

function drawRunner(ctx, x, y, phase, pose, c, extra = {}) {
  if (pose === 'slide') return drawSlider(ctx, x, y, c);
  const bob = pose === 'run' ? Math.round(Math.abs(Math.sin(phase)) * 1.5) : 0;
  const hipX = x;
  const hipY = y - 18 - bob;
  const sx = hipX + 2;
  const sy = hipY - 12;

  const leg = (i) => {
    const s = phase + (i ? Math.PI : 0);
    let a;
    let bend;
    if (pose === 'jump') {
      a = i ? -0.5 : 1.1;
      bend = i ? 0.6 : 1.9;
    } else {
      a = Math.sin(s) * 0.85;
      bend = 0.25 + Math.max(0, Math.cos(s)) * 1.3;
    }
    const kx = hipX + Math.sin(a) * 8;
    const ky = hipY + Math.cos(a) * 8;
    const fx = kx + Math.sin(a - bend) * 8;
    const fy = ky + Math.cos(a - bend) * 8;
    const skin = i ? c.skinDark : c.skin;
    line(ctx, hipX, hipY, kx, ky, 3, skin);
    line(ctx, kx, ky, fx, fy, 3, skin);
    // oversized carbon-plated (probably) shoes
    ctx.fillStyle = c.shoe;
    ctx.fillRect(Math.round(fx - 3), Math.round(fy - 3), 9, 3);
    ctx.fillStyle = c.sole;
    ctx.fillRect(Math.round(fx - 3), Math.round(fy), 9, 2);
  };

  const arm = (i) => {
    const s = phase + (i ? 0 : Math.PI);
    const up = pose === 'jump' ? (i ? -2.4 : 2.2) : Math.sin(s) * 0.9;
    const ex = sx + Math.sin(up) * 5;
    const ey = sy + 1 + Math.cos(up) * 5;
    const fa = up + 1.5;
    line(ctx, sx, sy + 1, ex, ey, 2, i ? c.skinDark : c.skin);
    line(ctx, ex, ey, ex + Math.sin(fa) * 5, ey + Math.cos(fa) * 5, 2, i ? c.skinDark : c.skin);
  };

  leg(1);
  arm(1);
  ctx.fillStyle = c.shorts;
  ctx.fillRect(hipX - 4, hipY - 2, 8, 5);
  leg(0);
  line(ctx, hipX, hipY - 3, sx, sy + 2, 6, c.shirt);
  ctx.fillStyle = C.cream;
  ctx.fillRect(sx - 2, sy + 3, 4, 2); // race number vibe
  // head + cap
  ctx.fillStyle = c.skin;
  ctx.fillRect(sx - 3, sy - 8, 7, 7);
  ctx.fillStyle = C.ink;
  ctx.fillRect(sx + 2, sy - 6, 1, 1);
  if (extra.hurt) ctx.fillRect(sx + 1, sy - 3, 2, 2);
  ctx.fillStyle = c.cap;
  ctx.fillRect(sx - 4, sy - 10, 8, 3);
  ctx.fillRect(sx + 3, sy - 8, 3, 1);
  if (extra.sweat) {
    ctx.fillStyle = '#8FC8FF';
    ctx.fillRect(sx - 6, sy - 7 + ((phase * 2) % 4), 1, 2);
    ctx.fillRect(sx + 6, sy - 4 + ((phase * 3) % 3), 1, 2);
  }
  arm(0);
}

function drawSlider(ctx, x, y, c) {
  const hipX = x - 2;
  const hipY = y - 5;
  line(ctx, hipX, hipY, x + 6, y - 3, 3, c.skin);
  line(ctx, x + 6, y - 3, x + 12, y - 3, 3, c.skin);
  ctx.fillStyle = c.shoe;
  ctx.fillRect(x + 11, y - 7, 4, 7);
  ctx.fillStyle = c.sole;
  ctx.fillRect(x + 15, y - 7, 2, 7);
  ctx.fillStyle = c.shorts;
  ctx.fillRect(hipX - 4, hipY - 3, 7, 5);
  line(ctx, hipX - 1, hipY - 1, x - 10, y - 10, 6, c.shirt);
  line(ctx, x - 10, y - 9, x - 13, y - 2, 2, c.skinDark);
  ctx.fillStyle = c.skin;
  ctx.fillRect(x - 17, y - 18, 7, 7);
  ctx.fillStyle = C.ink;
  ctx.fillRect(x - 12, y - 16, 1, 1);
  ctx.fillStyle = c.cap;
  ctx.fillRect(x - 18, y - 20, 8, 3);
  ctx.fillRect(x - 11, y - 18, 3, 1);
}

// ---------- renderer ----------
export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const sprites = Object.fromEntries(Object.entries(SPRITES).map(([k, v]) => [k, bake(v)]));
  const skyline = skylineTile();
  const clouds = cloudTile();
  const mids = [parkTile(), trackTile(), roadTile()];
  const skies = [
    ['#5FA8FF', '#7DB9FF', '#9CCBFF', '#BFDDFF', '#DDEEFF'],
    ['#FF8C5A', '#FFA36E', '#FFBB85', '#FFD3A0', '#FFE8C4'],
    ['#1B2A57', '#273A72', '#35508F', '#4767A8', '#5E80BE'],
  ];

  function scroll(img, factor, y, traveled, alpha = 1) {
    if (alpha <= 0) return;
    ctx.globalAlpha = alpha;
    const off = -Math.floor((traveled * factor) % img.width);
    ctx.drawImage(img, off, y);
    ctx.drawImage(img, off + img.width, y);
    ctx.globalAlpha = 1;
  }

  function sky(zone, alpha) {
    ctx.globalAlpha = alpha;
    const bands = skies[zone];
    const bh = Math.ceil(GROUND_Y / bands.length);
    bands.forEach((col, i) => {
      ctx.fillStyle = col;
      ctx.fillRect(0, i * bh, W, bh);
    });
    ctx.globalAlpha = 1;
  }

  function ground(zone, traveled, alpha) {
    if (alpha <= 0) return;
    ctx.globalAlpha = alpha;
    const scrollX = (period) => -Math.floor(traveled % period);
    if (zone === 0) {
      ctx.fillStyle = C.green;
      ctx.fillRect(0, GROUND_Y - 4, W, 4);
      ctx.fillStyle = '#C9A26B';
      ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
      ctx.fillStyle = '#A8824F';
      for (let x = scrollX(23); x < W; x += 23) ctx.fillRect(x, GROUND_Y + 8 + ((x * 7) & 15), 2, 2);
      ctx.fillStyle = '#1E8F5A';
      ctx.fillRect(0, GROUND_Y + 36, W, H - GROUND_Y - 36);
    } else if (zone === 1) {
      ctx.fillStyle = '#D9572B';
      ctx.fillRect(0, GROUND_Y - 2, W, H - GROUND_Y + 2);
      ctx.fillStyle = C.cream;
      for (const ly of [GROUND_Y + 12, GROUND_Y + 28, GROUND_Y + 44]) ctx.fillRect(0, ly, W, 2);
      for (let x = scrollX(160); x < W; x += 160) {
        ctx.fillRect(x, GROUND_Y + 2, 2, 46);
        ctx.font = 'bold 8px monospace';
        ctx.textAlign = 'left';
        ctx.fillText('100m', x + 5, GROUND_Y + 20);
      }
    } else {
      ctx.fillStyle = C.cream;
      ctx.fillRect(0, GROUND_Y - 4, W, 4);
      ctx.fillStyle = C.navy;
      for (let x = scrollX(24); x < W; x += 24) ctx.fillRect(x, GROUND_Y - 4, 12, 4);
      ctx.fillStyle = '#3B4560';
      ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
      ctx.fillStyle = C.gold;
      for (let x = scrollX(48); x < W; x += 48) ctx.fillRect(x, GROUND_Y + 24, 24, 3);
    }
    ctx.globalAlpha = 1;
  }

  function billboard(x, lines, accent) {
    const bx = Math.round(x);
    const by = GROUND_Y - 78;
    ctx.fillStyle = C.slate;
    ctx.fillRect(bx + 14, by + 36, 3, 42);
    ctx.fillRect(bx + 95, by + 36, 3, 42);
    ctx.fillStyle = C.ink;
    ctx.fillRect(bx - 2, by - 2, 116, 40);
    ctx.fillStyle = accent;
    ctx.fillRect(bx, by, 112, 36);
    ctx.fillStyle = C.ink;
    ctx.fillRect(bx, by, 112, 12);
    lines.forEach((l, i) => text(ctx, l, bx + 56, by + 6 + i * 11, i === 0 ? accent : C.ink, 8, 'center', null));
  }

  function prop(pr) {
    if (pr.type === 'club') {
      const variants = [
        ['BRAINROT RUN CLUB', 'EASY 5K @ 4:00/KM', 'NO PHOTO NO RUN'],
        ['RUN CLUB TONIGHT', 'RECOVERY PACE*', '*NOT RECOVERY'],
        ['BRAINROT RUN CLUB', 'EST. LAST TUESDAY', 'SINGLES WELCOME'],
      ];
      billboard(pr.x, variants[pr.variant], C.lime);
    } else if (pr.type === 'coffee') {
      billboard(pr.x, ['COFFEE AFTER', 'THE REAL', 'FINISH LINE'], C.orange);
    } else {
      // HYROX station: rower + dumbbells on a platform
      const bx = Math.round(pr.x);
      const by = GROUND_Y - 2;
      ctx.fillStyle = C.ink;
      ctx.fillRect(bx, by - 4, 100, 4);
      ctx.fillStyle = C.slate;
      ctx.fillRect(bx + 8, by - 9, 46, 3); // rail
      ctx.fillStyle = C.ink;
      ctx.fillRect(bx + 6, by - 18, 12, 12); // flywheel
      ctx.fillStyle = C.lime;
      ctx.fillRect(bx + 9, by - 15, 6, 6);
      ctx.fillStyle = C.orange;
      ctx.fillRect(bx + 32, by - 12, 8, 3); // seat
      for (const dx of [64, 82]) {
        ctx.fillStyle = C.ink;
        ctx.fillRect(bx + dx, by - 10, 4, 6);
        ctx.fillRect(bx + dx + 10, by - 10, 4, 6);
        ctx.fillStyle = C.slate;
        ctx.fillRect(bx + dx + 4, by - 8, 6, 2);
      }
      ctx.fillStyle = C.slate;
      ctx.fillRect(bx + 48, by - 52, 3, 48);
      ctx.fillStyle = C.ink;
      ctx.fillRect(bx + 18, by - 66, 66, 18);
      text(ctx, 'HYROX STATION', bx + 51, by - 61, C.lime, 7, 'center', null);
      text(ctx, `${pr.variant + 3}/8: ROW`, bx + 51, by - 53, C.cream, 7, 'center', null);
    }
  }

  function obstacle(o, phase) {
    const x = Math.round(o.x);
    if (o.knocked) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - o.knockT * 1.5);
      ctx.translate(0, -o.knockT * 180 + o.knockT * o.knockT * 300);
    }
    switch (o.type) {
      case 'pothole': {
        ctx.fillStyle = C.orange; // city spray paint ring
        ctx.fillRect(x + 1, GROUND_Y - 2, o.w - 2, 2);
        ctx.fillRect(x + 1, GROUND_Y + 10, o.w - 2, 2);
        ctx.fillRect(x - 1, GROUND_Y, 2, 10);
        ctx.fillRect(x + o.w - 1, GROUND_Y, 2, 10);
        ctx.fillStyle = C.ink;
        ctx.fillRect(x + 4, GROUND_Y, o.w - 8, 7);
        ctx.fillRect(x + 8, GROUND_Y + 7, o.w - 16, 3);
        ctx.fillStyle = '#000';
        ctx.fillRect(x + 10, GROUND_Y + 2, o.w - 20, 5);
        break;
      }
      case 'cone': {
        for (let i = 0; i < 20; i++) {
          const w = 2 + Math.floor(i * 0.5);
          ctx.fillStyle = i === 7 || i === 8 || i === 13 || i === 14 ? C.white : C.orange;
          ctx.fillRect(x + 7 - Math.floor(w / 2), GROUND_Y - 22 + i, w, 1);
        }
        ctx.fillStyle = C.ink;
        ctx.fillRect(x - 1, GROUND_Y - 3, 16, 3);
        break;
      }
      case 'runclub': {
        [[10, 0], [28, Math.PI * 0.6]].forEach(([dx, ph], i) => {
          ctx.save();
          ctx.translate(x + dx, 0);
          ctx.scale(-1, 1);
          drawRunner(ctx, 0, GROUND_Y, phase * 1.1 + ph + o.seed, 'run', CLUB_LOOKS[i]);
          ctx.restore();
        });
        if (Math.sin(phase * 0.25 + o.seed) > -0.2) text(ctx, 'ON YOUR LEFT!', x + 18, GROUND_Y - 52, C.cream, 7);
        break;
      }
      case 'banner': {
        ctx.fillStyle = C.ink;
        ctx.fillRect(x + 4, 0, 1, GROUND_Y - 52);
        ctx.fillRect(x + o.w - 5, 0, 1, GROUND_Y - 52);
        ctx.fillStyle = C.navy;
        ctx.fillRect(x - 1, GROUND_Y - 53, o.w + 2, 28);
        ctx.fillStyle = C.orange;
        ctx.fillRect(x + 1, GROUND_Y - 51, o.w - 2, 24);
        ctx.fillStyle = C.cream;
        for (let i = 0; i < o.w - 2; i += 6) ctx.fillRect(x + 1 + i, GROUND_Y - 30, 3, 3);
        text(ctx, 'PB OR', x + o.w / 2, GROUND_Y - 46, C.ink, 8, 'center', null);
        text(ctx, 'BUST', x + o.w / 2, GROUND_Y - 37, C.ink, 8, 'center', null);
        break;
      }
    }
    if (o.knocked) ctx.restore();
  }

  function item(it) {
    const img = sprites[it.type];
    const bob = Math.round(Math.sin(it.bob) * 2);
    const x = Math.round(it.x - img.width / 2);
    const y = Math.round(it.y - img.height / 2 + bob);
    if (it.y > GROUND_Y - 20) {
      ctx.fillStyle = 'rgba(11,22,48,0.25)';
      ctx.fillRect(Math.round(it.x - 5), GROUND_Y - 1, 10, 2);
    }
    ctx.drawImage(img, x, y);
  }

  function finishArch(sx) {
    const x = Math.round(sx);
    ctx.fillStyle = C.ink;
    ctx.fillRect(x - 2, GROUND_Y - 80, 4, 80);
    ctx.fillRect(x + 58, GROUND_Y - 80, 4, 80);
    for (let i = 0; i < 16; i++) {
      ctx.fillStyle = i % 2 ? C.ink : C.cream;
      ctx.fillRect(x + i * 4 - 2, GROUND_Y - 92, 4, 4);
      ctx.fillStyle = i % 2 ? C.cream : C.ink;
      ctx.fillRect(x + i * 4 - 2, GROUND_Y - 88, 4, 4);
    }
    ctx.fillStyle = C.orange;
    ctx.fillRect(x - 2, GROUND_Y - 84, 64, 12);
    text(ctx, 'FINISH', x + 30, GROUND_Y - 78, C.cream, 8, 'center', null);
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = i % 2 ? C.ink : C.cream;
      ctx.fillRect(x - 1, GROUND_Y + i * 4, 3, 4);
    }
  }

  function draw(game) {
    const p = game.player;
    ctx.save();
    if (game.shake > 0 && !game.reducedMotion) {
      ctx.translate(Math.round((Math.random() - 0.5) * game.shake), Math.round((Math.random() - 0.5) * game.shake));
    }

    // background layers (cross-fade between zones)
    const zb = game.zoneBlend;
    sky(game.prevZone, 1);
    sky(game.zone, zb);
    if (game.level >= 5 && !game.reducedMotion) {
      // brainrot sky: slow cycling tint
      ctx.fillStyle = `hsla(${(game.t * 60) % 360}, 90%, 60%, 0.18)`;
      ctx.fillRect(0, 0, W, GROUND_Y);
    }
    scroll(clouds, 0.04, 10, game.traveled + game.t * 200);
    scroll(skyline, 0.1, GROUND_Y - 110, game.traveled);
    scroll(mids[game.prevZone], 0.35, GROUND_Y - 80, game.traveled, 1 - zb);
    scroll(mids[game.zone], 0.35, GROUND_Y - 80, game.traveled, zb);
    for (const pr of game.props) prop(pr);
    ground(game.prevZone, game.traveled, 1);
    ground(game.zone, game.traveled, zb);

    // finish arch
    const finishScreenX = PLAYER_X + (FINISH_M / METERS_PER_PX - game.traveled);
    if (game.mode !== 'attract' && finishScreenX < W + 40 && finishScreenX > -80) finishArch(finishScreenX);

    for (const o of game.obstacles) obstacle(o, p.phase);
    for (const it of game.items) item(it);

    // player
    const blink = p.invuln > 0 && Math.floor(p.invuln * 14) % 2 === 0;
    const pose = p.slideT > 0 ? 'slide' : p.onGround ? 'run' : 'jump';
    if (game.boostT > 0) {
      ctx.globalAlpha = 0.3;
      drawRunner(ctx, PLAYER_X - 14, p.y, p.phase - 0.6, pose, { ...PLAYER_LOOK, shirt: C.lime });
      ctx.globalAlpha = 0.5;
      drawRunner(ctx, PLAYER_X - 7, p.y, p.phase - 0.3, pose, { ...PLAYER_LOOK, shirt: C.lime });
      ctx.globalAlpha = 1;
    }
    if (!blink) drawRunner(ctx, PLAYER_X, p.y, p.phase, pose, PLAYER_LOOK, { sweat: game.stamina <= 0, hurt: p.invuln > 0 });
    if (game.multT > 0 && !blink) text(ctx, 'x2', PLAYER_X, p.y - 50, C.lime, 8);

    for (const pt of game.particles) {
      ctx.globalAlpha = Math.min(1, pt.life / pt.max + 0.2);
      ctx.fillStyle = pt.color;
      ctx.fillRect(Math.round(pt.x), Math.round(pt.y), pt.size, pt.size);
    }
    ctx.globalAlpha = 1;
    for (const tx of game.texts) {
      ctx.globalAlpha = Math.min(1, tx.life * 2);
      text(ctx, tx.text, tx.x, tx.y, tx.color, 8);
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    if (game.flash > 0 && !game.reducedMotion) {
      ctx.globalAlpha = Math.min(0.35, game.flash);
      ctx.fillStyle = game.flashColor;
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }
  }

  return { draw };
}
