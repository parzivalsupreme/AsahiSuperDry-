'use client';

import { useEffect, useState } from 'react';
import { supabase } from './supabase';

// Photos live in a private Storage bucket. Entries reference them as
// ![caption](storage:<user id>/<file>) and get short-lived signed URLs when shown.
const BUCKET = 'photos';
const PREFIX = 'storage:';
const REF = /storage:([\w-]+\/[\w.-]+)/g;
const MAX_SIDE = 2000;

const signed = new Map(); // path -> { url, expires }

export function photoPaths(markdown) {
  return [...new Set([...(markdown || '').matchAll(REF)].map((m) => m[1]))];
}

// Shrink big camera photos before upload; keeps GIFs and small images as they are.
async function shrink(file) {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return file;
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size < 1.5e6) return file;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
  return blob || file;
}

// Uploads an image and returns the Markdown that embeds it.
export async function uploadPhoto(file) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error('Sign in to add photos.');
  const body = await shrink(file);
  const ext = body.type === 'image/jpeg' ? 'jpg' : (body.type.split('/')[1] || 'img').replace(/[^\w]/g, '');
  const path = `${auth.user.id}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, body, { contentType: body.type });
  if (error) throw error;
  const caption = file.name.replace(/\.[^.]+$/, '').replace(/[\[\]]/g, '') || 'photo';
  return `![${caption}](${PREFIX}${path})`;
}

export async function downloadPhoto(path) {
  const { data, error } = await supabase.storage.from(BUCKET).download(path);
  if (error) throw error;
  return data;
}

async function signUrls(paths) {
  const now = Date.now();
  const missing = paths.filter((p) => !(signed.get(p)?.expires > now + 60_000));
  if (missing.length) {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(missing, 3600);
    if (error) throw error;
    for (const d of data) if (d.signedUrl) signed.set(d.path, { url: d.signedUrl, expires: now + 3600_000 });
  }
}

// Swaps storage: references for viewable URLs.
function withPhotoUrls(markdown) {
  return (markdown || '').replace(REF, (ref, path) => signed.get(path)?.url || ref);
}

// The Markdown with photo URLs filled in; re-renders once they are signed.
export function usePhotoMarkdown(markdown) {
  const [, setVersion] = useState(0);
  const key = photoPaths(markdown).join('|');
  useEffect(() => {
    if (!key || !supabase) return;
    let live = true;
    signUrls(key.split('|')).then(() => live && setVersion((v) => v + 1), () => {});
    return () => {
      live = false;
    };
  }, [key]);
  return withPhotoUrls(markdown);
}
