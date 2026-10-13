'use client';

import { useEffect } from 'react';
import { keyClick } from '../../lib/sound';

const KIND = { ' ': 'space', Enter: 'enter', Backspace: 'back', Delete: 'back' };
const typing = (el) => el && (el.isContentEditable || el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && el.type !== 'checkbox'));

// Plays a key click while typing in any text box.
export default function TypingSound() {
  useEffect(() => {
    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey || !typing(e.target)) return;
      if (e.key.length === 1 || KIND[e.key]) keyClick(KIND[e.key] || 'key');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return null;
}
