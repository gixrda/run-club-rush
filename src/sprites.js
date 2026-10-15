// Loads the sprites extracted from the reference sheet (see tools/extract_sprites.py).
// Never rejects: anything that fails is reported in the console and the game falls
// back to its procedural drawings for that key.
const BASE = `${import.meta.env.BASE_URL}assets/sprites/`;

export async function loadSprites(onProgress = () => {}) {
  const atlas = { images: new Map(), anchors: {}, files: {}, missing: [] };
  let manifest;
  try {
    const res = await fetch(`${BASE}manifest.json`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    manifest = await res.json();
  } catch (err) {
    console.error('[sprites] manifest.json failed to load, using procedural fallbacks:', err);
    return atlas;
  }

  const entries = Object.entries(manifest.sprites);
  let done = 0;
  await Promise.all(entries.map(([key, s]) => new Promise((resolve) => {
    const img = new Image();
    const finish = () => {
      onProgress(++done, entries.length);
      resolve();
    };
    img.onload = () => {
      atlas.images.set(key, img);
      atlas.anchors[key] = s.anchorX;
      finish();
    };
    img.onerror = () => {
      atlas.missing.push(key);
      console.warn(`[sprites] missing or unreadable: ${BASE}${s.gameFile}`);
      finish();
    };
    img.src = BASE + s.gameFile;
    // Native-resolution files are used by the DOM (HUD icons, portraits).
    atlas.files[key] = BASE + s.file;
  })));
  if (atlas.missing.length) console.warn(`[sprites] ${atlas.missing.length} sprite(s) missing, fallbacks active:`, atlas.missing);
  return atlas;
}
