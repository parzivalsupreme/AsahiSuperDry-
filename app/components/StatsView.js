'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { dayKey } from '../../lib/dates';
import { listEntries } from '../../lib/entries';
import { computeStats } from '../../lib/stats';

const fmt = (n) => n.toLocaleString();

// ▲/▼ with the change, so direction never relies on color alone.
function Delta({ c }) {
  if (!c.diff) return <span className="delta flat">■ 0</span>;
  const up = c.diff > 0;
  const pct = c.pct === null ? '' : ` (${up ? '+' : ''}${(c.pct * 100).toFixed(0)}%)`;
  return (
    <span className={`delta ${up ? 'up' : 'down'}`}>
      {up ? '▲ +' : '▼ '}{fmt(c.diff)}{pct}
    </span>
  );
}

function Ticker({ s }) {
  const items = [
    ['WORDS 30D', fmt(s.words30.now), s.words30],
    ['ENTRIES 30D', fmt(s.entries30.now), s.entries30],
    ['DAYS 30D', fmt(s.days30.now), s.days30],
    ['TOTAL WORDS', fmt(s.totalWords)],
    ['BEST DAY', s.bestWeekday.count ? s.bestWeekday.name.toUpperCase() : '—'],
    ['TOP TAG', s.topTag?.toUpperCase() || '—'],
    ['TOP WORD', s.topWords[0]?.[0].toUpperCase() || '—'],
  ];
  const row = items.map(([label, value, c]) => (
    <span className="tick" key={label}>
      <b>{label}</b> {value} {c && <Delta c={c} />}
    </span>
  ));
  return (
    <div className="ticker">
      <div className="ticker-track">
        <div>{row}</div>
        <div aria-hidden="true">{row}</div>
      </div>
    </div>
  );
}

function Tile({ label, value, children }) {
  return (
    <div className="tile">
      <div className="tile-label">{label}</div>
      <div className="tile-value">{value}</div>
      <div className="tile-note">{children}</div>
    </div>
  );
}

// Horizontal bars with the value written out; the leader gets a ★.
function Ranking({ title, rows, best }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <section className="panel">
      <h2 className="section-title">{title}</h2>
      <ul className="hbars">
        {rows.map((r) => (
          <li key={r.label} className={r.label === best ? 'best' : ''}>
            <span>{r.label}</span>
            <span className="hbar-track"><span className="hbar" style={{ width: `${(r.value / max) * 100}%` }} /></span>
            <span className="hbar-value">{fmt(r.value)}{r.label === best && ' ★'}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function StatsView() {
  const [entries, setEntries] = useState(null);
  const [error, setError] = useState('');
  const [today, setToday] = useState(null);

  useEffect(() => {
    setToday(dayKey(new Date()));
    listEntries().then(setEntries, (e) => setError(e.message));
  }, []);

  const s = useMemo(() => entries && today && computeStats(entries, today), [entries, today]);

  if (error) return <p className="error">Could not load entries: {error}</p>;
  if (!s) return <p className="notice">Loading stats…</p>;
  if (!s.entries) return <div className="empty">No entries yet. <Link href="/new/">Write your first one</Link>.</div>;

  const maxMonth = Math.max(...s.months.map((m) => m.words), 1);

  return (
    <div className="page">
      <Ticker s={s} />

      <div className="tiles">
        <Tile label="Words · 30 days" value={fmt(s.words30.now)}><Delta c={s.words30} /></Tile>
        <Tile label="Entries · 30 days" value={fmt(s.entries30.now)}><Delta c={s.entries30} /></Tile>
        <Tile label="Total words" value={fmt(s.totalWords)}>{fmt(s.entries)} entries</Tile>
        <Tile label="Consistency" value={`${Math.round((s.daysWritten / s.span) * 100)}%`}>
          {s.daysWritten} of {s.span} days
        </Tile>
      </div>
      <p className="notice">▲▼ compare the last 30 days with the 30 days before.</p>

      <section className="panel">
        <h2 className="section-title">Words by month</h2>
        <div className="bars">
          {s.months.map((m) => (
            <div key={m.key} className="bar-col" title={`${m.label} ${m.year}: ${fmt(m.words)} words`}>
              <div className="bar-val">{m.words ? fmt(m.words) : ''}</div>
              <div className="bar-track">
                <div className="bar" style={{ height: `${(m.words / maxMonth) * 100}%` }} />
              </div>
              <div className="bar-label">{m.label}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="two-col">
        <Ranking
          title="Entries by weekday"
          rows={s.weekdays.map((w) => ({ label: w.name, value: w.count }))}
          best={s.bestWeekday.count ? s.bestWeekday.name : null}
        />
        <Ranking title="Most used words" rows={s.topWords.map(([w, n]) => ({ label: w, value: n }))} />
      </div>
    </div>
  );
}
