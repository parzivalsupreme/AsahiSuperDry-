'use client';

import { useEffect, useMemo, useState } from 'react';
import ContributionGraph from './ContributionGraph';
import EntryFeed from './EntryFeed';
import { addDays, dayKey, parseDay } from '../../lib/dates';

function computeStreaks(days, todayKey) {
  const set = new Set(days);
  let current = 0;
  if (todayKey) {
    let cursor = parseDay(todayKey);
    if (!set.has(todayKey)) cursor = addDays(cursor, -1); // today isn't over yet
    while (set.has(dayKey(cursor))) {
      current++;
      cursor = addDays(cursor, -1);
    }
  }
  let longest = 0;
  let run = 0;
  let prev = null;
  for (const key of [...set].sort()) {
    const d = parseDay(key);
    run = prev && dayKey(addDays(prev, 1)) === key ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = d;
  }
  return { current, longest };
}

export default function Dashboard({ entries }) {
  const [today, setToday] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);

  // "Today" is resolved in the browser so the static page stays correct after it was built.
  useEffect(() => setToday(dayKey(new Date())), []);

  const byDay = useMemo(() => {
    const map = new Map();
    for (const e of entries) {
      const d = map.get(e.day) || { count: 0, words: 0 };
      d.count++;
      d.words += e.words;
      map.set(e.day, d);
    }
    return map;
  }, [entries]);

  const streaks = useMemo(() => computeStreaks([...byDay.keys()], today), [byDay, today]);
  const totalWords = entries.reduce((sum, e) => sum + e.words, 0);

  return (
    <div className="dashboard">
      <div className="stats-row">
        <span><strong>{entries.length}</strong> entries</span>
        <span><strong>{totalWords.toLocaleString()}</strong> words</span>
        <span>🔥 Current streak: <strong>{streaks.current}</strong> {streaks.current === 1 ? 'day' : 'days'}</span>
        <span>🏆 Longest streak: <strong>{streaks.longest}</strong> {streaks.longest === 1 ? 'day' : 'days'}</span>
      </div>

      <section>
        <ContributionGraph
          byDay={byDay}
          today={today}
          selectedDay={selectedDay}
          onSelectDay={(key) => setSelectedDay((cur) => (cur === key ? null : key))}
        />
        <EntryFeed entries={entries} selectedDay={selectedDay} onClearDay={() => setSelectedDay(null)} />
      </section>
    </div>
  );
}
