'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { markdownToHtml } from '../../lib/richtext';
import RichEditor from './RichEditor';
import { getWork, newTask, parseWork, saveWork, toWorkMarkdown } from '../../lib/work';

const md = (text) => ({ __html: markdownToHtml(text) });

function TaskForm({ task, onSave, onCancel, submitLabel }) {
  const [title, setTitle] = useState(task?.title || '');
  const [description, setDescription] = useState(task?.description || '');
  const submit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSave(title.trim(), description);
    if (!task) {
      setTitle('');
      setDescription('');
    }
  };
  return (
    <form className="task-form" onSubmit={submit}>
      <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Task" aria-label="Task" autoFocus={!!task} />
      <RichEditor className="task-desc" value={description} onChange={setDescription} placeholder="Description (optional)" label="Description" />
      <div className="buttons">
        {onCancel && <button type="button" className="btn btn-sm" onClick={onCancel}>Cancel</button>}
        <button className="btn btn-sm btn-primary" disabled={!title.trim()}>{submitLabel}</button>
      </div>
    </form>
  );
}

function TaskItem({ task, onToggle, onEdit, onDelete }) {
  const [editing, setEditing] = useState(false);
  if (editing) {
    return (
      <li className="task editing">
        <TaskForm
          task={task}
          submitLabel="Save"
          onCancel={() => setEditing(false)}
          onSave={(title, description) => {
            onEdit({ title, description });
            setEditing(false);
          }}
        />
      </li>
    );
  }
  return (
    <li className={`task${task.done ? ' done' : ''}`}>
      <input type="checkbox" checked={task.done} onChange={onToggle} aria-label={`Done: ${task.title}`} />
      <div className="task-main">
        <div className="task-title">{task.title}</div>
        {task.description && <div className="rich-text task-body" dangerouslySetInnerHTML={md(task.description)} />}
      </div>
      <div className="task-actions">
        <button className="btn btn-sm" onClick={() => setEditing(true)}>Edit</button>
        <button className="btn btn-sm btn-danger" onClick={() => confirm(`Delete "${task.title}"?`) && onDelete()}>Delete</button>
      </div>
    </li>
  );
}

// Tasks with descriptions plus general notes, stored together as work.md.
export default function WorkView() {
  const [work, setWork] = useState(null);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [mode, setMode] = useState('page');
  const saving = useRef(Promise.resolve());
  const notesTimer = useRef(null);
  const latest = useRef(null);

  useEffect(() => {
    getWork().then((body) => {
      latest.current = parseWork(body);
      setWork(latest.current);
    }, (e) => setError(e.message));
  }, []);

  const markdown = useMemo(() => (work ? toWorkMarkdown(work) : ''), [work]);

  // Saves run one after another so the last change always wins.
  const persist = (next) => {
    const body = toWorkMarkdown(next);
    setStatus('Saving…');
    saving.current = saving.current
      .then(() => saveWork(body))
      .then(
        () => setStatus('Saved'),
        (e) => setStatus(`Save failed: ${e.message}`)
      );
  };

  const update = (change, { debounce = false } = {}) => {
    const next = change(latest.current);
    latest.current = next;
    setWork(next);
    clearTimeout(notesTimer.current);
    if (debounce) {
      setStatus('Unsaved changes');
      notesTimer.current = setTimeout(() => persist(next), 800);
    } else persist(next);
  };

  // Don't lose notes typed just before leaving the page.
  useEffect(() => {
    const flush = (e) => {
      if (status === 'Unsaved changes') e.preventDefault();
    };
    window.addEventListener('beforeunload', flush);
    return () => window.removeEventListener('beforeunload', flush);
  }, [status]);

  if (error) return <p className="error">Could not load work: {error}</p>;
  if (!work) return <p className="notice">Loading work…</p>;

  const setTask = (id, change) => update((w) => ({ ...w, tasks: w.tasks.map((t) => (t.id === id ? { ...t, ...change } : t)) }));
  const removeTask = (id) => update((w) => ({ ...w, tasks: w.tasks.filter((t) => t.id !== id) }));
  const addTask = (title, description) => update((w) => ({ ...w, tasks: [...w.tasks, newTask(title, description)] }));

  const open = work.tasks.filter((t) => !t.done);
  const done = work.tasks.filter((t) => t.done);
  const item = (t) => (
    <TaskItem
      key={t.id}
      task={t}
      onToggle={() => setTask(t.id, { done: !t.done })}
      onEdit={(change) => setTask(t.id, change)}
      onDelete={() => removeTask(t.id)}
    />
  );

  const download = () => {
    const url = URL.createObjectURL(new Blob([markdown], { type: 'text/markdown;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'work.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="page work-page">
      <div className="stats-row">
        <span><strong>{open.length}</strong> open</span>
        <span><strong>{done.length}</strong> done</span>
        <span className="notice">{status}</span>
        <span className="stats-actions work-actions">
          <span className="segmented">
            <button className={mode === 'page' ? 'active' : ''} onClick={() => setMode('page')}>Tasks & notes</button>
            <button className={mode === 'code' ? 'active' : ''} onClick={() => setMode('code')}>Markdown</button>
          </span>
          <button className="btn btn-sm" onClick={download}>Download .md</button>
        </span>
      </div>

      {mode === 'code' ? (
        <div className="file-box">
          <pre className="raw">{markdown}</pre>
        </div>
      ) : (
        <div className="work-split">
          <section className="work-tasks">
            <h2 className="section-title">Tasks</h2>
            <TaskForm submitLabel="Add task" onSave={addTask} />
            {work.tasks.length === 0 ? (
              <div className="empty">No tasks yet. Add one above.</div>
            ) : (
              <>
                {open.length > 0 && <ul className="tasks">{open.map(item)}</ul>}
                {done.length > 0 && (
                  <>
                    <h3 className="task-group">Done</h3>
                    <ul className="tasks">{done.map(item)}</ul>
                  </>
                )}
              </>
            )}
          </section>

          <section className="work-notes">
            <h2 className="section-title">Notes</h2>
            <RichEditor
              className="notes-editor"
              value={work.notes}
              onChange={(notes) => update((w) => ({ ...w, notes }), { debounce: true })}
              placeholder="General work notes…"
              label="Notes"
            />
          </section>
        </div>
      )}
    </div>
  );
}
