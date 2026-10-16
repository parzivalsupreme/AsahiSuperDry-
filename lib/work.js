import { supabase } from './supabase';

// The Work page is one Markdown file per account:
//
//   # Work
//
//   ## Tasks
//
//   - [ ] Task title
//     Description, indented two spaces (any Markdown).
//   - [x] A finished task
//
//   ## Notes
//
//   General notes in Markdown.

const db = () => supabase.from('work');

let nextId = 0;
const taskId = () => `t${++nextId}`;

export const newTask = (title, description = '') => ({ id: taskId(), done: false, title, description });

// Markdown -> { tasks, notes }. Lines before "## Tasks" are ignored.
export function parseWork(markdown) {
  const lines = (markdown || '').replace(/\r\n?/g, '\n').split('\n');
  const tasksAt = lines.findIndex((l) => /^##\s+Tasks\s*$/i.test(l));
  const notesAt = lines.findIndex((l, i) => i > tasksAt && /^##\s+Notes\s*$/i.test(l));
  const tasks = [];
  if (tasksAt >= 0) {
    let task = null;
    for (const line of lines.slice(tasksAt + 1, notesAt < 0 ? undefined : notesAt)) {
      const m = line.match(/^[-*]\s+\[([ xX])\]\s?(.*)$/);
      if (m) {
        task = { id: taskId(), done: m[1] !== ' ', title: m[2].trim(), description: [] };
        tasks.push(task);
      } else if (task) {
        task.description.push(line.replace(/^ {1,2}/, ''));
      }
    }
  }
  for (const t of tasks) t.description = t.description.join('\n').trim();
  const notes = notesAt < 0 ? '' : lines.slice(notesAt + 1).join('\n').trim();
  return { tasks, notes };
}

// { tasks, notes } -> Markdown.
export function toWorkMarkdown({ tasks, notes }) {
  const out = ['# Work', '', '## Tasks', ''];
  for (const t of tasks) {
    out.push(`- [${t.done ? 'x' : ' '}] ${t.title.replace(/\s+/g, ' ').trim() || 'Untitled'}`);
    const desc = (t.description || '').trim();
    if (desc) out.push(...desc.split('\n').map((l) => (l ? `  ${l}` : '')));
  }
  if (tasks.length) out.push('');
  out.push('## Notes', '');
  if (notes.trim()) out.push(notes.trim(), '');
  return out.join('\n');
}

// Missing table (schema.sql not re-run yet) reads as an empty work file.
const missingTable = (error) => error?.code === '42P01' || error?.code === 'PGRST205';

export async function getWork() {
  const { data, error } = await db().select('body').maybeSingle();
  if (error && !missingTable(error)) throw error;
  return data?.body || '';
}

export async function saveWork(body) {
  const { data: auth } = await supabase.auth.getSession();
  const { error } = await db().upsert({ user_id: auth.session?.user.id, body }, { onConflict: 'user_id' });
  if (missingTable(error)) throw new Error('The work table is missing. Re-run supabase/schema.sql in Supabase.');
  if (error) throw error;
}
