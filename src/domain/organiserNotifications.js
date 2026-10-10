import { addDays } from './day.js';
import { civilDate, organiserOccurrences, occurrenceInstant } from './organiser.js';
import { inQuietHours } from './notifications.js';

/** IDs are in a separate range; native sync cancels the previous combined plan first. */
export function planOrganiserNotifications(organiser, store, now = new Date()) {
  if (!store.reminders.enabled) return [];
  const from = civilDate(now),
    to = addDays(from, 14),
    entries = [];
  for (const kind of ['task', 'event'])
    for (const item of organiserOccurrences(organiser, kind, addDays(from, -1), to)) {
      if (!item.reminder || item.status !== 'open') continue;
      const at = occurrenceInstant(item);
      if (!at || at <= now) continue;
      const hhmm = `${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')}`;
      if (inQuietHours(store.quietHours, hhmm)) continue;
      entries.push({ at, body: item.title, key: item.key });
    }
  return entries
    .sort((a, b) => a.at - b.at || a.key.localeCompare(b.key))
    .map((e, i) => ({ ...e, id: 1000 + i }));
}
