# Strava Brainrot

A pixel-art endless runner parody of running culture. Vite + vanilla JS + Canvas 2D, no backend.

```bash
npm install
npm run dev     # play locally
npm run build   # production build in dist/
```

Controls: Space / Up / W or tap left half = jump; Down / S or tap right half = slide (hold to keep sliding); Esc / P = pause; M = sound; Enter = start/retry.

Code map:
- `src/config.js` – all tuning (physics, difficulty, items, levels, jokes)
- `src/game.js` – simulation: physics, spawning, collisions, scoring, Brainrot Meter
- `src/render.js` – procedural pixel art and parallax backgrounds
- `src/ui.js` – DOM HUD, popups, screens
- `src/audio.js` – synthesized sound effects
- `src/main.js` – loop, input, persistence (localStorage)
- `src/sprites.js` – preloads the sheet sprites (with progress); missing files fall back to procedural art

## Sprite assets

All in-game art comes from `public/assets/sprite-sheet-reference.png.png` (left untouched).
`tools/extract_sprites.py` (Python + Pillow) cuts it into individual sprites:

```bash
python tools/extract_sprites.py                       # regenerate public/assets/sprites/
python tools/extract_sprites.py --preview check.png   # plus a contact sheet for review
```

- Each sprite has a hand-measured cell (labels and neighbours excluded). The sheet's alpha
  channel is a usable matte (sprites ~245, background/glow 20-200), so transparency comes from
  alpha, never from colour, and dark details (vest, sunglasses, black gear) are preserved.
- `public/assets/sprites/<category>/<name>.png` = cleaned native resolution (used by the DOM HUD).
- `public/assets/sprites/<category>/game/<name>.png` = pre-scaled for the 960x540 canvas and drawn 1:1.
  All runner frames share one scale factor.
- `public/assets/sprites/manifest.json` = file, source coordinates, size, anchor and use of every sprite.

Known extraction limits: the sheet is painted pixel-art (no exact pixel grid), so game sprites are
downsampled rather than integer-scaled; the hit pose loses its small "dizzy stars"; `equipment/poles`,
`nutrition/caffeine` and `equipment/sleeves` keep a little of the dark drop-shadow baked into the matte.

Fictional parody. Not affiliated with Strava or HYROX.
