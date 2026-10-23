import './styles.css';
import { Game } from './game.js';
import { createRenderer } from './render.js';
import { loadAssets, LOGO_FALLBACK_SRC } from './sprites.js';
import { initAudio, setMuted as setAudioMuted, sfx } from './audio.js';
import { joke } from './jokes.js';
import { loadProgress as loadStore, saveProgress, recordResult } from './progress.js';
import { MARATHON } from './config.js';
import * as ui from './ui.js';

const $ = (id) => document.getElementById(id);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- persistence (progress.js) ----------
const store = loadStore();
const save = () => saveProgress(store);

// ---------- game wiring ----------
let state = 'loading'; // loading | title | starting | playing | paused | over
let course = 'arcade'; // arcade | marathon: retry and restart keep the current one
let renderer = null; // created once the assets are loaded
const canvas = $('game');
const game = new Game(onEvent, reducedMotion);
if (import.meta.env.DEV) window.__game = game; // debugging / smoke tests only

function onEvent(type, data) {
  if (state !== 'playing') return;
  switch (type) {
    case 'sfx': sfx(data); break;
    case 'callout': ui.notify(data); break;
    case 'toast': ui.toast(data); break;
    case 'levelup': ui.levelUp(data); break;
    case 'stage': ui.stage(data); break;
    case 'unlock':
      // Saved right away: the unlock survives even if the run is abandoned.
      store.marathonUnlocked = true;
      save();
      ui.marathonUnlocked();
      sfx('levelup');
      break;
    case 'gameover': gameOver(data); break;
  }
}

function gameOver(result) {
  state = 'over';
  ui.updateHUD(game, store); // reflect the finish bonus
  const info = recordResult(store, result);
  save();
  ui.setRecords(store);
  const marathon = result.course === 'marathon';
  const message = joke(marathon ? (result.finished ? 'marathonFinish' : 'marathonDnf') : result.finished ? 'finish' : 'dnf');
  // Brief beat so the crash/finish registers before the results cover the scene.
  setTimeout(() => {
    if (state === 'over') ui.showResults(result, store, info, message);
  }, 700);
}

function beginRun() {
  game.marathonUnlocked = store.marathonUnlocked;
  game.ghostTime = store.marathonBestTime || MARATHON.ghostDefaultTime;
  game.reset(course);
  ui.clearTransient();
  state = 'playing';
  ui.showScreen(null);
  document.activeElement?.blur();
  last = performance.now();
}

function start(which = course) {
  if (state === 'loading' || state === 'starting' || state === 'playing') return;
  // Phones: full screen hides the browser bars (Android; iOS Safari ignores it).
  if (matchMedia('(pointer: coarse)').matches && !document.fullscreenElement) document.documentElement.requestFullscreen?.()?.catch(() => {});
  if (which === 'marathon' && !store.marathonUnlocked) which = 'arcade';
  course = which;
  initAudio();
  if (state === 'title' && !reducedMotion) {
    // Short fade from the title screen into the run; the attract scene keeps moving meanwhile.
    state = 'starting';
    ui.leaveTitle(260, beginRun);
  } else {
    beginRun();
  }
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

function toTitle(screen = 'title') {
  state = 'title';
  game.toAttract();
  ui.clearTransient();
  ui.setRecords(store);
  ui.showScreen(screen);
}

function openMarathon() {
  if (!store.marathonUnlocked || (state !== 'title' && state !== 'over')) return;
  toTitle('marathon');
}

function toggleMute() {
  store.muted = !store.muted;
  setAudioMuted(store.muted);
  ui.setMuted(store.muted);
  save();
}

// ---------- input ----------
const JUMP_KEYS = ['Space', 'ArrowUp', 'KeyW'];
const SLIDE_KEYS = ['ArrowDown', 'KeyS'];
// HYROX stations also take left/right (A = left, B = right), e.g. for the farmer's carry balance.
const STATION_A = ['ArrowLeft', 'KeyA'];
const STATION_B = ['ArrowRight', 'KeyD'];

window.addEventListener('keydown', (e) => {
  if (state === 'playing') {
    if (game.inStation && (STATION_A.includes(e.code) || STATION_B.includes(e.code))) {
      e.preventDefault();
      if (STATION_A.includes(e.code)) { if (!e.repeat) game.jump(); } else game.slide(true);
      return;
    }
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
    if (state === 'title') start(ui.currentScreen === 'marathon' ? 'marathon' : 'arcade');
    else if (state === 'over' && ui.currentScreen === 'over') start();
    else if (state === 'paused') resume();
  }
  if (e.code.startsWith('Arrow') && state === 'playing') e.preventDefault();
});

window.addEventListener('keyup', (e) => {
  if (SLIDE_KEYS.includes(e.code) || STATION_B.includes(e.code)) game.slide(false);
});

// Touch / mouse on the canvas: left half jumps, right half slides (hold to keep sliding).
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

$('btn-play').addEventListener('click', () => start('arcade'));
$('btn-retry').addEventListener('click', () => start());
$('btn-restart').addEventListener('click', () => start());
$('btn-marathon').addEventListener('click', openMarathon);
$('btn-to-marathon').addEventListener('click', openMarathon);
$('btn-marathon-start').addEventListener('click', () => start('marathon'));
$('btn-marathon-back').addEventListener('click', () => toTitle('title'));
$('btn-resume').addEventListener('click', resume);
$('btn-title-from-pause').addEventListener('click', () => toTitle());
$('btn-title-from-over').addEventListener('click', () => toTitle());
$('btn-pause').addEventListener('click', (e) => {
  e.currentTarget.blur();
  pause();
});
for (const id of ['btn-mute', 'btn-mute-title']) {
  $(id).addEventListener('click', (e) => {
    if (id === 'btn-mute') e.currentTarget.blur();
    initAudio();
    toggleMute();
  });
}
// Original logo if the trimmed web copy is missing.
$('logo-img').addEventListener('error', (e) => {
  e.currentTarget.src = LOGO_FALLBACK_SRC;
}, { once: true });

// Pause when the tab is hidden or the window loses focus; never lose lives in the background.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) pause();
});
window.addEventListener('blur', pause);

// ---------- layout ----------
// Keep HUD + stage inside the viewport: the stage width is derived from the real HUD height.
new ResizeObserver(() => {
  const hud = $('hud');
  document.documentElement.style.setProperty('--hud-h', `${hud.hidden ? 0 : hud.offsetHeight}px`);
}).observe($('hud'));

// Render at device resolution so sprites and text stay sharp at any size.
function fitCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(480, Math.min(2560, Math.round(canvas.clientWidth * dpr)));
  const height = Math.round((width * 270) / 480);
  if (renderer && (canvas.width !== width || canvas.height !== height)) renderer.resize(width, height);
  else if (!renderer) {
    canvas.width = width;
    canvas.height = height;
  }
}
new ResizeObserver(fitCanvas).observe(canvas);

// ---------- loop ----------
let last = performance.now();
function frame(now) {
  // Clamp dt so a stalled tab can't fast-forward the run.
  const dt = Math.min(0.1, Math.max(0, (now - last) / 1000));
  last = now;
  if (renderer) {
    if (state === 'playing' || state === 'title' || state === 'starting') game.update(dt);
    renderer.draw(game);
  }
  if (state === 'playing') {
    ui.updateHUD(game, store);
    ui.tickNotifications(dt, game.imminent, game.inStation);
  }
  requestAnimationFrame(frame);
}

setAudioMuted(store.muted);
ui.setMuted(store.muted);
ui.setRecords(store);
ui.showScreen('title');
requestAnimationFrame(frame);

// ---------- loading: wait for logo + sprites, never block forever ----------
const t0 = performance.now();
let loadProgress = [0, 1];
ui.setLoading(0, 1, joke('loading'));
const phraseTimer = setInterval(() => ui.setLoading(...loadProgress, joke('loading')), 1400);
loadAssets((done, total) => {
  loadProgress = [done, total];
  ui.setLoading(done, total);
}).then((atlas) => {
  clearInterval(phraseTimer);
  fitCanvas();
  renderer = createRenderer(canvas, atlas);
  ui.applySprites(atlas.files);
  // A fast load just flashes the bar; a slow one lets the last phrase be read.
  const hold = performance.now() - t0 < 300 ? 0 : 250;
  setTimeout(() => {
    state = 'title';
    ui.finishLoading({ logoOk: Boolean(atlas.logo), essentialMissing: atlas.essentialMissing, missingCount: atlas.missing.length });
  }, hold);
});
