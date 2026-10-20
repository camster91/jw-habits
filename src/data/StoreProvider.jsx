/**
 * Loads the store from durable storage (upgrading a v2 value to v3), exposes it through `useStore`, and
 * persists every change. Nothing in here throws out to React: missing storage
 * falls back to a migrated or default store, saved data that fails validation
 * opens a recovery screen without overwriting it, and write failures are
 * warned about while the in-memory state stays current.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import i18n from 'i18next';
import { StoreContext } from './useStore.js';
import { appDay, currentDay } from '../domain/day.js';
import { cleanReferences, pruneAgendas } from '../domain/agenda.js';
import { defaultStore, validateStore } from '../domain/store.js';
import { migrateV1 } from '../domain/migrateV1.js';
import { upgradeStore } from '../domain/upgrade.js';
import { appLifecycle, isWeb } from '../utils/native.js';
import { durableGet, durableSet, safeGetItem } from '../utils/safeStorage.js';
import { repairStore } from '../domain/repair.js';
import { createRoutineWriter } from './routineWriter.js';
import UpdateRequired from '../components/UpdateRequired.jsx';
import DamagedData from '../components/DamagedData.jsx';

export const STORE_KEY = 'jw-habits-v2';
/** The original v2 text, kept once, the first time a v2 value is upgraded. */
export const BACKUP_KEY = `${STORE_KEY}-backup`;

const foregroundCallbacks = new Set();

/**
 * Set while a provider is loaded: returns the latest `{store, update, today}`.
 * Lets a callback registered after the load still get its first run.
 */
let latestArgs = null;

function runCallback(callback, args) {
  Promise.resolve()
    .then(() => callback(args))
    .catch((error) => console.warn('A foreground callback failed:', error));
}

/**
 * Register a callback that runs once after the store loads and again on every
 * app resume, with the latest `{store, update, today}`. May be async; a failure
 * is warned about and never affects other callbacks. Registering after the
 * load has finished still schedules one run straight away.
 * @returns {() => void} unsubscribe
 */
// The spec places onForeground beside the provider, so this file exports a non-component.
// eslint-disable-next-line react-refresh/only-export-components
export function onForeground(callback) {
  foregroundCallbacks.add(callback);
  if (latestArgs) {
    queueMicrotask(() => {
      if (foregroundCallbacks.has(callback) && latestArgs) runCallback(callback, latestArgs());
    });
  }
  return () => {
    foregroundCallbacks.delete(callback);
  };
}

const changeCallbacks = new Set();

/**
 * Register a callback that runs after each successful `update` with the new
 * store and, as a second argument, `{update, today}` so a listener can write
 * back. Not called during the initial load. A failure is warned about and
 * never affects the update or other callbacks.
 * @returns {() => void} unsubscribe
 */
// eslint-disable-next-line react-refresh/only-export-components
export function onStoreChange(callback) {
  changeCallbacks.add(callback);
  return () => {
    changeCallbacks.delete(callback);
  };
}

function notifyChange(store, extra) {
  for (const callback of [...changeCallbacks]) {
    try {
      Promise.resolve(callback(store, extra)).catch((error) =>
        console.warn('A store-change callback failed:', error)
      );
    } catch (error) {
      console.warn('A store-change callback failed:', error);
    }
  }
}

function currentLocale() {
  const raw = i18n.language || (typeof navigator !== 'undefined' && navigator.language) || 'en';
  return raw.split(/[-_]/)[0] || 'en';
}

/**
 * Today never moves backwards by a day (westward travel), but a lastSeenDay
 * more than a day ahead of the clock is dropped; refreshDay then resets it.
 */
function computeToday(lastSeenDay) {
  return currentDay(appDay(new Date()), lastSeenDay);
}

function msUntilNextRollover() {
  const now = new Date();
  const next = new Date(now);
  next.setHours(3, 0, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  return next - now;
}

/** Read the stored value, retrying once; throws if both attempts fail. */
async function readStored() {
  try {
    return await durableGet(STORE_KEY);
  } catch {
    return durableGet(STORE_KEY);
  }
}

/**
 * Keeps the original v2 text under BACKUP_KEY unless a backup already exists.
 * @returns {Promise<boolean>} false when the backup could not be checked or written
 */
async function keepV2Backup(raw) {
  try {
    if ((await durableGet(BACKUP_KEY)) == null) await durableSet(BACKUP_KEY, raw);
    return true;
  } catch (error) {
    console.warn('Could not back up the data before upgrading it; not saving this session:', error);
    return false;
  }
}

/** A stored value another window wrote, if this app can use it as it is. */
function adoptable(raw) {
  try {
    const result = validateStore(JSON.parse(raw));
    return result.ok ? result.store : null;
  } catch {
    return null;
  }
}

/**
 * @returns {Promise<{store: object, raw: string|null, persisted: boolean, readOnly: boolean}
 *   | {newer: {raw: string}} | {damaged: {raw: string, repair: object|null}}>}
 *   `persisted`: the store came from storage unchanged. `readOnly`: storage
 *   could not be read or a v2 value could not be backed up before its
 *   upgrade, so nothing may be written this session (the stored value must
 *   survive). `damaged`: the saved value failed validation; nothing is written
 *   until the user chooses on the recovery screen.
 */
async function loadStore() {
  const today = appDay(new Date());
  const locale = currentLocale();
  let raw = null;
  let readOnly = false;
  try {
    raw = await readStored();
  } catch (error) {
    readOnly = true;
    console.warn('Could not read the stored data; running without saving this session:', error);
  }
  if (raw != null) {
    let result = { ok: false };
    let upgraded = false;
    let candidate;
    try {
      const parsed = JSON.parse(raw);
      candidate = parsed;
      const current = upgradeStore(parsed, today);
      candidate = current;
      upgraded = current !== parsed;
      result = validateStore(current);
      // An older app cannot interpret a newer schema. Preserve its raw value
      // and block the normal app before defaults, cleanup or timers can write.
      if (result.reason === 'newerVersion') return { newer: { raw } };
    } catch {
      // unparseable: handled as corrupt below
    }
    if (result.ok && !upgraded)
      return { store: result.store, raw, persisted: true, readOnly: false };
    if (result.ok) {
      // Saving the upgraded store replaces the v2 text, so keep that first.
      // Without a backup, leave storage alone and run read-only this session.
      const backedUp = await keepV2Backup(raw);
      return { store: result.store, raw, persisted: false, readOnly: !backedUp };
    }
    // One bad field must never replace the whole history (#315). Leave the
    // saved bytes alone and let the user export, repair or start fresh.
    console.warn('Stored data failed validation; showing recovery before any change.');
    let repair = null;
    try {
      repair = repairStore(candidate, today, locale);
    } catch {
      // no repair offered
    }
    return { damaged: { raw, repair } };
  }
  let store = null;
  try {
    store = migrateV1(safeGetItem, today, locale);
  } catch (error) {
    console.warn('Migrating the old data failed:', error);
  }
  return { store: store ?? defaultStore(today, locale), raw, persisted: false, readOnly };
}

export function StoreProvider({ children }) {
  const [store, setStore] = useState(null);
  const [today, setToday] = useState(null);
  const [newerStore, setNewerStore] = useState(null);
  const [damaged, setDamaged] = useState(null);
  const [conflict, setConflict] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const storeRef = useRef(null);
  const todayRef = useRef(null);
  const readOnlyRef = useRef(false);
  const writerRef = useRef(null);
  const timerRef = useRef(null);
  const readyRef = useRef(false);

  const persist = useCallback((next) => {
    if (readOnlyRef.current || writerRef.current.blocked) return;
    writerRef.current.save(JSON.stringify(next)).catch((error) => {
      console.warn('Could not save your data:', error);
    });
  }, []);

  const update = useCallback(
    (fn) => {
      const next = fn(storeRef.current);
      storeRef.current = next;
      setStore(next);
      persist(next);
      if (readyRef.current) notifyChange(next, { update, today: todayRef.current });
    },
    [persist]
  );

  // Backup replacement acknowledges the durable write, unlike routine edits.
  // Dependent services (reminders, widget, badges) hear about it only after
  // that write succeeds, so a failed or cancelled import publishes nothing.
  const replace = useCallback(
    async (next, beforeWrite) => {
      if (readOnlyRef.current) throw new Error('Saving is paused; stored data was not replaced.');
      if (!validateStore(next).ok) throw new Error('Invalid routine data');
      await writerRef.current.replace(JSON.stringify(next), beforeWrite);
      storeRef.current = next;
      setStore(next);
      if (readyRef.current) notifyChange(next, { update, today: todayRef.current });
    },
    [update]
  );

  // Widget taps stay queued until this snapshot has a durable acknowledgement.
  const flush = useCallback(async () => {
    if (readOnlyRef.current) throw new Error('Saving is paused; widget taps remain queued.');
    const current = storeRef.current;
    if (!validateStore(current).ok) throw new Error('Invalid routine data');
    await writerRef.current.save(JSON.stringify(current));
    return current;
  }, []);

  // Recompute today and re-arm the 03:00 timer from the current clock, so a
  // resume after suspension or a timezone change never leaves a stale timer.
  const refreshDay = useCallback(
    function refresh() {
      const t = computeToday(storeRef.current.lastSeenDay);
      todayRef.current = t;
      setToday(t);
      if (t !== storeRef.current.lastSeenDay) update((s) => ({ ...s, lastSeenDay: t }));
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(refresh, msUntilNextRollover());
    },
    [update]
  );

  // A check-in made after sleep must not land on yesterday (#319). Returns
  // the current app day, rolling over first if the clock has moved on.
  const ensureToday = useCallback(() => {
    const t = computeToday(storeRef.current.lastSeenDay);
    if (t !== todayRef.current) refreshDay();
    return t;
  }, [refreshDay]);

  const getArgs = useCallback(
    () => ({ store: storeRef.current, update, flush, today: todayRef.current }),
    [update, flush]
  );

  const runForeground = useCallback(() => {
    for (const callback of [...foregroundCallbacks]) runCallback(callback, getArgs());
  }, [getArgs]);

  useEffect(() => {
    let cancelled = false;
    loadStore().then(({ store: stored, raw, persisted, readOnly, newer, damaged: bad }) => {
      if (cancelled) return;
      if (newer) {
        setNewerStore(newer);
        return;
      }
      if (bad) {
        setDamaged(bad);
        return;
      }
      setDamaged(null);
      // Drop references to deleted plans/steps and agenda weeks out of range.
      // Both return the same object when nothing changed, so a clean store is not rewritten.
      // Prune against the provider's app day (non-regressing, like refreshDay), not the raw clock.
      const loaded = pruneAgendas(cleanReferences(stored), computeToday(stored.lastSeenDay));
      readOnlyRef.current = readOnly;
      writerRef.current = createRoutineWriter({
        key: STORE_KEY,
        initialRaw: raw,
        onConflict: () => setConflict(true),
      });
      storeRef.current = loaded;
      setStore(loaded);
      if (!persisted || loaded !== stored) persist(loaded);
      refreshDay();
    });
    return () => {
      cancelled = true;
      readyRef.current = false;
      clearTimeout(timerRef.current);
      if (latestArgs === getArgs) latestArgs = null;
    };
  }, [persist, refreshDay, runForeground, getArgs, attempt]);

  const loaded = store !== null && today !== null;
  useEffect(() => {
    if (!loaded) return undefined;
    // Child effects (including badge toasts) have subscribed before this effect runs.
    readyRef.current = true;
    latestArgs = getArgs;
    runForeground();
    return appLifecycle.onStateChange(({ isActive }) => {
      if (!isActive) return;
      refreshDay();
      runForeground();
    });
  }, [loaded, refreshDay, runForeground, getArgs]);

  // Web/PWA has no native resume event, and timers stall while a tab sleeps.
  // Re-check the day when the page is shown or focused, and once a minute.
  useEffect(() => {
    if (!loaded || !isWeb) return undefined;
    const check = () => {
      if (computeToday(storeRef.current.lastSeenDay) !== todayRef.current) refreshDay();
    };
    const resume = () => {
      if (document.visibilityState === 'hidden') return;
      refreshDay();
      runForeground();
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') resume();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pageshow', resume);
    window.addEventListener('focus', check);
    const interval = setInterval(check, 60_000);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pageshow', resume);
      window.removeEventListener('focus', check);
      clearInterval(interval);
    };
  }, [loaded, refreshDay, runForeground]);

  // Another tab saved the routine store (#317). Adopt it when this window has
  // nothing unsaved; otherwise pause saving here rather than overwrite it.
  useEffect(() => {
    if (!loaded || !isWeb) return undefined;
    const onStorage = (event) => {
      if (event.storageArea && event.storageArea !== window.localStorage) return;
      if (event.key !== null && event.key !== STORE_KEY) return;
      const writer = writerRef.current;
      if (readOnlyRef.current || writer.blocked) return;
      if (event.key === STORE_KEY && event.newValue !== null && writer.canAdopt(event.oldValue)) {
        const next = adoptable(event.newValue);
        if (next) {
          writer.adopt(event.newValue);
          storeRef.current = next;
          setStore(next);
          return;
        }
      }
      writer.block();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [loaded]);

  const value = useMemo(
    () => ({
      store,
      update,
      replace,
      today,
      ensureToday,
      savingPaused: readOnlyRef.current,
      conflict,
    }),
    [store, update, replace, today, ensureToday, conflict]
  );
  if (newerStore) return <UpdateRequired raw={newerStore.raw} />;
  if (damaged)
    return (
      <DamagedData
        raw={damaged.raw}
        repair={damaged.repair}
        storeKey={STORE_KEY}
        onResolved={() => setAttempt((n) => n + 1)}
      />
    );
  if (!loaded) return null;
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
