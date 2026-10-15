# Run Club Rush (Strava Brainrot)

Italian running-culture parody endless runner. Vite + vanilla JS + Canvas 2D, no backend.

```bash
npm install
npm run dev     # play locally
npm run build   # production build in dist/
npm run check   # self-check of the joke picker
```

Controls: Space / Up / W or tap left half = jump; Down / S or tap right half = slide (hold to keep sliding);
Esc / P = pause; M = sound; Enter = start/retry.

Code map:
- `src/config.js` – all tuning (speed, spawn gaps, obstacles, run clubs, grannies) and all Italian copy/jokes
- `src/game.js` – simulation: physics, spawning, fairness rules, collisions, scoring, Brainrot Meter
- `src/render.js` – canvas renderer at device resolution: vector cartoon backgrounds + sheet sprites
- `src/characters.js` – vector cartoon run-club runners and grannies
- `src/jokes.js` – random joke picker without immediate repeats
- `src/ui.js` – DOM HUD, notification queue (one message at a time), screens
- `src/sprites.js` – asset loader with progress, timeout and fallbacks
- `src/audio.js` – synthesized sound effects
- `src/main.js` – loop, input, loading flow, persistence (localStorage)

## Assets

- `public/assets/logo_runclubrush.png` – official logo, untouched. `tools/prepare_logo.py` writes
  `logo_runclubrush-web.jpg` (same logo, empty margin trimmed, 1100px wide) used by the title screen;
  the original is the fallback.
- `public/assets/sprite-sheet-reference.png.png` – official sprite sheet, untouched.
  `tools/extract_sprites.py` cuts it into `public/assets/sprites/<category>/<name>.png` (native resolution,
  1px feathered outline) plus `manifest.json` (source coordinates, size, anchor, use).
  The canvas renders at device resolution and downsamples these with high-quality smoothing.
- Run-club members and grannies are drawn as vector cartoons (`src/characters.js`): the sheet has no art for them.

Known limits: the sheet is painted pixel-art, so sheet sprites keep a light pixel texture; the hit pose
loses its small "dizzy stars"; poles, caffeine and sleeves keep a bit of baked drop-shadow.

Fictional parody. Not affiliated with Strava or HYROX.
