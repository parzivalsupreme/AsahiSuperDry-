'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { formatDay } from '../../lib/dates';
import { listEntries, saveEntry } from '../../lib/entries';
import { deletePhotos, listPhotos, photoPaths, signUrls, signedUrl, withoutPhoto } from '../../lib/photos';

const size = (bytes) => (bytes > 1e6 ? `${(bytes / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1e3))} KB`);

// Every uploaded photo with the entry it appears in; deleting removes the file and its embeds.
export default function PhotoGallery() {
  const [photos, setPhotos] = useState(null);
  const [entries, setEntries] = useState([]);
  const [error, setError] = useState('');
  const [view, setView] = useState('all');
  const [busy, setBusy] = useState(null);

  useEffect(() => {
    Promise.all([listPhotos(), listEntries()])
      .then(async ([files, rows]) => {
        await signUrls(files.map((f) => f.path)).catch(() => {});
        setEntries(rows);
        setPhotos(files);
      })
      .catch((e) => setError(e.message));
  }, []);

  // Which entries embed each photo.
  const usedIn = useMemo(() => {
    const map = new Map();
    for (const e of entries) for (const p of photoPaths(e.body)) map.set(p, [...(map.get(p) || []), e]);
    return map;
  }, [entries]);

  if (error) return <p className="error">Could not load photos: {error}</p>;
  if (!photos) return <p className="notice">Loading photos…</p>;

  const unused = photos.filter((p) => !usedIn.has(p.path));
  const shown = view === 'unused' ? unused : photos;
  const total = photos.reduce((s, p) => s + p.size, 0);

  const remove = async (photo) => {
    const inEntries = usedIn.get(photo.path) || [];
    const where = inEntries.length ? `\n\nIt will also be removed from: ${inEntries.map((e) => `"${e.title}"`).join(', ')}.` : '';
    if (!confirm(`Delete this photo for good?${where}`)) return;
    setBusy(photo.path);
    try {
      const bodies = new Map();
      for (const e of inEntries) {
        bodies.set(e.id, withoutPhoto(e.body, photo.path));
        await saveEntry(e.id, { body: bodies.get(e.id) });
      }
      await deletePhotos([photo.path]);
      setPhotos((list) => list.filter((p) => p.path !== photo.path));
      setEntries((list) => list.map((e) => (bodies.has(e.id) ? { ...e, body: bodies.get(e.id) } : e)));
    } catch (err) {
      alert(`Couldn't delete the photo: ${err.message}`);
    }
    setBusy(null);
  };

  return (
    <div className="page">
      <div className="stats-row">
        <span><strong>{photos.length}</strong> {photos.length === 1 ? 'photo' : 'photos'}</span>
        <span><strong>{size(total)}</strong> stored</span>
        <span><strong>{unused.length}</strong> not in any entry</span>
      </div>

      <div className="activity-head">
        <h2 className="section-title">Photos</h2>
        <div className="segmented">
          <button className={view === 'all' ? 'active' : ''} onClick={() => setView('all')}>All</button>
          <button className={view === 'unused' ? 'active' : ''} onClick={() => setView('unused')}>Not in an entry</button>
        </div>
      </div>

      {shown.length === 0 ? (
        <div className="empty">
          {photos.length === 0 ? (
            <>No photos yet. Add some with <b>+ Photo</b> when you <Link href="/new/">write an entry</Link>.</>
          ) : (
            'Every photo is in an entry.'
          )}
        </div>
      ) : (
        <ul className="gallery">
          {shown.map((p) => {
            const inEntries = usedIn.get(p.path) || [];
            const first = inEntries[0];
            const img = <img src={signedUrl(p.path) || ''} alt={first ? first.title : p.name} loading="lazy" />;
            return (
              <li key={p.path} className={busy === p.path ? 'busy' : ''}>
                {first ? (
                  <Link href={`/entry/?id=${first.id}`} className="thumb">{img}</Link>
                ) : (
                  <a href={signedUrl(p.path) || '#'} target="_blank" rel="noreferrer" className="thumb">{img}</a>
                )}
                <div className="gallery-meta">
                  {first ? (
                    <>
                      <Link href={`/entry/?id=${first.id}`}>{first.title}</Link>
                      <span>{formatDay(first.day)}{inEntries.length > 1 ? ` · +${inEntries.length - 1} more` : ''}</span>
                    </>
                  ) : (
                    <>
                      <span className="unused">Not in an entry</span>
                      <span>{p.created ? formatDay(p.created.slice(0, 10)) : ''} · {size(p.size)}</span>
                    </>
                  )}
                </div>
                <button className="btn btn-sm btn-danger gallery-delete" onClick={() => remove(p)} disabled={busy === p.path}>
                  {busy === p.path ? 'Deleting…' : 'Delete'}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
