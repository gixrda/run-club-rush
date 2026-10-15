import { FINISH_M } from './config.js';
import { formatPace } from './game.js';

const $ = (id) => document.getElementById(id);
const fmtInt = (n) => Math.floor(n).toLocaleString('it-IT');
const fmtKm = (m) => `${(m / 1000).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} km`;
const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

// Only touch the DOM when a value actually changes.
const cache = new Map();
function set(id, value, prop = 'textContent') {
  const key = id + prop;
  if (cache.get(key) === value) return;
  cache.set(key, value);
  if (prop === 'hidden') $(id).hidden = value;
  else if (prop === 'width') $(id).style.width = value;
  else $(id)[prop] = value;
}

// Native-resolution sprite files from the sheet, keyed like 'ui/health' (empty until loaded).
let spriteFiles = {};

// Fill every <img data-sprite="..."> with its sheet sprite. Missing ones stay hidden;
// every icon sits next to a text label, so nothing essential is lost.
export function applySprites(files) {
  spriteFiles = files;
  for (const img of document.querySelectorAll('img[data-sprite]')) {
    const src = files[img.dataset.sprite];
    if (!src) continue;
    img.onload = () => { img.hidden = false; };
    img.src = src;
  }
  $('h-lives').classList.toggle('has-sprites', Boolean(files['ui/health']));
}

function variantImg(key, cls) {
  if (!spriteFiles[key]) return null;
  const img = document.createElement('img');
  img.className = cls;
  img.src = spriteFiles[key];
  img.alt = '';
  return img;
}

// ---------- screens ----------
const screens = ['title', 'pause', 'over'];
export let currentScreen = 'title';

export function showScreen(name) {
  currentScreen = name;
  for (const s of screens) {
    const el = $(`screen-${s}`);
    el.hidden = s !== name;
    el.classList.remove('leaving');
  }
  $('hud').hidden = name === 'title';
  const focus = { title: 'btn-play', pause: 'btn-resume', over: 'btn-retry' }[name];
  if (focus && !$(focus).disabled) $(focus).focus({ preventScroll: true });
}

// Short fade-out of the title screen before the run starts.
export function leaveTitle(ms, done) {
  const el = $('screen-title');
  el.classList.add('leaving');
  setTimeout(done, ms);
}

export function setLoading(done, total, phrase) {
  $('load-fill').style.width = `${Math.round((done / total) * 100)}%`;
  if (phrase) $('load-text').textContent = phrase;
}

export function finishLoading({ logoOk, essentialMissing, missingCount }) {
  $('loading').hidden = true;
  const play = $('btn-play');
  play.disabled = false;
  play.focus({ preventScroll: true });
  const problems = [];
  if (!logoOk) {
    problems.push('Logo non trovato (assets/logo_runclubrush.png).');
    $('logo-img').hidden = true;
    $('title-heading').classList.remove('sr-only');
  }
  if (essentialMissing.length) problems.push('Grafica del runner incompleta: uso quella di riserva.');
  else if (missingCount) problems.push(`${missingCount} immagini non caricate: uso la grafica di riserva.`);
  $('asset-warning').textContent = problems.join(' ');
  $('asset-warning').hidden = !problems.length;
}

export function setRecords(records) {
  $('r-score').textContent = fmtInt(records.bestScore);
  $('r-dist').textContent = fmtKm(records.bestDistance);
}

export function setMuted(muted) {
  for (const id of ['btn-mute', 'btn-mute-title']) {
    $(id).textContent = muted ? 'AUDIO: NO' : 'AUDIO: SÌ';
    $(id).setAttribute('aria-pressed', String(!muted));
  }
}

// ---------- HUD ----------
export function updateHUD(game, records) {
  set('h-dist', fmtKm(Math.min(game.meters, FINISH_M)));
  set('h-time', fmtTime(game.t));
  set('h-pace', game.boostT > 0 ? 'ILLEGALE' : `${formatPace(game.pace)}/km`);
  set('h-score', fmtInt(game.score));
  set('h-kudos', String(game.kudos));
  set('h-lives-text', '♥'.repeat(game.lives) + '♡'.repeat(3 - game.lives));
  set('h-lives', `${game.lives} vite su 3`, 'ariaLabel');
  if (cache.get('lives-icons') !== game.lives) {
    cache.set('lives-icons', game.lives);
    document.querySelectorAll('#h-lives .life').forEach((img, i) => img.classList.toggle('lost', i >= game.lives));
  }

  const st = Math.ceil(game.stamina);
  set('h-stamina', String(st));
  set('f-stamina', `${game.stamina}%`, 'width');
  set('m-stamina', st <= 0 ? 'meter is-empty' : st < 30 ? 'meter is-low' : 'meter', 'className');

  const lv = game.levelInfo;
  set('h-level', String(game.level));
  set('h-title', lv.title);
  if (spriteFiles[lv.variant]) set('h-variant', spriteFiles[lv.variant], 'src');
  set('f-brainrot', `${game.brainrot}%`, 'width');

  const beating = game.score > records.bestScore && records.bestScore > 0;
  set('h-pb', beating ? 'NUOVO PB!' : fmtInt(records.bestScore));

  set('t-combo', game.combo > 1 ? `COMBO KUDOS x${game.combo}` : '');
  set('t-combo', game.combo <= 1, 'hidden');
  set('t-mult', `PETTORINA x2 · ${Math.ceil(game.multT)}s`);
  set('t-mult', game.multT <= 0, 'hidden');
  set('t-boost', game.boostT <= 0, 'hidden');
  set('t-bonk', game.stamina > 0, 'hidden');
}

// ---------- notifications: one message at a time, queued by priority ----------
// Durations scale with length: short ≈ 2.8s, standard ≈ 4s, long / level-up ≈ 5-5.5s.
const QUEUE_MAX = 4;
const FADE_S = 0.3;
// A message is replaced early only after it has been readable for this long:
// urgent ones (hits, hints, level-ups) wait less, normal jokes never cut a message under 2.5s.
const MIN_SHOWN_URGENT_S = 1.5;
const MIN_SHOWN_S = 2.5;
const queue = [];
let current = null; // { el-data, remaining, priority }
let gapT = 0; // pause between two messages, lets the exit animation finish
let waitT = 0; // how long low-priority messages have been held back

function duration(msg) {
  if (msg.kind === 'level') return 5.5;
  const len = (msg.title ? msg.title.length + 10 : 0) + msg.text.length;
  return len <= 32 ? 2.8 : len <= 60 ? 4 : 5;
}

export function notify(msg) {
  msg.priority ??= 2;
  msg.duration = duration(msg);
  // A more important message (hit, hint, level-up) shortens the current one,
  // but only once it has been on screen long enough to be read.
  if (current && msg.priority > current.priority) {
    current.preemptAfter = Math.min(current.preemptAfter ?? Infinity, msg.priority >= 3 ? MIN_SHOWN_URGENT_S : MIN_SHOWN_S);
  }
  queue.push(msg);
  queue.sort((a, b) => b.priority - a.priority);
  // Drop the least important overflow instead of piling up stale jokes.
  while (queue.length > QUEUE_MAX) queue.pop();
}

function render(msg) {
  const el = $('callout');
  const parts = [];
  if (msg.image) parts.push(msg.image);
  if (msg.title) {
    const t = document.createElement('strong');
    t.className = 'callout-title';
    t.textContent = msg.title;
    parts.push(t);
  }
  const b = document.createElement('span');
  b.className = 'callout-text';
  b.textContent = msg.text;
  parts.push(b);
  if (msg.quote) {
    const q = document.createElement('span');
    q.className = 'callout-quote';
    q.textContent = msg.quote;
    parts.push(q);
  }
  el.replaceChildren(...parts);
  el.className = `${msg.kind} show`;
}

// Called every frame while playing. `imminent`: an obstacle is about to reach the runner,
// so low-priority chatter waits (up to 1.5s) and the road stays readable.
export function tickNotifications(dt, imminent) {
  if (current) {
    current.remaining -= dt;
    const shown = current.duration - current.remaining;
    if (current.remaining <= 0 || shown >= (current.preemptAfter ?? Infinity)) {
      $('callout').classList.remove('show');
      current = null;
      gapT = FADE_S;
    }
    return;
  }
  if (gapT > 0) {
    gapT -= dt;
    return;
  }
  if (!queue.length) return;
  if (imminent && queue[0].priority < 3 && waitT < 1.5) {
    waitT += dt;
    return;
  }
  waitT = 0;
  current = queue.shift();
  current.remaining = current.duration;
  render(current);
}

export function levelUp({ level, title, rank, variant, quote }) {
  notify({
    kind: 'level',
    priority: 3,
    image: variantImg(variant, 'callout-variant'),
    title: `LIVELLO ${level} · ${rank}`,
    text: title,
    quote: `"${quote}"`,
  });
}

export function toast({ title, body }) {
  notify({ kind: 'feed', priority: 1, title, text: body });
}

export function clearTransient() {
  queue.length = 0;
  current = null;
  gapT = 0;
  waitT = 0;
  $('callout').className = '';
}

// ---------- results ----------
export function showResults(result, records, isPB, message) {
  $('over-title').textContent = result.finished ? '5K COMPLETATA' : 'FINE CORSA';
  $('o-msg').textContent = message;
  $('o-pb').hidden = !isPB;
  const hour = new Date().getHours();
  const when = hour < 12 ? 'mattutina' : hour < 18 ? 'pomeridiana' : 'serale';
  $('o-name').textContent = result.finished ? `Easy 5K ${when} (non easy)` : `Corsa ${when} (abbandonata)`;
  $('o-score').textContent = fmtInt(result.score);
  $('o-dist').textContent = fmtKm(result.meters);
  $('o-time').textContent = fmtTime(result.time);
  $('o-pace').textContent = result.meters > 50 ? `${formatPace(result.pace)}/km` : '-';
  $('o-kudos').textContent = String(result.kudos);
  $('o-shoes').textContent = String(result.shoes);
  $('o-level').textContent = `LV ${result.maxLevel} ${result.maxLevelRank} · ${result.maxLevelTitle}`;
  if (spriteFiles[result.maxLevelVariant]) $('o-variant').src = spriteFiles[result.maxLevelVariant];
  $('o-best').textContent = fmtInt(records.bestScore);
  showScreen('over');
}
