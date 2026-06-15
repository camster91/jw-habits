/**
 * Daily Bible reading helper. Returns today's entry from the
 * /data/bible-reading.json 366-day schedule, with a deep link
 * to the passage on wol.jw.org.
 *
 * The JSON is fetched lazily on first call. Subsequent calls
 * are O(1) via the in-memory cache, which invalidates when the
 * date changes so an app left open across midnight picks up
 * the new reading without a reload.
 *
 * The schedule uses day-of-year (1-366). We wrap to 1..length
 * so the schedule loops year-over-year, so a user who started
 * mid-year can keep going. (The schedule is 366 entries; day
 * 366 is a leap-year-only entry. On non-leap years we skip it
 * via the modulo.)
 */

let schedulePromise = null;

function loadSchedule() {
  if (!schedulePromise) {
    schedulePromise = fetch('/data/bible-reading.json')
      .then((r) => {
        if (!r.ok) throw new Error(`bible-reading.json HTTP ${r.status}`);
        return r.json();
      })
      .catch(() => [
        // Last-resort fallback so the app still works offline or
        // if the JSON is missing.
        { day: 1, reading: 'Genesis 1-3' },
        { day: 2, reading: 'Genesis 4-7' },
      ]);
  }
  return schedulePromise;
}

let cache = { date: null, reading: null };

function dayOfYear(d) {
  const start = new Date(d.getFullYear(), 0, 0);
  const diff = d - start;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export async function getDailyReading(date = new Date()) {
  const today = dayOfYear(date);
  const dateKey = date.toISOString().slice(0, 10);
  if (cache.date === dateKey && cache.reading) {
    return cache.reading;
  }
  const schedule = await loadSchedule();
  const wrapped = ((today - 1) % schedule.length) + 1;
  const entry = schedule.find((e) => e.day === wrapped) || schedule[0];
  // Build a wol.jw.org deep link. Import lazily to avoid a
  // circular dep at module-load time (jwLibraryLinks.js doesn't
  // depend on this file).
  const { parseReadingToLink } = await import('./jwLibraryLinks.js');
  const url = parseReadingToLink(entry.reading);
  const reading = {
    day: entry.day,
    label: entry.reading,
    url: url || 'https://www.jw.org/en/library/bible/',
  };
  cache = { date: dateKey, reading };
  return reading;
}
