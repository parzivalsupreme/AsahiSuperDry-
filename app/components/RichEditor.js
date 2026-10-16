'use client';

import { useEffect, useRef, useState } from 'react';
import { marked } from 'marked';
import { htmlToMarkdown } from '../../lib/richtext';

const SIZES = [
  ['P', 'Normal'],
  ['H3', 'Large'],
  ['H2', 'Larger'],
  ['H1', 'Largest'],
];

const run = (command, arg) => document.execCommand(command, false, arg);

// Write normally with a formatting toolbar; the value in and out is Markdown.
export default function RichEditor({ value, onChange, placeholder, className = '', label }) {
  const ref = useRef(null);
  const emitted = useRef(null);
  const range = useRef(null);
  const [empty, setEmpty] = useState(!value);
  const [state, setState] = useState({ block: 'P', bold: false, italic: false, ul: false, ol: false });

  // Load the Markdown, unless it's what this editor just produced.
  useEffect(() => {
    if (value === emitted.current) return;
    emitted.current = value;
    ref.current.innerHTML = value ? marked.parse(value) : '';
    setEmpty(!value);
  }, [value]);

  const emit = () => {
    const md = htmlToMarkdown(ref.current);
    setEmpty(!md && !ref.current.querySelector('li'));
    if (md === emitted.current) return;
    emitted.current = md;
    onChange(md);
  };

  // Keep the toolbar showing the formatting under the cursor.
  useEffect(() => {
    const onSelect = () => {
      const sel = document.getSelection();
      if (!sel.rangeCount || !ref.current?.contains(sel.anchorNode)) return;
      range.current = sel.getRangeAt(0).cloneRange();
      let el = sel.anchorNode.nodeType === 1 ? sel.anchorNode : sel.anchorNode.parentElement;
      let block = 'P';
      for (; el && el !== ref.current; el = el.parentElement) {
        if (/^H[1-6]$/.test(el.tagName)) {
          block = el.tagName > 'H3' ? 'H3' : el.tagName;
          break;
        }
      }
      setState({
        block,
        bold: block === 'P' && document.queryCommandState('bold'), // headings are bold already
        italic: document.queryCommandState('italic'),
        ul: document.queryCommandState('insertUnorderedList'),
        ol: document.queryCommandState('insertOrderedList'),
      });
    };
    document.addEventListener('selectionchange', onSelect);
    return () => document.removeEventListener('selectionchange', onSelect);
  }, []);

  // Put the cursor back where it was (the size menu takes focus away).
  const apply = (command, arg) => {
    ref.current.focus();
    if (range.current && ref.current.contains(range.current.startContainer)) {
      const sel = document.getSelection();
      sel.removeAllRanges();
      sel.addRange(range.current);
    }
    run('styleWithCSS', false);
    run(command, arg);
    emit();
    document.dispatchEvent(new Event('selectionchange'));
  };

  const onKeyDown = (e) => {
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.shiftKey && (e.key === '8' || e.key === '*')) {
      e.preventDefault();
      apply('insertUnorderedList');
    } else if (mod && e.shiftKey && (e.key === '7' || e.key === '&')) {
      e.preventDefault();
      apply('insertOrderedList');
    }
  };

  // Pasted text keeps bold, italics, headings and lists, and drops other styling.
  const onPaste = (e) => {
    const html = e.clipboardData.getData('text/html');
    const text = e.clipboardData.getData('text/plain');
    e.preventDefault();
    if (html) {
      const box = document.createElement('div');
      box.innerHTML = html;
      run('insertHTML', marked.parse(htmlToMarkdown(box)));
    } else run('insertText', text);
    emit();
  };

  // Toolbar buttons keep the selection in the text.
  const keep = (e) => e.preventDefault();

  return (
    <div className={`rich ${className}`}>
      <div className="rich-toolbar" role="toolbar" aria-label="Formatting">
        <select
          className="rich-size"
          value={state.block}
          onChange={(e) => apply('formatBlock', e.target.value)}
          aria-label="Text size"
          title="Text size"
        >
          {SIZES.map(([tag, name]) => (
            <option key={tag} value={tag}>{name}</option>
          ))}
        </select>
        <button type="button" className={state.bold ? 'active' : ''} onMouseDown={keep} onClick={() => apply('bold')} title="Bold (Ctrl+B)" aria-pressed={state.bold}>
          <b>B</b>
        </button>
        <button type="button" className={state.italic ? 'active' : ''} onMouseDown={keep} onClick={() => apply('italic')} title="Italic (Ctrl+I)" aria-pressed={state.italic}>
          <i>I</i>
        </button>
        <button type="button" className={state.ul ? 'active' : ''} onMouseDown={keep} onClick={() => apply('insertUnorderedList')} title="Bullet points (Ctrl+Shift+8)" aria-pressed={state.ul}>
          • List
        </button>
        <button type="button" className={state.ol ? 'active' : ''} onMouseDown={keep} onClick={() => apply('insertOrderedList')} title="Numbered list (Ctrl+Shift+7)" aria-pressed={state.ol}>
          1. List
        </button>
      </div>
      <div
        ref={ref}
        className={`rich-body markdown-body${empty ? ' is-empty' : ''}`}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label={label || placeholder}
        data-placeholder={placeholder}
        onFocus={() => run('defaultParagraphSeparator', 'p')}
        onInput={emit}
        onKeyDown={onKeyDown}
        onPaste={onPaste}
        spellCheck
      />
    </div>
  );
}
