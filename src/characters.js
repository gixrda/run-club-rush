// Vector cartoon characters (run club members, grannies), drawn in logical units.
// The canvas transform scales them to device resolution, so they stay sharp at any size.
const INK = '#14213D';
const OUT = 1.1; // outline thickness

function limb(ctx, x0, y0, x1, y1, w, color) {
  ctx.lineCap = 'round';
  ctx.strokeStyle = INK;
  ctx.lineWidth = w + OUT * 2;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.stroke();
}

function blob(ctx, color, path) {
  ctx.beginPath();
  path();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.lineWidth = OUT;
  ctx.strokeStyle = INK;
  ctx.stroke();
}

function circle(ctx, x, y, r, color) {
  blob(ctx, color, () => ctx.arc(x, y, r, 0, Math.PI * 2));
}

export function shadow(ctx, x, y, w) {
  ctx.fillStyle = 'rgba(11, 22, 48, 0.22)';
  ctx.beginPath();
  ctx.ellipse(x, y, w, w * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();
}

// Side-view runner, ~46px tall at scale 1, feet at (x, y). facing: 1 = right, -1 = left.
export function drawClubRunner(ctx, x, y, phase, look, { facing = 1, scale = 1 } = {}) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale * facing, scale);
  shadow(ctx, 0, 0, 9);
  const bob = Math.abs(Math.sin(phase)) * 1.4;
  const hipY = -22 - bob;
  const sx = 3;
  const sy = hipY - 14;

  const leg = (i) => {
    const s = phase + (i ? Math.PI : 0);
    const a = Math.sin(s) * 0.8;
    const bend = 0.25 + Math.max(0, Math.cos(s)) * 1.3;
    const kx = Math.sin(a) * 11;
    const ky = hipY + Math.cos(a) * 11;
    const fx = kx + Math.sin(a - bend) * 11;
    const fy = ky + Math.cos(a - bend) * 11;
    const skin = i ? shade(look.skin) : look.skin;
    limb(ctx, 0, hipY, kx, ky, 4, skin);
    limb(ctx, kx, ky, fx, fy, 3.6, skin);
    blob(ctx, look.shoe, () => ctx.roundRect(fx - 3, fy - 2.6, 9, 4.2, 2));
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(fx - 2.6, fy + 0.9, 8.2, 1.1);
  };
  const arm = (i) => {
    const s = phase + (i ? 0 : Math.PI);
    const up = Math.sin(s) * 0.85;
    const ex = sx + Math.sin(up) * 7;
    const ey = sy + 2 + Math.cos(up) * 7;
    const fa = up + 1.5;
    const skin = i ? shade(look.skin) : look.skin;
    limb(ctx, sx, sy + 2, ex, ey, 3, skin);
    limb(ctx, ex, ey, ex + Math.sin(fa) * 6, ey + Math.cos(fa) * 6, 2.8, skin);
  };

  leg(1);
  arm(1);
  // torso + shorts
  limb(ctx, 0, hipY - 2, sx, sy + 3, 9, look.shirt);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillRect(sx - 1.5, sy + 2, 2, 8);
  blob(ctx, look.shorts, () => ctx.roundRect(-5.5, hipY - 3, 11, 7, 2.5));
  leg(0);
  // head
  const hx = sx + 1;
  const hy = sy - 7;
  if (look.ponytail) {
    const swing = Math.sin(phase * 2) * 1.5;
    blob(ctx, look.hair, () => ctx.ellipse(hx - 7, hy - 1 + swing, 3.2, 2, -0.4, 0, Math.PI * 2));
  }
  circle(ctx, hx, hy, 5.4, look.skin);
  ctx.fillStyle = look.hair;
  ctx.beginPath();
  ctx.arc(hx, hy, 5.4, Math.PI * 0.95, Math.PI * 1.95);
  ctx.closePath();
  ctx.fill();
  if (look.cap) {
    blob(ctx, look.cap, () => {
      ctx.arc(hx, hy - 1, 5.6, Math.PI, 0);
      ctx.closePath();
    });
    blob(ctx, look.cap, () => ctx.roundRect(hx + 2, hy - 2.2, 6, 1.8, 0.9));
  }
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(hx + 2.6, hy + 0.2, 0.8, 0, Math.PI * 2);
  ctx.fill();
  arm(0);
  ctx.restore();
}

// Granny, ~36px tall at scale 1, feet at (x, y). prop: 'bag' | 'cart'.
export function drawNonna(ctx, x, y, phase, look, { facing = 1, scale = 1, prop = 'bag' } = {}) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale * facing, scale);
  shadow(ctx, prop === 'cart' ? 4 : 0, 0, prop === 'cart' ? 15 : 9);
  const step = Math.sin(phase);
  const bob = Math.abs(step) * 0.7;

  if (prop === 'cart') {
    // tartan shopping trolley, pushed ahead
    const cx = 9;
    const wheelSpin = phase * 2;
    blob(ctx, '#B23A48', () => ctx.roundRect(cx, -21, 10, 15, 2));
    ctx.strokeStyle = 'rgba(255,245,230,0.55)';
    ctx.lineWidth = 0.8;
    for (const ly of [-17, -12]) {
      ctx.beginPath();
      ctx.moveTo(cx + 0.5, ly);
      ctx.lineTo(cx + 9.5, ly);
      ctx.stroke();
    }
    for (const lx of [cx + 3.5, cx + 6.5]) {
      ctx.beginPath();
      ctx.moveTo(lx, -20.5);
      ctx.lineTo(lx, -6.5);
      ctx.stroke();
    }
    limb(ctx, cx + 1, -21, cx - 2, -27, 1.2, '#5C6B8A');
    for (const wx of [cx + 2, cx + 8]) {
      circle(ctx, wx, -3, 2.6, '#2B2B2B');
      ctx.strokeStyle = '#9AA5B8';
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(wx + Math.cos(wheelSpin) * 2, -3 + Math.sin(wheelSpin) * 2);
      ctx.lineTo(wx - Math.cos(wheelSpin) * 2, -3 - Math.sin(wheelSpin) * 2);
      ctx.stroke();
    }
  }

  // legs: short steps, thick stockings, sensible shoes
  for (const i of [1, 0]) {
    const a = (i ? -step : step) * 0.28;
    const fx = Math.sin(a) * 8 + (i ? -1.5 : 1.5);
    limb(ctx, i ? -1.5 : 1.5, -10 - bob, fx, -1.5, 3.2, i ? '#CFAE86' : '#E2C29A');
    blob(ctx, '#3B2A20', () => ctx.roundRect(fx - 2.2, -2.6, 5.6, 2.8, 1.3));
  }

  // coat: slightly hunched trapezoid with a darker back
  blob(ctx, look.coat, () => {
    ctx.moveTo(-4, -27 - bob);
    ctx.lineTo(5, -26 - bob);
    ctx.lineTo(8, -9 - bob);
    ctx.lineTo(-7, -9 - bob);
    ctx.closePath();
  });
  ctx.fillStyle = 'rgba(11,22,48,0.18)';
  ctx.beginPath();
  ctx.moveTo(-4, -27 - bob);
  ctx.lineTo(-1, -27 - bob);
  ctx.lineTo(-3, -9 - bob);
  ctx.lineTo(-7, -9 - bob);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#FFF5E6';
  for (const by of [-22, -17, -12]) {
    ctx.beginPath();
    ctx.arc(4.2, by - bob, 0.7, 0, Math.PI * 2);
    ctx.fill();
  }

  // head (forward, a little hunched)
  const hx = 3.5;
  const hy = -31.5 - bob;
  circle(ctx, hx, hy, 4.8, '#F2C4A0');
  if (look.scarf) {
    blob(ctx, look.scarf, () => {
      ctx.arc(hx - 0.5, hy - 0.5, 5.4, Math.PI * 0.8, Math.PI * 2.05);
      ctx.lineTo(hx + 1, hy + 4.5);
      ctx.closePath();
    });
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    for (const [dx, dy] of [[-2, -3], [1, -4], [-3.5, 0]]) {
      ctx.beginPath();
      ctx.arc(hx + dx, hy + dy, 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    ctx.fillStyle = look.hair;
    ctx.beginPath();
    ctx.arc(hx, hy, 4.9, Math.PI * 0.9, Math.PI * 1.9);
    ctx.closePath();
    ctx.fill();
    circle(ctx, hx - 4.6, hy - 3.4, 2.4, look.hair); // bun
  }
  // glasses + smile
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.arc(hx + 2.6, hy + 0.2, 1.3, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(hx + 2.4, hy + 2.6, 1, 0.1 * Math.PI, 0.7 * Math.PI);
  ctx.stroke();

  // arm: holding the trolley handle or swinging a shopping bag
  if (prop === 'cart') {
    limb(ctx, 2, -24 - bob, 7.5, -26.5, 2.6, look.coat);
  } else {
    const swing = step * 0.15;
    const bx = 6 + Math.sin(swing) * 2;
    limb(ctx, 2, -24 - bob, bx, -15, 2.6, look.coat);
    // shopping bag with a leek sticking out
    limb(ctx, bx + 2.2, -16.5, bx + 3.8, -26, 1.4, '#6BBF59');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(bx + 2.9, -18, 1.2, 2);
    blob(ctx, look.bag, () => ctx.roundRect(bx - 1, -15, 7.5, 8.5, 1.5));
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(bx + 2.7, -15, 2.2, Math.PI, 0);
    ctx.stroke();
  }
  ctx.restore();
}

// Slightly darker variant of a hex colour, for the far-side limbs.
function shade(hex) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.round(v * 0.82);
  return `rgb(${f(n >> 16)}, ${f((n >> 8) & 255)}, ${f(n & 255)})`;
}
