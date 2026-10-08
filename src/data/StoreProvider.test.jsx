import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useEffect } from 'react';
import { render, act, fireEvent } from '@testing-library/react';
import i18n from 'i18next';

const prefs = vi.hoisted(() => new Map());
const lifecycle = vi.hoisted(() => ({ handler: null, unsubscribed: 0 }));
const backup = vi.hoisted(() => vi.fn());

vi.mock('../utils/backup.js', () => ({
  saveBackup: backup,
  isShareCancel: (error) => /cancel/i.test(String(error?.message ?? error)),
}));

vi.mock('../utils/native.js', () => ({
  isNative: true,
  isWeb: false,
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
  backup.mockReset();
  backup.mockResolvedValue(undefined);
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
    expect(latest.store.version).toBe(3);
    expect(latest.today).toBe('2026-10-06');
  });

  it('survives a remount with the same store', async () => {
    const first = await mount();
    act(() => latest.update((s) => ({ ...s, labels: { dailyText: 'Hope' } })));
    await flush();
    first.unmount();
    await mount();
    expect(latest.store.labels.dailyText).toBe('Hope');
    expect(JSON.parse(prefs.get(STORE_KEY)).labels.dailyText).toBe('Hope');
  });

  it('persists two rapid updates, composing on the latest store', async () => {
    await mount();
    act(() => {
      latest.update((s) => ({ ...s, labels: { dailyText: 'Hope' } }));
      latest.update((s) => ({ ...s, pioneer: true }));
    });
    await flush();
    const saved = JSON.parse(prefs.get(STORE_KEY));
    expect(saved.labels.dailyText).toBe('Hope');
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
    expect(latest.store.version).toBe(3);
    expect([...prefs.keys()].some((k) => k.includes('-corrupt-'))).toBe(true);
  });

  it('warns but keeps in-memory state when a save fails', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { Preferences } = await import('@capacitor/preferences');
    await mount();
    vi.spyOn(Preferences, 'set').mockRejectedValue(new Error('disk full'));
    act(() => latest.update((s) => ({ ...s, labels: { dailyText: 'Hope' } })));
    await flush();
    expect(latest.store.labels.dailyText).toBe('Hope');
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

  it('prunes agendas against the app day, not the clock behind it (Codex P2)', async () => {
    vi.setSystemTime(new Date(2026, 9, 11, 10, 0)); // Sunday; lastSeenDay is the Monday after
    const ahead = '2026-12-07'; // 8 weeks after Monday 2026-10-12
    const free = [{ id: 'f1', kind: 'free', title: 'Song', link: null }];
    prefs.set(
      STORE_KEY,
      JSON.stringify({
        ...defaultStore('2026-10-01', 'en'),
        lastSeenDay: '2026-10-12',
        familyAgendas: { [ahead]: free },
      })
    );
    await mount();
    expect(latest.today).toBe('2026-10-12');
    expect(latest.store.familyAgendas[ahead]).toEqual(free);
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
    const off = onStoreChange((store) => seen.push(store.labels.dailyText));
    await mount();
    expect(seen).toEqual([]);
    act(() => latest.update((s) => ({ ...s, labels: { dailyText: 'Hope' } })));
    act(() => latest.update((s) => ({ ...s, labels: { dailyText: 'Joy' } })));
    expect(seen).toEqual(['Hope', 'Joy']);
    off();
    act(() => latest.update((s) => ({ ...s, labels: { dailyText: 'Peace' } })));
    expect(seen).toEqual(['Hope', 'Joy']);
  });

  it('passes {update, today} as a second argument so a listener can write back', async () => {
    let extra = null;
    const off = onStoreChange((store, e) => {
      extra = e;
    });
    await mount();
    act(() => latest.update((s) => ({ ...s, labels: { dailyText: 'Hope' } })));
    expect(typeof extra.update).toBe('function');
    expect(extra.today).toBe(latest.today);
    off();
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
    act(() => latest.update((s) => ({ ...s, labels: { dailyText: 'Kept' } })));
    await flush();
    expect(latest.store.labels.dailyText).toBe('Kept');
    expect(good).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledTimes(2);
    offs.forEach((off) => off());
  });
});

describe('onForeground', () => {
  it('runs after load and on every resume with the latest values', async () => {
    const seen = [];
    const off = onForeground(({ store, today }) => {
      seen.push([store.labels.dailyText, today]);
    });
    await mount();
    expect(seen).toEqual([[undefined, '2026-10-06']]);
    act(() => latest.update((s) => ({ ...s, labels: { dailyText: 'Hope' } })));
    act(() => lifecycle.handler({ isActive: true }));
    await flush();
    expect(seen).toEqual([
      [undefined, '2026-10-06'],
      ['Hope', '2026-10-06'],
    ]);
    off();
  });

  it('lets a callback update the store, and unsubscribe stops it', async () => {
    const calls = vi.fn(({ update }) =>
      update((s) => ({ ...s, labels: { dailyText: 'From callback' } }))
    );
    const off = onForeground(calls);
    await mount();
    expect(latest.store.labels.dailyText).toBe('From callback');
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
    expect(latest.store.version).toBe(3);
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
    expect(calls.mock.calls[0][0].store.version).toBe(3);
    act(() => lifecycle.handler({ isActive: true }));
    await flush();
    expect(calls).toHaveBeenCalledTimes(2);
  });
});

describe('storage failures never overwrite stored data', () => {
  it('retries a failed read once and then uses the stored value', async () => {
    const saved = JSON.stringify({
      ...defaultStore('2026-10-01', 'en'),
      labels: { dailyText: 'Kept' },
    });
    prefs.set(STORE_KEY, saved);
    vi.spyOn(Preferences, 'get').mockRejectedValueOnce(new Error('transient'));
    await mount();
    expect(latest.store.labels.dailyText).toBe('Kept');
  });

  it('does not persist anything when the read fails twice', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const saved = JSON.stringify({
      ...defaultStore('2026-10-01', 'en'),
      labels: { dailyText: 'Kept' },
    });
    prefs.set(STORE_KEY, saved);
    vi.spyOn(Preferences, 'get').mockRejectedValue(new Error('down'));
    await mount();
    act(() => latest.update((s) => ({ ...s, labels: { dailyText: 'Changed' } })));
    await flush();
    expect(latest.store.labels.dailyText).toBe('Changed');
    expect(prefs.get(STORE_KEY)).toBe(saved);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('does not persist when the corrupt copy cannot be kept', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    prefs.set(STORE_KEY, 'garbage');
    vi.spyOn(Preferences, 'set').mockRejectedValue(new Error('full'));
    await mount();
    act(() => latest.update((s) => ({ ...s, labels: { dailyText: 'Changed' } })));
    await flush();
    expect(latest.store.labels.dailyText).toBe('Changed');
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

describe('upgrading a stored v2 value', () => {
  const BACKUP_KEY = `${STORE_KEY}-backup`;
  const v2Raw = (studyTopic) => {
    // eslint-disable-next-line no-unused-vars
    const { plans, activePlan, familyAgendas, badges, showGameLayer, showShare, ...rest } =
      defaultStore('2026-09-01', 'en');
    return JSON.stringify({
      ...rest,
      version: 2,
      studyTopic,
      onboardingDone: true,
      log: [{ routine: 'dailyText', day: '2026-10-01', value: true }],
    });
  };
  const backupWrites = (spy) => spy.mock.calls.filter(([{ key }]) => key === BACKUP_KEY).length;

  it('loads it as v3, persists v3, and keeps the original once as a backup', async () => {
    const raw = v2Raw('Daniel');
    prefs.set(STORE_KEY, raw);
    const set = vi.spyOn(Preferences, 'set');
    await mount();
    expect(latest.store.version).toBe(3);
    expect(latest.store.onboardingDone).toBe(true);
    expect(latest.store.log).toEqual([{ routine: 'dailyText', day: '2026-10-01', value: true }]);
    expect(latest.store.plans.map((p) => [p.title, p.createdOn])).toEqual([
      ['Daniel', '2026-10-06'],
    ]);
    expect(latest.store.activePlan.personalStudy).toBe(latest.store.plans[0].id);
    const saved = JSON.parse(prefs.get(STORE_KEY));
    expect(saved.version).toBe(3);
    expect(saved).not.toHaveProperty('studyTopic');
    expect(validateStore(saved).ok).toBe(true);
    expect(prefs.get(BACKUP_KEY)).toBe(raw);
    expect(backupWrites(set)).toBe(1);
    expect([...prefs.keys()].some((k) => k.includes('-corrupt-'))).toBe(false);
  });

  it('writes the backup only once across launches', async () => {
    const raw = v2Raw('');
    prefs.set(STORE_KEY, raw);
    const set = vi.spyOn(Preferences, 'set');
    const first = await mount();
    const planIds = latest.store.plans;
    first.unmount();
    await mount();
    expect(backupWrites(set)).toBe(1);
    expect(prefs.get(BACKUP_KEY)).toBe(raw);
    expect(latest.store.plans).toEqual(planIds);
  });

  it('never overwrites an existing backup', async () => {
    prefs.set(BACKUP_KEY, 'older backup');
    prefs.set(STORE_KEY, v2Raw('Daniel'));
    await mount();
    expect(prefs.get(BACKUP_KEY)).toBe('older backup');
    expect(JSON.parse(prefs.get(STORE_KEY)).version).toBe(3);
  });

  it('leaves the v2 value in place when the backup cannot be written', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const raw = v2Raw('Daniel');
    prefs.set(STORE_KEY, raw);
    vi.spyOn(Preferences, 'set').mockRejectedValue(new Error('full'));
    await mount();
    expect(latest.store.version).toBe(3);
    act(() => latest.update((s) => ({ ...s, pioneer: true })));
    await flush();
    expect(prefs.get(STORE_KEY)).toBe(raw);
    expect(prefs.has(BACKUP_KEY)).toBe(false);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('sets a v2 value that fails validation aside as corrupt, without a backup', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const raw = JSON.stringify({ ...JSON.parse(v2Raw('Daniel')), tone: 'loud' });
    prefs.set(STORE_KEY, raw);
    await mount();
    expect(latest.store.onboardingDone).toBe(false);
    expect(prefs.has(BACKUP_KEY)).toBe(false);
    const copies = [...prefs.keys()].filter((k) => k.includes('-corrupt-'));
    expect(copies.map((k) => prefs.get(k))).toEqual([raw]);
  });

  it('blocks an unknown newer store without replacing or copying its raw bytes', async () => {
    const raw = '{ "version": 4, "privateFutureNotes": ["Keep exactly"] }';
    prefs.set(STORE_KEY, raw);
    const foreground = vi.fn();
    const unsubscribe = onForeground(foreground);
    try {
      const view = await mount();
      expect(
        view.getByRole('heading', { name: 'Update Faithful Days to open your data' })
      ).toBeTruthy();
      expect(latest).toBeUndefined();
      await act(async () => vi.advanceTimersByTime(24 * 60 * 60 * 1000));
      await flush();
      expect([...prefs.entries()]).toEqual([[STORE_KEY, raw]]);
      expect(foreground).not.toHaveBeenCalled();
      expect(lifecycle.handler).toBeNull();
    } finally {
      unsubscribe();
    }
  });

  it('exports a newer store byte-for-byte without adopting or replacing it', async () => {
    const raw = '{ "version": 99, "future": {"body":"Private notes"} }';
    prefs.set(STORE_KEY, raw);
    const view = await mount();
    fireEvent.click(view.getByRole('button', { name: 'Save a copy of your data' }));
    await flush();
    expect(backup).toHaveBeenCalledWith(
      raw,
      'faithful-days-saved-data-2026-10-06.json',
      'Faithful Days saved data'
    );
    expect(view.getByRole('status').textContent).toContain('Copy offered');
    expect([...prefs.entries()]).toEqual([[STORE_KEY, raw]]);
  });

  it('announces a failed or cancelled newer-store export and preserves the original', async () => {
    const raw = '{"version":4,"future":"Keep me"}';
    prefs.set(STORE_KEY, raw);
    backup.mockRejectedValueOnce(new Error('File write failed'));
    const view = await mount();
    const button = view.getByRole('button', { name: 'Save a copy of your data' });
    fireEvent.click(button);
    await flush();
    expect(view.getByRole('status').textContent).toContain('Could not offer a copy');
    backup.mockRejectedValueOnce(new Error('User cancelled'));
    fireEvent.click(button);
    await flush();
    expect(view.getByRole('status').textContent).toContain('Copy cancelled');
    expect([...prefs.entries()]).toEqual([[STORE_KEY, raw]]);
  });
});

describe('StoreProvider reference cleanup (Review Focus 1)', () => {
  it('drops dangling agenda items and activePlan on load, and persists the cleaned store', async () => {
    const base = defaultStore('2026-10-01', 'en');
    const dangling = {
      ...base,
      activePlan: { personalStudy: 'a'.repeat(8) },
      familyAgendas: {
        '2026-10-05': [
          { id: 'x1', kind: 'step', planId: 'gone-plan', stepId: 'gone-step' },
          { id: 'x2', kind: 'free', title: 'Song', link: null },
        ],
        '2020-01-06': [{ id: 'x3', kind: 'free', title: 'Old', link: null }],
      },
    };
    expect(validateStore(dangling).ok).toBe(true);
    prefs.set(STORE_KEY, JSON.stringify(dangling));
    await mount();
    expect(latest.today).toBe('2026-10-06');
    expect(latest.store.activePlan.personalStudy).toBe(null);
    expect(latest.store.familyAgendas).toEqual({
      '2026-10-05': [{ id: 'x2', kind: 'free', title: 'Song', link: null }],
    });
    const saved = JSON.parse(prefs.get(STORE_KEY));
    expect(saved.familyAgendas['2020-01-06']).toBeUndefined();
    expect(validateStore(saved).ok).toBe(true);
  });

  it('does not write a clean store back', async () => {
    const set = vi.spyOn(Preferences, 'set');
    prefs.set(
      STORE_KEY,
      JSON.stringify({ ...defaultStore('2026-10-06', 'en'), lastSeenDay: '2026-10-06' })
    );
    await mount();
    expect(set).not.toHaveBeenCalledWith(expect.objectContaining({ key: STORE_KEY }));
  });
});

// eslint-disable-next-line no-unused-vars -- used in JSX
function ForegroundListener({ events }) {
  useEffect(() => {
    const receive = () => events.push('heard');
    window.addEventListener('startup-award', receive);
    return () => window.removeEventListener('startup-award', receive);
  }, [events]);
  return null;
}
it('runs initial foreground callbacks after child listeners commit', async () => {
  const events = [];
  const off = onForeground(() => window.dispatchEvent(new Event('startup-award')));
  const view = render(
    <StoreProvider>
      <ForegroundListener events={events} />
    </StoreProvider>
  );
  await flush();
  expect(events).toEqual(['heard']);
  off();
  view.unmount();
});
