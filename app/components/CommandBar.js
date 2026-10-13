'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatDay } from '../../lib/dates';
import { listEntries } from '../../lib/entries';
import { supabase } from '../../lib/supabase';
import { THEMES, setTheme, toggleCrt } from '../../lib/theme';
import { openRandomEntry } from './Shortcuts';

export const openCommandBar = () => window.dispatchEvent(new Event('journal-command'));

// Ctrl/Cmd+K: jump to any page, entry or tag, or run a command.
export default function CommandBar() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [entries, setEntries] = useState([]);
  const listRef = useRef(null);

  useEffect(() => {
    const toggle = () => setOpen((o) => !o);
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('journal-command', toggle);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('journal-command', toggle);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActive(0);
    supabase?.auth.getSession().then(({ data }) => data.session && listEntries().then(setEntries, () => {}));
  }, [open]);

  const items = useMemo(() => {
    const go = (href) => () => router.push(href);
    const tags = [...new Set(entries.flatMap((e) => e.tags))].sort();
    const all = [
      { kind: 'Page', label: 'Entries', hint: '1', run: go('/') },
      { kind: 'Page', label: 'New entry', hint: '2', run: go('/new/') },
      { kind: 'Page', label: 'Tags', hint: '3', run: go('/tags/') },
      { kind: 'Page', label: 'Random entry', hint: '4', run: () => openRandomEntry(router, new URLSearchParams(location.search).get('id')) },
      { kind: 'Page', label: 'Stats', hint: '5', run: go('/stats/') },
      { kind: 'Page', label: 'Habits', hint: '6', run: go('/habits/') },
      { kind: 'Page', label: 'Photos', hint: '7', run: go('/photos/') },
      ...THEMES.map((t) => ({ kind: 'Theme', label: `Theme: ${t}`, run: () => setTheme(t) })),
      { kind: 'Theme', label: 'Toggle CRT scanlines', run: toggleCrt },
      { kind: 'Help', label: 'Keyboard shortcuts', hint: '?', run: () => window.dispatchEvent(new Event('journal-help')) },
      ...tags.map((t) => ({ kind: 'Tag', label: `#${t}`, run: go(`/tags/?tag=${encodeURIComponent(t)}`) })),
      ...entries.map((e) => ({ kind: 'Entry', label: e.title, hint: formatDay(e.day), run: go(`/entry/?id=${e.id}`) })),
    ];
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) return all.filter((i) => i.kind !== 'Entry' && i.kind !== 'Tag').concat(all.filter((i) => i.kind === 'Entry').slice(0, 5));
    return all
      .filter((i) => terms.every((t) => `${i.label} ${i.hint || ''}`.toLowerCase().includes(t)))
      .sort((a, b) => b.label.toLowerCase().startsWith(terms[0]) - a.label.toLowerCase().startsWith(terms[0]))
      .slice(0, 40);
  }, [entries, query, router]);

  useEffect(() => {
    listRef.current?.querySelector('.active')?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  if (!open) return null;

  const run = (item) => {
    setOpen(false);
    item?.run();
  };

  const onKey = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const step = e.key === 'ArrowDown' ? 1 : -1;
      setActive((a) => (a + step + items.length) % Math.max(items.length, 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      run(items[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className="kbd-overlay cmd-overlay" onClick={() => setOpen(false)}>
      <div className="cmd" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Command bar">
        <div className="cmd-input">
          <span>&gt;</span>
          <input
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={onKey}
            placeholder="Go to a page, entry or tag, or run a command…"
            aria-label="Command"
          />
        </div>
        <ul className="cmd-list" ref={listRef} role="listbox">
          {items.length === 0 && <li className="cmd-empty">No matches.</li>}
          {items.map((item, i) => (
            <li
              key={`${item.kind}-${item.label}-${i}`}
              role="option"
              aria-selected={i === active}
              className={i === active ? 'active' : ''}
              onMouseMove={() => setActive(i)}
              onClick={() => run(item)}
            >
              <span className="cmd-kind">{item.kind}</span>
              <span className="cmd-label">{item.label}</span>
              {item.hint && <span className="cmd-hint">{item.hint}</span>}
            </li>
          ))}
        </ul>
        <div className="cmd-foot">↑↓ move · Enter open · Esc close</div>
      </div>
    </div>
  );
}
