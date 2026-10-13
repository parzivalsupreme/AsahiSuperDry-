'use client';

import { openCommandBar } from './CommandBar';

export default function CommandKey() {
  return (
    <button className="cmd-key" onClick={openCommandBar} title="Command bar (Ctrl+K)">
      Ctrl K
    </button>
  );
}
