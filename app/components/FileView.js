'use client';

import { useState } from 'react';
import { formatDay } from '../../lib/dates';

export default function FileView({ entry, editUrl }) {
  const [mode, setMode] = useState('preview');
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(entry.raw);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  return (
    <div className="file-box">
      <div className="file-header">
        <div className="segmented">
          <button className={mode === 'preview' ? 'active' : ''} onClick={() => setMode('preview')}>
            Preview
          </button>
          <button className={mode === 'code' ? 'active' : ''} onClick={() => setMode('code')}>
            Code
          </button>
        </div>
        <span>
          {formatDay(entry.day, { weekday: true })}
          {entry.time && ` · ${entry.time}`} · {entry.lines} lines · {entry.words.toLocaleString()} words
        </span>
        <div className="actions">
          <button className="btn btn-sm" onClick={copy}>
            {copied ? 'Copied!' : 'Copy raw'}
          </button>
          {editUrl && (
            <a className="btn btn-sm" href={editUrl} target="_blank" rel="noreferrer">
              Edit on GitHub
            </a>
          )}
        </div>
      </div>
      {mode === 'preview' ? (
        <div className="file-body">
          {entry.tags.length > 0 && (
            <div className="labels" style={{ margin: '0 0 16px' }}>
              {entry.tags.map((t) => (
                <span className="label" key={t}>{t}</span>
              ))}
            </div>
          )}
          <div className="markdown-body" dangerouslySetInnerHTML={{ __html: entry.html }} />
        </div>
      ) : (
        <pre className="raw">{entry.raw}</pre>
      )}
    </div>
  );
}
