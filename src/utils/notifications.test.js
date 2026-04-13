import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Capacitor core
vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => false,
    getPlatform: () => 'web',
  },
}));

// Mock Capacitor LocalNotifications
vi.mock('@capacitor/local-notifications', () => ({
  LocalNotifications: {
    schedule: vi.fn(() => Promise.resolve()),
    cancel: vi.fn(() => Promise.resolve()),
    cancelAll: vi.fn(() => Promise.resolve()),
    checkPermissions: vi.fn(() => Promise.resolve({ state: 'granted' })),
    requestPermissions: vi.fn(() => Promise.resolve({ state: 'granted' })),
  },
}));

// Mock native module
vi.mock('../utils/native', () => ({
  isNative: false,
  isAndroid: false,
  isIOS: false,
  isWeb: true,
}));

import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  showNotification,
  scheduleNotificationForToday,
  scheduleDailyTextReminder,
  scheduleBibleReadingReminder,
  cancelScheduledNotification,
  initializeReminders,
} from './notifications.js';

describe('notifications', () => {
  let originalNotification;
  let originalServiceWorker;

  beforeEach(() => {
    originalNotification = global.Notification;
    originalServiceWorker = global.navigator.serviceWorker;

    global.Notification = {
      permission: 'default',
      requestPermission: vi.fn(() => Promise.resolve('granted')),
    };

    global.navigator.serviceWorker = {
      ready: Promise.resolve({
        showNotification: vi.fn(() => Promise.resolve()),
      }),
    };

    vi.useFakeTimers();
  });

  afterEach(() => {
    global.Notification = originalNotification;
    global.navigator.serviceWorker = originalServiceWorker;
    vi.useRealTimers();
  });

  describe('isNotificationSupported', () => {
    it('should return true when Notification and serviceWorker are available', () => {
      expect(isNotificationSupported()).toBe(true);
    });

    it('should return false when Notification is not available', () => {
      delete global.Notification;
      expect(isNotificationSupported()).toBe(false);
    });
  });

  describe('getNotificationPermission', () => {
    it('should return current permission status', () => {
      global.Notification.permission = 'granted';
      expect(getNotificationPermission()).toBe('granted');
    });

    it('should return "unsupported" when notifications not supported', () => {
      delete global.Notification;
      expect(getNotificationPermission()).toBe('unsupported');
    });
  });

  describe('requestNotificationPermission', () => {
    it('should request permission and return result', async () => {
      const result = await requestNotificationPermission();

      expect(global.Notification.requestPermission).toHaveBeenCalled();
      expect(result).toBe('granted');
    });

    it('should return "unsupported" when not supported', async () => {
      delete global.Notification;
      const result = await requestNotificationPermission();

      expect(result).toBe('unsupported');
    });

    it('should handle permission request errors', async () => {
      global.Notification.requestPermission = vi.fn(() => Promise.reject(new Error('Test error')));

      const result = await requestNotificationPermission();

      expect(result).toBe('error');
    });
  });

  describe('showNotification', () => {
    it('should show notification when permission granted', async () => {
      global.Notification.permission = 'granted';

      const result = await showNotification('Test Title', { body: 'Test body' });

      expect(result).toBe(true);
    });

    it('should return false when permission not granted', async () => {
      global.Notification.permission = 'denied';

      const result = await showNotification('Test Title');

      expect(result).toBe(false);
    });

    it('should return false when not supported', async () => {
      delete global.Notification;

      const result = await showNotification('Test Title');

      expect(result).toBe(false);
    });
  });

  describe('scheduleNotificationForToday', () => {
    it('should schedule notification for future time today', () => {
      const now = new Date('2026-01-20T10:00:00');
      vi.setSystemTime(now);

      const timeoutId = scheduleNotificationForToday('12:00', 'Test');

      expect(timeoutId).not.toBeNull();
    });

    it('should return null for past time today', () => {
      const now = new Date('2026-01-20T15:00:00');
      vi.setSystemTime(now);

      const timeoutId = scheduleNotificationForToday('12:00', 'Test');

      expect(timeoutId).toBeNull();
    });
  });

  describe('scheduleDailyTextReminder', () => {
    it('should schedule daily text reminder', () => {
      const now = new Date('2026-01-20T06:00:00');
      vi.setSystemTime(now);

      const timeoutId = scheduleDailyTextReminder('07:00');

      expect(timeoutId).not.toBeNull();
    });
  });

  describe('scheduleBibleReadingReminder', () => {
    it('should schedule bible reading reminder', () => {
      const now = new Date('2026-01-20T19:00:00');
      vi.setSystemTime(now);

      const timeoutId = scheduleBibleReadingReminder('20:00');

      expect(timeoutId).not.toBeNull();
    });
  });

  describe('cancelScheduledNotification', () => {
    it('should clear timeout', () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

      cancelScheduledNotification(123);

      expect(clearTimeoutSpy).toHaveBeenCalledWith(123);
    });

    it('should handle null timeout id', () => {
      expect(() => cancelScheduledNotification(null)).not.toThrow();
    });
  });

  describe('initializeReminders', () => {
    it('should initialize reminders when enabled and permission granted', async () => {
      const now = new Date('2026-01-20T06:00:00');
      vi.setSystemTime(now);
      global.Notification.permission = 'granted';

      const settings = {
        notificationsEnabled: true,
        notifications: {
          dailyText: { time: '07:00', enabled: true },
          bibleReading: { time: '20:00', enabled: true },
        },
      };

      const handles = await initializeReminders(settings);

      expect(handles.length).toBeGreaterThan(0);
    });

    it('should return empty array when disabled', async () => {
      const settings = {
        notificationsEnabled: false,
        notifications: {
          dailyText: { time: '07:00', enabled: true },
          bibleReading: { time: '20:00', enabled: true },
        },
      };

      const handles = await initializeReminders(settings);

      expect(handles).toEqual([]);
    });
  });
});