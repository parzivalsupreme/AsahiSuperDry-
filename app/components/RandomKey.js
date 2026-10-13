'use client';

import { useRouter } from 'next/navigation';
import { openRandomEntry } from './Shortcuts';

export default function RandomKey() {
  const router = useRouter();
  return (
    <button
      className="fn-key"
      onClick={() => openRandomEntry(router, new URLSearchParams(location.search).get('id'))}
    >
      <span className="num">4)</span>Random
    </button>
  );
}
