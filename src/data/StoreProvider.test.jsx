import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';

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
import { StoreProvider, onForeground, STORE_KEY } from './StoreProvider.jsx';
import { useStore } from './useStore.js';
import { defaultStore } from '../domain/store.js';

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

  it('persists the current day as lastSeenDay on load', async () => {
    await mount();
    expect(latest.store.lastSeenDay).toBe('2026-10-06');
    expect(JSON.parse(prefs.get(STORE_KEY)).lastSeenDay).toBe('2026-10-06');
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
