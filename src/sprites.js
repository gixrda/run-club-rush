// Loads the sprites extracted from the reference sheet (tools/extract_sprites.py) and the logo.
// Never rejects and never hangs: failures are reported in the console, a global timeout
// releases the loading screen, and the game falls back to vector art for missing keys.
const BASE = import.meta.env.BASE_URL;
const SPRITES = `${BASE}assets/sprites/`;
export const LOGO_SRC = `${BASE}assets/logo_runclubrush-web.jpg`;
export const LOGO_FALLBACK_SRC = `${BASE}assets/logo_runclubrush.png`;
const TIMEOUT_MS = 10000;

// Without these the game still runs, but the title screen reports the problem.
export const ESSENTIAL = ['runner/idle', 'runner/run1', 'runner/run2', 'runner/run3', 'runner/run4', 'runner/jump', 'runner/slide', 'runner/hit'];

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export async function loadAssets(onProgress = () => {}) {
  const atlas = { images: new Map(), anchors: {}, files: {}, missing: [], logo: null };
  let manifest = { sprites: {} };
  try {
    const res = await fetch(`${SPRITES}manifest.json`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    manifest = await res.json();
  } catch (err) {
    console.error('[assets] manifest.json non caricato, uso la grafica di riserva:', err);
  }

  const entries = Object.entries(manifest.sprites);
  const total = entries.length + 1;
  let done = 0;
  const tick = () => onProgress(++done, total);

  const logo = (async () => {
    // Web copy first (trimmed, lighter), then the untouched original.
    atlas.logo = (await loadImage(LOGO_SRC)) || (await loadImage(LOGO_FALLBACK_SRC));
    if (!atlas.logo) console.error(`[assets] logo mancante: ${LOGO_SRC} e ${LOGO_FALLBACK_SRC}`);
    tick();
  })();

  const sprites = entries.map(async ([key, s]) => {
    atlas.files[key] = SPRITES + s.file;
    const img = await loadImage(SPRITES + s.file);
    if (img) {
      atlas.images.set(key, img);
      atlas.anchors[key] = s.anchorX;
    } else {
      atlas.missing.push(key);
      console.warn(`[assets] sprite mancante o illeggibile: ${SPRITES}${s.file}`);
    }
    tick();
  });

  let timedOut = false;
  await Promise.race([
    Promise.all([logo, ...sprites]),
    new Promise((r) => setTimeout(() => { timedOut = true; r(); }, TIMEOUT_MS)),
  ]);
  if (timedOut) {
    console.warn('[assets] caricamento oltre il tempo massimo: continuo con quello che c\'è.');
    // Still-pending requests count as missing (late arrivals may still fill in the atlas).
    atlas.missing = entries.map(([key]) => key).filter((key) => !atlas.images.has(key));
  }
  if (atlas.missing.length) console.warn(`[assets] ${atlas.missing.length} sprite mancanti, grafica di riserva attiva:`, atlas.missing);
  atlas.essentialMissing = ESSENTIAL.filter((k) => !atlas.images.has(k));
  return atlas;
}
