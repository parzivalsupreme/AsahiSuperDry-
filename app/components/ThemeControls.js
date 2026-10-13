'use client';

import { nextTheme, toggleCrt, toggleSound, useTheme } from '../../lib/theme';

export default function ThemeControls() {
  const { theme, crt, sound } = useTheme();
  return (
    <span className="theme-controls">
      <button onClick={nextTheme} title="Switch color theme">{theme}</button>
      <button onClick={toggleCrt} className={crt ? 'on' : ''} title="Toggle CRT scanlines" aria-pressed={crt}>
        CRT
      </button>
      <button onClick={toggleSound} className={sound ? 'on' : ''} title="Typing sounds" aria-pressed={sound}>
        Sound
      </button>
    </span>
  );
}
