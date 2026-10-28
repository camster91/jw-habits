/**
 * Big dates (`store.events`): the Memorial, conventions, assemblies, circuit
 * overseer visits and anything else the user types in. Pure: no React and no
 * storage. Every writer returns the store itself when it would make an event
 * `validateStore` refuses, so a bad input can never corrupt the store.
 */
import { addDays } from './day.js';
import { EVENT_KINDS, MAX_EVENTS, newId, validEvent } from './store.js';
import { MAX_TITLE } from './ids.js';
import { isSafeHttpUrl } from '../utils/safeUrls.js';

/** Days ahead that Today's "Coming up" line looks. */
export const COMING_UP_DAYS = 14;

const FIELDS = ['kind', 'title', 'start', 'end', 'link'];

/** A real calendar day 'YYYY-MM-DD' (the same test validateStore applies). */
const isDay = (x) => typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x) && addDays(x, 0) === x;

/** A trimmed string, or null when blank or not a string. */
const clean = (x) => (typeof x === 'string' && x.trim() !== '' ? x.trim() : null);

/** An event from the form's fields: names and links trimmed, blanks as null. */
function normalize(id, fields) {
  return {
    id,
    kind: fields.kind,
    title: clean(fields.title),
    start: fields.start,
    end: clean(fields.end),
    link: clean(fields.link),
  };
}

/** The given fields of `input` only (never `id`). */
function pick(input) {
  const out = {};
  for (const k of FIELDS) if (k in input) out[k] = input[k];
  return out;
}

const isObject = (x) => typeof x === 'object' && x !== null && !Array.isArray(x);

/**
 * Adds an event with a fresh id (any `id` in `input` is ignored). Returns the
 * store unchanged when the event is invalid or the list is at MAX_EVENTS.
 */
export function addEvent(store, input) {
  if (!isObject(input) || store.events.length >= MAX_EVENTS) return store;
  const event = normalize(newId(), pick(input));
  if (!validEvent(event)) return store;
  return { ...store, events: [...store.events, event] };
}

/** Changes the given fields of one event; unknown id or an invalid result: unchanged. */
export function updateEvent(store, id, patch) {
  const index = store.events.findIndex((e) => e.id === id);
  if (index < 0 || !isObject(patch)) return store;
  const event = normalize(id, { ...store.events[index], ...pick(patch) });
  if (!validEvent(event)) return store;
  const events = store.events.slice();
  events[index] = event;
  return { ...store, events };
}

/** Deletes one event; an unknown id changes nothing. */
export function removeEvent(store, id) {
  if (!store.events.some((e) => e.id === id)) return store;
  return { ...store, events: store.events.filter((e) => e.id !== id) };
}

const byStart = (a, b) =>
  a.start < b.start ? -1 : a.start > b.start ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0;

/** Every event, by start date and then id. */
export function sortedEvents(store) {
  return [...store.events].sort(byStart);
}

/**
 * Events starting from `day` to `withinDays` days after it (both ends
 * included), sorted. An event that started before `day` is not upcoming,
 * even while it is still going.
 */
export function upcoming(store, day, withinDays) {
  const last = Number.isFinite(withinDays) ? addDays(day, withinDays) : null;
  return sortedEvents(store).filter((e) => e.start >= day && (last === null || e.start <= last));
}

/** Events that started before `day`, the most recent first. */
export function pastEvents(store, day) {
  return sortedEvents(store)
    .filter((e) => e.start < day)
    .reverse();
}

/** Today's "Coming up" event: the first starting within 14 days, or null. */
export function nextComing(store, day) {
  return upcoming(store, day, COMING_UP_DAYS)[0] ?? null;
}

/** The event's name: its title when not blank, else the kind's name. */
export function eventLabel(event, t) {
  return clean(event.title) ?? t('fd.events.kind.' + event.kind);
}

/**
 * Why the store would refuse these form fields, as `{field: reason}` (empty
 * when valid). Reasons are keys under `fd.events.error`.
 */
export function eventErrors(fields) {
  const errors = {};
  const title = clean(fields.title);
  const end = clean(fields.end);
  const link = clean(fields.link);
  if (!EVENT_KINDS.includes(fields.kind)) errors.kind = 'kindNeeded';
  if (title === null && fields.kind === 'other') errors.title = 'titleNeeded';
  if (title !== null && title.length > MAX_TITLE) errors.title = 'titleTooLong';
  if (!isDay(fields.start)) errors.start = 'startNeeded';
  if (end !== null && !isDay(end)) errors.end = 'badEnd';
  else if (end !== null && isDay(fields.start) && end < fields.start) errors.end = 'endBeforeStart';
  if (link !== null && !isSafeHttpUrl(link)) errors.link = 'badLink';
  return errors;
}

/**
 * 'YYYY-MM-DD' as a short local date, "Sat 14 Nov", formatted with
 * Intl.DateTimeFormat in the app's language like Today's other dates. The
 * parts are joined in a fixed order so the line reads the same everywhere;
 * `withYear` adds the year ("Sat 14 Nov 2027").
 */
export function shortDate(day, language, withYear = false) {
  const [y, m, d] = day.split('-').map(Number);
  const parts = new Intl.DateTimeFormat(language, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).formatToParts(new Date(y, m - 1, d, 12));
  const part = (type) => parts.find((p) => p.type === type).value;
  const text = `${part('weekday')} ${part('day')} ${part('month')}`;
  return withYear ? `${text} ${part('year')}` : text;
}

/** An event's dates: "Sat 14 Nov", or "Sat 14 Nov – Sun 15 Nov" when it ends later. */
export function eventDates(event, language, today) {
  const withYear = (day) => day.slice(0, 4) !== today.slice(0, 4);
  const start = shortDate(event.start, language, withYear(event.start));
  if (event.end === null || event.end === event.start) return start;
  return `${start} – ${shortDate(event.end, language, withYear(event.end))}`;
}
