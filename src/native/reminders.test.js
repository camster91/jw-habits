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
vi.mock('../utils/native.js', () => ({
  get isNative() {
    return native.isNative;
  },
}));

import { syncReminders } from './reminders.js';
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

  it('asks for permission when it is undecided', async () => {
    plugin.checkPermissions.mockResolvedValue({ display: 'prompt' });
    expect(await syncReminders(store(), t)).toEqual({ scheduled: 7 });
    expect(plugin.requestPermissions).toHaveBeenCalled();
  });

  it('resolves {scheduled: 0} without throwing when permission is denied', async () => {
    plugin.checkPermissions.mockResolvedValue({ display: 'denied' });
    await expect(syncReminders(store(), t)).resolves.toEqual({ scheduled: 0 });
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
});
