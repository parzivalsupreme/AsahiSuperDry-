'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { randomEntryId } from '../../lib/entries';

const KEYS = [
  ['1', 'Entries'],
  ['2', 'New entry'],
  ['3', 'Tags'],
  ['4', 'Random entry'],
  ['5', 'Stats'],
  ['N', 'New entry'],
  ['/', 'Search'],
  ['Ctrl+S', 'Save entry (while writing)'],
  ['Esc', 'Leave a text box'],
  ['?', 'Show this help'],
];

const typing = (el) => el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName));

export async function openRandomEntry(router, currentId) {
  const id = await randomEntryId(currentId).catch(() => null);
  router.push(id ? `/entry/?id=${id}` : '/');
}

// Global keyboard shortcuts, terminal style.
export default function Shortcuts() {
  const router = useRouter();
  const [help, setHelp] = useState(false);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        if (typing(document.activeElement)) document.activeElement.blur();
        setHelp(false);
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey || typing(e.target)) return;
      const go = {
        1: () => router.push('/'),
        2: () => router.push('/new/'),
        n: () => router.push('/new/'),
        3: () => router.push('/tags/'),
        4: () => openRandomEntry(router, new URLSearchParams(location.search).get('id')),
        5: () => router.push('/stats/'),
        '?': () => setHelp((h) => !h),
        '/': () => document.querySelector('.search')?.focus(),
      }[e.key.toLowerCase()];
      if (go) {
        e.preventDefault();
        setHelp(false);
        go();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [router]);

  if (!help) return null;
  return (
    <div className="kbd-overlay" onClick={() => setHelp(false)}>
      <div className="kbd-panel" onClick={(e) => e.stopPropagation()}>
        <h2 className="section-title">Keyboard shortcuts</h2>
        <table>
          <tbody>
            {KEYS.map(([k, what]) => (
              <tr key={k}>
                <td><kbd>{k}</kbd></td>
                <td>{what}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
