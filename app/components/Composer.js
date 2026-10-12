'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { marked } from 'marked';
import { dayKey } from '../../lib/dates';
import { getEntry, saveEntry } from '../../lib/entries';

const DRAFT_KEY = 'journal-draft';
const TEMPLATE = `## Today

What happened?

## Grateful for

- 

## Tomorrow

- [ ] 
`;

function blankForm() {
  const now = new Date();
  return { title: '', date: dayKey(now), time: now.toTimeString().slice(0, 5), tags: '', body: TEMPLATE };
}

export default function Composer() {
  const id = useSearchParams().get('id');
  const router = useRouter();
  const [form, setForm] = useState(null);
  const [tab, setTab] = useState('write');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Load the entry being edited, or a saved draft / blank form for a new one.
  useEffect(() => {
    if (id) {
      getEntry(id).then(
        (e) =>
          e
            ? setForm({ title: e.title, date: e.day, time: e.time || '', tags: e.tags.join(', '), body: e.body })
            : setError('Entry not found.'),
        (e) => setError(e.message)
      );
      return;
    }
    let draft = null;
    try {
      draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
    } catch {}
    setForm({ ...blankForm(), ...(draft || {}) });
  }, [id]);

  // Autosave drafts of new entries in this browser.
  useEffect(() => {
    if (!form || id) return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
    } catch {}
  }, [form, id]);

  const previewHtml = useMemo(
    () => (tab === 'preview' && form ? marked.parse(form.body || '*Nothing to preview*') : ''),
    [tab, form]
  );

  if (error && !form) return <p className="error">{error}</p>;
  if (!form) return <p className="notice">Loading…</p>;

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const savedId = await saveEntry(id, {
        title: form.title.trim() || 'Untitled',
        day: form.date || dayKey(new Date()),
        time: form.time || null,
        tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
        body: form.body,
      });
      if (!id) {
        try {
          localStorage.removeItem(DRAFT_KEY);
        } catch {}
      }
      router.push(`/entry/?id=${savedId}`);
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  };

  const discard = () => {
    if (!confirm(id ? 'Discard your changes?' : 'Discard this draft?')) return;
    if (id) return router.push(`/entry/?id=${id}`);
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {}
    setForm(blankForm());
  };

  return (
    <div style={{ maxWidth: 1012, margin: '0 auto' }}>
      <nav className="breadcrumb">
        <Link href="/">entries</Link>
        <span className="sep">/</span>
        <strong>{id ? 'edit' : 'new'}</strong>
      </nav>

      <div className="form-grid">
        <div className="field">
          <label htmlFor="title">Title</label>
          <input id="title" className="input input-title" value={form.title} onChange={set('title')} placeholder="What's on your mind?" autoFocus />
        </div>
        <div className="field">
          <label htmlFor="date">Date</label>
          <input id="date" type="date" className="input input-title" value={form.date} onChange={set('date')} />
        </div>
      </div>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="tags">Tags</label>
          <input id="tags" className="input" value={form.tags} onChange={set('tags')} placeholder="life, work, ideas" />
          <div className="hint">Comma separated.</div>
        </div>
        <div className="field">
          <label htmlFor="time">Time</label>
          <input id="time" type="time" className="input" value={form.time} onChange={set('time')} />
        </div>
      </div>

      <div className="file-box">
        <div className="tabnav">
          <button className={tab === 'write' ? 'active' : ''} onClick={() => setTab('write')}>Write</button>
          <button className={tab === 'preview' ? 'active' : ''} onClick={() => setTab('preview')}>Preview</button>
        </div>
        {tab === 'write' ? (
          <textarea className="editor" value={form.body} onChange={set('body')} placeholder="Write in Markdown…" spellCheck />
        ) : (
          <div className="preview markdown-body" dangerouslySetInnerHTML={{ __html: previewHtml }} />
        )}
      </div>

      <div className="editor-footer">
        <span className={error ? 'error' : 'notice'}>
          {error || (id ? 'Editing a saved entry.' : 'Draft autosaves in this browser until you save.')}
        </span>
        <div className="buttons">
          <button className="btn" onClick={discard}>Discard</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save entry'}
          </button>
        </div>
      </div>
    </div>
  );
}
