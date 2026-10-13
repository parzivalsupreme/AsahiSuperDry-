// Date helpers that work in the viewer's local time with YYYY-MM-DD keys.

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const pad = (n) => String(n).padStart(2, '0');

export function dayKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function parseDay(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

export function formatDay(key, { weekday = false } = {}) {
  const d = parseDay(key);
  return d.toLocaleDateString('en-US', {
    weekday: weekday ? 'long' : undefined,
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// Current streak (today may still be empty) and longest run of consecutive days.
export function computeStreaks(days, todayKey) {
  const set = new Set(days);
  let current = 0;
  if (todayKey) {
    let cursor = parseDay(todayKey);
    if (!set.has(todayKey)) cursor = addDays(cursor, -1); // today isn't over yet
    while (set.has(dayKey(cursor))) {
      current++;
      cursor = addDays(cursor, -1);
    }
  }
  let longest = 0;
  let run = 0;
  let prev = null;
  for (const key of [...set].sort()) {
    const d = parseDay(key);
    run = prev && dayKey(addDays(prev, 1)) === key ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = d;
  }
  return { current, longest };
}
