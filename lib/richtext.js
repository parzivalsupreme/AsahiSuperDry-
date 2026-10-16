import { marked } from 'marked';

// The rich editor's text is kept as Markdown, one line per line on screen,
// like a notes app: blank lines and leading spaces stay exactly as typed.
//
//   # Title / ## Heading / ### Subheading / plain lines (Body)
//   - bullet   1. numbered   - [ ] checklist   - [x] done
//   Nested list items are indented two spaces per level.

const BLOCKS = new Set(['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'UL', 'OL', 'BLOCKQUOTE', 'PRE', 'HR', 'TABLE', 'LI']);

/* ---------- HTML -> Markdown ---------- */

// Escapes characters Markdown would otherwise read as formatting.
const escapeText = (text) => text.replace(/ /g, ' ').replace(/([\\`*_~[\]<])/g, '\\$1');

// Stops a line that starts like a heading, list or rule from becoming one.
const escapeLineStart = (line) => line.replace(/^(\s*)(#{1,6}\s|[-+*]\s|\d+[.)]\s|-{3,}\s*$)/, (m, sp, mark) => `${sp}\\${mark}`);

// Wraps text in a marker, keeping surrounding spaces outside it (Markdown needs that).
function wrap(text, mark) {
  const m = text.match(/^(\s*)([\s\S]*?)(\s*)$/);
  return m[2] ? `${m[1]}${mark}${m[2]}${mark}${m[3]}` : text;
}

function inline(node) {
  if (node.nodeType === 3) return escapeText(node.textContent.replace(/\n/g, ' '));
  if (node.nodeType !== 1) return '';
  const tag = node.tagName;
  if (tag === 'BR') return '\n';
  if (tag === 'INPUT') return '';
  if (tag === 'IMG') return node.getAttribute('src') ? `![${node.getAttribute('alt') || ''}](${node.getAttribute('src')})` : '';
  if (tag === 'CODE') return '`' + node.textContent + '`';
  if (BLOCKS.has(tag)) return '\n' + [...node.childNodes].map(inline).join('') + '\n';
  let text = [...node.childNodes].map(inline).join('');
  if (tag === 'A' && node.getAttribute('href')) return `[${text}](${node.getAttribute('href')})`;
  const style = node.style || {};
  const bold = tag === 'B' || tag === 'STRONG' || Number(style.fontWeight) >= 600 || style.fontWeight === 'bold';
  const italic = tag === 'I' || tag === 'EM' || style.fontStyle === 'italic';
  const strike = tag === 'S' || tag === 'DEL' || tag === 'STRIKE' || /line-through/.test(style.textDecoration || '');
  return text
    .split('\n')
    .map((part) => {
      if (italic) part = wrap(part, '*');
      if (bold) part = wrap(part, '**');
      if (strike) part = wrap(part, '~~');
      return part;
    })
    .join('\n');
}

// A block's inline content as lines; the <br> a browser keeps in an empty line isn't a line of its own.
const lines = (nodes) => nodes.map(inline).join('').replace(/\n$/, '').split('\n');

function listLines(node, depth, out) {
  const type = node.tagName === 'OL' ? 'ol' : node.classList.contains('checklist') ? 'check' : 'ul';
  let n = Number(node.getAttribute('start')) || 1;
  for (const li of node.children) {
    if (li.tagName === 'UL' || li.tagName === 'OL') {
      listLines(li, depth + 1, out); // a list nested straight in a list
      continue;
    }
    if (li.tagName !== 'LI') continue;
    const marker = type === 'ol' ? `${n++}. ` : type === 'check' ? `- [${li.dataset.checked === 'true' ? 'x' : ' '}] ` : '- ';
    const own = [];
    const nested = [];
    for (const c of li.childNodes) (c.nodeType === 1 && (c.tagName === 'UL' || c.tagName === 'OL') ? nested : own).push(c);
    const text = lines(own).map((l) => l.trim()).filter(Boolean).join(' ');
    out.push('  '.repeat(depth) + marker + text);
    for (const sub of nested) listLines(sub, depth + 1, out);
  }
}

function blockLines(root, out) {
  let loose = []; // inline nodes sitting directly in the root
  const flush = () => {
    if (loose.length) out.push(...lines(loose).map(escapeLineStart));
    loose = [];
  };
  for (const node of root.childNodes) {
    if (node.nodeType !== 1 || !BLOCKS.has(node.tagName)) {
      loose.push(node);
      continue;
    }
    flush();
    const tag = node.tagName;
    if (/^H[1-6]$/.test(tag)) {
      const text = lines([...node.childNodes]).join(' ').trim();
      out.push(text ? `${'#'.repeat(Math.min(3, Number(tag[1])))} ${text}` : '');
    } else if (tag === 'UL' || tag === 'OL') {
      listLines(node, 0, out);
    } else if (tag === 'HR') {
      out.push('---');
    } else if (tag === 'PRE') {
      out.push(...node.textContent.replace(/\n$/, '').split('\n').map((l) => escapeLineStart(escapeText(l))));
    } else if ([...node.children].some((c) => BLOCKS.has(c.tagName))) {
      blockLines(node, out); // a wrapper around other blocks
    } else {
      out.push(...lines([...node.childNodes]).map(escapeLineStart));
    }
  }
  flush();
}

export function htmlToMarkdown(root) {
  const out = [];
  blockLines(root, out);
  return out.join('\n').replace(/\s+$/, '');
}

/* ---------- Markdown -> HTML ---------- */

const LIST = /^(\s*)(?:([-*+])|(\d+)[.)])\s+(?:\[([ xX])\]\s+)?(.*)$/;

const inlineHtml = (text) => marked.parseInline(text);

function listHtml(items) {
  const tag = (t) => (t === 'ol' ? 'ol' : 'ul');
  const open = (it) =>
    it.type === 'ol'
      ? `<ol${it.start !== 1 ? ` start="${it.start}"` : ''}>`
      : it.type === 'check' ? '<ul class="checklist">' : '<ul>';
  const stack = [];
  let html = '';
  for (const it of items) {
    while (stack.length && it.indent < stack[stack.length - 1].indent) html += `</li></${tag(stack.pop().type)}>`;
    const top = stack[stack.length - 1];
    if (top && it.indent === top.indent && it.type !== top.type) html += `</li></${tag(stack.pop().type)}>`;
    const cur = stack[stack.length - 1];
    if (!cur || it.indent > cur.indent) {
      html += open(it);
      stack.push(it);
    } else html += '</li>';
    html += `<li${it.type === 'check' ? ` data-checked="${it.checked}"` : ''}>${inlineHtml(it.text) || '<br>'}`;
  }
  while (stack.length) html += `</li></${tag(stack.pop().type)}>`;
  return html;
}

// Line-for-line HTML for the editor and for showing saved text.
export function markdownToHtml(md) {
  const src = (md || '').replace(/\r\n?/g, '\n').split('\n');
  let html = '';
  for (let i = 0; i < src.length; ) {
    if (LIST.test(src[i])) {
      const items = [];
      for (let m; i < src.length && (m = src[i].match(LIST)); i++) {
        items.push({
          indent: m[1].replace(/\t/g, '  ').length,
          type: m[3] ? 'ol' : m[4] ? 'check' : 'ul',
          start: Number(m[3]) || 1,
          checked: m[4] ? m[4] !== ' ' : false,
          text: m[5],
        });
      }
      html += listHtml(items);
      continue;
    }
    const line = src[i++];
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) html += `<h${Math.min(3, h[1].length)}>${inlineHtml(h[2])}</h${Math.min(3, h[1].length)}>`;
    else if (/^-{3,}\s*$/.test(line)) html += '<hr>';
    else html += `<p>${line.trim() ? inlineHtml(line) : '<br>'}</p>`;
  }
  return html;
}
