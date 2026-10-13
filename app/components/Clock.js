'use client';

import { useEffect, useState } from 'react';
import { locationAllowed, stampPlaceAndWeather } from '../../lib/place';

const CACHE = 'journal-here';
const MAX_AGE = 30 * 60 * 1000; // refresh place & weather every 30 minutes

function cached() {
  try {
    const c = JSON.parse(sessionStorage.getItem(CACHE) || 'null');
    return c && Date.now() - c.at < MAX_AGE ? c : null;
  } catch {
    return null;
  }
}

// Live date/time readout in the header, terminal style, with the current place & weather.
export default function Clock() {
  const [now, setNow] = useState(null);
  const [here, setHere] = useState(null);
  const [allowed, setAllowed] = useState(true);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const refresh = async () => {
    try {
      const next = { ...(await stampPlaceAndWeather()), at: Date.now() };
      sessionStorage.setItem(CACHE, JSON.stringify(next));
      setHere(next);
      setAllowed(true);
    } catch {
      setAllowed(false);
    }
  };

  // Only look up automatically when location is already allowed, so the header never prompts.
  useEffect(() => {
    const c = cached();
    if (c) setHere(c);
    locationAllowed().then((ok) => {
      setAllowed(ok);
      if (ok && !c) refresh();
    });
    const id = setInterval(() => locationAllowed().then((ok) => ok && refresh()), MAX_AGE);
    return () => clearInterval(id);
  }, []);

  if (!now) return <span className="clock" />;
  const date = now.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' });
  const time = now.toLocaleTimeString('en-GB', { hour12: false });
  const place = here && [here.place, here.weather].filter(Boolean).join(' · ');
  return (
    <span className="clock">
      {date} {time}
      {place ? (
        <span className="clock-place"> · {place}</span>
      ) : (
        !allowed && (
          <button className="clock-place clock-locate" onClick={refresh} title="Show place & weather here">
            + weather
          </button>
        )
      )}
    </span>
  );
}
