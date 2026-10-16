// Small canvas helpers shared by the renderer modules. Everything is in logical units.
export const FONT = '"Segoe UI", system-ui, -apple-system, Roboto, "Helvetica Neue", Arial, sans-serif';
export const INK = '#14213D';

// Seeded RNG so background tiles look the same every run.
export function rng(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function text(ctx, str, x, y, color, size = 9, { align = 'center', outline = INK, weight = 800 } = {}) {
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

export function outlined(ctx, fill, path, lw = 1) {
  ctx.beginPath();
  path();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = lw;
  ctx.strokeStyle = INK;
  ctx.stroke();
}

export function fillPath(ctx, fill, path) {
  ctx.beginPath();
  path();
  ctx.fillStyle = fill;
  ctx.fill();
}

export function line(ctx, x0, y0, x1, y1, color, w = 1) {
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
}

// Word-wraps `str` into at most `maxLines` lines no wider than maxW, shrinking the font if needed.
// Returns { lines, size }.
export function wrap(ctx, str, maxW, size, maxLines = 3, weight = 800) {
  for (let s = size; s >= size * 0.7; s -= 0.5) {
    ctx.font = `${weight} ${s}px ${FONT}`;
    const lines = [];
    let cur = '';
    for (const word of str.split(' ')) {
      const next = cur ? `${cur} ${word}` : word;
      if (ctx.measureText(next).width <= maxW || !cur) cur = next;
      else {
        lines.push(cur);
        cur = word;
      }
    }
    if (cur) lines.push(cur);
    if (lines.length <= maxLines && lines.every((l) => ctx.measureText(l).width <= maxW)) return { lines, size: s };
  }
  return { lines: [str], size: size * 0.7 };
}
