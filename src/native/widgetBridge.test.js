import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import i18n from 'i18next';

const plugin = vi.hoisted(() => ({
  setSnapshot: vi.fn(),
  drainQueue: vi.fn(),
}));
const registered = vi.hoisted(() => ({ names: [] }));
const native = vi.hoisted(() => ({ isNative: true }));
const hooks = vi.hoisted(() => ({ foreground: null, change: null }));

vi.mock('@capacitor/core', () => ({
  registerPlugin: (name) => {
    registered.names.push(name);
    return plugin;
  },
}));
vi.mock('../data/StoreProvider.jsx', () => ({
  onForeground: (cb) => {
    hooks.foreground = cb;
    return () => {
      hooks.foreground = null;
    };
  },
  onStoreChange: (cb) => {
    hooks.change = cb;
    return () => {
      hooks.change = null;
    };
  },
}));
vi.mock('../utils/native.js', () => ({
  get isNative() {
    return native.isNative;
  },
}));

import {
  buildSnapshot,
  publishSnapshot,
  drainWidgetCheckIns,
  registerWidgetBridge,
} from './widgetBridge.js';
import { defaultStore, addCheckIn } from '../domain/store.js';
import { dueToday } from '../domain/routines.js';
import { ACCENTS } from '../theme/theme.js';

const t = i18n.t.bind(i18n);
const TODAY = '2026-10-06';

function store() {
  return defaultStore('2026-10-01', 'en');
}

/** A fake provider: `update` applies the function to its own copy of the store. */
function provider(initial) {
  const state = { store: initial };
  const update = vi.fn((fn) => {
    state.store = fn(state.store);
  });
  return { state, update };
}

function sentSnapshot(call = 0) {
  return JSON.parse(plugin.setSnapshot.mock.calls[call][0].json);
}

beforeEach(() => {
  native.isNative = true;
  plugin.setSnapshot.mockReset().mockResolvedValue(undefined);
  plugin.drainQueue.mockReset().mockResolvedValue({ items: [] });
  hooks.foreground = null;
  hooks.change = null;
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 9, 6, 9, 0));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('plugin registration', () => {
  it('registers the native plugin under the name WidgetBridge', () => {
    expect(registered.names).toContain('WidgetBridge');
  });
});

describe('publishSnapshot', () => {
  it('sends JSON with exactly the snapshot keys', async () => {
    await publishSnapshot(store(), TODAY, t);
    expect(plugin.setSnapshot).toHaveBeenCalledTimes(1);
    const snap = sentSnapshot();
    expect(Object.keys(snap).sort()).toEqual(
      ['accent', 'day', 'doneCount', 'dueCount', 'items'].sort()
    );
    expect(snap.day).toBe(TODAY);
    expect(snap.accent).toBe(ACCENTS[0]);
    for (const item of snap.items) {
      expect(Object.keys(item).sort()).toEqual(['done', 'label', 'routine']);
    }
  });

  it('lists only the due routines, never ministry, with translated or custom labels', async () => {
    const s = { ...store(), labels: { dailyText: 'Text for today' } };
    // Turn meeting prep off so the due list is deterministic regardless of weekday rules.
    s.schedule[0].enabled.meetingPrep = false;
    await publishSnapshot(s, TODAY, t);
    const snap = sentSnapshot();
    const expected = dueToday(s, TODAY).filter((id) => id !== 'ministry');
    expect(dueToday(s, TODAY)).toContain('ministry');
    expect(snap.items.map((i) => i.routine)).toEqual(expected);
    expect(snap.items.find((i) => i.routine === 'dailyText').label).toBe('Text for today');
    expect(snap.items.find((i) => i.routine === 'bibleReading').label).toBe('Bible reading');
    expect(snap.dueCount).toBe(expected.length);
  });

  it('marks routines done today and counts them', async () => {
    const s = addCheckIn(store(), { routine: 'dailyText', day: TODAY, value: true });
    await publishSnapshot(s, TODAY, t);
    const snap = sentSnapshot();
    expect(snap.items.find((i) => i.routine === 'dailyText').done).toBe(true);
    expect(snap.items.find((i) => i.routine === 'bibleReading').done).toBe(false);
    expect(snap.doneCount).toBe(1);
  });

  it('uses the chosen accent colour', () => {
    expect(buildSnapshot({ ...store(), accent: 3 }, TODAY, t).accent).toBe(ACCENTS[3]);
  });

  it('never throws when the plugin fails', async () => {
    plugin.setSnapshot.mockRejectedValue(new Error('boom'));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await expect(publishSnapshot(store(), TODAY, t)).resolves.toBeUndefined();
    warn.mockRestore();
  });
});

describe('drainWidgetCheckIns', () => {
  it('returns the queued items', async () => {
    plugin.drainQueue.mockResolvedValue({
      items: [
        { routine: 'dailyText', day: TODAY },
        { routine: 'bibleReading', day: TODAY },
      ],
    });
    expect(await drainWidgetCheckIns()).toEqual([
      { routine: 'dailyText', day: TODAY },
      { routine: 'bibleReading', day: TODAY },
    ]);
  });

  it('drops malformed items and survives a plugin failure', async () => {
    plugin.drainQueue.mockResolvedValue({
      items: [
        { routine: 'dailyText' },
        { routine: 'dailyText', day: '6 Oct 2026' },
        null,
        { routine: 'nope', day: TODAY },
        'x',
      ],
    });
    expect(await drainWidgetCheckIns()).toEqual([]);
    plugin.drainQueue.mockRejectedValue(new Error('boom'));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(await drainWidgetCheckIns()).toEqual([]);
    warn.mockRestore();
  });
});

describe('on web', () => {
  it('both functions are no-ops', async () => {
    native.isNative = false;
    await publishSnapshot(store(), TODAY, t);
    expect(await drainWidgetCheckIns()).toEqual([]);
    expect(plugin.setSnapshot).not.toHaveBeenCalled();
    expect(plugin.drainQueue).not.toHaveBeenCalled();
  });
});

describe('registerWidgetBridge', () => {
  it('applies 2 drained check-ins as 2 log entries, then publishes', async () => {
    plugin.drainQueue.mockResolvedValue({
      items: [
        { routine: 'dailyText', day: TODAY },
        { routine: 'bibleReading', day: TODAY },
      ],
    });
    const off = registerWidgetBridge();
    const { state, update } = provider(store());
    await hooks.foreground({ store: state.store, update, today: TODAY });

    expect(state.store.log).toHaveLength(2);
    expect(state.store.log).toEqual([
      { routine: 'dailyText', day: TODAY, value: true },
      { routine: 'bibleReading', day: TODAY, value: { chapters: [] } },
    ]);
    const snap = sentSnapshot(plugin.setSnapshot.mock.calls.length - 1);
    expect(snap.doneCount).toBe(2);
    off();
  });

  it('ignores ministry, stale days and routines already done today', async () => {
    const existing = addCheckIn(store(), {
      routine: 'bibleReading',
      day: TODAY,
      value: { chapters: [0, 1] },
    });
    plugin.drainQueue.mockResolvedValue({
      items: [
        { routine: 'ministry', day: TODAY },
        { routine: 'dailyText', day: '2026-10-05' },
        { routine: 'bibleReading', day: TODAY },
      ],
    });
    const off = registerWidgetBridge();
    const { state, update } = provider(existing);
    await hooks.foreground({ store: state.store, update, today: TODAY });

    expect(update).not.toHaveBeenCalled();
    expect(state.store.log).toEqual([
      { routine: 'bibleReading', day: TODAY, value: { chapters: [0, 1] } },
    ]);
    expect(plugin.setSnapshot).toHaveBeenCalledTimes(1);
    off();
  });

  it('publishes on foreground even when the queue is empty', async () => {
    const off = registerWidgetBridge();
    const { state, update } = provider(store());
    await hooks.foreground({ store: state.store, update, today: TODAY });
    expect(update).not.toHaveBeenCalled();
    expect(plugin.setSnapshot).toHaveBeenCalledTimes(1);
    off();
  });

  it('publishes store changes after a 500 ms debounce, using the latest store', async () => {
    const off = registerWidgetBridge();
    hooks.change(store());
    const latest = addCheckIn(store(), { routine: 'dailyText', day: TODAY, value: true });
    hooks.change(latest);
    await vi.advanceTimersByTimeAsync(499);
    expect(plugin.setSnapshot).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(plugin.setSnapshot).toHaveBeenCalledTimes(1);
    const snap = sentSnapshot();
    expect(snap.day).toBe(TODAY);
    expect(snap.doneCount).toBe(1);
    off();
  });

  it('unsubscribes and cancels a pending publish', async () => {
    const off = registerWidgetBridge();
    hooks.change(store());
    off();
    await vi.advanceTimersByTimeAsync(1000);
    expect(plugin.setSnapshot).not.toHaveBeenCalled();
    expect(hooks.foreground).toBeNull();
    expect(hooks.change).toBeNull();
  });
});
