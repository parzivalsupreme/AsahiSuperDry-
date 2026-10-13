// Where and in what weather an entry was written, from the browser's location.
// Weather: Open-Meteo. City: BigDataCloud's free client-side reverse geocoder. Neither needs a key.

const WEATHER = [
  [0, 'Clear'], [1, 'Mostly clear'], [2, 'Partly cloudy'], [3, 'Overcast'], [48, 'Fog'],
  [57, 'Drizzle'], [67, 'Rain'], [77, 'Snow'], [82, 'Showers'], [86, 'Snow showers'], [99, 'Thunderstorm'],
];
const describe = (code) => (WEATHER.find(([max]) => code <= max) || WEATHER[WEATHER.length - 1])[1];

// True when the browser will hand over the location without asking.
export async function locationAllowed() {
  try {
    return (await navigator.permissions.query({ name: 'geolocation' })).state === 'granted';
  } catch {
    return false;
  }
}

const position = () =>
  new Promise((resolve, reject) =>
    navigator.geolocation
      ? navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 15000, maximumAge: 600000 })
      : reject(new Error('Location is not available in this browser.'))
  );

const json = async (url) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
};

// Returns { place, weather }; either may be null if its lookup fails.
export async function stampPlaceAndWeather() {
  const { coords } = await position();
  const lat = coords.latitude.toFixed(3);
  const lon = coords.longitude.toFixed(3);
  const [geo, wx] = await Promise.allSettled([
    json(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`),
    json(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code`),
  ]);
  const g = geo.value;
  const place = g ? [g.city || g.locality, g.countryName].filter(Boolean).join(', ') || null : null;
  const c = wx.value?.current;
  const weather = c ? `${Math.round(c.temperature_2m)}°C ${describe(c.weather_code)}` : null;
  return { place, weather };
}
