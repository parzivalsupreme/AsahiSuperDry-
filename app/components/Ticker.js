'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Delta from './Delta';
import { dayKey } from '../../lib/dates';
import { listEntries } from '../../lib/entries';
import { tickerQuotes } from '../../lib/stats';
import { useSession } from '../../lib/supabase';

// A scrolling quote board under the header, refreshed on every page change.
export default function Ticker() {
  const session = useSession();
  const pathname = usePathname();
  const [quotes, setQuotes] = useState(null);

  useEffect(() => {
    if (!session) return;
    listEntries().then((entries) => setQuotes(entries.length ? tickerQuotes(entries, dayKey(new Date())) : null), () => {});
  }, [session, pathname]);

  if (!session || !quotes) return null;
  const row = quotes.map(([label, value, c]) => (
    <span className="tick" key={label}>
      <b>{label}</b> {value} {c && <Delta c={c} />}
    </span>
  ));
  return (
    <div className="ticker site-ticker">
      <div className="ticker-track">
        <div>{row}</div>
        <div aria-hidden="true">{row}</div>
      </div>
    </div>
  );
}
