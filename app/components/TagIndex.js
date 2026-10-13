'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { formatDay } from '../../lib/dates';
import { listEntries } from '../../lib/entries';

// Every tag with the entries that carry it.
export default function TagIndex() {
  const selected = useSearchParams().get('tag');
  const router = useRouter();
  const [entries, setEntries] = useState(null);
  const [error, setError] = useState('');
  const [sort, setSort] = useState('count');
  const [query, setQuery] = useState('');

  useEffect(() => {
    listEntries().then(setEntries, (e) => setError(e.message));
  }, []);

  const tags = useMemo(() => {
    const map = new Map();
    for (const e of entries || []) {
      for (const t of e.tags) {
        const tag = map.get(t) || { name: t, entries: [], words: 0 };
        tag.entries.push(e);
        tag.words += e.words;
        map.set(t, tag);
      }
    }
    const list = [...map.values()];
    return sort === 'count'
      ? list.sort((a, b) => b.entries.length - a.entries.length || a.name.localeCompare(b.name))
      : list.sort((a, b) => a.name.localeCompare(b.name));
  }, [entries, sort]);

  if (error) return <p className="error">Could not load entries: {error}</p>;
  if (!entries) return <p className="notice">Loading tags…</p>;

  const q = query.trim().toLowerCase();
  const shown = tags.filter((t) => (selected ? t.name === selected : !q || t.name.toLowerCase().includes(q)));
  const untagged = entries.filter((e) => e.tags.length === 0).length;
  const pick = (name) => router.push(name && name !== selected ? `/tags/?tag=${encodeURIComponent(name)}` : '/tags/');

  return (
    <div className="page">
      <div className="stats-row">
        <span><strong>{tags.length}</strong> {tags.length === 1 ? 'tag' : 'tags'}</span>
        <span><strong>{entries.length - untagged}</strong> tagged entries</span>
        <span><strong>{untagged}</strong> untagged</span>
      </div>

      <div className="activity-head">
        <h2 className="section-title">
          Tags{' '}
          {selected && (
            <span className="filter-chip">
              {selected}
              <button onClick={() => pick(null)} aria-label="Show all tags">×</button>
            </span>
          )}
        </h2>
        <div className="tag-tools">
          <div className="segmented">
            <button className={sort === 'count' ? 'active' : ''} onClick={() => setSort('count')}>Most used</button>
            <button className={sort === 'name' ? 'active' : ''} onClick={() => setSort('name')}>A–Z</button>
          </div>
          <input
            className="search"
            type="search"
            placeholder="Find a tag…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {tags.length === 0 ? (
        <div className="empty">
          No tags yet. Add some when you <Link href="/new/">write an entry</Link>.
        </div>
      ) : (
        <>
          <div className="tag-cloud">
            {tags.map((t) => (
              <button
                key={t.name}
                className={`tag-pill${selected === t.name ? ' active' : ''}`}
                onClick={() => pick(t.name)}
              >
                {t.name}
                <span className="count">{t.entries.length}</span>
              </button>
            ))}
          </div>

          {shown.length === 0 && <div className="empty">No tags match.</div>}

          {shown.map((t) => (
            <section className="tag-group" key={t.name}>
              <h3>
                <button className="label" onClick={() => pick(t.name)}>{t.name}</button>
                <span>
                  {t.entries.length} {t.entries.length === 1 ? 'entry' : 'entries'} · {t.words.toLocaleString()} words
                </span>
              </h3>
              <ul className="tag-entries">
                {t.entries.map((e) => (
                  <li key={e.id}>
                    <span className="date">{formatDay(e.day)}</span>
                    <Link href={`/entry/?id=${e.id}`}>{e.title}</Link>
                    <span className="words">{e.words.toLocaleString()} words</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </>
      )}
    </div>
  );
}
