import { strToU8, zipSync } from 'fflate';
import { slugify, toMarkdown } from './entries';
import { downloadPhoto, photoPaths } from './photos';
import { getWork } from './work';

// Every entry as a Markdown file, plus its photos, in one .zip.
export async function exportAll(entries) {
  const files = {};
  const used = new Set();
  const photos = new Map(); // storage path -> file name in the zip

  for (const e of entries) {
    for (const path of photoPaths(e.body)) photos.set(path, path.split('/').pop());
  }
  for (const [path, name] of photos) {
    try {
      files[`journal/photos/${name}`] = new Uint8Array(await (await downloadPhoto(path)).arrayBuffer());
    } catch {
      photos.delete(path); // leave the reference as is if the photo is gone
    }
  }

  for (const e of entries) {
    const base = `${e.day}-${slugify(e.title)}`;
    let name = `${base}.md`;
    for (let n = 2; used.has(name); n++) name = `${base}-${n}.md`;
    used.add(name);
    const body = e.body.replace(/storage:([\w-]+\/[\w.-]+)/g, (ref, path) =>
      photos.has(path) ? `photos/${photos.get(path)}` : ref
    );
    files[`journal/${name}`] = strToU8(toMarkdown({ ...e, body }));
  }

  const work = await getWork().catch(() => '');
  if (work) files['journal/work.md'] = strToU8(work);

  return new Blob([zipSync(files, { level: 6 })], { type: 'application/zip' });
}
