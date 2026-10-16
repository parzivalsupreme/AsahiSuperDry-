'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { addDays, computeStreaks, dayKey, formatDay, parseDay, tipDay } from '../../lib/dates';
import { dayHref, listEntries } from '../../lib/entries';

const WEEKS = 52;

// One row per habit: streaks, last-30-day count and a one-year grid.
function habitRows(entries, todayKey) {
  const days = new Map(); // habit -> Map of day -> entries that ticked it
  for (const e of entries) {
    for (const h of e.habits) {
      if (!days.has(h)) days.set(h, new Map());
      const byDay = days.get(h);
      if (!byDay.has(e.day)) byDay.set(e.day, []);
      byDay.get(e.day).push(e);
    }
  }
  const today = parseDay(todayKey);
  const since30 = dayKey(addDays(today, -29));
  const grid = []; // from the Sunday WEEKS weeks back through today
  for (let d = addDays(today, -(WEEKS - 1) * 7 - today.getDay()); d <= today; d = addDays(d, 1)) grid.push(dayKey(d));

  return [...days]
    .map(([name, byDay]) => ({
      name,
      ...computeStreaks([...byDay.keys()], todayKey),
      last30: [...byDay.keys()].filter((k) => k >= since30).length,
      total: byDay.size,
      cells: grid.map((key) => ({ key, done: byDay.has(key), entries: byDay.get(key) || [] })),
    }))
    .sort((a, b) => b.last30 - a.last30 || b.total - a.total || a.name.localeCompare(b.name));
}

function tipText(c) {
  if (!c.done) return `Not done on ${tipDay(c.key)}.`;
  const what = c.entries.length === 1 ? `"${c.entries[0].title}"` : `${c.entries.length} entries`;
  return `Done on ${tipDay(c.key)}: ${what}.`;
}

// On narrow screens the grid scrolls sideways; start at the latest weeks.
// Done boxes open the entry that ticked the habit (or that day's list when there are several).
function HabitGrid({ habit, onTip }) {
  const ref = useRef(null);
  const router = useRouter();
  useEffect(() => {
    ref.current.scrollLeft = ref.current.scrollWidth;
  }, []);
  return (
    <div ref={ref} className="habit-grid" aria-label={`${habit.name}: done ${habit.total} days`} onScroll={() => onTip(null)}>
      {habit.cells.map((c) => {
        const href = dayHref(c.key, c.entries.map((e) => e.id));
        return (
          <span
            key={c.key}
            className={`cell${href ? ' linked' : ''}`}
            data-level={c.done ? 4 : 0}
            role={href ? 'link' : undefined}
            tabIndex={href ? 0 : undefined}
            aria-label={`${formatDay(c.key)}: ${c.done ? 'done' : 'not done'}`}
            onMouseEnter={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              onTip({ x: r.left + r.width / 2, y: r.top, text: tipText(c) });
            }}
            onMouseLeave={() => onTip(null)}
            onClick={href ? () => router.push(href) : undefined}
            onKeyDown={href ? (e) => e.key === 'Enter' && router.push(href) : undefined}
          />
        );
      })}
    </div>
  );
}

export default function HabitsView() {
  const [entries, setEntries] = useState(null);
  const [error, setError] = useState('');
  const [today, setToday] = useState(null);
  const [tip, setTip] = useState(null);

  useEffect(() => {
    setToday(dayKey(new Date()));
    listEntries().then(setEntries, (e) => setError(e.message));
  }, []);

  const rows = useMemo(() => (entries && today ? habitRows(entries, today) : null), [entries, today]);

  if (error) return <p className="error">Could not load entries: {error}</p>;
  if (!rows) return <p className="notice">Loading habits…</p>;

  const doneToday = rows.filter((r) => r.cells[r.cells.length - 1].done).length;

  return (
    <div className="page">
      <div className="stats-row">
        <span><strong>{rows.length}</strong> {rows.length === 1 ? 'habit' : 'habits'}</span>
        <span><strong>{doneToday}</strong> done today</span>
      </div>

      <h2 className="section-title">Habits</h2>
      {rows.length === 0 ? (
        <div className="empty">
          No habits yet. Tick some when you <Link href="/new/">write an entry</Link>.
        </div>
      ) : (
        <div className="habits">
          {rows.map((r) => (
            <section className="habit" key={r.name}>
              <div className="habit-head">
                <h3>{r.name}</h3>
                <span><strong>{r.current}</strong> day streak</span>
                <span>Best <strong>{r.longest}</strong></span>
                <span><strong>{r.last30}</strong>/30 days</span>
              </div>
              <HabitGrid habit={r} onTip={setTip} />
            </section>
          ))}
        </div>
      )}
      {tip && (
        <div className="tooltip" style={{ left: tip.x, top: tip.y }}>
          {tip.text}
        </div>
      )}
    </div>
  );
}
