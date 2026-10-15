// Tiny synthesized SFX. The AudioContext is created on the first user gesture.
let ac = null;
let muted = false;

export function initAudio() {
  try {
    if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state === 'suspended') ac.resume();
  } catch {
    ac = null; // audio is optional
  }
}

export function setMuted(m) {
  muted = m;
}

function tone(freq, dur, { type = 'square', vol = 0.06, to = freq, delay = 0 } = {}) {
  if (!ac || muted) return;
  const t0 = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  osc.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

const SFX = {
  jump: () => tone(300, 0.12, { to: 620 }),
  slide: () => tone(220, 0.12, { type: 'triangle', to: 110, vol: 0.08 }),
  kudos: () => tone(988, 0.07, { vol: 0.04 }),
  pickup: () => { tone(660, 0.07); tone(990, 0.1, { delay: 0.07 }); },
  hit: () => { tone(180, 0.3, { type: 'sawtooth', to: 50, vol: 0.09 }); },
  smash: () => tone(500, 0.15, { type: 'sawtooth', to: 1200, vol: 0.05 }),
  bonk: () => tone(200, 0.4, { type: 'triangle', to: 80, vol: 0.08 }),
  levelup: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.12, { delay: i * 0.08 })),
  gameover: () => [392, 330, 262, 196].forEach((f, i) => tone(f, 0.18, { type: 'triangle', delay: i * 0.15, vol: 0.08 })),
  finish: () => [523, 659, 784, 659, 784, 1047].forEach((f, i) => tone(f, 0.14, { delay: i * 0.1 })),
};

export function sfx(name) {
  SFX[name]?.();
}
