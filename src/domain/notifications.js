/**
 * The plan for the next days' local notifications. Pure: it reads the store
 * and the clock it is given and returns what to schedule, nothing more.
 * At most two entries a day (a morning and an evening one), never any
 * discouraging wording, never inside quiet hours.
 */
import { addDays, appDay, weekday } from './day.js';
import { dueToday, isDone } from './routines.js';
import { scheduleOn } from './schedule.js';
import { labelFor } from './store.js';
import { backupStale } from './backup.js';
import { eventLabel, sortedEvents } from './events.js';

const ROLLOVER_HOUR = 3;
const DEFAULT_MORNING = { time: '07:00', phrase: null };

const minutes = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

/**
 * A local Date for app day `day` at 'HH:MM'. The app day rolls over at 03:00,
 * so a clock time before 03:00 belongs to the next calendar date.
 */
function at(day, hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  const [y, mo, d] = (h < ROLLOVER_HOUR ? addDays(day, 1) : day).split('-').map(Number);
  return new Date(y, mo - 1, d, h, m);
}

/** Quiet hours may wrap midnight; the start is inside, the end is not. */
function inQuietHours(quiet, hhmm) {
  if (!quiet) return false;
  const [start, end, time] = [quiet.start, quiet.end, hhmm].map(minutes);
  if (start === end) return false;
  return start < end ? time >= start && time < end : time >= start || time < end;
}

function joinLabels(labels, t) {
  if (labels.length < 2) return labels.join('');
  return t('fd.notify.and', { head: labels.slice(0, -1).join(', '), last: labels.at(-1) });
}

/** The routine line and the time it is anchored to, or null when none is due. */
function routineLine(store, day, t) {
  const off = store.reminders.off;
  const list = dueToday(store, day).filter((id) => !isDone(store, id, day) && !off.includes(id));
  if (list.length === 0) return null;

  const fallback = store.anchors?.dailyText ?? DEFAULT_MORNING;
  const anchors = list.map((id) => store.anchors?.[id] ?? fallback);
  const anchor = anchors.reduce((a, b) => (minutes(b.time) < minutes(a.time) ? b : a));
  const prefix = anchor.phrase
    ? t(`fd.anchor.${anchor.phrase}`, { defaultValue: anchor.time })
    : anchor.time;
  const labels = list.map((id) => labelFor(store, id, t));
  const body = t('fd.notify.ready', { count: list.length, prefix, list: joinLabels(labels, t) });
  return { time: anchor.time, body };
}

/** One line per event starting in 7 days or tomorrow. */
function eventLines(store, day, t) {
  if (!store.reminders.events) return [];
  const soon = addDays(day, 7);
  const tomorrow = addDays(day, 1);
  const lines = [];
  for (const event of sortedEvents(store)) {
    const label = eventLabel(event, t);
    if (event.start === tomorrow) lines.push(t('fd.notify.eventTomorrow', { label }));
    else if (event.start === soon) lines.push(t('fd.notify.eventSoon', { label }));
  }
  return lines;
}

/**
 * True on the 1st of a month when the backup reminder is on and the last
 * backup is missing, unreadable, in the future, or 30 or more days old as of
 * `entryAt`, the moment the notification would show (not when it is planned).
 */
export function backupDue(store, day, entryAt) {
  return (
    day.endsWith('-01') &&
    store.reminders.backup &&
    backupStale(store.backup?.lastExportAt, entryAt)
  );
}

/**
 * The morning entry: the routine line, then date lines, then the backup line.
 * With no routine due, the lines alone make the entry, at the daily text time.
 */
function morningEntry(store, day, t) {
  const routine = routineLine(store, day, t);
  const time = routine?.time ?? (store.anchors?.dailyText ?? DEFAULT_MORNING).time;
  const lines = [
    ...(routine ? [routine.body] : []),
    ...eventLines(store, day, t),
    ...(backupDue(store, day, at(day, time)) ? [t('fd.notify.backup')] : []),
  ];
  if (lines.length === 0) return null;
  return { time, body: lines.join('\n') };
}

function meetingEveToday(store, day) {
  if (store.reminders.off.includes('meetingPrep')) return false;
  const tomorrow = addDays(day, 1);
  const { enabled, meetingDays } = scheduleOn(store, tomorrow);
  return (
    enabled.meetingPrep &&
    meetingDays.includes(weekday(tomorrow)) &&
    !isDone(store, 'meetingPrep', day)
  );
}

function eveningEntry(store, day, t) {
  const lines = [];
  if (store.wrapUpNotification) lines.push(t('fd.notify.wrapUp'));
  if (meetingEveToday(store, day)) lines.push(t('fd.notify.meetingEve'));
  if (lines.length === 0) return null;
  return { time: store.wrapUpTime, body: lines.join('\n') };
}

/**
 * @param {object} store the v2 store
 * @param {Date} now
 * @param {(key: string, options?: object) => string} t
 * @param {number} [days]
 * @returns {{id: number, at: Date, kind: 'morning'|'evening', body: string}[]}
 */
export function planNotifications(store, now, t, days = 7) {
  if (!store.reminders.enabled) return [];
  const today = appDay(now);
  const plan = [];
  for (let offset = 0; offset < days; offset++) {
    const day = addDays(today, offset);
    const candidates = [
      ['morning', 1, morningEntry(store, day, t)],
      ['evening', 2, eveningEntry(store, day, t)],
    ];
    for (const [kind, slot, entry] of candidates) {
      if (!entry || inQuietHours(store.quietHours, entry.time)) continue;
      const when = at(day, entry.time);
      if (when <= now) continue;
      plan.push({ id: offset * 10 + slot, at: when, kind, body: entry.body });
    }
  }
  return plan;
}
