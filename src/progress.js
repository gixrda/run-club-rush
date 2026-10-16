// Persistent records and unlocks (localStorage; may be unavailable in private mode or with blocked
// site data, then progress simply lasts for the session). Same key as before: old records are kept.
import { MARATHON } from './config.js';

const KEY = 'strava-brainrot:v1';
const DEFAULTS = {
  bestScore: 0,
  bestDistance: 0,
  muted: false,
  marathonUnlocked: false,
  marathonBestScore: 0,
  marathonBestTime: 0, // seconds of play, 0 = never finished
  legend: false, // LEGGENDA DELL'ASFALTO: marathon completed at least once
};

export function loadProgress() {
  let saved = {};
  try {
    saved = JSON.parse(localStorage.getItem(KEY) || '{}') || {};
  } catch {
    /* defaults */
  }
  const store = { ...DEFAULTS, ...saved };
  // Records set before the marathon existed still count for the unlock.
  if (store.bestScore >= MARATHON.unlockScore) store.marathonUnlocked = true;
  return store;
}

export function saveProgress(store) {
  try {
    localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    /* records just won't persist */
  }
}

// Updates the records of the run's course. Returns { isPB, newLegend, bestTime }.
export function recordResult(store, result) {
  if (result.course === 'marathon') {
    const isPB = result.score > store.marathonBestScore;
    store.marathonBestScore = Math.max(store.marathonBestScore, result.score);
    let bestTime = false;
    let newLegend = false;
    if (result.finished) {
      bestTime = !store.marathonBestTime || result.time < store.marathonBestTime;
      if (bestTime) store.marathonBestTime = result.time;
      newLegend = !store.legend;
      store.legend = true;
    }
    return { isPB, newLegend, bestTime };
  }
  const isPB = result.score > store.bestScore;
  store.bestScore = Math.max(store.bestScore, result.score);
  store.bestDistance = Math.max(store.bestDistance, result.meters);
  if (result.score >= MARATHON.unlockScore) store.marathonUnlocked = true;
  return { isPB, newLegend: false, bestTime: false };
}
