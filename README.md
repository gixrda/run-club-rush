# Run Club Rush (Strava Brainrot)

Italian running-culture parody endless runner. Vite + vanilla JS + Canvas 2D, no backend.

```bash
npm install
npm run dev     # play locally
npm run build   # production build in dist/
npm run check   # self-checks: joke picker + headless game rules (zones, stations, gel joke, unlock, marathon)
```

Controls: Space / Up / W or tap left half = jump; Down / S or tap right half = slide (hold to keep sliding);
Esc / P = pause; M = sound; Enter = start/retry. At HYROX stations the same two inputs drive the mini-game
(Left / A and Right / D work too).

Modes:
- Arcade 5K: five environments, one per km (park first, Marathon City last, the middle three shuffled),
  and the eight HYROX stations in race order, each a 5-10s mini-game.
- MARATONA BRAINROT: unlocked when a single arcade run reaches 10.000 points (saved immediately; an old
  best score ≥ 10.000 also unlocks it). 42,195 symbolic km in four stages (pacing, fueling, the wall, final
  sprint) against a ghost of your best time. Finishing grants the title LEGGENDA DELL'ASFALTO.

Code map:
- `src/config.js` – all tuning (speed, spawn gaps, zones, obstacles per zone, run-club archetypes, marathon
  stages, gel window) and the Italian copy/jokes
- `src/stations.js` – the eight HYROX stations: central tuning + one arcade mechanic each
- `src/billboards.js` – poster catalog by category, rotation without consecutive repeats
- `src/game.js` – simulation: physics, spawning, fairness rules, collisions, scoring, stations, marathon, unlock
- `src/render.js` – canvas renderer at device resolution; `src/scenery.js` environments, posters, vector
  obstacles; `src/station-view.js` station equipment and meters; `src/draw.js` shared canvas helpers
- `src/characters.js` – vector cartoon run-club archetypes and grannies
- `src/jokes.js` – random picker without immediate repeats (jokes, posters, station lines)
- `src/ui.js` – DOM HUD, notification queue (one message at a time), station banner, screens
- `src/progress.js` – records and unlocks in localStorage
- `src/sprites.js` – asset loader with progress, timeout and fallbacks
- `src/audio.js` – synthesized sound effects
- `src/main.js` – loop, input, loading flow

## Deploy

Live: https://gixrda.github.io/run-club-rush/ (GitHub Pages). Every push to `main` runs
`.github/workflows/pages.yml`: `npm ci`, `npm run check`, `npm run build` with `BASE_PATH=/run-club-rush/`,
then publishes `dist/`. If the self-checks fail nothing is published and the previous version stays online.

GitHub Pages cannot send response headers, so `vite.config.js` embeds the CSP (same-origin only, no inline
scripts) and the no-referrer policy as `<meta>` tags in the production build. `public/_headers` carries the
full header set (HSTS, no framing, ...) for hosts that support it, such as Cloudflare Pages.
The game has no backend, no third-party scripts and no network calls besides its own assets.

## Assets

- `public/assets/logo_runclubrush.png` – official logo, untouched. `tools/prepare_logo.py` writes
  `logo_runclubrush-web.jpg` (same logo, empty margin trimmed, 1100px wide) used by the title screen;
  the original is the fallback.
- `public/assets/sprite-sheet-reference.png.png` – official sprite sheet, untouched.
  `tools/extract_sprites.py` cuts it into `public/assets/sprites/<category>/<name>.png` (native resolution,
  1px feathered outline) plus `manifest.json` (source coordinates, size, anchor, use).
  The canvas renders at device resolution and downsamples these with high-quality smoothing.
- Run-club members, grannies, the new trail/beach/arena obstacles, rice cakes and station equipment are vector
  art: the sheet has no art for them.

Known limits: the sheet is painted pixel-art, so sheet sprites keep a light pixel texture; the hit pose
loses its small "dizzy stars"; poles, caffeine and sleeves keep a bit of baked drop-shadow.

Fictional parody. Not affiliated with Strava, HYROX or Garmin.
