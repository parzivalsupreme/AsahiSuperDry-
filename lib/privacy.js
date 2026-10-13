'use client';

import { useEffect, useState } from 'react';

// Two ways to hide the journal from onlookers:
//   blur  – everything below the header is blurred except a spotlight around the pointer
//   panic – a full-screen fake stock chart covers the page
// State lives on <html> (data-blur / data-panic) so any component can read it.

const set = (name, on) => {
  document.documentElement.toggleAttribute(`data-${name}`, on);
  window.dispatchEvent(new Event('journal-privacy'));
};
const isOn = (name) => document.documentElement.hasAttribute(`data-${name}`);

export const toggleBlur = () => set('blur', !isOn('blur'));
export const togglePanic = () => set('panic', !isOn('panic'));

export function usePrivacy() {
  const [state, setState] = useState({ blur: false, panic: false });
  useEffect(() => {
    const sync = () => setState({ blur: isOn('blur'), panic: isOn('panic') });
    sync();
    window.addEventListener('journal-privacy', sync);
    return () => window.removeEventListener('journal-privacy', sync);
  }, []);
  return state;
}
