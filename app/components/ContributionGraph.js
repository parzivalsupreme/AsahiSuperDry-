'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { MONTHS, addDays, dayKey, formatDay, parseDay, tipDay } from '../../lib/dates';

const WEEKDAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', ''];

// Map a day's word count to a 0–4 intensity, relative to the busiest day in view.
function levelFor(words, max) {
  if (!words) return 0;
  if (max <= 0) return 1;
  return Math.min(4, Math.max(1, Math.ceil((words / max) * 4)));
}

function buildRange(view, todayKey) {
  if (view === 'last') {
    const end = parseDay(todayKey);
    return { start: addDays(end, -364), end };
  }
  return { start: new Date(view, 0, 1), end: new Date(view, 11, 31) };
}

export default function ContributionGraph({ byDay, today, selectedDay, onSelectDay }) {
  const [view, setView] = useState('last');
  const [tip, setTip] = useState(null);
  const scrollRef = useRef(null);

  const years = useMemo(() => {
    const set = new Set([...byDay.keys()].map((k) => Number(k.slice(0, 4))));
    if (today) set.add(Number(today.slice(0, 4)));
    return [...set].sort((a, b) => b - a);
  }, [byDay, today]);

  const graph = useMemo(() => {
    if (!today) return null;
    const { start, end } = buildRange(view, today);
    const startKey = dayKey(start);
    const endKey = dayKey(end);
    const gridStart = addDays(start, -start.getDay()); // back up to Sunday

    const weeks = [];
    let total = 0;
    let max = 0;
    for (const [key, d] of byDay) {
      if (key >= startKey && key <= endKey) {
        total += d.count;
        max = Math.max(max, d.words);
      }
    }

    for (let cursor = gridStart; cursor <= end; ) {
      const week = [];
      for (let i = 0; i < 7; i++) {
        const key = dayKey(cursor);
        const inRange = key >= startKey && key <= endKey;
        const data = byDay.get(key);
        week.push({
          key,
          inRange,
          count: data?.count || 0,
          words: data?.words || 0,
          level: inRange ? levelFor(data?.words || 0, max) : 0,
        });
        cursor = addDays(cursor, 1);
      }
      weeks.push(week);
    }

    // Month labels sit above the first week that contains the 1st (or the first week, if it's mid-month).
    const months = weeks.map((week, i) => {
      const first = week.find((c) => c.inRange && (i === 0 || c.key.endsWith('-01')));
      if (!first) return null;
      const m = parseDay(first.key).getMonth();
      // Skip a label for a partial first month that would collide with the next one.
      if (i === 0 && !first.key.endsWith('-01') && weeks[2]?.some((c) => c.key.endsWith('-01'))) return null;
      return MONTHS[m];
    });

    return { weeks, months, total };
  }, [byDay, today, view]);

  // On narrow screens the graph scrolls sideways; start at the most recent weeks.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [graph]);

  const heading = graph
    ? `${graph.total} ${graph.total === 1 ? 'entry' : 'entries'} ${view === 'last' ? 'in the last year' : `in ${view}`}`
    : ' ';

  const showTip = (e, cell) => {
    const r = e.currentTarget.getBoundingClientRect();
    const what = cell.count
      ? `${cell.count} ${cell.count === 1 ? 'entry' : 'entries'} (${cell.words.toLocaleString()} words)`
      : 'No entries';
    setTip({ x: r.left + r.width / 2, y: r.top, text: `${what} on ${tipDay(cell.key)}.` });
  };

  return (
    <div>
      <h2 className="section-title">{heading}</h2>
      <div className="graph-wrap">
        <div className="graph-box">
          <div className="graph-scroll" ref={scrollRef}>
            {graph ? (
              <table className="graph-table" role="grid" aria-label="Journal entry graph">
                <thead>
                  <tr>
                    <td />
                    {graph.months.map((m, i) => (
                      <td key={i} className="graph-month">
                        {m && <span>{m}</span>}
                      </td>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {WEEKDAY_LABELS.map((label, row) => (
                    <tr key={row}>
                      <td className="graph-weekday">{label && <span>{label}</span>}</td>
                      {graph.weeks.map((week, col) => {
                        const cell = week[row];
                        if (!cell.inRange) {
                          return (
                            <td key={col}>
                              <span className="cell future" />
                            </td>
                          );
                        }
                        return (
                          <td key={col}>
                            <span
                              role="gridcell"
                              tabIndex={-1}
                              aria-label={`${cell.count} entries on ${formatDay(cell.key)}`}
                              className={`cell${selectedDay === cell.key ? ' selected' : ''}`}
                              data-level={cell.level}
                              onMouseEnter={(e) => showTip(e, cell)}
                              onMouseLeave={() => setTip(null)}
                              onClick={() => onSelectDay(cell.key)}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ height: 112 }} />
            )}
          </div>
          <div className="graph-footer">
            <span className="legend">
              Less
              {[0, 1, 2, 3, 4].map((l) => (
                <span key={l} className="cell" data-level={l} />
              ))}
              More
            </span>
          </div>
        </div>

        <ul className="year-list">
          <li>
            <button className={view === 'last' ? 'active' : ''} onClick={() => setView('last')}>
              Last year
            </button>
          </li>
          {years.map((y) => (
            <li key={y}>
              <button className={view === y ? 'active' : ''} onClick={() => setView(y)}>
                {y}
              </button>
            </li>
          ))}
        </ul>
      </div>
      {tip && (
        <div className="tooltip" style={{ left: tip.x, top: tip.y }}>
          {tip.text}
        </div>
      )}
    </div>
  );
}
