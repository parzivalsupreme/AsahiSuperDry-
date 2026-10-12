'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { MONTHS_LONG, formatDay, parseDay } from '../../lib/dates';

export default function EntryFeed({ entries, selectedDay, onClearDay }) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((e) => {
      if (selectedDay && e.day !== selectedDay) return false;
      if (!q) return true;
      return (
        e.title.toLowerCase().includes(q) ||
        e.excerpt.toLowerCase().includes(q) ||
        e.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [entries, selectedDay, query]);

  const groups = useMemo(() => {
    const out = [];
    for (const e of filtered) {
      const month = e.day.slice(0, 7);
      if (!out.length || out[out.length - 1].month !== month) out.push({ month, items: [] });
      out[out.length - 1].items.push(e);
    }
    return out;
  }, [filtered]);

  return (
    <div className="activity">
      <div className="activity-head">
        <h2 className="section-title" style={{ margin: 0 }}>
          Journal activity{' '}
          {selectedDay && (
            <span className="filter-chip">
              {formatDay(selectedDay)}
              <button onClick={onClearDay} aria-label="Clear day filter">×</button>
            </span>
          )}
        </h2>
        <input
          className="search"
          type="search"
          placeholder="Find an entry…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {groups.length === 0 && (
        <div className="empty">
          {entries.length === 0 ? (
            <>No entries yet. <Link href="/new/">Write your first one</Link>.</>
          ) : (
            'No entries match.'
          )}
        </div>
      )}

      {groups.map(({ month, items }) => {
        const d = parseDay(`${month}-01`);
        return (
          <div className="month-group" key={month}>
            <h3>
              {MONTHS_LONG[d.getMonth()]} <span>{d.getFullYear()}</span>
            </h3>
            <div className="timeline">
              {items.map((e) => (
                <article className="entry-card" key={e.id}>
                  <h4>
                    <Link href={`/entry/?id=${e.id}`}>{e.title}</Link>
                    {e.tags.length > 0 && (
                      <span className="labels">
                        {e.tags.map((t) => (
                          <span
                            className="label"
                            key={t}
                            style={{ cursor: 'pointer' }}
                            onClick={() => setQuery(t)}
                          >
                            {t}
                          </span>
                        ))}
                      </span>
                    )}
                  </h4>
                  <div className="meta">
                    {formatDay(e.day, { weekday: true })}
                    {e.time && ` · ${e.time}`}
                    {e.mood && ` · ${e.mood}`} · {e.words.toLocaleString()} words
                  </div>
                  {e.excerpt && <p>{e.excerpt}</p>}
                </article>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
