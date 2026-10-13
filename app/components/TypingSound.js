'use client';

import { useEffect } from 'react';
import { keyClick } from '../../lib/sound';
import { soundOn } from '../../lib/theme';

const HEAVY = new Set([' ', 'Enter', 'Backspace', 'Delete']);
const typing = (el) => el && (el.isContentEditable || el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && el.type !== 'checkbox'));

// Plays a key click while typing in any text box, when Sound is on.
export default function TypingSound() {
  useEffect(() => {
    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey || !typing(e.target) || !soundOn()) return;
      if (e.key.length === 1 || HEAVY.has(e.key)) keyClick(HEAVY.has(e.key));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return null;
}
