'use client';

import { useEffect, useRef, useState } from 'react';
import { usePrivacy } from '../../lib/privacy';

const BARS = 78; // 5-minute bars, 09:30–16:00
const AXIS = 76; // room for price labels on the right
const RANGES = ['1D', '3D', '1M', '6M', 'YTD', '1Y', '5Y', 'Max'];

// A fictional ticker's intraday random walk.
function session() {
  const out = [];
  let p = 104.2;
  for (let i = 0; i < BARS; i++) {
    p = Math.max(1, p + (Math.random() - 0.48) * 0.32);
    out.push({ p, v: 3e5 + Math.random() * 1.4e6 * (i < 6 || i > BARS - 7 ? 2 : 1) });
  }
  return out;
}

const fmt = (n) => n.toFixed(2);
const vol = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(3)}M` : `${Math.round(n / 1e3)}K`);
const clock = (i) => {
  const m = 570 + i * 5;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};
const pad = (n) => String(n).padStart(2, '0');
const mdY = (d) => `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${d.getFullYear()}`;

// The boss screen: a price graph styled after a market terminal, covering the journal.
export default function PanicScreen() {
  const { panic } = usePrivacy();
  const [bars, setBars] = useState(null);
  const [now, setNow] = useState(null);
  const [size, setSize] = useState(null);
  const box = useRef(null);

  useEffect(() => {
    if (!panic) return;
    const title = document.title;
    document.title = 'JRNL US Equity GP';
    setBars((b) => b || session());
    setNow(new Date());
    // The last bar keeps ticking, like a live quote.
    const id = setInterval(() => {
      setBars((b) => {
        const last = b[b.length - 1];
        return [...b.slice(0, -1), { p: Math.max(1, last.p + (Math.random() - 0.5) * 0.08), v: last.v + Math.random() * 4e4 }];
      });
      setNow(new Date());
    }, 1200);
    return () => {
      clearInterval(id);
      document.title = title;
    };
  }, [panic]);

  // Draw at the chart box's real pixel size so it fills any screen without stretching text.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, [panic, bars !== null]);

  if (!panic || !bars) return null;

  const prices = bars.map((d) => d.p);
  const open = prices[0];
  const last = prices[prices.length - 1];
  const hi = Math.max(...prices);
  const lo = Math.min(...prices);
  const avg = prices.reduce((s, p) => s + p, 0) / prices.length;
  const hiAt = clock(prices.indexOf(hi));
  const loAt = clock(prices.indexOf(lo));
  const diff = last - open;
  const up = diff >= 0;
  const totalV = bars.reduce((s, d) => s + d.v, 0);
  const maxV = Math.max(...bars.map((d) => d.v));

  const W = Math.max(120, (size?.w || 800) - AXIS);
  const total = size?.h || 420;
  const VH = Math.max(50, total * 0.22);
  const XAXIS = 22;
  const GAP = 8;
  const H = Math.max(100, total - VH - XAXIS - GAP);
  const span = (hi - lo) * 0.12 || 1;
  const top = hi + span;
  const bottom = lo - span;
  const x = (i) => ((i + 0.5) / BARS) * W;
  const y = (p) => ((top - p) / (top - bottom)) * H;
  const vy = (v) => H + GAP + VH * (1 - v / (maxV * 1.1));
  const line = prices.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p).toFixed(1)}`).join('');
  const step = (top - bottom) / 6;
  const ticks = Array.from({ length: 6 }, (_, i) => bottom + step * (i + 0.5));
  const timeTicks = Array.from({ length: BARS }, (_, i) => i).filter((i) => i % (W < 500 ? 18 : 6) === 0);
  const barW = Math.max(1, (W / BARS) * 0.7);
  const date = now ? mdY(now) : '';
  const time = now ? `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}` : '';

  return (
    <div className="panic" role="presentation">
      <div className="bb-cmd">
        <span className="bb-cmd-sec">JRNL US Equity</span>
        <span className="bb-cmd-fn">GP</span>
        <span className="bb-cmd-help">&lt;HELP&gt; for explanation.</span>
      </div>

      <div className="bb-bar">
        <span className="bb-sec">JRNL US Equity</span>
        <button className="bb-btn red">96) Actions ▾</button>
        <button className="bb-btn">97) Edit ▾</button>
        <button className="bb-btn">98) Table</button>
        <span className="bb-title">Line Chart</span>
      </div>

      <div className="bb-bar">
        <span className="bb-field">{date}</span>
        <span className="bb-dash">-</span>
        <span className="bb-field">{date}</span>
        <span className="bb-field wide">Last Price</span>
        <span className="bb-field">Local CCY</span>
        <span className="bb-ranges">
          {RANGES.map((r) => (
            <span key={r} className={r === '1D' ? 'on' : ''}>{r}</span>
          ))}
        </span>
        <span className="bb-tools">
          <span>Track</span><span>Annotate</span><span>News</span><span>Zoom</span>
        </span>
      </div>

      <div className="bb-chart" ref={box}>
        <svg width={W + AXIS} height={total}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1="0" x2={W} y1={y(t)} y2={y(t)} className="bb-grid" />
              {Math.abs(y(t) - y(last)) > 20 && <text x={W + 8} y={y(t) + 4} className="bb-axis">{fmt(t)}</text>}
            </g>
          ))}
          {timeTicks.map((i) => (
            <g key={i}>
              <line x1={x(i)} x2={x(i)} y1="0" y2={H + GAP + VH} className="bb-grid" />
              <text x={x(i)} y={total - 6} className="bb-axis" textAnchor={i ? "middle" : "start"}>{clock(i)}</text>
            </g>
          ))}
          <line x1="0" x2={W} y1={y(avg)} y2={y(avg)} className="bb-avg" />
          <path d={line} className="bb-line" />
          <rect x={W + 1} y={y(last) - 9} width={AXIS - 2} height="18" className="bb-tag" />
          <text x={W + 8} y={y(last) + 4} className="bb-tag-text">{fmt(last)}</text>

          <line x1="0" x2={W + AXIS} y1={H + GAP / 2} y2={H + GAP / 2} className="bb-split" />
          {bars.map((d, i) => (
            <rect key={i} x={x(i) - barW / 2} width={barW} y={vy(d.v)} height={H + GAP + VH - vy(d.v)} className={i && d.p < bars[i - 1].p ? 'bb-vol down' : 'bb-vol'} />
          ))}
          <text x={W + 8} y={H + GAP + 14} className="bb-axis">{vol(maxV)}</text>
          <line x1={W} x2={W} y1="0" y2={H + GAP + VH} className="bb-frame" />
        </svg>

        <div className="bb-legend">
          <div className="bb-legend-sec">JRNL US Equity</div>
          <div><i className="sw line" />Last Price <b>{fmt(last)}</b></div>
          <div><i className="sw hi" />High on {hiAt} <b>{fmt(hi)}</b></div>
          <div><i className="sw avg" />Average <b>{fmt(avg)}</b></div>
          <div><i className="sw lo" />Low on {loAt} <b>{fmt(lo)}</b></div>
          <div className={up ? 'bb-up' : 'bb-down'}>{up ? '+' : ''}{fmt(diff)} {up ? '+' : ''}{((diff / open) * 100).toFixed(2)}%</div>
        </div>
        <div className="bb-legend bb-legend-vol" style={{ top: H + GAP + 4 }}>
          <div><i className="sw vol" />Volume <b>{vol(totalV)}</b></div>
        </div>
      </div>

      <div className="bb-foot">
        <span>SN 106219 EDT GMT-4:00 H471-2208-0 {date} {time}</span>
      </div>
    </div>
  );
}
