// Map coordinates for stamped place names like "Tokyo, Japan", via Open-Meteo's free geocoder (no key).
// Results are cached in this browser so each place is looked up once.

const KEY = 'journal-geocode';

function readCache() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}');
  } catch {
    return {};
  }
}

function writeCache(cache) {
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {}
}

async function lookup(place) {
  const parts = place.split(',').map((s) => s.trim());
  const country = parts.length > 1 ? parts[parts.length - 1].toLowerCase() : null;
  const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(parts[0])}&count=10&language=en`);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  const results = (await res.json()).results || [];
  // Prefer a match in the stamped country; otherwise the most prominent result.
  const hit = results.find((r) => country && r.country?.toLowerCase() === country) || results[0];
  return hit ? [hit.longitude, hit.latitude] : null;
}

// Returns Map(place -> [lon, lat] | null). Failed lookups aren't cached, so they retry next visit.
export async function geocodePlaces(places) {
  const cache = readCache();
  const out = new Map();
  await Promise.all(
    places.map(async (p) => {
      if (p in cache) return out.set(p, cache[p]);
      try {
        cache[p] = await lookup(p);
        out.set(p, cache[p]);
      } catch {
        out.set(p, null);
      }
    })
  );
  writeCache(cache);
  return out;
}
