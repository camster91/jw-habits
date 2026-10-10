/**
 * Home-screen widgets through the native WidgetBridge plugin. The app writes
 * a small JSON snapshot of today's routines; the widget only reads it and
 * queues `{routine, day}` check-ins, which the app applies to their own day
 * on the next foreground. The widget never runs domain logic. Best-effort
 * throughout: on web, or if the plugin fails, nothing happens and nothing
 * throws.
 */
import i18n from 'i18next';
import { registerPlugin } from '@capacitor/core';
import { onForeground, onStoreChange } from '../data/StoreProvider.jsx';
import { addDays, appDay, currentDay } from '../domain/day.js';
import { ROUTINE_IDS, dueToday, isDone } from '../domain/routines.js';
import { addCheckIn, labelFor } from '../domain/store.js';
import { ACCENTS } from '../theme/theme.js';
import { isNative } from '../utils/native.js';

const WidgetBridge = registerPlugin('WidgetBridge');

/** Not offered in the widget: a ministry entry needs details only the app can collect. */
const WIDGET_EXCLUDED = new Set(['ministry']);

const PUBLISH_DELAY_MS = 500;

/**
 * The snapshot the widget renders: today's due routines (minus ministry),
 * whether each is done, and the counts over those items.
 * @returns {{day: string, doneCount: number, dueCount: number,
 *   items: {routine: string, label: string, done: boolean}[], accent: string}}
 */
export function buildSnapshot(store, today, t) {
  const items = dueToday(store, today)
    .filter((id) => !WIDGET_EXCLUDED.has(id))
    .map((id) => ({ routine: id, label: labelFor(store, id, t), done: isDone(store, id, today) }));
  return {
    day: today,
    doneCount: items.filter((i) => i.done).length,
    dueCount: items.length,
    items,
    accent: ACCENTS[store.accent] ?? ACCENTS[0],
  };
}

/** Hand the snapshot to the native side. No-op on web; never throws. */
export async function publishSnapshot(store, today, t) {
  if (!isNative) return;
  try {
    await WidgetBridge.setSnapshot({ json: JSON.stringify(buildSnapshot(store, today, t)) });
  } catch (error) {
    console.warn('Could not update the widget:', error);
  }
}

function validItem(x) {
  return (
    x !== null &&
    typeof x === 'object' &&
    ROUTINE_IDS.includes(x.routine) &&
    typeof x.day === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(x.day)
  );
}

/**
 * Read the check-ins without removing them. Malformed items are
 * ignored (left pending). Resolves [] on web or on any failure.
 * @returns {Promise<{routine: string, day: string}[]>}
 */
export async function readWidgetCheckIns() {
  if (!isNative) return [];
  try {
    const result = await WidgetBridge.peekQueue();
    const items = Array.isArray(result?.items) ? result.items : [];
    return items.filter(validItem).map(({ routine, day }) => ({ routine, day }));
  } catch (error) {
    console.warn('Could not read widget check-ins:', error);
    return [];
  }
}

/** How many days back a queued tap may still land (the app may not open before 03:00). */
const MAX_AGE_DAYS = 3;

/**
 * The queued items that should become check-ins, each on its own day: a day
 * inside history, not after today and at most 3 days old; never ministry;
 * and never a routine/day that already has an entry (so a widget tap can't
 * overwrite chapters logged in the app). Repeats are dropped.
 */
function applicable(store, items, today) {
  const oldest = addDays(today, -MAX_AGE_DAYS);
  const seen = new Set();
  return items.filter(({ routine, day }) => {
    const key = routine + '|' + day;
    if (WIDGET_EXCLUDED.has(routine) || seen.has(key)) return false;
    if (day > today || day < oldest || day < store.schedule[0].from) return false;
    seen.add(key);
    return !store.log.some((e) => e.routine === routine && e.day === day);
  });
}

/** Same rule as the provider's `today` (see `currentDay`). */
function todayFor(store) {
  return currentDay(appDay(new Date()), store.lastSeenDay);
}

/**
 * Read, durably save and acknowledge widget taps, then publish the snapshot on every foreground, and
 * republish (debounced) after each store change. Call once at startup, after
 * i18n is initialised. Lives here so StoreProvider never imports a plugin.
 * @returns {() => void} unsubscribe
 */
export function registerWidgetBridge() {
  const t = i18n.t.bind(i18n);

  let processing = false;
  const offForeground = onForeground(async ({ store, update, flush, today }) => {
    if (processing) return;
    processing = true;
    try {
      const queued = await readWidgetCheckIns();
      let latest = store;
      // Skip the update (and its save) when nothing applies; inside it, re-check
      // against the current store in case it moved on during the read.
      if (applicable(store, queued, today).length > 0) {
        update((s) => {
          // Always `true`, Bible reading included: `{chapters: []}` is the
          // catch-up marker only, and today.js takes that back.
          latest = applicable(s, queued, today).reduce(
            (acc, { routine, day }) => addCheckIn(acc, { routine, day, value: true }),
            s
          );
          return latest;
        });
      }
      if (queued.length > 0) {
        // Flush even when taps already appear in memory after a previous failed write.
        // A missing new bridge/provider fails safely without draining older queues.
        if (typeof flush !== 'function') throw new Error('Durable widget save is unavailable');
        latest = await flush();
        await WidgetBridge.acknowledgeQueue({ items: queued });
      }
      await publishSnapshot(latest, today, t);
    } catch (error) {
      console.warn('Widget taps remain queued until saving succeeds:', error);
    } finally {
      processing = false;
    }
  });

  let timer = null;
  const offChange = onStoreChange((store) => {
    clearTimeout(timer);
    timer = setTimeout(() => void publishSnapshot(store, todayFor(store), t), PUBLISH_DELAY_MS);
  });

  return () => {
    offForeground();
    offChange();
    clearTimeout(timer);
  };
}
