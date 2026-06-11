import { format, isToday, isYesterday, differenceInDays, parseISO } from 'date-fns';

/**
 * Format a date for human display: 'Today', 'Yesterday', '3 days ago',
 * or 'Jun 4' (for >7 days).
 *
 * @param {Date|string|number} date - A Date, ISO string, or timestamp
 * @returns {string} A short human-readable date label
 */
export function formatRelativeDate(date) {
  if (!date) return '';
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '';

  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';

  const days = differenceInDays(new Date(), d);
  if (days < 0) {
    // Future date — show absolute
    return format(d, 'MMM d');
  }
  if (days < 7) {
    return `${days} days ago`;
  }
  return format(d, 'MMM d');
}

/**
 * Format a date with optional time: 'Today 2:30pm', 'Yesterday 9:15am',
 * or 'Jun 4' (older than 7 days). For activity timestamps in lists.
 */
export function formatRelativeDateTime(date) {
  if (!date) return '';
  const d = typeof date === 'string' ? parseISO(date) : date;
  if (Number.isNaN(d.getTime())) return '';
  const dayLabel = formatRelativeDate(d);
  if (dayLabel === 'Today' || dayLabel === 'Yesterday') {
    return `${dayLabel} ${format(d, 'h:mma').toLowerCase()}`;
  }
  return dayLabel;
}
