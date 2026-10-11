import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { marked } from 'marked';
import config from '../journal.config.js';

const ENTRIES_DIR = path.join(process.cwd(), config.entriesDir);

function pad(n) {
  return String(n).padStart(2, '0');
}

// Normalize a frontmatter date (gray-matter may give a Date or a string) to YYYY-MM-DD.
function toDay(value) {
  if (!value) return null;
  if (value instanceof Date && !isNaN(value)) {
    return `${value.getUTCFullYear()}-${pad(value.getUTCMonth() + 1)}-${pad(value.getUTCDate())}`;
  }
  const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

function toTags(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  return String(value)
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}

function countWords(text) {
  const words = text.replace(/[#>*_`~\-\[\]()!|]/g, ' ').match(/\S+/g);
  return words ? words.length : 0;
}

function excerpt(text, length = 180) {
  const plain = text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^#+\s+/gm, '')
    .replace(/[*_`>~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return plain.length > length ? plain.slice(0, length).trimEnd() + '…' : plain;
}

function readEntry(file) {
  const slug = file.replace(/\.md$/, '');
  const raw = fs.readFileSync(path.join(ENTRIES_DIR, file), 'utf8');
  const { data, content } = matter(raw);
  const stat = fs.statSync(path.join(ENTRIES_DIR, file));
  const fallbackDay = `${stat.mtime.getFullYear()}-${pad(stat.mtime.getMonth() + 1)}-${pad(stat.mtime.getDate())}`;
  const day = toDay(data.date) || toDay(slug) || fallbackDay;
  const titleFromHeading = content.match(/^#\s+(.+)$/m)?.[1];
  return {
    slug,
    file,
    day,
    time: typeof data.time === 'string' ? data.time : null,
    title: data.title ? String(data.title) : titleFromHeading || slug,
    tags: toTags(data.tags),
    mood: data.mood ? String(data.mood) : null,
    words: countWords(content),
    lines: raw.split('\n').length,
    excerpt: excerpt(content),
    raw,
    content,
  };
}

function sortEntries(a, b) {
  return (
    b.day.localeCompare(a.day) ||
    (b.time || '').localeCompare(a.time || '') ||
    b.slug.localeCompare(a.slug)
  );
}

export function getAllEntries() {
  if (!fs.existsSync(ENTRIES_DIR)) return [];
  return fs
    .readdirSync(ENTRIES_DIR)
    .filter((f) => f.endsWith('.md') && !f.startsWith('.') && f.toLowerCase() !== 'readme.md')
    .map(readEntry)
    .sort(sortEntries);
}

// Lightweight list for client components (no full content).
export function getEntrySummaries() {
  return getAllEntries().map(({ raw, content, ...rest }) => rest);
}

export function getEntry(slug) {
  const entries = getAllEntries();
  const index = entries.findIndex((e) => e.slug === slug);
  if (index === -1) return null;
  const entry = entries[index];
  return {
    ...entry,
    html: marked.parse(entry.content),
    newer: entries[index - 1] ? { slug: entries[index - 1].slug, title: entries[index - 1].title } : null,
    older: entries[index + 1] ? { slug: entries[index + 1].slug, title: entries[index + 1].title } : null,
  };
}
