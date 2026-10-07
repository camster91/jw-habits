import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useEffect } from 'react';
import { render, act } from '@testing-library/react';
import i18n from 'i18next';

const prefs = vi.hoisted(() => new Map());
const lifecycle = vi.hoisted(() => ({ handler: null, unsubscribed: 0 }));

vi.mock('../utils/native.js', () => ({
  isNative: true,
  appLifecycle: {
    onStateChange: (cb) => {
      lifecycle.handler = cb;
      return () => {
        lifecycle.unsubscribed += 1;
        lifecycle.handler = null;
      };
    },
  },
}));
vi.mock('../domain/migrateV1.js', async () => {
  const actual = await vi.importActual('../domain/migrateV1.js');
  return { migrateV1: vi.fn(actual.migrateV1) };
});
vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: async ({ key }) => ({ value: prefs.has(key) ? prefs.get(key) : null }),
    set: async ({ key, value }) => {
      prefs.set(key, value);
    },
    remove: async ({ key }) => {
      prefs.delete(key);
    },
  },
}));

// eslint-disable-next-line no-unused-vars -- used inside mount() via JSX
import { StoreProvider, onForeground, onStoreChange, STORE_KEY } from './StoreProvider.jsx';
import { useStore } from './useStore.js';
import { defaultStore, validateStore } from '../domain/store.js';
import { migrateV1 } from '../domain/migrateV1.js';
import { Preferences } from '@capacitor/preferences';

let latest;
// eslint-disable-next-line no-unused-vars -- used inside mount() via JSX
function Probe() {
  latest = useStore();
  return <p>{latest.today}</p>;
}

const flush = () =>
  act(async () => {
    for (let i = 0; i < 10; i += 1) await Promise.resolve();
  });

async function mount() {
  const view = render(
    <StoreProvider>
      <Probe />
    </StoreProvider>
  );
  await flush();
  return view;
}

beforeEach(() => {
  prefs.clear();
  latest = undefined;
  lifecycle.handler = null;
  lifecycle.unsubscribed = 0;
  vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] });
  vi.setSystemTime(new Date(2026, 9, 6, 10, 0));
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('StoreProvider persistence', () => {
  it('renders nothing until loaded, then a default store', async () => {
    const view = render(
      <StoreProvider>
        <Probe />
      </StoreProvider>
    );
    expect(view.container).toBeEmptyDOMElement();
    await flush();
    expect(latest.store.version).toBe(2);
    expect(latest.today).toBe('2026-10-06');
  });

  it('survives a remount with the same store', async () => {
    const first = await mount();
    act(() => latest.update((s) => ({ ...s, studyTopic: 'Hope' })));
    await flush();
    first.unmount();
    await mount();
    expect(latest.store.studyTopic).toBe('Hope');
    expect(JSON.parse(prefs.get(STORE_KEY)).studyTopic).toBe('Hope');
  });

  it('persists two rapid updates, composing on the latest store', async () => {
    await mount();
    act(() => {
      latest.update((s) => ({ ...s, studyTopic: 'Hope' }));
      latest.update((s) => ({ ...s, pioneer: true }));
    });
    await flush();
    const saved = JSON.parse(prefs.get(STORE_KEY));
    expect(saved.studyTopic).toBe('Hope');
    expect(saved.pioneer).toBe(true);
  });

  it('loads a migrated store when only v1 keys exist', async () => {
    localStorage.setItem('jw-bible-reading-days', JSON.stringify(['2026-10-01']));
    await mount();
    expect(latest.store.log).toEqual([{ routine: 'bibleReading', day: '2026-10-01', value: true }]);
    expect(latest.store.onboardingDone).toBe(true);
    expect(JSON.parse(prefs.get(STORE_KEY)).log).toHaveLength(1);
  });

  it('keeps a copy of an invalid stored value, warns once, and starts fresh', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    prefs.set(STORE_KEY, '{"version":2,"nonsense":true}');
    await mount();
    const copies = [...prefs.keys()].filter((k) => k.startsWith(`${STORE_KEY}-corrupt-`));
    expect(copies).toEqual([`${STORE_KEY}-corrupt-${Date.now()}`]);
    expect(prefs.get(copies[0])).toBe('{"version":2,"nonsense":true}');
    expect(latest.store.onboardingDone).toBe(false);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('treats unparseable text the same way and never throws', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    prefs.set(STORE_KEY, 'not json');
    await mount();
    expect(latest.store.version).toBe(2);
    expect([...prefs.keys()].some((k) => k.includes('-corrupt-'))).toBe(true);
  });

  it('warns but keeps in-memory state when a save fails', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { Preferences } = await import('@capacitor/preferences');
    await mount();
    vi.spyOn(Preferences, 'set').mockRejectedValue(new Error('disk full'));
    act(() => latest.update((s) => ({ ...s, studyTopic: 'Hope' })));
    await flush();
    expect(latest.store.studyTopic).toBe('Hope');
    expect(warn).toHaveBeenCalled();
  });
});

describe('today never moves backwards', () => {
  it('uses lastSeenDay when the clock is behind it', async () => {
    prefs.set(
      STORE_KEY,
      JSON.stringify({ ...defaultStore('2026-10-01', 'en'), lastSeenDay: '2026-10-07' })
    );
    await mount();
    expect(latest.today).toBe('2026-10-07');
    expect(latest.store.lastSeenDay).toBe('2026-10-07');
  });

  it('ignores a lastSeenDay more than a day ahead (a clock once set forward) and resets it', async () => {
    prefs.set(
      STORE_KEY,
      JSON.stringify({ ...defaultStore('2026-10-01', 'en'), lastSeenDay: '2026-10-16' })
    );
    await mount();
    expect(latest.today).toBe('2026-10-06');
    expect(latest.store.lastSeenDay).toBe('2026-10-06');
    expect(JSON.parse(prefs.get(STORE_KEY)).lastSeenDay).toBe('2026-10-06');
    expect(validateStore(JSON.parse(prefs.get(STORE_KEY))).ok).toBe(true);
  });

  it('persists the current day as lastSeenDay on load', async () => {
    await mount();
    expect(latest.store.lastSeenDay).toBe('2026-10-06');
    expect(JSON.parse(prefs.get(STORE_KEY)).lastSeenDay).toBe('2026-10-06');
    expect(validateStore(JSON.parse(prefs.get(STORE_KEY))).ok).toBe(true);
  });

  it('advances on resume when the clock has moved on', async () => {
    await mount();
    vi.setSystemTime(new Date(2026, 9, 8, 9, 0));
    act(() => lifecycle.handler({ isActive: true }));
    await flush();
    expect(latest.today).toBe('2026-10-08');
    expect(JSON.parse(prefs.get(STORE_KEY)).lastSeenDay).toBe('2026-10-08');
  });

  it('ignores a backgrounding event', async () => {
    await mount();
    vi.setSystemTime(new Date(2026, 9, 8, 9, 0));
    act(() => lifecycle.handler({ isActive: false }));
    await flush();
    expect(latest.today).toBe('2026-10-06');
  });

  it('rolls over at the next 03:00 and re-arms', async () => {
    await mount();
    // 10:00 to 03:00 the next day is 17 hours.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(17 * 3600 * 1000);
    });
    expect(latest.today).toBe('2026-10-07');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(24 * 3600 * 1000);
    });
    expect(latest.today).toBe('2026-10-08');
  });

  it('stops listening and timing on unmount', async () => {
    const view = await mount();
    view.unmount();
    expect(lifecycle.unsubscribed).toBe(1);
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('onStoreChange', () => {
  it('runs after each update with the new store, not during the initial load', async () => {
    const seen = [];
    const off = onStoreChange((store) => seen.push(store.studyTopic));
    await mount();
    expect(seen).toEqual([]);
    act(() => latest.update((s) => ({ ...s, studyTopic: 'Hope' })));
    act(() => latest.update((s) => ({ ...s, studyTopic: 'Joy' })));
    expect(seen).toEqual(['Hope', 'Joy']);
    off();
    act(() => latest.update((s) => ({ ...s, studyTopic: 'Peace' })));
    expect(seen).toEqual(['Hope', 'Joy']);
  });

  it('isolates throwing and rejecting callbacks from update', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const good = vi.fn();
    const offs = [
      onStoreChange(() => {
        throw new Error('sync');
      }),
      onStoreChange(async () => {
        throw new Error('async');
      }),
      onStoreChange(good),
    ];
    await mount();
    act(() => latest.update((s) => ({ ...s, studyTopic: 'Kept' })));
    await flush();
    expect(latest.store.studyTopic).toBe('Kept');
    expect(good).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledTimes(2);
    offs.forEach((off) => off());
  });
});

describe('onForeground', () => {
  it('runs after load and on every resume with the latest values', async () => {
    const seen = [];
    const off = onForeground(({ store, today }) => {
      seen.push([store.studyTopic, today]);
    });
    await mount();
    expect(seen).toEqual([['', '2026-10-06']]);
    act(() => latest.update((s) => ({ ...s, studyTopic: 'Hope' })));
    act(() => lifecycle.handler({ isActive: true }));
    await flush();
    expect(seen).toEqual([
      ['', '2026-10-06'],
      ['Hope', '2026-10-06'],
    ]);
    off();
  });

  it('lets a callback update the store, and unsubscribe stops it', async () => {
    const calls = vi.fn(({ update }) => update((s) => ({ ...s, studyTopic: 'From callback' })));
    const off = onForeground(calls);
    await mount();
    expect(latest.store.studyTopic).toBe('From callback');
    off();
    act(() => lifecycle.handler({ isActive: true }));
    await flush();
    expect(calls).toHaveBeenCalledTimes(1);
  });

  it('isolates throwing and rejecting callbacks', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const good = vi.fn();
    const offs = [
      onForeground(() => {
        throw new Error('sync');
      }),
      onForeground(async () => {
        throw new Error('async');
      }),
      onForeground(good),
    ];
    await mount();
    expect(good).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledTimes(2);
    expect(latest.store.version).toBe(2);
    offs.forEach((off) => off());
  });
});

describe('rollover timer on resume', () => {
  it('re-arms from the recomputed delay instead of keeping the stale timer', async () => {
    await mount();
    expect(vi.getTimerCount()).toBe(1);
    // Suspended until 23:00; the next 03:00 is now 4 hours away, not 17.
    vi.setSystemTime(new Date(2026, 9, 6, 23, 0));
    act(() => lifecycle.handler({ isActive: true }));
    await flush();
    expect(vi.getTimerCount()).toBe(1);
    expect(latest.today).toBe('2026-10-06');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4 * 3600 * 1000);
    });
    expect(latest.today).toBe('2026-10-07');
    expect(vi.getTimerCount()).toBe(1);
  });
});

describe('late onForeground registration', () => {
  it('runs a callback registered from a child effect exactly once after load', async () => {
    const calls = vi.fn();
    // eslint-disable-next-line no-unused-vars -- used below via JSX
    function Child() {
      useEffect(() => onForeground(calls), []);
      return null;
    }
    render(
      <StoreProvider>
        <Child />
      </StoreProvider>
    );
    await flush();
    expect(calls).toHaveBeenCalledTimes(1);
    expect(calls.mock.calls[0][0].store.version).toBe(2);
    act(() => lifecycle.handler({ isActive: true }));
    await flush();
    expect(calls).toHaveBeenCalledTimes(2);
  });
});

describe('storage failures never overwrite stored data', () => {
  it('retries a failed read once and then uses the stored value', async () => {
    const saved = JSON.stringify({ ...defaultStore('2026-10-01', 'en'), studyTopic: 'Kept' });
    prefs.set(STORE_KEY, saved);
    vi.spyOn(Preferences, 'get').mockRejectedValueOnce(new Error('transient'));
    await mount();
    expect(latest.store.studyTopic).toBe('Kept');
  });

  it('does not persist anything when the read fails twice', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const saved = JSON.stringify({ ...defaultStore('2026-10-01', 'en'), studyTopic: 'Kept' });
    prefs.set(STORE_KEY, saved);
    vi.spyOn(Preferences, 'get').mockRejectedValue(new Error('down'));
    await mount();
    act(() => latest.update((s) => ({ ...s, studyTopic: 'Changed' })));
    await flush();
    expect(latest.store.studyTopic).toBe('Changed');
    expect(prefs.get(STORE_KEY)).toBe(saved);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('does not persist when the corrupt copy cannot be kept', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    prefs.set(STORE_KEY, 'garbage');
    vi.spyOn(Preferences, 'set').mockRejectedValue(new Error('full'));
    await mount();
    act(() => latest.update((s) => ({ ...s, studyTopic: 'Changed' })));
    await flush();
    expect(latest.store.studyTopic).toBe('Changed');
    expect(prefs.get(STORE_KEY)).toBe('garbage');
    expect(warn).toHaveBeenCalledTimes(2);
  });
});

describe('locale selection', () => {
  const setLanguage = (value) =>
    Object.defineProperty(i18n, 'language', { value, configurable: true, writable: true });

  afterEach(() => setLanguage('en'));

  it('uses the primary subtag of the i18next language', async () => {
    setLanguage('fr-CA');
    await mount();
    expect(migrateV1.mock.calls.at(-1)[2]).toBe('fr');
  });

  it('falls back to the primary subtag of navigator.language', async () => {
    setLanguage('');
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('es-MX');
    await mount();
    expect(migrateV1.mock.calls.at(-1)[2]).toBe('es');
  });
});
