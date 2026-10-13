'use client';

import { useEffect, useState } from 'react';

export const THEMES = ['amber', 'green', 'blue'];
const KEY = 'journal-theme';

function read() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
    return { theme: THEMES.includes(saved.theme) ? saved.theme : 'amber', crt: !!saved.crt };
  } catch {
    return { theme: 'amber', crt: false };
  }
}

function apply(next) {
  document.documentElement.dataset.theme = next.theme;
  document.documentElement.toggleAttribute('data-crt', next.crt);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {}
  window.dispatchEvent(new Event('journal-theme'));
}

export const setTheme = (theme) => apply({ ...read(), theme });
export const toggleCrt = () => apply({ ...read(), crt: !read().crt });
export const nextTheme = () => setTheme(THEMES[(THEMES.indexOf(read().theme) + 1) % THEMES.length]);

// Runs before first paint (inlined in <head>) so the saved theme never flashes.
export const THEME_BOOT = `try{var t=JSON.parse(localStorage.getItem('${KEY}')||'{}');if(t.theme)document.documentElement.dataset.theme=t.theme;if(t.crt)document.documentElement.setAttribute('data-crt','')}catch(e){}`;

export function useTheme() {
  const [state, setState] = useState({ theme: 'amber', crt: false });
  useEffect(() => {
    const sync = () => setState(read());
    sync();
    window.addEventListener('journal-theme', sync);
    return () => window.removeEventListener('journal-theme', sync);
  }, []);
  return state;
}
