import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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
    // Save originals
    originalNotification = global.Notification;
    originalServiceWorker = global.navigator.serviceWorker;

    // Setup mocks
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
    // Restore originals
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
      // Should not throw
      expect(() => cancelScheduledNotification(null)).not.toThrow();
    });
  });

  describe('initializeReminders', () => {
    it('should initialize reminders when enabled and permission granted', () => {
      const now = new Date('2026-01-20T06:00:00');
      vi.setSystemTime(now);
      global.Notification.permission = 'granted';

      const settings = {
        notificationsEnabled: true,
        dailyTextReminderTime: '07:00',
        bibleReadingReminderTime: '20:00',
      };

      const timeouts = initializeReminders(settings);

      expect(timeouts.dailyText).not.toBeNull();
      expect(timeouts.bibleReading).not.toBeNull();
    });

    it('should not initialize reminders when disabled', () => {
      const settings = {
        notificationsEnabled: false,
        dailyTextReminderTime: '07:00',
        bibleReadingReminderTime: '20:00',
      };

      const timeouts = initializeReminders(settings);

      expect(timeouts.dailyText).toBeUndefined();
      expect(timeouts.bibleReading).toBeUndefined();
    });
  });
});
