'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { addDays, computeStreaks, dayKey, formatDay, parseDay } from '../../lib/dates';
import { listEntries } from '../../lib/entries';

const WEEKS = 52;

// One row per habit: streaks, last-30-day count and a one-year grid.
function habitRows(entries, todayKey) {
  const days = new Map(); // habit -> Set of days
  for (const e of entries) {
    for (const h of e.habits) {
      if (!days.has(h)) days.set(h, new Set());
      days.get(h).add(e.day);
    }
  }
  const today = parseDay(todayKey);
  const since30 = dayKey(addDays(today, -29));
  const grid = []; // from the Sunday WEEKS weeks back through today
  for (let d = addDays(today, -(WEEKS - 1) * 7 - today.getDay()); d <= today; d = addDays(d, 1)) grid.push(dayKey(d));

  return [...days]
    .map(([name, set]) => ({
      name,
      ...computeStreaks([...set], todayKey),
      last30: [...set].filter((k) => k >= since30).length,
      total: set.size,
      cells: grid.map((key) => ({ key, done: set.has(key) })),
    }))
    .sort((a, b) => b.last30 - a.last30 || b.total - a.total || a.name.localeCompare(b.name));
}

// On narrow screens the grid scrolls sideways; start at the latest weeks.
function HabitGrid({ habit }) {
  const ref = useRef(null);
  useEffect(() => {
    ref.current.scrollLeft = ref.current.scrollWidth;
  }, []);
  return (
    <div ref={ref} className="habit-grid" role="img" aria-label={`${habit.name}: done ${habit.total} days`}>
      {habit.cells.map((c) => (
        <span key={c.key} className="cell" data-level={c.done ? 4 : 0} title={`${formatDay(c.key)}: ${c.done ? 'done' : 'not done'}`} />
      ))}
    </div>
  );
}

export default function HabitsView() {
  const [entries, setEntries] = useState(null);
  const [error, setError] = useState('');
  const [today, setToday] = useState(null);

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
              <HabitGrid habit={r} />
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
