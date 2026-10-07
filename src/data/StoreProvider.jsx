/**
 * Loads the store from durable storage (upgrading a v2 value to v3), exposes it through `useStore`, and
 * persists every change. Nothing in here throws out to React: bad storage
 * falls back to a migrated or default store, and write failures are warned
 * about while the in-memory state stays current.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import i18n from 'i18next';
import { StoreContext } from './useStore.js';
import { appDay, currentDay } from '../domain/day.js';
import { cleanReferences, pruneAgendas } from '../domain/agenda.js';
import { defaultStore, validateStore } from '../domain/store.js';
import { migrateV1 } from '../domain/migrateV1.js';
import { upgradeStore } from '../domain/upgrade.js';
import { appLifecycle } from '../utils/native.js';
import { durableGet, durableSet, safeGetItem } from '../utils/safeStorage.js';

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

/**
 * @returns {Promise<{store: object, persisted: boolean, readOnly: boolean}>}
 *   `persisted`: the store came from storage unchanged. `readOnly`: storage
 *   could not be read, the unreadable value could not be kept, or a v2 value
 *   could not be backed up before its upgrade, so nothing may be written this
 *   session (the stored value must survive).
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
    try {
      const parsed = JSON.parse(raw);
      const current = upgradeStore(parsed, today);
      upgraded = current !== parsed;
      result = validateStore(current);
    } catch {
      // unparseable: handled as corrupt below
    }
    if (result.ok && !upgraded) return { store: result.store, persisted: true, readOnly: false };
    if (result.ok) {
      // Saving the upgraded store replaces the v2 text, so keep that first.
      // Without a backup, leave storage alone and run read-only this session.
      const backedUp = await keepV2Backup(raw);
      return { store: result.store, persisted: false, readOnly: !backedUp };
    }
    console.warn('Stored data failed validation; keeping a copy and starting over.');
    try {
      await durableSet(`${STORE_KEY}-corrupt-${Date.now()}`, raw);
    } catch (error) {
      readOnly = true;
      console.warn('Could not keep a copy of the unreadable data; not saving this session:', error);
    }
  }
  let store = null;
  try {
    store = migrateV1(safeGetItem, today, locale);
  } catch (error) {
    console.warn('Migrating the old data failed:', error);
  }
  return { store: store ?? defaultStore(today, locale), persisted: false, readOnly };
}

export function StoreProvider({ children }) {
  const [store, setStore] = useState(null);
  const [today, setToday] = useState(null);
  const storeRef = useRef(null);
  const todayRef = useRef(null);
  const readOnlyRef = useRef(false);
  const timerRef = useRef(null);
  const readyRef = useRef(false);

  const persist = useCallback((next) => {
    if (readOnlyRef.current) return;
    durableSet(STORE_KEY, JSON.stringify(next)).catch((error) => {
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

  const getArgs = useCallback(
    () => ({ store: storeRef.current, update, today: todayRef.current }),
    [update]
  );

  const runForeground = useCallback(() => {
    for (const callback of [...foregroundCallbacks]) runCallback(callback, getArgs());
  }, [getArgs]);

  useEffect(() => {
    let cancelled = false;
    loadStore().then(({ store: stored, persisted, readOnly }) => {
      if (cancelled) return;
      // Drop references to deleted plans/steps and agenda weeks out of range.
      // Both return the same object when nothing changed, so a clean store is not rewritten.
      // Prune against the provider's app day (non-regressing, like refreshDay), not the raw clock.
      const loaded = pruneAgendas(cleanReferences(stored), computeToday(stored.lastSeenDay));
      readOnlyRef.current = readOnly;
      storeRef.current = loaded;
      setStore(loaded);
      if (!persisted || loaded !== stored) persist(loaded);
      refreshDay();
      readyRef.current = true;
      latestArgs = getArgs;
      runForeground();
    });
    return () => {
      cancelled = true;
      readyRef.current = false;
      clearTimeout(timerRef.current);
      if (latestArgs === getArgs) latestArgs = null;
    };
  }, [persist, refreshDay, runForeground, getArgs]);

  const loaded = store !== null;
  useEffect(() => {
    if (!loaded) return undefined;
    return appLifecycle.onStateChange(({ isActive }) => {
      if (!isActive) return;
      refreshDay();
      runForeground();
    });
  }, [loaded, refreshDay, runForeground]);

  const value = useMemo(() => ({ store, update, today }), [store, update, today]);
  if (!loaded || today === null) return null;
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
