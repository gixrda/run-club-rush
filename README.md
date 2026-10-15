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

Fictional parody. Not affiliated with Strava or HYROX.
