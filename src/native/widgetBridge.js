/**
 * Home-screen widgets through the native WidgetBridge plugin. The app writes
 * a small JSON snapshot of today's routines; the widget only reads it and
 * queues `{routine, day}` check-ins, which the app applies on the next
 * foreground. The widget never runs domain logic. Best-effort throughout: on
 * web, or if the plugin fails, nothing happens and nothing throws.
 */
import i18n from 'i18next';
import { registerPlugin } from '@capacitor/core';
import { onForeground, onStoreChange } from '../data/StoreProvider.jsx';
import { appDay } from '../domain/day.js';
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
 * Take (and clear) the check-ins the widget queued. Malformed items are
 * dropped. Resolves [] on web or on any failure.
 * @returns {Promise<{routine: string, day: string}[]>}
 */
export async function drainWidgetCheckIns() {
  if (!isNative) return [];
  try {
    const result = await WidgetBridge.drainQueue();
    const items = Array.isArray(result?.items) ? result.items : [];
    return items.filter(validItem).map(({ routine, day }) => ({ routine, day }));
  } catch (error) {
    console.warn('Could not read widget check-ins:', error);
    return [];
  }
}

/**
 * The queued items that should become check-ins: today's only (a stale day
 * is dropped), never ministry, and never one already done today (so a widget
 * tap can't overwrite chapters logged in the app).
 */
function applicable(store, items, today) {
  const seen = new Set();
  return items.filter(({ routine, day }) => {
    if (day !== today || WIDGET_EXCLUDED.has(routine) || seen.has(routine)) return false;
    seen.add(routine);
    return !isDone(store, routine, today);
  });
}

function checkInValue(routine) {
  return routine === 'bibleReading' ? { chapters: [] } : true;
}

/** Same rule as the provider's `today`: the clock's app day, never before the last day seen. */
function todayFor(store) {
  const clock = appDay(new Date());
  return store.lastSeenDay && store.lastSeenDay > clock ? store.lastSeenDay : clock;
}

/**
 * Drain the widget queue and publish the snapshot on every foreground, and
 * republish (debounced) after each store change. Call once at startup, after
 * i18n is initialised. Lives here so StoreProvider never imports a plugin.
 * @returns {() => void} unsubscribe
 */
export function registerWidgetBridge() {
  const t = i18n.t.bind(i18n);

  const offForeground = onForeground(async ({ store, update, today }) => {
    const queued = await drainWidgetCheckIns();
    let latest = store;
    // Skip the update (and its save) when nothing applies; inside it, re-check
    // against the current store in case it moved on during the drain.
    if (applicable(store, queued, today).length > 0) {
      update((s) => {
        latest = applicable(s, queued, today).reduce(
          (acc, { routine }) =>
            addCheckIn(acc, { routine, day: today, value: checkInValue(routine) }),
          s
        );
        return latest;
      });
    }
    await publishSnapshot(latest, today, t);
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
