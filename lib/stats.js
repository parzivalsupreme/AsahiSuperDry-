import { MONTHS, WEEKDAYS, addDays, dayKey, parseDay } from './dates';

const STOPWORDS = new Set(`a about above after again against all am an and any are as at be because been before being
below between both but by can could did do does doing down during each few for from further had has have having he
her here hers herself him himself his how i if in into is it its itself just me more most my myself no nor not now of
off on once only or other our ours ourselves out over own same she should so some such than that the their theirs
them themselves then there these they this those through to too under until up very was we were what when where
which while who whom why will with would you your yours yourself yourselves im ive dont didnt thats also get got
really one like today tomorrow went going much still even back well way things thing lot`.split(/\s+/));

function words(body) {
  return (
    body
      .toLowerCase()
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/!?\[[^\]]*\]\([^)]*\)/g, ' ')
      .replace(/https?:\S+/g, ' ')
      .match(/[a-z][a-z']{2,}/g) || []
  );
}

// Words, entries and active days in the `days` days ending on `endKey`.
function windowTotals(entries, endKey, days) {
  const startKey = dayKey(addDays(parseDay(endKey), 1 - days));
  const inWindow = entries.filter((e) => e.day >= startKey && e.day <= endKey);
  return {
    words: inWindow.reduce((s, e) => s + e.words, 0),
    count: inWindow.length,
    days: new Set(inWindow.map((e) => e.day)).size,
  };
}

const change = (now, before) => ({ now, diff: now - before, pct: before ? (now - before) / before : null });

export function computeStats(entries, todayKey) {
  const today = parseDay(todayKey);
  const cur = windowTotals(entries, todayKey, 30);
  const prev = windowTotals(entries, dayKey(addDays(today, -30)), 30);

  const months = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const prefix = dayKey(d).slice(0, 7);
    const words = entries.reduce((s, e) => s + (e.day.startsWith(prefix) ? e.words : 0), 0);
    months.push({ key: prefix, label: MONTHS[d.getMonth()], year: d.getFullYear(), words });
  }

  const weekdays = WEEKDAYS.map((name) => ({ name, count: 0 }));
  const wordCounts = new Map();
  const tagCounts = new Map();
  for (const e of entries) {
    weekdays[parseDay(e.day).getDay()].count++;
    for (const w of words(e.body)) if (!STOPWORDS.has(w)) wordCounts.set(w, (wordCounts.get(w) || 0) + 1);
    for (const t of e.tags) tagCounts.set(t, (tagCounts.get(t) || 0) + 1);
  }
  const top = (map, n) => [...map].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, n);

  const days = [...new Set(entries.map((e) => e.day))].sort();
  const span = days.length ? Math.round((today - parseDay(days[0])) / 864e5) + 1 : 0;

  return {
    totalWords: entries.reduce((s, e) => s + e.words, 0),
    entries: entries.length,
    daysWritten: days.length,
    span,
    words30: change(cur.words, prev.words),
    entries30: change(cur.count, prev.count),
    days30: change(cur.days, prev.days),
    months,
    weekdays,
    bestWeekday: weekdays.reduce((a, b) => (b.count > a.count ? b : a)),
    topWords: top(wordCounts, 10),
    topTag: top(tagCounts, 1)[0]?.[0] || null,
  };
}
