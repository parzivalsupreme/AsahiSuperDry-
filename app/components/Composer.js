'use client';

import { useEffect, useMemo, useState } from 'react';
import { marked } from 'marked';
import { dayKey } from '../../lib/dates';

const DRAFT_KEY = 'journal-draft';
const TEMPLATE = `## Today

What happened?

## Grateful for

- 

## Tomorrow

- [ ] 
`;

function slugify(text) {
  return (
    text
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'entry'
  );
}

// Double-quoted YAML strings accept JSON escaping.
const yamlString = (s) => JSON.stringify(s);

function buildMarkdown({ title, date, time, tags, mood, body }) {
  const tagList = tags
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
  const lines = ['---', `title: ${yamlString(title || 'Untitled')}`, `date: ${date}`];
  if (time) lines.push(`time: ${yamlString(time)}`);
  if (tagList.length) lines.push(`tags: [${tagList.map(yamlString).join(', ')}]`);
  if (mood) lines.push(`mood: ${yamlString(mood)}`);
  lines.push('---', '', body.trim(), '');
  return lines.join('\n');
}

export default function Composer({ config }) {
  const [form, setForm] = useState({ title: '', date: '', time: '', tags: '', mood: '', body: TEMPLATE });
  const [tab, setTab] = useState('write');
  const [status, setStatus] = useState('');
  const [loaded, setLoaded] = useState(false);

  // Fill in today's date/time and restore any saved draft (browser only).
  useEffect(() => {
    const now = new Date();
    const defaults = {
      date: dayKey(now),
      time: now.toTimeString().slice(0, 5),
    };
    let draft = null;
    try {
      draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
    } catch {}
    setForm((f) => ({ ...f, ...defaults, ...(draft || {}) }));
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
    } catch {}
  }, [form, loaded]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const filename = `${form.date || 'YYYY-MM-DD'}-${slugify(form.title)}.md`;
  const markdown = useMemo(() => buildMarkdown(form), [form]);
  const previewHtml = useMemo(
    () => (tab === 'preview' ? marked.parse(form.body || '*Nothing to preview*') : ''),
    [tab, form.body]
  );

  const flash = (msg) => {
    setStatus(msg);
    setTimeout(() => setStatus(''), 2500);
  };

  const download = () => {
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    flash(`Downloaded ${filename} — drop it into /${config.entriesDir} and rebuild.`);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      flash('Markdown copied to clipboard.');
    } catch {
      flash('Could not copy — try Download instead.');
    }
  };

  const commitUrl = config.repo
    ? `https://github.com/${config.repo}/new/${config.branch}/${config.entriesDir}?filename=${encodeURIComponent(
        filename
      )}&value=${encodeURIComponent(markdown)}`
    : null;

  const clear = () => {
    if (!confirm('Discard this draft?')) return;
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {}
    const now = new Date();
    setForm({ title: '', date: dayKey(now), time: now.toTimeString().slice(0, 5), tags: '', mood: '', body: TEMPLATE });
  };

  return (
    <div style={{ maxWidth: 1012, margin: '0 auto' }}>
      <nav className="breadcrumb">
        <span>{config.username}</span>
        <span className="sep">/</span>
        <span>{config.entriesDir}</span>
        <span className="sep">/</span>
        <strong className="mono" style={{ fontSize: 16 }}>{filename}</strong>
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
      <div className="form-grid form-grid-3">
        <div className="field">
          <label htmlFor="tags">Tags</label>
          <input id="tags" className="input" value={form.tags} onChange={set('tags')} placeholder="life, work, ideas" />
          <div className="hint">Comma separated.</div>
        </div>
        <div className="field">
          <label htmlFor="mood">Mood</label>
          <input id="mood" className="input" value={form.mood} onChange={set('mood')} placeholder="😊 good" />
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
          <button className={tab === 'file' ? 'active' : ''} onClick={() => setTab('file')}>.md file</button>
        </div>
        {tab === 'write' && (
          <textarea className="editor" value={form.body} onChange={set('body')} placeholder="Write in Markdown…" spellCheck />
        )}
        {tab === 'preview' && (
          <div className="preview markdown-body" dangerouslySetInnerHTML={{ __html: previewHtml }} />
        )}
        {tab === 'file' && <pre className="raw">{markdown}</pre>}
      </div>

      <div className="editor-footer">
        <span className="notice">
          {status || 'Draft autosaves in this browser. Markdown is supported.'}
        </span>
        <div className="buttons">
          <button className="btn" onClick={clear}>Discard</button>
          <button className="btn" onClick={copy}>Copy</button>
          <button className="btn" onClick={download}>Download .md</button>
          {commitUrl && (
            <a className="btn btn-primary" href={commitUrl} target="_blank" rel="noreferrer">
              Commit to GitHub
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
