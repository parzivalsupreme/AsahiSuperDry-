'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { marked } from 'marked';
import { dayKey } from '../../lib/dates';
import { getEntry, saveEntry } from '../../lib/entries';
import { uploadPhoto, usePhotoMarkdown } from '../../lib/photos';

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
  const [uploading, setUploading] = useState(0);
  const editorRef = useRef(null);
  const fileRef = useRef(null);
  const saveRef = useRef(null);

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

  const previewBody = usePhotoMarkdown(tab === 'preview' && form ? form.body : '');
  const previewHtml = useMemo(
    () => (tab === 'preview' ? marked.parse(previewBody || '*Nothing to preview*') : ''),
    [tab, previewBody]
  );

  // Ctrl/Cmd+S saves from anywhere on the page.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveRef.current?.();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (error && !form) return <p className="error">{error}</p>;
  if (!form) return <p className="notice">Loading…</p>;

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  // Uploads images and drops their Markdown in at the cursor.
  const addPhotos = async (files) => {
    const images = [...files].filter((f) => f.type.startsWith('image/'));
    if (!images.length) return;
    const el = editorRef.current;
    const at = el ? el.selectionStart : form.body.length;
    setUploading((n) => n + images.length);
    setError('');
    try {
      const snippets = await Promise.all(images.map(uploadPhoto));
      const text = `\n${snippets.join('\n')}\n`;
      setForm((f) => ({ ...f, body: f.body.slice(0, at) + text + f.body.slice(at) }));
      setTab('write');
    } catch (e) {
      setError(`Photo upload failed: ${e.message}`);
    } finally {
      setUploading((n) => n - images.length);
    }
  };

  const onPaste = (e) => {
    const files = [...e.clipboardData.files];
    if (files.some((f) => f.type.startsWith('image/'))) {
      e.preventDefault();
      addPhotos(files);
    }
  };

  const onDrop = (e) => {
    if (!e.dataTransfer.files.length) return;
    e.preventDefault();
    addPhotos(e.dataTransfer.files);
  };

  const save = async () => {
    if (saving) return;
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

  saveRef.current = save;

  const discard = () => {
    if (!confirm(id ? 'Discard your changes?' : 'Discard this draft?')) return;
    if (id) return router.push(`/entry/?id=${id}`);
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {}
    setForm(blankForm());
  };

  return (
    <div className="page">
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
          <button className="tab-action" onClick={() => fileRef.current?.click()} disabled={uploading > 0}>
            {uploading ? 'Uploading…' : '+ Photo'}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => {
              addPhotos(e.target.files);
              e.target.value = '';
            }}
          />
        </div>
        {tab === 'write' ? (
          <textarea
            ref={editorRef}
            className="editor"
            value={form.body}
            onChange={set('body')}
            onPaste={onPaste}
            onDrop={onDrop}
            onDragOver={(e) => e.preventDefault()}
            placeholder="Write in Markdown… (paste or drop photos here)"
            spellCheck
          />
        ) : (
          <div className="preview markdown-body" dangerouslySetInnerHTML={{ __html: previewHtml }} />
        )}
      </div>

      <div className="editor-footer">
        <span className={error ? 'error' : 'notice'}>
          {error || (id ? 'Editing a saved entry. Ctrl+S to save.' : 'Draft autosaves in this browser until you save. Ctrl+S to save.')}
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
