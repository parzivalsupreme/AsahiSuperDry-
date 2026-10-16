// Turns the rich editor's HTML into Markdown, so you can write normally
// and still keep plain Markdown files.

const BLOCKS = new Set(['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'UL', 'OL', 'BLOCKQUOTE', 'PRE', 'HR', 'TABLE']);

// Escapes characters Markdown would otherwise read as formatting.
function escapeText(text) {
  return text.replace(/ /g, ' ').replace(/([\\`*_[\]<])/g, '\\$1');
}

// Stops a line that starts like a heading, list or quote from becoming one.
function escapeLineStart(line) {
  return line.replace(/^(\s*)(#{1,6}\s|>|[-+]\s|\d+[.)]\s)/, (m, sp, mark) => `${sp}\\${mark}`);
}

// Wraps text in a marker, keeping surrounding spaces outside it (Markdown needs that).
function wrap(text, mark) {
  const m = text.match(/^(\s*)([\s\S]*?)(\s*)$/);
  return m[2] ? `${m[1]}${mark}${m[2]}${mark}${m[3]}` : text;
}

function inline(node) {
  if (node.nodeType === 3) return escapeText(node.textContent);
  if (node.nodeType !== 1) return '';
  const tag = node.tagName;
  if (tag === 'BR') return '\\\n';
  if (tag === 'INPUT') return '';
  if (tag === 'IMG') return node.getAttribute('src') ? `![${node.getAttribute('alt') || ''}](${node.getAttribute('src')})` : '';
  if (tag === 'CODE') return '`' + node.textContent + '`';
  let text = [...node.childNodes].map(inline).join('');
  if (tag === 'A' && node.getAttribute('href')) return `[${text}](${node.getAttribute('href')})`;
  const style = node.style || {};
  const bold = tag === 'B' || tag === 'STRONG' || Number(style.fontWeight) >= 600 || style.fontWeight === 'bold';
  const italic = tag === 'I' || tag === 'EM' || style.fontStyle === 'italic';
  if (italic) text = wrap(text, '*');
  if (bold) text = wrap(text, '**');
  if (tag === 'S' || tag === 'DEL' || tag === 'STRIKE') text = wrap(text, '~~');
  return text;
}

const inlineLines = (nodes) =>
  nodes
    .map(inline)
    .join('')
    .replace(/\\\n$/, '')
    .split('\n')
    .map((l, i) => (i === 0 ? escapeLineStart(l.trim()) : l.trim()))
    .join('\n')
    .trim();

function list(node, depth) {
  const ordered = node.tagName === 'OL';
  let n = Number(node.getAttribute('start')) || 1;
  const lines = [];
  for (const li of node.children) {
    if (li.tagName !== 'LI') continue;
    const marker = ordered ? `${n++}. ` : '- ';
    const box = li.querySelector(':scope > input[type="checkbox"], :scope > p > input[type="checkbox"]');
    const check = box ? (box.checked ? '[x] ' : '[ ] ') : '';
    const own = [];
    const nested = [];
    for (const c of li.childNodes) {
      if (c.nodeType === 1 && (c.tagName === 'UL' || c.tagName === 'OL')) nested.push(c);
      else if (c.nodeType === 1 && BLOCKS.has(c.tagName)) own.push(...c.childNodes, document.createTextNode(' '));
      else own.push(c);
    }
    const pad = ' '.repeat(marker.length);
    const text = inlineLines(own).replace(/\n/g, `\n${pad}`);
    lines.push(`${marker}${check}${text}`);
    for (const sub of nested) lines.push(...list(sub, depth + 1).split('\n').map((l) => pad + l));
  }
  return lines.join('\n');
}

function blocks(root) {
  const out = [];
  let loose = []; // inline nodes sitting directly in the root
  const flush = () => {
    const text = inlineLines(loose);
    if (text) out.push(text);
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
      const text = inlineLines([...node.childNodes]).replace(/\\?\n/g, ' ');
      if (text) out.push(`${'#'.repeat(Number(tag[1]))} ${text}`);
    } else if (tag === 'UL' || tag === 'OL') {
      const text = list(node, 0);
      if (text) out.push(text);
    } else if (tag === 'BLOCKQUOTE') {
      const text = blocks(node);
      if (text) out.push(text.split('\n').map((l) => (l ? `> ${l}` : '>')).join('\n'));
    } else if (tag === 'PRE') {
      out.push('```\n' + node.textContent.replace(/\n$/, '') + '\n```');
    } else if (tag === 'HR') {
      out.push('---');
    } else if ([...node.children].some((c) => BLOCKS.has(c.tagName))) {
      const text = blocks(node); // a wrapper div around other blocks
      if (text) out.push(text);
    } else {
      const text = inlineLines([...node.childNodes]);
      if (text) out.push(text);
    }
  }
  flush();
  return out.join('\n\n');
}

export function htmlToMarkdown(root) {
  return blocks(root).trim();
}
