/**
 * Habit row progress metadata helpers.
 *
 * Each helper returns `{ label, current, total, pct }` where
 * label is human-readable, current/total are integers, and pct
 * is 0..1. All values are computed from a Date — no fetch, no
 * external content, no user state. Just calendar arithmetic.
 */

/**
 * Reading-schedule position.
 *
 * Returns the day's position within the bundled reading schedule. The
 * schedule wraps year-over-year (day N+1 → day 1), so this is a position
 * within the current calendar year, not a claim that the schedule covers
 * a complete canon.
 *
 * The label deliberately says "day N of M", not "day N of M read" — it
 * describes position in a repeating list, which is what it actually is.
 *
 * Uses UTC throughout to avoid DST off-by-one errors (Jan 1 is in EST,
 * Jun 30 is in EDT — a 24h-based day count computes 180 days instead of
 * 181 across the spring-forward boundary).
 */
export function bibleReadingProgress(date = new Date(), totalDays = 366) {
  const year = date.getUTCFullYear();
  const start = Date.UTC(year, 0, 1);
  // UTC millis at the start of `date` (local-clock day).
  const today = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const day = Math.floor((today - start) / 86400000) + 1;
  const pct = Math.min(day / totalDays, 1);
  return {
    label: `Day ${day} of ${totalDays}`,
    current: day,
    total: totalDays,
    pct,
  };
}

/**
 * Daily text progress (calendar-month based).
 * The reading is a per-calendar-day concept, so the
 * natural progress unit is "day X of N" within the current
 * month. We don't know the count of texts published in any
 * given month, but we know the month length — so we use the
 * honest calendar-day counter instead. The metadata is
 * calendar-only; no external content is implied.
 */
export function dailyTextProgress(date = new Date()) {
  // Use local-calendar day + last-day-of-month (UTC-safe
  // because we only use year/month/day fields, no hours).
  const day = date.getDate();
  const total = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  return {
    label: `Day ${day} of ${total}`,
    current: day,
    total,
    pct: day / total,
  };
}
