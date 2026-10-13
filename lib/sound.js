'use client';

// Vintage electromechanical key sounds, synthesized with Web Audio (no audio files):
// heavy two-stage clacks through a small, warm, slightly overdriven speaker.
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

// Filtered noise burst.
function noiseHit(t, freq, dur, vol, q = 2) {
  const src = ctx.createBufferSource();
  src.buffer = noise;
  src.playbackRate.value = 0.8 + Math.random() * 0.4;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = freq;
  filter.Q.value = q;
  src.connect(filter).connect(env(t, vol, dur)).connect(out);
  src.start(t, Math.random() * 0.1);
  src.stop(t + dur + 0.01);
}

function tone(t, type, from, to, dur, vol) {
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t);
  if (to !== from) osc.frequency.exponentialRampToValueAtTime(to, t + dur);
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

// Teletype-style carriage return: a quick ratchet of small clicks.
function ratchet(t, clicks, spacing, vol) {
  for (let i = 0; i < clicks; i++) noiseHit(t + i * spacing, 2400 - i * 120, 0.012, vol * (1 - i / (clicks + 2)), 3);
}

// kind: 'key' | 'space' | 'back' | 'enter'
export function keyClick(kind = 'key') {
  if (!ctx) setup();
  if (ctx.state === 'suspended') ctx.resume();
  const t = ctx.currentTime;
  if (kind === 'enter') {
    clack(t, 1000, 0.9);
    ratchet(t + 0.05, 7, 0.022, 0.35);
    clack(t + 0.22, 750, 0.7); // carriage lands
  } else if (kind === 'back') {
    clack(t, 1400, 0.55);
  } else if (kind === 'space') {
    clack(t, 900, 0.85);
  } else {
    clack(t, 1700 + Math.random() * 600, 0.7);
  }
}
