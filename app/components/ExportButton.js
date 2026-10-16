'use client';

import { useState } from 'react';
import { dayKey } from '../../lib/dates';
import { exportAll } from '../../lib/export';

export default function ExportButton({ entries }) {
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    try {
      const url = URL.createObjectURL(await exportAll(entries));
      const a = document.createElement('a');
      a.href = url;
      a.download = `journal-${dayKey(new Date())}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(`Export failed: ${e.message}`);
    }
    setBusy(false);
  };

  return (
    <button className="btn btn-sm" onClick={run} disabled={busy}>
      {busy ? 'Exporting…' : 'Export all (.zip)'}
    </button>
  );
}
