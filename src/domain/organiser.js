import { fromFields as zonedFields } from 'temporal-polyfill/fns/ZonedDateTime';
import { newId } from './ids.js';
import { addDays, weekday } from './day.js';
import { isSafeHttpUrl } from '../utils/safeUrls.js';

export const ORGANISER_KEY = 'faithful-days-organiser-v1';
export const ORGANISER_LIMIT_BYTES = 2 * 1024 * 1024;
export const emptyOrganiser = () => ({
  version: 1,
  revision: 0,
  tasks: [],
  events: [],
  exceptions: [],
  personalRoutines: [],
  routineCheckIns: [],
  relations: [],
});
const object = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
const text = (x, max, required = false) =>
  typeof x === 'string' && x.length <= max && (!required || Boolean(x.trim()));
const id = (x) => text(x, 100, true);
export const civilDate = (now = new Date()) =>
  `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
export function validDate(x) {
  if (typeof x !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(x)) return false;
  const date = new Date(x + 'T12:00:00Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === x;
}
const time = (x) => typeof x === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(x);
const stamp = (x) =>
  typeof x === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(x) && Number.isFinite(Date.parse(x));
export const deviceZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;
export function validZone(zone) {
  try {
    new Intl.DateTimeFormat('en', { timeZone: zone });
    return text(zone, 100, true);
  } catch {
    return false;
  }
}
const unique = (xs) => new Set(xs.map((x) => x.id)).size === xs.length;
const list = (xs, max, test) =>
  Array.isArray(xs) && xs.length <= max && xs.every(test) && unique(xs);
const ref = (x) =>
  object(x) &&
  ['task', 'event', 'note', 'meeting', 'assignment', 'plan', 'step', 'day'].includes(x.kind) &&
  id(x.id);
const repeat = (x, date) =>
  object(x) &&
  ['none', 'daily', 'weekly', 'monthly'].includes(x.frequency) &&
  Array.isArray(x.weekdays) &&
  x.weekdays.length <= 7 &&
  x.weekdays.every((d) => Number.isInteger(d) && d >= 0 && d <= 6) &&
  new Set(x.weekdays).size === x.weekdays.length &&
  (x.frequency !== 'weekly' || x.weekdays.length > 0) &&
  (x.until === null || (validDate(x.until) && x.until >= date)) &&
  (x.frequency === 'none' || validDate(date));
function item(x, kind) {
  return (
    object(x) &&
    id(x.id) &&
    text(x.title, 120, true) &&
    text(x.details, 2000) &&
    (kind === 'task' ? x.date === null || validDate(x.date) : validDate(x.date)) &&
    (x.time === null || (time(x.time) && validDate(x.date))) &&
    (kind === 'event' ? validZone(x.timezone) : x.timezone === 'floating') &&
    repeat(x.repeat, x.date) &&
    typeof x.reminder === 'boolean' &&
    (!x.reminder || x.time !== null) &&
    stamp(x.createdAt) &&
    stamp(x.updatedAt) &&
    (x.archivedAt === null || stamp(x.archivedAt)) &&
    (kind !== 'event' ||
      (x.endDate === null && x.endTime === null) ||
      (validDate(x.endDate) &&
        x.endDate <= addDays(x.date, 365) &&
        (x.time === null
          ? x.endTime === null && x.endDate > x.date
          : time(x.endTime) && `${x.endDate}T${x.endTime}` > `${x.date}T${x.time}`)))
  );
}
export function validateOrganiser(x) {
  if (
    !object(x) ||
    x.version !== 1 ||
    !Number.isSafeInteger(x.revision) ||
    x.revision < 0 ||
    !list(x.tasks, 2000, (t) => item(t, 'task')) ||
    !list(x.events, 1000, (e) => item(e, 'event')) ||
    !list(
      x.exceptions,
      10000,
      (e) =>
        object(e) &&
        id(e.id) &&
        id(e.itemId) &&
        (e.date === null || validDate(e.date)) &&
        (e.scheduledDate === null || validDate(e.scheduledDate)) &&
        ['open', 'done', 'skipped'].includes(e.status) &&
        (e.status === 'done' ? stamp(e.completedAt) : e.completedAt === null) &&
        text(e.title, 120, true) &&
        text(e.details, 2000) &&
        (e.time === null || time(e.time))
    ) ||
    !list(
      x.personalRoutines,
      100,
      (r) =>
        object(r) &&
        id(r.id) &&
        text(r.title, 120, true) &&
        ['daily', 'weekly'].includes(r.cadence) &&
        ['sun', 'book', 'sparkles', 'heart', 'calendar'].includes(r.icon) &&
        (r.url === null || (text(r.url, 2000, true) && isSafeHttpUrl(r.url))) &&
        (r.archivedAt === null || stamp(r.archivedAt))
    ) ||
    !list(
      x.routineCheckIns,
      10000,
      (c) => object(c) && id(c.id) && id(c.routineId) && validDate(c.day) && stamp(c.recordedAt)
    ) ||
    !list(x.relations, 5000, (r) => object(r) && id(r.id) && ref(r.source) && ref(r.target))
  )
    return { ok: false, reason: 'badShape' };
  const items = [...x.tasks, ...x.events];
  if (
    !unique(items) ||
    x.exceptions.some(
      (e) => !items.some((i) => i.id === e.itemId) || e.id !== occurrenceKey(e.itemId, e.date)
    ) ||
    x.routineCheckIns.some(
      (c) =>
        !x.personalRoutines.some((r) => r.id === c.routineId) || c.id !== `${c.routineId}@${c.day}`
    ) ||
    new Set(
      x.relations.map((r) => `${r.source.kind}:${r.source.id}>${r.target.kind}:${r.target.id}`)
    ).size !== x.relations.length ||
    x.relations.some((r) =>
      [r.source, r.target].some(
        (v) =>
          ['task', 'event'].includes(v.kind) &&
          !x[v.kind === 'task' ? 'tasks' : 'events'].some((i) => i.id === v.id)
      )
    )
  )
    return { ok: false, reason: 'badReferences' };
  for (const e of x.exceptions) {
    const base = items.find((i) => i.id === e.itemId);
    const kind = x.tasks.some((t) => t.id === base.id) ? 'task' : 'event';
    if (
      !matches({ ...base, repeat: { ...base.repeat, until: null } }, e.date) ||
      !item(
        {
          ...base,
          ...e,
          date: e.scheduledDate,
          repeat: { frequency: 'none', weekdays: [], until: null },
        },
        kind
      )
    )
      return { ok: false, reason: 'badReferences' };
  }
  const raw = JSON.stringify(x);
  if (new TextEncoder().encode(raw).length > ORGANISER_LIMIT_BYTES)
    return { ok: false, reason: 'tooLarge' };
  return { ok: true, organiser: JSON.parse(raw) };
}
export const occurrenceKey = (id, date) => `${id}@${date ?? 'undated'}`;
export function newOrganiserItem(kind, values, now = new Date()) {
  const stamp = now.toISOString();
  return {
    id: newId(),
    title: '',
    details: '',
    date: kind === 'event' ? civilDate(now) : null,
    time: null,
    timezone: kind === 'event' ? deviceZone() : 'floating',
    repeat: { frequency: 'none', weekdays: [], until: null },
    reminder: false,
    createdAt: stamp,
    updatedAt: stamp,
    archivedAt: null,
    ...(kind === 'event' ? { endDate: null, endTime: null } : {}),
    ...values,
  };
}
export function putOrganiserItem(state, kind, value, now = new Date()) {
  const key = kind === 'task' ? 'tasks' : 'events';
  const found = state[key].find((i) => i.id === value.id);
  const next = found
    ? { ...found, ...value, updatedAt: now.toISOString() }
    : newOrganiserItem(kind, value, now);
  const updated = {
    ...state,
    [key]: found ? state[key].map((i) => (i.id === next.id ? next : i)) : [...state[key], next],
  };
  if (!validateOrganiser(updated).ok)
    throw new Error('Check the title, dates, time and recurrence. Your draft is kept.');
  return updated;
}
function matches(item, date) {
  if (!item.date) return date === null;
  if (!date || date < item.date || (item.repeat.until && date > item.repeat.until)) return false;
  switch (item.repeat.frequency) {
    case 'none':
      return date === item.date;
    case 'daily':
      return true;
    case 'weekly':
      return item.repeat.weekdays.includes(weekday(date));
    case 'monthly':
      return date.slice(-2) === item.date.slice(-2);
    default:
      return false;
  }
}
/** Visible ranges are bounded; moved occurrences retain their original identity. */
export function organiserOccurrences(state, kind, from, to, { includeArchived = false } = {}) {
  if (!validDate(from) || !validDate(to) || to < from || to > addDays(from, 366))
    throw new Error('Choose a date range of at most one year.');
  const result = [];
  for (const item of state[kind === 'task' ? 'tasks' : 'events']) {
    if (item.archivedAt && !includeArchived) continue;
    const exceptions = state.exceptions.filter((e) => e.itemId === item.id);
    const push = (date) => {
      const key = occurrenceKey(item.id, date),
        exception = exceptions.find((e) => e.id === key);
      const scheduledDate = exception ? exception.scheduledDate : date;
      if (scheduledDate !== null && (scheduledDate < from || scheduledDate > to)) return;
      result.push({
        ...item,
        ...(kind === 'event' && item.endDate && date
          ? {
              endDate: addDays(
                date,
                Math.round(
                  (Date.parse(item.endDate + 'T12:00:00Z') - Date.parse(item.date + 'T12:00:00Z')) /
                    86400000
                )
              ),
            }
          : {}),
        ...exception,
        id: item.id,
        key,
        originalDate: date,
        date: scheduledDate,
        status: exception?.status ?? 'open',
        kind,
      });
    };
    if (item.date === null) push(null);
    else
      for (let date = from; date <= to; date = addDays(date, 1))
        if (matches(item, date)) push(date);
    for (const e of exceptions)
      if (
        e.date !== null &&
        (e.date < from || e.date > to) &&
        e.scheduledDate >= from &&
        e.scheduledDate <= to
      )
        push(e.date);
  }
  return result.sort(
    (a, b) =>
      (a.date ?? '9999').localeCompare(b.date ?? '9999') ||
      (a.time ?? '').localeCompare(b.time ?? '')
  );
}
export function changeOccurrence(state, occurrence, change, now = new Date()) {
  const { id: itemId, originalDate: date, key } = occurrence;
  const exception = {
    id: key,
    itemId,
    date,
    scheduledDate: occurrence.date,
    status: occurrence.status,
    completedAt: occurrence.completedAt ?? null,
    title: occurrence.title,
    details: occurrence.details,
    time: occurrence.time,
    timezone: occurrence.timezone,
    reminder: occurrence.reminder,
    ...(occurrence.kind === 'event'
      ? { endDate: occurrence.endDate, endTime: occurrence.endTime }
      : {}),
    ...change,
  };
  exception.completedAt =
    exception.status === 'done' ? (change.completedAt ?? now.toISOString()) : null;
  const next = {
    ...state,
    exceptions: [...state.exceptions.filter((e) => e.id !== key), exception],
  };
  if (!validateOrganiser(next).ok) throw new Error('Invalid occurrence change');
  return next;
}
export function editFuture(state, occurrence, values, now = new Date()) {
  const key = occurrence.kind === 'task' ? 'tasks' : 'events',
    item = state[key].find((i) => i.id === occurrence.id);
  if (item.repeat.frequency === 'none')
    return changeOccurrence(state, occurrence, {
      ...values,
      scheduledDate: values.date ?? occurrence.date,
    });
  const ended =
    occurrence.originalDate === item.date
      ? { ...item, archivedAt: now.toISOString() }
      : {
          ...item,
          repeat: { ...item.repeat, until: addDays(occurrence.originalDate, -1) },
          updatedAt: now.toISOString(),
        };
  const next = { ...state, [key]: state[key].map((i) => (i.id === item.id ? ended : i)) };
  return putOrganiserItem(
    next,
    occurrence.kind,
    {
      ...item,
      ...values,
      id: newId(),
      date: values.date ?? occurrence.originalDate,
      createdAt: now.toISOString(),
    },
    now
  );
}
export function archiveItem(state, kind, id, now = new Date()) {
  return putOrganiserItem(state, kind, { id, archivedAt: now.toISOString() }, now);
}
export function linkNote(state, noteId, target) {
  const source = { kind: 'note', id: noteId };
  if (
    state.relations.some(
      (r) =>
        r.source.kind === 'note' &&
        r.source.id === noteId &&
        r.target.kind === target.kind &&
        r.target.id === target.id
    )
  )
    return state;
  return { ...state, relations: [...state.relations, { id: newId(), source, target }] };
}
/** Compatible disambiguation shifts DST gaps forward and chooses the earlier overlap. */
export function occurrenceInstant(occurrence, zone = deviceZone()) {
  if (!occurrence.date || !occurrence.time) return null;
  const [year, month, day] = occurrence.date.split('-').map(Number),
    [hour, minute] = occurrence.time.split(':').map(Number);
  return new Date(
    zonedFields(
      {
        year,
        month,
        day,
        hour,
        minute,
        timeZone: occurrence.timezone === 'floating' ? zone : occurrence.timezone,
      },
      { disambiguation: 'compatible' }
    ).epochMilliseconds
  );
}
export function togglePersonalCheckIn(state, routineId, day, now = new Date()) {
  const id = `${routineId}@${day}`;
  return {
    ...state,
    routineCheckIns: state.routineCheckIns.some((c) => c.id === id)
      ? state.routineCheckIns.filter((c) => c.id !== id)
      : [...state.routineCheckIns, { id, routineId, day, recordedAt: now.toISOString() }],
  };
}

/** Calendar visibility follows device civil dates; all-day dates never shift zones. */
export function calendarEvents(state, from, to, zone = deviceZone()) {
  const span = Math.max(
    0,
    ...state.events.map((e) =>
      e.endDate
        ? Math.ceil(
            (Date.parse(e.endDate + 'T12:00:00Z') - Date.parse(e.date + 'T12:00:00Z')) / 86400000
          )
        : 0
    )
  );
  const lookback = Math.min(
    span + 2,
    365 - Math.round((Date.parse(to + 'T12:00:00Z') - Date.parse(from + 'T12:00:00Z')) / 86400000)
  );
  const parts = (instant) => {
    const p = Object.fromEntries(
      new Intl.DateTimeFormat('en', {
        timeZone: zone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      })
        .formatToParts(instant)
        .map((p) => [p.type, p.value])
    );
    return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
  };
  return organiserOccurrences(state, 'event', addDays(from, -lookback), addDays(to, 1))
    .filter((e) => e.status !== 'skipped')
    .map((e) => {
      const start = e.time ? parts(occurrenceInstant(e)) : { date: e.date, time: null };
      const end = e.endDate
        ? e.endTime
          ? parts(occurrenceInstant({ ...e, date: e.endDate, time: e.endTime }))
          : { date: addDays(e.endDate, -1), time: null }
        : start;
      return { ...e, displayDate: start.date, displayTime: start.time, displayEndDate: end.date };
    })
    .filter((e) => e.displayDate <= to && e.displayEndDate >= from)
    .sort(
      (a, b) =>
        a.displayDate.localeCompare(b.displayDate) ||
        (a.displayTime ?? '').localeCompare(b.displayTime ?? '')
    );
}
