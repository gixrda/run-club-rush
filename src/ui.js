import { FINISH_M } from './config.js';
import { formatPace } from './game.js';

const $ = (id) => document.getElementById(id);
const fmtInt = (n) => Math.floor(n).toLocaleString('en-US');
const fmtKm = (m) => `${(m / 1000).toFixed(2)} km`;
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

const screens = ['title', 'pause', 'over'];
export let currentScreen = 'title';

export function showScreen(name) {
  currentScreen = name;
  for (const s of screens) $(`screen-${s}`).hidden = s !== name;
  $('hud').hidden = name === 'title';
  const focus = { title: 'btn-play', pause: 'btn-resume', over: 'btn-retry' }[name];
  if (focus) $(focus).focus({ preventScroll: true });
}

export function setRecords(records) {
  $('r-score').textContent = fmtInt(records.bestScore);
  $('r-dist').textContent = fmtKm(records.bestDistance);
}

export function setMuted(muted) {
  $('btn-mute').textContent = muted ? 'SOUND OFF' : 'SOUND ON';
  $('btn-mute').setAttribute('aria-pressed', String(!muted));
}

export function updateHUD(game, records) {
  set('h-dist', fmtKm(Math.min(game.meters, FINISH_M)));
  set('h-time', fmtTime(game.t));
  set('h-pace', game.boostT > 0 ? 'ILLEGAL' : `${formatPace(game.pace)}/km`);
  set('h-score', fmtInt(game.score));
  set('h-kudos', String(game.kudos));
  set('h-lives', '♥'.repeat(game.lives) + '♡'.repeat(3 - game.lives));
  set('h-lives', `${game.lives} lives`, 'ariaLabel');

  const st = Math.ceil(game.stamina);
  set('h-stamina', String(st));
  set('f-stamina', `${game.stamina}%`, 'width');
  set('m-stamina', st <= 0 ? 'meter is-empty' : st < 30 ? 'meter is-low' : 'meter', 'className');

  const lv = game.levelInfo;
  set('h-level', String(game.level));
  set('h-title', lv.title);
  set('f-brainrot', `${game.brainrot}%`, 'width');

  const beating = game.score > records.bestScore && records.bestScore > 0;
  set('h-pb', beating ? 'NEW PB!' : fmtInt(records.bestScore));

  set('t-combo', game.combo > 1 ? `KUDOS COMBO x${game.combo}` : '');
  set('t-combo', game.combo <= 1, 'hidden');
  set('t-mult', `RACE BIB x2 · ${Math.ceil(game.multT)}s`);
  set('t-mult', game.multT <= 0, 'hidden');
  set('t-boost', game.boostT <= 0, 'hidden');
  set('t-bonk', game.stamina > 0, 'hidden');
}

let calloutTimer = 0;
export function callout(textOrNode, kind = 'good', ms = 1800) {
  const el = $('callout');
  el.replaceChildren(textOrNode);
  el.className = `show ${kind}`;
  // restart the pop animation
  void el.offsetWidth;
  el.classList.add('pop');
  clearTimeout(calloutTimer);
  calloutTimer = setTimeout(() => { el.className = ''; }, ms);
}

export function levelUp({ level, title, quote }) {
  const frag = document.createDocumentFragment();
  const t = document.createElement('strong');
  t.textContent = `LV ${level}: ${title}`;
  const q = document.createElement('span');
  q.textContent = `"${quote}"`;
  frag.append(t, q);
  callout(frag, 'level', 2600);
}

export function toast({ title, body }) {
  const feed = $('feed');
  const el = document.createElement('div');
  el.className = 'toast';
  const t = document.createElement('strong');
  t.textContent = title;
  const b = document.createElement('span');
  b.textContent = body;
  el.append(t, b);
  feed.prepend(el);
  while (feed.children.length > 2) feed.lastChild.remove();
  setTimeout(() => el.remove(), 3400);
}

export function clearTransient() {
  $('feed').replaceChildren();
  $('callout').className = '';
}

export function showResults(result, records, isPB, message) {
  $('over-title').textContent = result.finished ? '5K COMPLETE' : 'DNF';
  $('o-msg').textContent = message;
  $('o-pb').hidden = !isPB;
  const hour = new Date().getHours();
  $('o-name').textContent = `${hour < 12 ? 'Morning' : hour < 18 ? 'Afternoon' : 'Evening'} ${result.finished ? 'Easy 5K (not easy)' : 'Run (abandoned)'}`;
  $('o-score').textContent = fmtInt(result.score);
  $('o-dist').textContent = fmtKm(result.meters);
  $('o-time').textContent = fmtTime(result.time);
  $('o-pace').textContent = result.meters > 50 ? `${formatPace(result.pace)}/km` : '-';
  $('o-kudos').textContent = String(result.kudos);
  $('o-shoes').textContent = String(result.shoes);
  $('o-level').textContent = `LV ${result.maxLevel} · ${result.maxLevelTitle}`;
  $('o-best').textContent = fmtInt(records.bestScore);
  showScreen('over');
}
