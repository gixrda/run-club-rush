import './styles.css';
import { Game } from './game.js';
import { createRenderer } from './render.js';
import { loadSprites } from './sprites.js';
import { initAudio, setMuted as setAudioMuted, sfx } from './audio.js';
import * as ui from './ui.js';
import { DNF_MESSAGES, FINISH_MESSAGES } from './config.js';

const $ = (id) => document.getElementById(id);
const pick = (arr) => arr[(Math.random() * arr.length) | 0];
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- persistence (storage may be unavailable: private mode, blocked site data) ----------
const KEY = 'strava-brainrot:v1';
function load() {
  try {
    return { bestScore: 0, bestDistance: 0, muted: false, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
  } catch {
    return { bestScore: 0, bestDistance: 0, muted: false };
  }
}
function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    /* records just won't persist */
  }
}
const store = load();

// ---------- game wiring ----------
let state = 'loading'; // loading | title | playing | paused | over
let renderer = null; // created once the sprite sheet assets are loaded
const game = new Game(onEvent, reducedMotion);
if (import.meta.env.DEV) window.__game = game; // debugging / smoke tests only

function onEvent(type, data) {
  if (state !== 'playing') return;
  switch (type) {
    case 'sfx': sfx(data); break;
    case 'callout': ui.callout(data.text, data.kind); break;
    case 'toast': ui.toast(data); break;
    case 'levelup': ui.levelUp(data); break;
    case 'gameover': gameOver(data); break;
  }
}

function gameOver(result) {
  state = 'over';
  ui.updateHUD(game, store); // reflect the finish bonus
  const isPB = result.score > store.bestScore;
  store.bestScore = Math.max(store.bestScore, result.score);
  store.bestDistance = Math.max(store.bestDistance, result.meters);
  save();
  ui.setRecords(store);
  const message = pick(result.finished ? FINISH_MESSAGES : DNF_MESSAGES);
  // Brief beat so the crash/finish registers before the results cover the scene.
  setTimeout(() => {
    if (state === 'over') ui.showResults(result, store, isPB, message);
  }, 700);
}

function start() {
  if (state === 'loading') return;
  initAudio();
  game.reset();
  ui.clearTransient();
  state = 'playing';
  ui.showScreen(null);
  document.activeElement?.blur();
  last = performance.now();
}

function pause() {
  if (state !== 'playing') return;
  state = 'paused';
  game.slide(false);
  ui.showScreen('pause');
}

function resume() {
  if (state !== 'paused') return;
  state = 'playing';
  ui.showScreen(null);
  document.activeElement?.blur();
  last = performance.now();
}

function toTitle() {
  state = 'title';
  game.toAttract();
  ui.clearTransient();
  ui.setRecords(store);
  ui.showScreen('title');
}

function toggleMute() {
  store.muted = !store.muted;
  // Keep HUD + stage inside the viewport: the stage width is derived from the real HUD height.
new ResizeObserver(() => {
  const hud = $('hud');
  document.documentElement.style.setProperty('--hud-h', `${hud.hidden ? 0 : hud.offsetHeight}px`);
}).observe($('hud'));

setAudioMuted(store.muted);
  ui.setMuted(store.muted);
  save();
}

// ---------- input ----------
const JUMP_KEYS = ['Space', 'ArrowUp', 'KeyW'];
const SLIDE_KEYS = ['ArrowDown', 'KeyS'];

window.addEventListener('keydown', (e) => {
  if (state === 'playing') {
    if (JUMP_KEYS.includes(e.code)) {
      e.preventDefault();
      if (!e.repeat) game.jump();
      return;
    }
    if (SLIDE_KEYS.includes(e.code)) {
      e.preventDefault();
      game.slide(true);
      return;
    }
    if (e.code === 'Escape' || e.code === 'KeyP') {
      e.preventDefault();
      pause();
      return;
    }
  } else if (state === 'paused' && (e.code === 'Escape' || e.code === 'KeyP')) {
    e.preventDefault();
    resume();
    return;
  }
  if (e.code === 'KeyM') toggleMute();
  // Enter: start / restart / resume, unless a button has focus (it handles Enter natively).
  if (e.code === 'Enter' && document.activeElement?.tagName !== 'BUTTON') {
    if (state === 'title' || (state === 'over' && ui.currentScreen === 'over')) start();
    else if (state === 'paused') resume();
  }
  if (e.code.startsWith('Arrow') && state !== 'title' && state !== 'over' && state !== 'paused') e.preventDefault();
});

window.addEventListener('keyup', (e) => {
  if (SLIDE_KEYS.includes(e.code)) game.slide(false);
});

// Touch / mouse on the canvas: left half jumps, right half slides (hold to keep sliding).
const canvas = $('game');
let slidePointer = null;
canvas.addEventListener('pointerdown', (e) => {
  if (state !== 'playing') return;
  e.preventDefault();
  const r = canvas.getBoundingClientRect();
  if (e.clientX - r.left < r.width / 2) {
    game.jump();
  } else {
    slidePointer = e.pointerId;
    canvas.setPointerCapture(e.pointerId);
    game.slide(true);
  }
});
const endSlide = (e) => {
  if (e.pointerId === slidePointer) {
    slidePointer = null;
    game.slide(false);
  }
};
canvas.addEventListener('pointerup', endSlide);
canvas.addEventListener('pointercancel', endSlide);
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

$('pad-jump').addEventListener('pointerdown', (e) => {
  e.preventDefault();
  if (state === 'playing') game.jump();
});
$('pad-slide').addEventListener('pointerdown', (e) => {
  e.preventDefault();
  $('pad-slide').setPointerCapture(e.pointerId);
  if (state === 'playing') game.slide(true);
});
for (const ev of ['pointerup', 'pointercancel']) $('pad-slide').addEventListener(ev, () => game.slide(false));
for (const id of ['pad-jump', 'pad-slide']) $(id).addEventListener('contextmenu', (e) => e.preventDefault());

$('btn-play').addEventListener('click', start);
$('btn-retry').addEventListener('click', start);
$('btn-restart').addEventListener('click', start);
$('btn-resume').addEventListener('click', resume);
$('btn-title-from-pause').addEventListener('click', toTitle);
$('btn-title-from-over').addEventListener('click', toTitle);
$('btn-pause').addEventListener('click', (e) => {
  e.currentTarget.blur();
  pause();
});
$('btn-mute').addEventListener('click', (e) => {
  e.currentTarget.blur();
  initAudio();
  toggleMute();
});

// Pause when the tab is hidden or the window loses focus; never lose lives in the background.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) pause();
});
window.addEventListener('blur', pause);

// ---------- loop ----------
let last = performance.now();
function frame(now) {
  // Clamp dt so a stalled tab can't fast-forward the run.
  const dt = Math.min(0.1, Math.max(0, (now - last) / 1000));
  last = now;
  if (renderer) {
    if (state === 'playing' || state === 'title') game.update(dt);
    renderer.draw(game);
  }
  if (state === 'playing') ui.updateHUD(game, store);
  requestAnimationFrame(frame);
}

// Keep HUD + stage inside the viewport: the stage width is derived from the real HUD height.
new ResizeObserver(() => {
  const hud = $('hud');
  document.documentElement.style.setProperty('--hud-h', `${hud.hidden ? 0 : hud.offsetHeight}px`);
}).observe($('hud'));

setAudioMuted(store.muted);
ui.setMuted(store.muted);
ui.setRecords(store);
ui.showScreen('title');
requestAnimationFrame(frame);

// Preload every sheet sprite before the first run; failures fall back to procedural art.
const playBtn = $('btn-play');
playBtn.disabled = true;
playBtn.textContent = 'LOADING';
loadSprites((done, total) => {
  playBtn.textContent = `LOADING ${done}/${total}`;
}).then((atlas) => {
  renderer = createRenderer($('game'), atlas);
  ui.applySprites(atlas.files);
  state = 'title';
  playBtn.disabled = false;
  playBtn.textContent = 'PLAY';
  playBtn.focus({ preventScroll: true });
});
