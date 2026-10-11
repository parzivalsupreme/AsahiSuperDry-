'use client';

import { useEffect, useState } from 'react';

// Live date/time readout in the header, terminal style.
export default function Clock() {
  const [now, setNow] = useState(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!now) return <span className="clock" />;
  const date = now.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' });
  const time = now.toLocaleTimeString('en-GB', { hour12: false });
  return <span className="clock">{date} {time}</span>;
}
