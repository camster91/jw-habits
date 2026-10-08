import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import i18n from 'i18next';

const plugin = vi.hoisted(() => ({
  checkPermissions: vi.fn(),
  requestPermissions: vi.fn(),
  getPending: vi.fn(),
  cancel: vi.fn(),
  schedule: vi.fn(),
}));
const native = vi.hoisted(() => ({ isNative: true }));

vi.mock('@capacitor/local-notifications', () => ({ LocalNotifications: plugin }));
const hooks = vi.hoisted(() => ({ foreground: null, change: null }));
vi.mock('../data/StoreProvider.jsx', () => ({
  onForeground: (cb) => {
    hooks.foreground = cb;
    return () => {};
  },
  onStoreChange: (cb) => {
    hooks.change = cb;
    return () => {};
  },
}));
vi.mock('../utils/native.js', () => ({
  get isNative() {
    return native.isNative;
  },
}));

import { syncReminders, registerReminderSync } from './reminders.js';
import { defaultStore } from '../domain/store.js';

const t = i18n.t.bind(i18n);

/** Only the daily text is enabled, so each day plans one morning entry. */
function store() {
  const s = defaultStore('2026-10-01', 'en');
  for (const id of Object.keys(s.schedule[0].enabled)) {
    s.schedule[0].enabled[id] = id === 'dailyText';
  }
  return s;
}

beforeEach(() => {
  native.isNative = true;
  plugin.checkPermissions.mockResolvedValue({ display: 'granted' });
  plugin.requestPermissions.mockResolvedValue({ display: 'granted' });
  plugin.getPending.mockResolvedValue({ notifications: [{ id: 99 }] });
  plugin.cancel.mockResolvedValue(undefined);
  plugin.schedule.mockResolvedValue({ notifications: [] });
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 9, 6, 5, 0));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('syncReminders', () => {
  it('cancels pending, then schedules the plan while idle', async () => {
    const result = await syncReminders(store(), t);
    expect(result).toEqual({ scheduled: 7 });
    expect(plugin.cancel).toHaveBeenCalledWith({ notifications: [{ id: 99 }] });
    const { notifications } = plugin.schedule.mock.calls[0][0];
    expect(notifications).toHaveLength(7);
    expect(notifications[0]).toMatchObject({
      id: 1,
      title: 'Faithful Days',
      body: '07:00 · Daily text is ready',
      schedule: { allowWhileIdle: true },
    });
    expect(notifications[0].schedule.at).toBeInstanceOf(Date);
    expect(plugin.cancel.mock.invocationCallOrder[0]).toBeLessThan(
      plugin.schedule.mock.invocationCallOrder[0]
    );
  });

  it('never requests permission, whatever the state', async () => {
    for (const display of ['prompt', 'prompt-with-rationale', 'denied', 'granted']) {
      plugin.checkPermissions.mockResolvedValue({ display });
      await syncReminders(store(), t);
    }
    const off = { ...store(), reminders: { enabled: false, off: [] } };
    await syncReminders(off, t);
    expect(plugin.requestPermissions).not.toHaveBeenCalled();
  });

  it('cancels stale notifications even when permission is not granted', async () => {
    plugin.checkPermissions.mockResolvedValue({ display: 'prompt' });
    expect(await syncReminders(store(), t)).toEqual({ scheduled: 0 });
    expect(plugin.cancel).toHaveBeenCalledWith({ notifications: [{ id: 99 }] });
    expect(plugin.schedule).not.toHaveBeenCalled();
  });

  it('resolves {scheduled: 0} without throwing when permission is denied', async () => {
    plugin.checkPermissions.mockResolvedValue({ display: 'denied' });
    await expect(syncReminders(store(), t)).resolves.toEqual({ scheduled: 0 });
    expect(plugin.cancel).toHaveBeenCalled();
    expect(plugin.schedule).not.toHaveBeenCalled();
  });

  it('resolves {scheduled: 0} and warns when schedule rejects', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    plugin.schedule.mockRejectedValue(new Error('boom'));
    await expect(syncReminders(store(), t)).resolves.toEqual({ scheduled: 0 });
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('cancels but schedules nothing when the plan is empty', async () => {
    const s = { ...store(), reminders: { enabled: false, off: [] } };
    expect(await syncReminders(s, t)).toEqual({ scheduled: 0 });
    expect(plugin.cancel).toHaveBeenCalled();
    expect(plugin.schedule).not.toHaveBeenCalled();
  });

  it('does nothing on the web', async () => {
    native.isNative = false;
    expect(await syncReminders(store(), t)).toEqual({ scheduled: 0 });
    expect(plugin.checkPermissions).not.toHaveBeenCalled();
  });

  it('a delayed older schedule cannot outlive a newer request to turn reminders off', async () => {
    let releaseSchedule;
    const delayed = new Promise((resolve) => {
      releaseSchedule = resolve;
    });
    let pending = [{ id: 99 }];
    plugin.getPending.mockImplementation(async () => ({ notifications: [...pending] }));
    plugin.cancel.mockImplementation(async () => {
      pending = [];
    });
    plugin.schedule.mockImplementation(async ({ notifications }) => {
      await delayed;
      pending = notifications;
    });
    const first = syncReminders(store(), t);
    await vi.waitFor(() => expect(plugin.schedule).toHaveBeenCalledTimes(1));
    const disabled = { ...store(), reminders: { enabled: false, off: [] } };
    const second = syncReminders(disabled, t);
    await Promise.resolve();
    expect(plugin.getPending).toHaveBeenCalledTimes(1);
    releaseSchedule();
    expect(await first).toEqual({ scheduled: 7 });
    expect(await second).toEqual({ scheduled: 0 });
    expect(plugin.getPending).toHaveBeenCalledTimes(2);
    expect(pending).toEqual([]);
  });

  it('a failed cancellation does not prevent the next sync from applying newer settings', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    plugin.cancel.mockRejectedValueOnce(new Error('cancel unavailable'));
    const first = syncReminders(store(), t);
    const newer = store();
    newer.anchors.dailyText.time = '09:00';
    const second = syncReminders(newer, t);
    expect(await first).toEqual({ scheduled: 0 });
    expect(await second).toEqual({ scheduled: 7 });
    expect(plugin.schedule).toHaveBeenCalledTimes(1);
    expect(plugin.schedule.mock.calls[0][0].notifications[0].body).toContain('09:00');
    warn.mockRestore();
  });
});

describe('registerReminderSync', () => {
  it('foreground supersedes a pending debounce with the current settings', async () => {
    const unsubscribe = registerReminderSync();
    hooks.change(store());
    const disabled = { ...store(), reminders: { enabled: false, off: [] } };
    await hooks.foreground({ store: disabled });
    await vi.advanceTimersByTimeAsync(1000);
    expect(plugin.getPending).toHaveBeenCalledTimes(1);
    expect(plugin.schedule).not.toHaveBeenCalled();
    unsubscribe();
  });

  it('syncs on foreground and, debounced, on store changes with the latest store', async () => {
    registerReminderSync();
    const s1 = { ...store(), studyTopic: 'one' };
    const s2 = { ...store(), studyTopic: 'two' };
    hooks.change(s1);
    await vi.advanceTimersByTimeAsync(400);
    hooks.change(s2);
    await vi.advanceTimersByTimeAsync(999);
    expect(plugin.schedule).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(plugin.schedule).toHaveBeenCalledTimes(1);
    await hooks.foreground({ store: s2 });
    expect(plugin.schedule).toHaveBeenCalledTimes(2);
  });
});
