'use client';

import { useEffect, useMemo, useState } from 'react';
import ContributionGraph from './ContributionGraph';
import EntryFeed from './EntryFeed';
import ExportButton from './ExportButton';
import { computeStreaks, dayKey } from '../../lib/dates';
import { listEntries } from '../../lib/entries';

export default function Dashboard() {
  const [entries, setEntries] = useState(null);
  const [error, setError] = useState('');
  const [today, setToday] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);

  useEffect(() => {
    setToday(dayKey(new Date()));
    listEntries().then(setEntries, (e) => setError(e.message));
  }, []);

  const byDay = useMemo(() => {
    const map = new Map();
    for (const e of entries || []) {
      const d = map.get(e.day) || { count: 0, words: 0 };
      d.count++;
      d.words += e.words;
      map.set(e.day, d);
    }
    return map;
  }, [entries]);

  const streaks = useMemo(() => computeStreaks([...byDay.keys()], today), [byDay, today]);

  if (error) return <p className="error">Could not load entries: {error}</p>;
  if (!entries) return <p className="notice">Loading entries…</p>;
  const totalWords = entries.reduce((sum, e) => sum + e.words, 0);

  return (
    <div className="page">
      <div className="stats-row">
        <span><strong>{entries.length}</strong> entries</span>
        <span><strong>{totalWords.toLocaleString()}</strong> words</span>
        <span>Current streak: <strong>{streaks.current}</strong> {streaks.current === 1 ? 'day' : 'days'}</span>
        <span>Longest streak: <strong>{streaks.longest}</strong> {streaks.longest === 1 ? 'day' : 'days'}</span>
        <span className="stats-actions">
          <ExportButton entries={entries} />
        </span>
      </div>

      <ContributionGraph
        byDay={byDay}
        today={today}
        selectedDay={selectedDay}
        onSelectDay={(key) => setSelectedDay((cur) => (cur === key ? null : key))}
      />
      <EntryFeed entries={entries} selectedDay={selectedDay} onClearDay={() => setSelectedDay(null)} />
    </div>
  );
}
