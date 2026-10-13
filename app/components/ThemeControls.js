'use client';

import { toggleBlur, usePrivacy } from '../../lib/privacy';
import { nextTheme, toggleCrt, useTheme } from '../../lib/theme';

export default function ThemeControls() {
  const { theme, crt } = useTheme();
  const { blur } = usePrivacy();
  return (
    <span className="theme-controls">
      <button onClick={nextTheme} title="Switch color theme">{theme}</button>
      <button onClick={toggleCrt} className={crt ? 'on' : ''} title="Toggle CRT scanlines" aria-pressed={crt}>
        CRT
      </button>
      <button onClick={toggleBlur} className={blur ? 'on' : ''} title="Blur the screen (B)" aria-pressed={blur}>
        Blur
      </button>
    </span>
  );
}
