'use client';

import { nextTheme, toggleCrt, useTheme } from '../../lib/theme';

export default function ThemeControls() {
  const { theme, crt } = useTheme();
  return (
    <span className="theme-controls">
      <button onClick={nextTheme} title="Switch color theme">{theme}</button>
      <button onClick={toggleCrt} className={crt ? 'on' : ''} title="Toggle CRT scanlines" aria-pressed={crt}>
        CRT
      </button>
    </span>
  );
}
