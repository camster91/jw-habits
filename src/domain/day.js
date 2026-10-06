/**
 * App days. An "app day" is a local calendar date ('YYYY-MM-DD') that rolls
 * over at 03:00 local time, so late-night use still counts for the day the
 * user thinks they are in. Only local Date getters are used; never UTC or
 * toISOString(), which would shift days for anyone not on UTC.
 */

const ROLLOVER_HOUR = 3;

const pad = (n) => String(n).padStart(2, '0');

function format(y, m, d) {
  return `${y}-${pad(m)}-${pad(d)}`;
}

/** Parse 'YYYY-MM-DD' into a local Date at noon (noon is safe from DST shifts). */
function parse(day) {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
}

function formatDate(date) {
  return format(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

/**
 * The app day for an instant: the local date, or the previous one before 03:00
 * local wall-clock (so DST days roll over at 03:00 on the clock, not 02:00/04:00).
 * @param {Date} now
 * @returns {string} 'YYYY-MM-DD'
 */
export function appDay(now) {
  const calendar = formatDate(now);
  return now.getHours() < ROLLOVER_HOUR ? addDays(calendar, -1) : calendar;
}

/**
 * @param {string} day 'YYYY-MM-DD'
 * @param {number} n days to add (may be negative)
 * @returns {string} 'YYYY-MM-DD'
 */
export function addDays(day, n) {
  const date = parse(day);
  date.setDate(date.getDate() + n);
  return formatDate(date);
}

/** @returns {number} 0..6, 0 is Sunday */
export function weekday(day) {
  return parse(day).getDay();
}

/** The Monday of the Monday-Sunday week containing `day`. */
export function weekStart(day) {
  return addDays(day, -((weekday(day) + 6) % 7));
}

/** @returns {string} 'YYYY-MM' */
export function monthKey(day) {
  return day.slice(0, 7);
}

/** Service years run September-August; returns the year in which that September falls. */
export function serviceYear(day) {
  const [y, m] = day.split('-').map(Number);
  return m >= 9 ? y : y - 1;
}
