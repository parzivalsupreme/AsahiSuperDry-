'use client';

import { useEffect, useRef, useState } from 'react';
import { htmlToMarkdown, markdownToHtml } from '../../lib/richtext';

// Text styles, as in the Notes app.
const STYLES = [
  ['H1', 'Title'],
  ['H2', 'Heading'],
  ['H3', 'Subheading'],
  ['P', 'Body'],
];

const run = (command, arg) => document.execCommand(command, false, arg);
const listKind = (list) => (!list ? null : list.tagName === 'OL' ? 'ol' : list.classList.contains('checklist') ? 'check' : 'ul');

// Write like a notes app with a formatting toolbar; the value in and out is Markdown.
export default function RichEditor({ value, onChange, placeholder, className = '', label }) {
  const ref = useRef(null);
  const emitted = useRef(null);
  const range = useRef(null);
  const [empty, setEmpty] = useState(!value);
  const [state, setState] = useState({ block: 'P', bold: false, italic: false, strike: false, list: null });

  // Load the Markdown, unless it's what this editor just produced.
  useEffect(() => {
    if (value === emitted.current) return;
    emitted.current = value;
    ref.current.innerHTML = value ? markdownToHtml(value) : '';
    setEmpty(!value);
  }, [value]);

  const emit = () => {
    const md = htmlToMarkdown(ref.current);
    setEmpty(!md && !ref.current.querySelector('li, h1, h2, h3') && ref.current.querySelectorAll('p').length < 2);
    if (md === emitted.current) return;
    emitted.current = md;
    onChange(md);
  };

  // The element the cursor is in, and the list around it.
  const caret = () => {
    const sel = document.getSelection();
    if (!sel.rangeCount || !ref.current?.contains(sel.anchorNode)) return null;
    const el = sel.anchorNode.nodeType === 1 ? sel.anchorNode : sel.anchorNode.parentElement;
    const li = el.closest('li');
    return { sel, el, li, list: li?.parentElement };
  };

  // Keep the toolbar showing the formatting under the cursor.
  useEffect(() => {
    const onSelect = () => {
      const at = caret();
      if (!at) return;
      range.current = at.sel.getRangeAt(0).cloneRange();
      const h = at.el.closest('h1, h2, h3, h4, h5, h6');
      const block = h && ref.current.contains(h) ? (h.tagName > 'H3' ? 'H3' : h.tagName) : 'P';
      const list = listKind(at.list);
      setState({
        block,
        bold: block === 'P' && document.queryCommandState('bold'), // titles and headings are bold already
        italic: document.queryCommandState('italic'),
        strike: document.queryCommandState('strikeThrough'),
        list,
      });
    };
    document.addEventListener('selectionchange', onSelect);
    return () => document.removeEventListener('selectionchange', onSelect);
  }, []);

  const refresh = () => {
    emit();
    document.dispatchEvent(new Event('selectionchange'));
  };

  // Put the cursor back where it was (the style menu takes focus away).
  const restore = () => {
    ref.current.focus();
    if (range.current && ref.current.contains(range.current.startContainer)) {
      const sel = document.getSelection();
      sel.removeAllRanges();
      sel.addRange(range.current);
    }
    run('styleWithCSS', false);
  };

  const apply = (command, arg) => {
    restore();
    run(command, arg);
    refresh();
  };

  // Bullets, numbers and checklists; choosing the current kind again turns the list off.
  const setList = (kind) => {
    restore();
    const at = caret();
    const current = listKind(at?.list);
    if (current === kind) {
      run(kind === 'ol' ? 'insertOrderedList' : 'insertUnorderedList');
    } else if (current && current !== 'ol' && kind !== 'ol') {
      at.list.classList.toggle('checklist', kind === 'check'); // bullets <-> checklist
    } else {
      run(kind === 'ol' ? 'insertOrderedList' : 'insertUnorderedList');
      const list = caret()?.li?.parentElement;
      if (list && kind === 'check') list.classList.add('checklist');
      if (list && kind === 'ul') list.classList.remove('checklist');
    }
    refresh();
  };

  const onKeyDown = (e) => {
    const mod = e.ctrlKey || e.metaKey;
    const at = caret();
    if (mod && e.shiftKey && (e.key === '8' || e.key === '*')) {
      e.preventDefault();
      setList('ul');
    } else if (mod && e.shiftKey && (e.key === '7' || e.key === '&')) {
      e.preventDefault();
      setList('ol');
    } else if (mod && e.shiftKey && e.key.toLowerCase() === 'l') {
      e.preventDefault();
      setList('check');
    } else if (e.key === 'Tab' && at?.li) {
      // Indent or outdent list items.
      e.preventDefault();
      const checklist = at.list.classList.contains('checklist');
      run(e.shiftKey ? 'outdent' : 'indent');
      const list = caret()?.li?.parentElement;
      if (list && checklist) list.classList.add('checklist');
      refresh();
    } else if (e.key === ' ' && !mod && at && !at.li) {
      // "- " or "* " starts bullets, "1. " starts a numbered list, "[] " a checklist.
      const block = at.el.closest('p, div, h1, h2, h3') || ref.current;
      const before = document.createRange();
      before.setStart(block, 0);
      before.setEnd(at.sel.anchorNode, at.sel.anchorOffset);
      const typed = before.toString();
      const kind = /^[-*•]$/.test(typed) ? 'ul' : /^1[.)]$/.test(typed) ? 'ol' : /^\[\]$/.test(typed) ? 'check' : null;
      if (!kind) return;
      e.preventDefault();
      at.sel.removeAllRanges();
      at.sel.addRange(before);
      run('delete');
      range.current = document.getSelection().getRangeAt(0).cloneRange();
      setList(kind);
    } else if (e.key === 'Enter' && at?.list?.classList.contains('checklist')) {
      // A new checklist item starts unticked.
      setTimeout(() => {
        const li = caret()?.li;
        if (li && li.parentElement.classList.contains('checklist')) li.dataset.checked = 'false';
        emit();
      });
    }
  };

  // Clicking a checklist circle ticks it.
  const onMouseDown = (e) => {
    const li = e.target.closest?.('li');
    if (!li || !li.parentElement.classList.contains('checklist')) return;
    if (e.clientX > li.getBoundingClientRect().left) return;
    e.preventDefault();
    li.dataset.checked = li.dataset.checked === 'true' ? 'false' : 'true';
    emit();
  };

  // Pasted text keeps its styles, lists and line breaks, and drops other formatting.
  const onPaste = (e) => {
    const html = e.clipboardData.getData('text/html');
    const text = e.clipboardData.getData('text/plain');
    e.preventDefault();
    if (html) {
      const box = document.createElement('div');
      box.innerHTML = html;
      run('insertHTML', markdownToHtml(htmlToMarkdown(box)));
    } else run('insertText', text);
    emit();
  };

  // Toolbar buttons keep the selection in the text.
  const keep = (e) => e.preventDefault();
  const button = (active, onClick, title, children) => (
    <button type="button" className={active ? 'active' : ''} onMouseDown={keep} onClick={onClick} title={title} aria-pressed={active}>
      {children}
    </button>
  );

  return (
    <div className={`rich ${className}`}>
      <div className="rich-toolbar" role="toolbar" aria-label="Formatting">
        <select className="rich-size" value={state.block} onChange={(e) => apply('formatBlock', e.target.value)} aria-label="Text style" title="Text style">
          {STYLES.map(([tag, name]) => (
            <option key={tag} value={tag}>{name}</option>
          ))}
        </select>
        {button(state.bold, () => apply('bold'), 'Bold (Ctrl+B)', <b>B</b>)}
        {button(state.italic, () => apply('italic'), 'Italic (Ctrl+I)', <i>I</i>)}
        {button(state.strike, () => apply('strikeThrough'), 'Strikethrough', <s>S</s>)}
        {button(state.list === 'ul', () => setList('ul'), 'Bulleted list (Ctrl+Shift+8, or type "- ")', '• List')}
        {button(state.list === 'ol', () => setList('ol'), 'Numbered list (Ctrl+Shift+7, or type "1. ")', '1. List')}
        {button(state.list === 'check', () => setList('check'), 'Checklist (Ctrl+Shift+L, or type "[] ")', '◯ Checklist')}
      </div>
      <div
        ref={ref}
        className={`rich-body${empty ? ' is-empty' : ''}`}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label={label || placeholder}
        data-placeholder={placeholder}
        onFocus={() => run('defaultParagraphSeparator', 'p')}
        onInput={emit}
        onKeyDown={onKeyDown}
        onMouseDown={onMouseDown}
        onPaste={onPaste}
        spellCheck
      />
    </div>
  );
}
