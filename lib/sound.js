'use client';

// Atompunk terminal key sounds, synthesized with Web Audio (no audio files):
// heavy relay clacks, a buzz of mains electricity and stray Geiger-counter ticks,
// all through a small, overdriven speaker.
let ctx = null;
let noise = null;
let out = null;

function setup() {
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  noise = ctx.createBuffer(1, ctx.sampleRate * 0.2, ctx.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

  // Old speaker: soft overdrive, no deep bass, no crisp highs.
  const drive = ctx.createWaveShaper();
  const curve = new Float32Array(1024);
  for (let i = 0; i < curve.length; i++) curve[i] = Math.tanh(((i / 511.5) - 1) * 2.5);
  drive.curve = curve;
  const low = ctx.createBiquadFilter();
  low.type = 'highpass';
  low.frequency.value = 220;
  const high = ctx.createBiquadFilter();
  high.type = 'lowpass';
  high.frequency.value = 3200;
  const level = ctx.createGain();
  level.gain.value = 0.5;
  drive.connect(low).connect(high).connect(level).connect(ctx.destination);
  out = drive;
}

const env = (t, vol, dur) => {
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  return gain;
};

// Filtered noise burst; `to` sweeps the filter for a zap.
function noiseHit(t, freq, dur, vol, q = 2, to = freq) {
  const src = ctx.createBufferSource();
  src.buffer = noise;
  src.playbackRate.value = 0.8 + Math.random() * 0.4;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(freq, t);
  if (to !== freq) filter.frequency.exponentialRampToValueAtTime(to, t + dur);
  filter.Q.value = q;
  src.connect(filter).connect(env(t, vol, dur)).connect(out);
  src.start(t, Math.random() * 0.1);
  src.stop(t + dur + 0.01);
}

function tone(t, type, from, to, dur, vol, vibrato = 0) {
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t);
  if (to !== from) osc.frequency.exponentialRampToValueAtTime(to, t + dur);
  if (vibrato) {
    const lfo = ctx.createOscillator();
    const depth = ctx.createGain();
    lfo.frequency.value = 9;
    depth.gain.value = vibrato;
    lfo.connect(depth).connect(osc.frequency);
    lfo.start(t);
    lfo.stop(t + dur + 0.01);
  }
  osc.connect(env(t, vol, dur)).connect(out);
  osc.start(t);
  osc.stop(t + dur + 0.01);
}

// Relay clack: the press, then a softer release a moment later.
function clack(t, freq, vol) {
  noiseHit(t, freq, 0.03, vol);
  noiseHit(t + 0.016 + Math.random() * 0.006, freq * 0.65, 0.025, vol * 0.45);
  tone(t, 'sine', 95, 45, 0.05, vol * 0.6);
}

// Electrical "zzt" from the mains.
const buzz = (t, dur, vol) => tone(t, 'sawtooth', 120, 118, dur, vol);

// Now and then, a few stray Geiger-counter ticks.
function geiger(t, chance, max = 3) {
  if (Math.random() > chance) return;
  const n = 1 + Math.floor(Math.random() * max);
  for (let i = 0; i < n; i++) noiseHit(t + 0.02 + Math.random() * 0.12, 3000, 0.004, 0.5, 0.7);
}

// kind: 'key' | 'space' | 'back' | 'enter'
export function keyClick(kind = 'key') {
  if (!ctx) setup();
  if (ctx.state === 'suspended') ctx.resume();
  const t = ctx.currentTime;
  if (kind === 'enter') {
    clack(t, 1100, 0.9);
    clack(t + 0.06, 800, 0.8); // ka-chunk
    buzz(t + 0.04, 0.12, 0.08);
    tone(t + 0.1, 'square', 196, 147, 0.22, 0.07, 6); // warbling vacuum-tube tone
    geiger(t + 0.15, 1, 5);
  } else if (kind === 'back') {
    noiseHit(t, 3200, 0.07, 0.6, 3, 500); // static zap
    buzz(t, 0.05, 0.06);
  } else if (kind === 'space') {
    clack(t, 900, 0.9);
    buzz(t, 0.04, 0.05);
  } else {
    clack(t, 1700 + Math.random() * 600, 0.7);
    buzz(t, 0.025, 0.03);
    geiger(t, 0.2);
  }
}
