import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
vi.mock('../utils/native.js', () => ({
  isNative: false,
  isWeb: true,
  appLifecycle: { onStateChange: () => () => {} },
}));
// eslint-disable-next-line no-unused-vars -- used in JSX
import { StoreProvider, STORE_KEY, onForeground } from './StoreProvider.jsx';
import { defaultStore } from '../domain/store.js';
import { useStore } from './useStore.js';

let latest;
// eslint-disable-next-line no-unused-vars -- used in JSX
function Probe() {
  latest = useStore();
  return <p>{latest.today}</p>;
}

const settle = () =>
  act(async () => {
    for (let i = 0; i < 20; i += 1) await Promise.resolve();
  });

async function mount() {
  const view = render(
    <StoreProvider>
      <Probe />
    </StoreProvider>
  );
  await settle();
  return view;
}

/** jsdom only accepts its own Storage in the constructor; attach the area afterwards. */
function storageEvent({ storageArea, ...init }) {
  const event = new StorageEvent('storage', init);
  if (storageArea) Object.defineProperty(event, 'storageArea', { value: storageArea });
  return event;
}

const saved = () => JSON.parse(localStorage.getItem(STORE_KEY));

/** What another tab does: write the shared key, then the browser notifies this tab. */
function otherTabWrites(change, { announce = true, oldValue } = {}) {
  const before = localStorage.getItem(STORE_KEY);
  const next = JSON.stringify(change(JSON.parse(before)));
  localStorage.setItem(STORE_KEY, next);
  if (announce)
    window.dispatchEvent(
      storageEvent({
        key: STORE_KEY,
        oldValue: oldValue === undefined ? before : oldValue,
        newValue: next,
        storageArea: localStorage,
      })
    );
  return next;
}

const setVisibility = (value) =>
  Object.defineProperty(document, 'visibilityState', { value, configurable: true });

beforeEach(() => {
  localStorage.clear();
  latest = undefined;
  setVisibility('visible');
  vi.useFakeTimers({
    toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'],
  });
  vi.setSystemTime(new Date(2026, 9, 6, 10, 0));
  localStorage.setItem(
    STORE_KEY,
    JSON.stringify({ ...defaultStore('2026-10-01', 'en'), lastSeenDay: '2026-10-06' })
  );
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  delete navigator.locks;
});

describe('two open tabs (#317)', () => {
  it('adopts another tab’s check-in and keeps it when this tab saves next', async () => {
    const view = await mount();
    otherTabWrites((s) => ({
      ...s,
      log: [{ routine: 'dailyText', day: '2026-10-06', value: true }],
    }));
    await settle();
    expect(latest.store.log).toHaveLength(1);
    act(() => latest.update((s) => ({ ...s, pioneer: true })));
    await settle();
    expect(saved().log).toEqual([{ routine: 'dailyText', day: '2026-10-06', value: true }]);
    expect(saved().pioneer).toBe(true);
    expect(latest.conflict).toBe(false);
    view.unmount();
  });

  it('pauses instead of overwriting a write that lands before its storage event', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const view = await mount();
    const theirs = otherTabWrites(
      (s) => ({ ...s, log: [{ routine: 'dailyText', day: '2026-10-06', value: true }] }),
      { announce: false }
    );
    act(() => latest.update((s) => ({ ...s, pioneer: true })));
    await settle();
    expect(localStorage.getItem(STORE_KEY)).toBe(theirs);
    expect(latest.conflict).toBe(true);
    // Later edits in this window are kept in memory only.
    act(() => latest.update((s) => ({ ...s, hoursGoal: 5 })));
    await settle();
    expect(localStorage.getItem(STORE_KEY)).toBe(theirs);
    view.unmount();
  });

  it('pauses when a change arrives while this tab has an unsaved snapshot', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const view = await mount();
    let theirs;
    act(() => {
      latest.update((s) => ({ ...s, pioneer: true }));
      theirs = otherTabWrites((s) => ({ ...s, hoursGoal: 9 }));
    });
    await settle();
    expect(latest.conflict).toBe(true);
    expect(localStorage.getItem(STORE_KEY)).toBe(theirs);
    view.unmount();
  });

  it('pauses for out-of-step, newer-version and cleared storage events', async () => {
    for (const write of [
      () => otherTabWrites((s) => ({ ...s, pioneer: true }), { oldValue: 'something else' }),
      () => otherTabWrites((s) => ({ ...s, version: 4 })),
      () => window.dispatchEvent(storageEvent({ key: null })),
    ]) {
      const view = await mount();
      const before = latest.store;
      write();
      await settle();
      expect(latest.conflict).toBe(true);
      expect(latest.store).toBe(before);
      view.unmount();
      localStorage.setItem(
        STORE_KEY,
        JSON.stringify({ ...defaultStore('2026-10-01', 'en'), lastSeenDay: '2026-10-06' })
      );
    }
  });

  it('ignores other keys and session storage', async () => {
    const view = await mount();
    window.dispatchEvent(storageEvent({ key: 'faithful-days-workspace-v1' }));
    window.dispatchEvent(storageEvent({ key: STORE_KEY, storageArea: sessionStorage }));
    await settle();
    expect(latest.conflict).toBe(false);
    view.unmount();
  });

  it('writes under a Web Lock named for the store when the browser has one', async () => {
    const request = vi.fn((name, fn) => fn());
    navigator.locks = { request };
    const view = await mount();
    act(() => latest.update((s) => ({ ...s, pioneer: true })));
    await settle();
    expect(request).toHaveBeenCalledWith(STORE_KEY, expect.any(Function));
    expect(saved().pioneer).toBe(true);
    view.unmount();
  });

  it('stops listening on unmount', async () => {
    const view = await mount();
    const probe = latest;
    view.unmount();
    otherTabWrites((s) => ({ ...s, pioneer: true }));
    await settle();
    expect(probe.store.pioneer).toBe(false);
  });
});

describe('web resume after sleep (#319)', () => {
  // 02:30 on 7 October is still the 6 October app day.
  const sleepUntil = (date) => vi.setSystemTime(date);

  it('rolls over on visibility, without the stalled 03:00 timer firing', async () => {
    vi.setSystemTime(new Date(2026, 9, 7, 2, 30));
    const runs = [];
    const off = onForeground(({ today }) => runs.push(today));
    const view = await mount();
    expect(latest.today).toBe('2026-10-06');
    sleepUntil(new Date(2026, 9, 7, 9, 15));
    setVisibility('hidden');
    document.dispatchEvent(new Event('visibilitychange'));
    await settle();
    expect(latest.today).toBe('2026-10-06');
    setVisibility('visible');
    document.dispatchEvent(new Event('visibilitychange'));
    await settle();
    expect(latest.today).toBe('2026-10-07');
    expect(saved().lastSeenDay).toBe('2026-10-07');
    expect(runs.at(-1)).toBe('2026-10-07');
    off();
    view.unmount();
  });

  it('rolls over on pageshow (back/forward cache) and on focus', async () => {
    vi.setSystemTime(new Date(2026, 9, 7, 2, 30));
    const view = await mount();
    sleepUntil(new Date(2026, 9, 7, 8, 0));
    window.dispatchEvent(new Event('pageshow'));
    await settle();
    expect(latest.today).toBe('2026-10-07');
    sleepUntil(new Date(2026, 9, 8, 8, 0));
    window.dispatchEvent(new Event('focus'));
    await settle();
    expect(latest.today).toBe('2026-10-08');
    view.unmount();
  });

  it('re-checks once a minute while the page stays open', async () => {
    vi.setSystemTime(new Date(2026, 9, 7, 2, 59, 30));
    const view = await mount();
    sleepUntil(new Date(2026, 9, 7, 6, 0));
    await act(async () => {
      vi.advanceTimersByTime(60_000);
    });
    await settle();
    expect(latest.today).toBe('2026-10-07');
    view.unmount();
  });

  it('ensureToday refreshes before a resumed check-in can use yesterday', async () => {
    vi.setSystemTime(new Date(2026, 9, 7, 2, 30));
    const view = await mount();
    sleepUntil(new Date(2026, 9, 7, 7, 0));
    let fresh;
    act(() => {
      fresh = latest.ensureToday();
    });
    await settle();
    expect(fresh).toBe('2026-10-07');
    expect(latest.today).toBe('2026-10-07');
    view.unmount();
  });

  it('removes its listeners on unmount', async () => {
    vi.setSystemTime(new Date(2026, 9, 7, 2, 30));
    const runs = [];
    const off = onForeground(({ today }) => runs.push(today));
    const view = await mount();
    const count = runs.length;
    view.unmount();
    sleepUntil(new Date(2026, 9, 7, 9, 0));
    document.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new Event('pageshow'));
    window.dispatchEvent(new Event('focus'));
    vi.advanceTimersByTime(120_000);
    await settle();
    expect(runs.length).toBe(count);
    expect(saved().lastSeenDay).toBe('2026-10-06');
    off();
  });
});
