/**
 * The monthly ministry report reminder: which month it is for, when it is
 * due, and the text of last month's totals. Pure; the notification line and
 * the Today card both read from here so the rules live in one place.
 */
import { addDays, monthKey } from './day.js';
import { scheduleOn } from './schedule.js';
import { ministryEntry } from './today.js';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** The day-of-month the card stops showing after. */
const LAST_CARD_DAY = 7;

/**
 * The month before `day`'s: its key, English name, year and last day.
 * @param {string} day 'YYYY-MM-DD'
 */
export function reportMonth(day) {
  const lastDay = addDays(`${monthKey(day)}-01`, -1);
  const [year, month] = lastDay.split('-').map(Number);
  return { key: monthKey(lastDay), name: MONTHS[month - 1], year, lastDay };
}

/** True on days 1 to 7 when the ministry routine is enabled that day (the Today card). */
export function reportDue(store, day) {
  const dayOfMonth = Number(day.slice(8, 10));
  return dayOfMonth <= LAST_CARD_DAY && scheduleOn(store, day).enabled.ministry === true;
}

/** True on the 1st when the ministry routine is enabled and its reminder switch is on. */
export function reportNotifyDue(store, day) {
  return (
    day.endsWith('-01') &&
    scheduleOn(store, day).enabled.ministry === true &&
    !store.reminders.off.includes('ministry')
  );
}

/** Last month's lines: shared, studies and (pioneers) hours; or the "nothing logged" line. */
export function reportLines(store, day, t) {
  const { name, lastDay } = reportMonth(day);
  const entry = ministryEntry(store, lastDay);
  if (!entry) return [t('fd.today.report.none', { month: name })];
  const { shared, studies, hours } = entry.value;
  const lines = [
    t('fd.today.report.shared', {
      answer: t(shared ? 'fd.today.report.yes' : 'fd.today.report.no'),
    }),
    t('fd.today.report.studies', { count: studies ?? 0 }),
  ];
  if (store.pioneer && typeof hours === 'number') lines.push(t('fd.today.report.hours', { hours }));
  return lines;
}

/** The same lines as one plain string for the clipboard. */
export function reportText(store, day, t) {
  const { name, year } = reportMonth(day);
  return `${name} ${year} — ${reportLines(store, day, t).join(' · ')}`;
}
