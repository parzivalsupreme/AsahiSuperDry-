'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { geoEqualEarth, geoGraticule10, geoPath } from 'd3-geo';
import { formatDay } from '../../lib/dates';
import { listEntries } from '../../lib/entries';
import { geocodePlaces } from '../../lib/geo';

const W = 960;
const H = 470;
const projection = geoEqualEarth().fitExtent([[8, 8], [W - 8, H - 8]], { type: 'Sphere' });
const path = geoPath(projection);
const sphere = path({ type: 'Sphere' });
const graticule = path(geoGraticule10());

// Country outlines, loaded only on this page.
function useCountries() {
  const [d, setD] = useState(null);
  useEffect(() => {
    Promise.all([import('topojson-client'), import('world-atlas/countries-110m.json')]).then(([topo, world]) => {
      const w = world.default || world;
      setD(path(topo.mesh(w, w.objects.countries)) + path(topo.feature(w, w.objects.land)));
    });
  }, []);
  return d;
}

// Every place you've written from, as dots on a world map sized by entry count.
export default function PlacesMap() {
  const [entries, setEntries] = useState(null);
  const [coords, setCoords] = useState(null);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const outlines = useCountries();

  useEffect(() => {
    listEntries().then(setEntries, (e) => setError(e.message));
  }, []);

  // [{ name, entries: [...] }], most visited first.
  const places = useMemo(() => {
    const map = new Map();
    for (const e of entries || []) if (e.place) map.set(e.place, [...(map.get(e.place) || []), e]);
    return [...map].map(([name, list]) => ({ name, entries: list })).sort((a, b) => b.entries.length - a.entries.length || a.name.localeCompare(b.name));
  }, [entries]);

  useEffect(() => {
    if (places.length) geocodePlaces(places.map((p) => p.name)).then(setCoords);
  }, [places]);

  if (error) return <p className="error">Could not load entries: {error}</p>;
  if (!entries) return <p className="notice">Loading places…</p>;
  if (!places.length) {
    return (
      <div className="empty">
        No places yet. Allow location when you <Link href="/new/">write an entry</Link> and it will show up here.
      </div>
    );
  }

  const max = places[0].entries.length;
  const radius = (n) => 4 + 10 * Math.sqrt(n / max);
  const dots = places
    .map((p) => ({ ...p, xy: coords?.get(p.name) && projection(coords.get(p.name)) }))
    .filter((p) => p.xy)
    .reverse(); // big dots underneath small ones
  const missing = coords ? places.filter((p) => !coords.get(p.name)).length : 0;
  const countries = new Set(places.map((p) => p.name.split(',').pop().trim()));
  const current = places.find((p) => p.name === selected);
  const toggle = (name) => setSelected((cur) => (cur === name ? null : name));

  return (
    <div className="page">
      <div className="stats-row">
        <span><strong>{places.length}</strong> {places.length === 1 ? 'place' : 'places'}</span>
        <span><strong>{countries.size}</strong> {countries.size === 1 ? 'country' : 'countries'}</span>
        <span>Most written from: <strong>{places[0].name}</strong></span>
        {!coords && <span className="notice">Locating…</span>}
        {missing > 0 && <span className="notice">{missing} not found on the map</span>}
      </div>

      <div className="places">
        <section className="panel map-panel">
          <svg viewBox={`0 0 ${W} ${H}`} className="world-map" role="img" aria-label={`Map of ${places.length} places`}>
            <path d={sphere} className="map-sphere" />
            <path d={graticule} className="map-grid" />
            {outlines && <path d={outlines} className="map-land" />}
            {dots.map((p) => (
              <g
                key={p.name}
                className={`map-dot${p.name === selected ? ' active' : ''}`}
                transform={`translate(${p.xy[0]},${p.xy[1]})`}
                onClick={() => toggle(p.name)}
              >
                <title>{`${p.name}: ${p.entries.length} ${p.entries.length === 1 ? 'entry' : 'entries'}`}</title>
                <circle r={radius(p.entries.length) + 6} className="map-dot-halo" />
                <circle r={radius(p.entries.length)} />
              </g>
            ))}
          </svg>
        </section>

        <section className="panel place-list">
          <h2 className="section-title">Places</h2>
          <ul>
            {places.map((p) => (
              <li key={p.name}>
                <button className={p.name === selected ? 'active' : ''} onClick={() => toggle(p.name)} aria-pressed={p.name === selected}>
                  <span>{p.name}</span>
                  <span className="count">{p.entries.length}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {current && (
        <section className="panel">
          <h2 className="section-title">{current.name}</h2>
          <ul className="place-entries">
            {current.entries.map((e) => (
              <li key={e.id}>
                <span className="place-day">{formatDay(e.day)}</span>
                <Link href={`/entry/?id=${e.id}`}>{e.title}</Link>
                {e.weather && <span className="place-weather">{e.weather}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
