'use client';

// Soft mechanical-keyboard clicks, synthesized with Web Audio (no audio files).
let ctx = null;
let noise = null;

function setup() {
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  noise = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
}

// heavy: a deeper "thock" for Space, Enter and Backspace.
export function keyClick(heavy = false) {
  if (!ctx) setup();
  if (ctx.state === 'suspended') ctx.resume();
  const t = ctx.currentTime;

  const src = ctx.createBufferSource();
  src.buffer = noise;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = (heavy ? 1400 : 2800) + Math.random() * 600;
  filter.Q.value = 1.2;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(heavy ? 0.35 : 0.22, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + (heavy ? 0.06 : 0.035));
  src.connect(filter).connect(gain).connect(ctx.destination);
  src.start(t);
  src.stop(t + 0.07);

  const body = ctx.createOscillator();
  body.frequency.setValueAtTime(heavy ? 140 : 220, t);
  body.frequency.exponentialRampToValueAtTime(60, t + 0.05);
  const bodyGain = ctx.createGain();
  bodyGain.gain.setValueAtTime(heavy ? 0.25 : 0.1, t);
  bodyGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
  body.connect(bodyGain).connect(ctx.destination);
  body.start(t);
  body.stop(t + 0.07);
}
