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
// look: colours + archetype build (height, girth, stride, bob) and gear (see config ARCHETYPES).
export function drawClubRunner(ctx, x, y, phase, look, { facing = 1, scale = 1 } = {}) {
  const girth = look.girth ?? 1;
  const stride = look.stride ?? 1;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale * facing * (0.9 + girth * 0.1), scale * (look.height ?? 1));
  shadow(ctx, 0, 0, 8 + girth * 2);
  const bob = Math.abs(Math.sin(phase)) * 1.4 * (look.bob ?? 1);
  const hipY = -22 - bob;
  const sx = 3;
  const sy = hipY - 14;
  const legColor = (i) => (look.bottom === 'tights' ? (i ? shade(look.shorts) : look.shorts) : i ? shade(look.skin) : look.skin);

  const leg = (i) => {
    const s = phase + (i ? Math.PI : 0);
    const a = Math.sin(s) * 0.8 * stride;
    const bend = 0.25 + Math.max(0, Math.cos(s)) * 1.3 * stride;
    const kx = Math.sin(a) * 11;
    const ky = hipY + Math.cos(a) * 11;
    const fx = kx + Math.sin(a - bend) * 11;
    const fy = ky + Math.cos(a - bend) * 11;
    limb(ctx, 0, hipY, kx, ky, 3.6 + girth * 0.6, legColor(i));
    if (look.bottom === 'long') limb(ctx, 0, hipY, kx * 0.8, hipY + (ky - hipY) * 0.8, 4.6 + girth * 0.6, i ? shade(look.shorts) : look.shorts);
    limb(ctx, kx, ky, fx, fy, 3.2 + girth * 0.4, legColor(i));
    // carbon plates are thick and loud, old shoes are flat
    const sole = look.sole === 'carbon' ? 3 : look.sole === 'old' ? 0.6 : 1.1;
    blob(ctx, look.shoe, () => ctx.roundRect(fx - 3, fy - 2.6, 9, 3.4 + sole, 2));
    ctx.fillStyle = look.sole === 'trail' ? '#2B2B2B' : '#FFFFFF';
    ctx.fillRect(fx - 2.6, fy + sole - 0.2, 8.2, Math.min(2, sole));
  };
  const arm = (i) => {
    const skin = i ? shade(look.skin) : look.skin;
    // the filmer keeps the front arm out, phone pointed at their own face
    if (!i && look.phone) {
      const ex = sx + 7;
      const ey = sy + 1;
      limb(ctx, sx, sy + 2, ex, ey, 3, skin);
      limb(ctx, ex, ey, ex + 6, ey - 5, 2.8, skin);
      blob(ctx, '#14213D', () => ctx.roundRect(ex + 4.5, ey - 10.5, 3.4, 6, 0.8));
      ctx.fillStyle = '#E5383B';
      ctx.beginPath();
      ctx.arc(ex + 6.2, ey - 9.3, 0.7, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    const s = phase + (i ? 0 : Math.PI);
    const up = Math.sin(s) * 0.85 * stride;
    const ex = sx + Math.sin(up) * 7;
    const ey = sy + 2 + Math.cos(up) * 7;
    const fa = up + 1.5;
    const w = 2.6 + girth * 0.5;
    limb(ctx, sx, sy + 2, ex, ey, w, skin);
    if (look.top === 'tee') limb(ctx, sx, sy + 2, sx + (ex - sx) * 0.45, sy + 2 + (ey - sy - 2) * 0.45, w + 1.2, i ? shade(look.shirt) : look.shirt);
    const hx = ex + Math.sin(fa) * 6;
    const hy = ey + Math.cos(fa) * 6;
    limb(ctx, ex, ey, hx, hy, w - 0.2, skin);
    if (look.wristbands) {
      ctx.fillStyle = look.club ?? '#FFFFFF';
      ctx.fillRect(hx - (hx - ex) * 0.3 - 1.4, hy - (hy - ey) * 0.3 - 1.4, 2.8, 2.8);
    }
  };

  leg(1);
  arm(1);
  if (look.vest) blob(ctx, '#2B2B2B', () => ctx.roundRect(-6.5, sy, 5, 11, 2)); // pack on the back
  // torso: singlets are narrow, tees and hybrid shoulders wide
  const torso = (look.top === 'singlet' ? 7.5 : look.top === 'tank' ? 10 : 9) * (0.75 + girth * 0.25);
  limb(ctx, 0, hipY - 2, sx, sy + 3, torso, look.shirt);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillRect(sx - 1.5, sy + 2, 2, 8);
  if (girth > 1.2 && look.top !== 'tank') {
    // dad bod: the belly sticks out a bit
    blob(ctx, look.shirt, () => ctx.ellipse(sx + 2.2, hipY - 5, 3.6, 3.2, 0, 0, Math.PI * 2));
  }
  if (look.vest) {
    ctx.fillStyle = '#2B2B2B';
    ctx.fillRect(sx - 2.5, sy + 1, 5, 9);
    blob(ctx, '#7FD1FF', () => ctx.roundRect(sx + 1.2, sy + 2, 2.6, 5, 1)); // soft flask
  }
  if (look.bib) {
    blob(ctx, '#FFFFFF', () => ctx.roundRect(sx - 1.5, sy + 4, 6, 4.5, 0.6));
    ctx.fillStyle = '#E5383B';
    ctx.fillRect(sx - 0.8, sy + 5.5, 4.6, 1.2);
  } else if (look.club) {
    ctx.fillStyle = look.club; // club patch: the group is recognisable at a glance
    ctx.fillRect(sx - 0.5, sy + 4.5, 3, 3);
  }
  const shortsH = look.bottom === 'split' ? 5 : look.bottom === 'long' ? 9 : 7;
  blob(ctx, look.shorts, () => ctx.roundRect(-5.5, hipY - 3, 11, shortsH, 2.5));
  if (look.belt) {
    blob(ctx, '#14213D', () => ctx.roundRect(-5.8, hipY - 4, 11.6, 2.4, 1));
    ctx.fillStyle = '#FF6B35';
    ctx.fillRect(-3.5, hipY - 5, 2, 3);
    ctx.fillRect(1.5, hipY - 5, 2, 3);
  }
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
  if (look.headband) {
    ctx.fillStyle = look.club ?? '#FFFFFF';
    ctx.fillRect(hx - 5.4, hy - 3.2, 10.8, 1.8);
  }
  if (look.cap) {
    const c = look.capColor ?? look.cap;
    blob(ctx, c, () => {
      ctx.arc(hx, hy - 1, 5.6, Math.PI, 0);
      ctx.closePath();
    });
    // visor forward, or backwards for the hybrid athlete
    if (look.cap === 'back') blob(ctx, c, () => ctx.roundRect(hx - 8, hy - 2.2, 4.5, 1.8, 0.9));
    else blob(ctx, c, () => ctx.roundRect(hx + 2, hy - 2.2, 6, 1.8, 0.9));
  }
  if (look.headphones) {
    blob(ctx, '#2B2B2B', () => ctx.arc(hx - 0.8, hy + 0.4, 2, 0, Math.PI * 2));
    ctx.strokeStyle = '#2B2B2B';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(hx - 0.4, hy - 0.5, 5.8, Math.PI * 1.15, Math.PI * 1.75);
    ctx.stroke();
  }
  if (look.sunglasses) {
    blob(ctx, '#14213D', () => ctx.roundRect(hx + 1, hy - 1, 4.6, 2, 1));
    ctx.fillStyle = '#7FD1FF';
    ctx.fillRect(hx + 2.4, hy - 0.6, 2.2, 0.7);
  } else {
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.arc(hx + 2.6, hy + 0.2, 0.8, 0, Math.PI * 2);
    ctx.fill();
  }
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
