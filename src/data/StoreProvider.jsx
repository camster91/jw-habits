/**
 * Loads the v2 store from durable storage, exposes it through `useStore`, and
 * persists every change. Nothing in here throws out to React: bad storage
 * falls back to a migrated or default store, and write failures are warned
 * about while the in-memory state stays current.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import i18n from 'i18next';
import { StoreContext } from './useStore.js';
import { appDay } from '../domain/day.js';
import { defaultStore, validateStore } from '../domain/store.js';
import { migrateV1 } from '../domain/migrateV1.js';
import { appLifecycle } from '../utils/native.js';
import { durableGet, durableSet, safeGetItem } from '../utils/safeStorage.js';

export const STORE_KEY = 'jw-habits-v2';

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

function currentLocale() {
  const raw = i18n.language || (typeof navigator !== 'undefined' && navigator.language) || 'en';
  return raw.split(/[-_]/)[0] || 'en';
}

/** Today never moves backwards: the later of the clock's app day and the last day seen. */
function computeToday(lastSeenDay) {
  const clock = appDay(new Date());
  return lastSeenDay && lastSeenDay > clock ? lastSeenDay : clock;
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
 * @returns {Promise<{store: object, persisted: boolean, readOnly: boolean}>}
 *   `persisted`: the store came from storage unchanged. `readOnly`: storage
 *   could not be read or the unreadable value could not be kept, so nothing
 *   may be written this session (the stored value must survive).
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
    try {
      const result = validateStore(JSON.parse(raw));
      if (result.ok) return { store: result.store, persisted: true, readOnly: false };
    } catch {
      // unparseable: handled as corrupt below
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
    loadStore().then(({ store: loaded, persisted, readOnly }) => {
      if (cancelled) return;
      readOnlyRef.current = readOnly;
      storeRef.current = loaded;
      setStore(loaded);
      if (!persisted) persist(loaded);
      refreshDay();
      latestArgs = getArgs;
      runForeground();
    });
    return () => {
      cancelled = true;
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
