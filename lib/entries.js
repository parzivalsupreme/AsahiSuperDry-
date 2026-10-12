import { supabase as client } from './supabase';

const COLUMNS = 'id, title, day, time, tags, mood, body, created_at, updated_at';

function db() {
  if (!client) {
    throw new Error('Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, then rebuild.');
  }
  return client.from('entries');
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
  const query = id
    ? db().update(fields).eq('id', id)
    : db().insert(fields);
  const { data, error } = await query.select('id').single();
  if (error) throw error;
  return data.id;
}

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
  if (entry.tags?.length) lines.push(`tags: [${entry.tags.map(q).join(', ')}]`);
  if (entry.mood) lines.push(`mood: ${q(entry.mood)}`);
  lines.push('---', '', (entry.body || '').trim(), '');
  return lines.join('\n');
}
