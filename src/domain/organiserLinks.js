import { addDays } from './day.js';
import { calendarEvents, civilDate, organiserOccurrences } from './organiser.js';

export function organiserItemUrl(kind, id) {
  return `/plans?${new URLSearchParams({ itemKind: kind, itemId: id })}`;
}

/** Resolve a series link to upcoming, recent, or first activity without writing state. */
export function linkedOrganiserOccurrence(state, kind, id, today = civilDate()) {
  if (!['task', 'event'].includes(kind)) return null;
  const item = state[kind === 'task' ? 'tasks' : 'events'].find((i) => i.id === id);
  if (!item || item.archivedAt) return null;
  const scoped = {
    ...state,
    tasks: kind === 'task' ? [item] : [],
    events: kind === 'event' ? [item] : [],
    exceptions: state.exceptions.filter((e) => e.itemId === id),
  };
  const occurrences = (from, to = from) =>
    (kind === 'event'
      ? calendarEvents(scoped, from, to)
      : organiserOccurrences(scoped, kind, from, to)
    ).filter((o) => o.status !== 'skipped');
  if (item.repeat.frequency === 'none') {
    const exception = scoped.exceptions.find((e) => e.date === item.date);
    const date = exception ? exception.scheduledDate : item.date;
    const anchor = date ?? today;
    return (
      occurrences(
        kind === 'event' ? addDays(anchor, -2) : anchor,
        kind === 'event' ? addDays(anchor, 2) : anchor
      )[0] ?? null
    );
  }
  const from = item.date > today ? item.date : today;
  const upcoming = occurrences(from, addDays(from, 180));
  return (
    upcoming.find((o) => o.status === 'open') ??
    upcoming[0] ??
    occurrences(addDays(today, -180), today).at(-1) ??
    occurrences(item.date, addDays(item.date, 7))[0] ??
    null
  );
}
