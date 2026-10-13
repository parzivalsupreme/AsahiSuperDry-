import { supabase } from './supabase';

// '*' so the app keeps working before the optional place/weather columns are added.
const COLUMNS = '*';

const db = () => supabase.from('entries');

function countWords(text) {
  const words = text.replace(/[#>*_`~\-\[\]()!|]/g, ' ').match(/\S+/g);
  return words ? words.length : 0;
}

function excerpt(text, length = 180) {
  const plain = text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^#+\s+.*$/gm, ' ')
    .replace(/[*_`>~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return plain.length > length ? plain.slice(0, length).trimEnd() + '…' : plain;
}

function withStats(row) {
  const body = row.body || '';
  return { ...row, body, tags: row.tags || [], words: countWords(body), excerpt: excerpt(body) };
}

export async function listEntries() {
  const { data, error } = await db()
    .select(COLUMNS)
    .order('day', { ascending: false })
    .order('time', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data.map(withStats);
}

export async function getEntry(id) {
  const { data, error } = await db().select(COLUMNS).eq('id', id).maybeSingle();
  if (error) throw error;
  return data && withStats(data);
}

// Inserts when id is empty, otherwise updates. Returns the entry id.
export async function saveEntry(id, fields) {
  const run = (f) => (id ? db().update(f).eq('id', id) : db().insert(f)).select('id').single();
  let { data, error } = await run(fields);
  // PGRST204: a column is missing because schema.sql hasn't been re-run yet; save without place/weather.
  if (error?.code === 'PGRST204') {
    const { place, weather, ...rest } = fields;
    ({ data, error } = await run(rest));
  }
  if (error) throw error;
  return data.id;
}

// "Tokyo, Japan · 18°C Rain", or '' when nothing was stamped.
export const placeLine = (e) => [e.place, e.weather].filter(Boolean).join(' · ');

export async function deleteEntry(id) {
  const { error } = await db().delete().eq('id', id);
  if (error) throw error;
}

export function slugify(text) {
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

// The entry as a standalone Markdown file with frontmatter.
export function toMarkdown(entry) {
  const q = (s) => JSON.stringify(s); // double-quoted YAML accepts JSON escaping
  const lines = ['---', `title: ${q(entry.title || 'Untitled')}`, `date: ${entry.day}`];
  if (entry.time) lines.push(`time: ${q(entry.time)}`);
  if (entry.place) lines.push(`place: ${q(entry.place)}`);
  if (entry.weather) lines.push(`weather: ${q(entry.weather)}`);
  if (entry.tags?.length) lines.push(`tags: [${entry.tags.map(q).join(', ')}]`);
  lines.push('---', '', (entry.body || '').trim(), '');
  return lines.join('\n');
}

// A random entry's id, avoiding the one being read when there's a choice.
export async function randomEntryId(excludeId) {
  const { data, error } = await db().select('id');
  if (error) throw error;
  const ids = data.map((r) => r.id);
  const pool = ids.length > 1 ? ids.filter((id) => id !== excludeId) : ids;
  return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
}
