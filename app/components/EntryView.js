'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { marked } from 'marked';
import { formatDay } from '../../lib/dates';
import { deleteEntry, getEntry, placeLine, slugify, toMarkdown } from '../../lib/entries';
import { photoPaths, usePhotoMarkdown } from '../../lib/photos';

export default function EntryView() {
  const id = useSearchParams().get('id');
  const router = useRouter();
  const [entry, setEntry] = useState(undefined);
  const [error, setError] = useState('');
  const [mode, setMode] = useState('preview');

  useEffect(() => {
    if (!id) return setEntry(null);
    getEntry(id).then(setEntry, (e) => setError(e.message));
  }, [id]);

  const body = usePhotoMarkdown(entry?.body);
  const html = useMemo(() => (body ? marked.parse(body) : ''), [body]);

  if (error) return <p className="error">{error}</p>;
  if (entry === undefined) return <p className="notice">Loading…</p>;
  if (!entry) return <p className="notice">Entry not found. <Link href="/">Back to entries</Link></p>;

  const markdown = toMarkdown(entry);
  const filename = `${entry.day}-${slugify(entry.title)}.md`;

  const download = () => {
    const url = URL.createObjectURL(new Blob([markdown], { type: 'text/markdown;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const remove = async () => {
    const photos = photoPaths(entry.body).length;
    const note = photos ? ` Its ${photos === 1 ? 'photo' : `${photos} photos`} will be deleted too.` : '';
    if (!confirm(`Delete "${entry.title}"?${note} This can't be undone.`)) return;
    try {
      await deleteEntry(entry);
      router.push('/');
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="page">
      <nav className="breadcrumb">
        <Link href="/">entries</Link>
        <span className="sep">/</span>
        <strong>{entry.title}</strong>
      </nav>

      <div className="file-box">
        <div className="file-header">
          <div className="segmented">
            <button className={mode === 'preview' ? 'active' : ''} onClick={() => setMode('preview')}>
              Preview
            </button>
            <button className={mode === 'code' ? 'active' : ''} onClick={() => setMode('code')}>
              Markdown
            </button>
          </div>
          <span>
            {formatDay(entry.day, { weekday: true })}
            {entry.time && ` · ${entry.time}`}
            {placeLine(entry) && ` · ${placeLine(entry)}`}
            {' · '}{entry.words.toLocaleString()} words
          </span>
          <div className="actions">
            <button className="btn btn-sm" onClick={download}>Download .md</button>
            <Link className="btn btn-sm" href={`/new/?id=${entry.id}`}>Edit</Link>
            <button className="btn btn-sm btn-danger" onClick={remove}>Delete</button>
          </div>
        </div>
        {mode === 'preview' ? (
          <div className="file-body">
            {entry.tags.length > 0 && (
              <div className="labels">
                {entry.tags.map((t) => (
                  <Link className="label" key={t} href={`/tags/?tag=${encodeURIComponent(t)}`}>{t}</Link>
                ))}
              </div>
            )}
            {entry.habits.length > 0 && (
              <p className="entry-habits">
                <Link href="/habits/">Habits</Link>: {entry.habits.map((h) => `✓ ${h}`).join('  ')}
              </p>
            )}
            <div className="markdown-body" dangerouslySetInnerHTML={{ __html: html }} />
          </div>
        ) : (
          <pre className="raw">{markdown}</pre>
        )}
      </div>
    </div>
  );
}
