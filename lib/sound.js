'use client';

// Retro terminal key sounds in the style of an old green-screen computer, synthesized with
// Web Audio (no audio files): a crisp, plasticky key click, and on Enter the fast "tick-tick"
// chatter of text printing out.
let ctx = null;
let noise = null;
let out = null;

function setup() {
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  noise = ctx.createBuffer(1, ctx.sampleRate * 0.2, ctx.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

  // Small terminal speaker: a touch of grit, no deep bass, softened top end.
  const drive = ctx.createWaveShaper();
  const curve = new Float32Array(1024);
  for (let i = 0; i < curve.length; i++) curve[i] = Math.tanh(((i / 511.5) - 1) * 1.6);
  drive.curve = curve;
  const low = ctx.createBiquadFilter();
  low.type = 'highpass';
  low.frequency.value = 300;
  const high = ctx.createBiquadFilter();
  high.type = 'lowpass';
  high.frequency.value = 5200;
  const level = ctx.createGain();
  level.gain.value = 0.55;
  drive.connect(low).connect(high).connect(level).connect(ctx.destination);
  out = drive;
}

const env = (t, vol, dur) => {
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  return gain;
};

function noiseHit(t, freq, dur, vol, q) {
  const src = ctx.createBufferSource();
  src.buffer = noise;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = freq;
  filter.Q.value = q;
  src.connect(filter).connect(env(t, vol, dur)).connect(out);
  src.start(t, Math.random() * 0.15);
  src.stop(t + dur + 0.01);
}

function ping(t, freq, dur, vol, type = 'sine') {
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.value = freq;
  osc.connect(env(t, vol, dur)).connect(out);
  osc.start(t);
  osc.stop(t + dur + 0.01);
}

// Crisp key: a sharp click, the plastic keycap ringing briefly, then a soft release.
function click(t, pitch, vol) {
  const p = pitch * (0.92 + Math.random() * 0.16);
  noiseHit(t, p, 0.018, vol, 3);
  ping(t, p * 0.8, 0.022, vol * 0.18);
  noiseHit(t + 0.03 + Math.random() * 0.01, p * 0.7, 0.012, vol * 0.3, 3);
}

// Text printing out: rapid little ticks.
function chatter(t, count) {
  for (let i = 0; i < count; i++) ping(t + i * 0.028 + Math.random() * 0.006, 1900 + Math.random() * 500, 0.008, 0.09, 'square');
}

// kind: 'key' | 'space' | 'back' | 'enter'
export function keyClick(kind = 'key') {
  if (!ctx) setup();
  if (ctx.state === 'suspended') ctx.resume();
  const t = ctx.currentTime;
  if (kind === 'enter') {
    click(t, 2600, 0.95);
    chatter(t + 0.09, 14);
  } else if (kind === 'space') {
    click(t, 2200, 0.85);
  } else if (kind === 'back') {
    click(t, 3000, 0.6);
  } else {
    click(t, 3400, 0.7);
  }
}
