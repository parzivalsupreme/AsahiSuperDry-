'use client';

// Retro-futuristic terminal key sounds, synthesized with Web Audio (no audio files):
// a clunky mechanical click with a short electronic chirp on top.
let ctx = null;
let noise = null;
let out = null;

const NOTES = [1046.5, 1174.7, 1318.5, 1396.9, 1568.0]; // C6 D6 E6 F6 G6: chirps stay in tune with each other
const pick = (list) => list[Math.floor(Math.random() * list.length)];

function setup() {
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  noise = ctx.createBuffer(1, ctx.sampleRate * 0.1, ctx.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  // A gentle low-pass gives everything that small, boxy terminal-speaker sound.
  out = ctx.createBiquadFilter();
  out.type = 'lowpass';
  out.frequency.value = 4200;
  out.connect(ctx.destination);
}

// Mechanical part: a filtered noise burst.
function click(t, freq, dur, vol) {
  const src = ctx.createBufferSource();
  src.buffer = noise;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = freq;
  filter.Q.value = 1.4;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(filter).connect(gain).connect(out);
  src.start(t);
  src.stop(t + dur + 0.01);
}

// Electronic part: a short square-wave beep, optionally gliding to another pitch.
function blip(t, from, to, dur, vol) {
  const osc = ctx.createOscillator();
  osc.type = 'square';
  osc.frequency.setValueAtTime(from, t);
  if (to !== from) osc.frequency.exponentialRampToValueAtTime(to, t + dur);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(vol, t + 0.003);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain).connect(out);
  osc.start(t);
  osc.stop(t + dur + 0.01);
}

// Low "clunk" for the heavier keys.
function thud(t, freq, dur, vol) {
  const osc = ctx.createOscillator();
  osc.frequency.setValueAtTime(freq, t);
  osc.frequency.exponentialRampToValueAtTime(freq / 2.5, t + dur);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain).connect(out);
  osc.start(t);
  osc.stop(t + dur + 0.01);
}

// kind: 'key' | 'space' | 'back' | 'enter'
export function keyClick(kind = 'key') {
  if (!ctx) setup();
  if (ctx.state === 'suspended') ctx.resume();
  const t = ctx.currentTime;
  if (kind === 'enter') {
    click(t, 900, 0.08, 0.35);
    thud(t, 150, 0.12, 0.35);
    blip(t + 0.05, 880, 880, 0.06, 0.05); // beep…
    blip(t + 0.12, 1318.5, 1318.5, 0.08, 0.05); // …boop
  } else if (kind === 'back') {
    click(t, 2200, 0.03, 0.2);
    blip(t, 900, 450, 0.05, 0.04);
  } else if (kind === 'space') {
    click(t, 1500, 0.045, 0.28);
    thud(t, 120, 0.06, 0.2);
    blip(t, 523.3, 523.3, 0.03, 0.03);
  } else {
    click(t, 3000 + Math.random() * 500, 0.025, 0.22);
    blip(t, pick(NOTES), pick(NOTES), 0.028, 0.035);
  }
}
