import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act } from '@testing-library/react';

// Mock document.documentElement.setAttribute
vi.spyOn(document.documentElement, 'setAttribute').mockImplementation(() => {});

// Import after setup
const { default: useSettingsStore } = await import('./settingsStore.ts');

describe('settingsStore', () => {
  beforeEach(() => {
    // Reset store to default values
    act(() => {
      const store = useSettingsStore.getState();
      store.setNotificationsEnabled(false);
      store.setTheme('light');
      // Reset notifications to defaults
      store.toggleNotification('dailyText');
      store.toggleNotification('dailyText'); // toggle back on
      store.setNotificationTime('dailyText', '07:00');
      store.setNotificationTime('bibleReading', '20:00');
      store.updateNotification('meetingPrep', { enabled: true });
      store.setBibleReadingSchedule({ startingScheduleDay: 1, readingPace: 1, customStartDate: null, useCustomSchedule: false });
    });
  });

  describe('Default values', () => {
    it('should have correct default values', () => {
      const state = useSettingsStore.getState();
      expect(state.notificationsEnabled).toBe(false);
      expect(state.notifications.dailyText.time).toBe('07:00');
      expect(state.notifications.bibleReading.time).toBe('20:00');
      expect(state.notifications.meetingPrep.enabled).toBe(true);
      expect(state.theme).toBe('light');
    });

    it('should have default notifications object', () => {
      const state = useSettingsStore.getState();
      expect(state.notifications).toBeDefined();
      expect(state.notifications.dailyText).toBeDefined();
      expect(state.notifications.bibleReading).toBeDefined();
      expect(state.notifications.meetingPrep).toBeDefined();
    });

    it('should have default bible reading schedule', () => {
      const state = useSettingsStore.getState();
      expect(state.bibleReadingSchedule.startingScheduleDay).toBe(1);
      expect(state.bibleReadingSchedule.readingPace).toBe(1);
      expect(state.bibleReadingSchedule.useCustomSchedule).toBe(false);
    });
  });

  describe('Notification settings', () => {
    it('should enable notifications', () => {
      act(() => {
        useSettingsStore.getState().setNotificationsEnabled(true);
      });

      expect(useSettingsStore.getState().notificationsEnabled).toBe(true);
    });

    it('should disable notifications', () => {
      act(() => {
        useSettingsStore.getState().setNotificationsEnabled(true);
        useSettingsStore.getState().setNotificationsEnabled(false);
      });

      expect(useSettingsStore.getState().notificationsEnabled).toBe(false);
    });

    it('should toggle individual notification', () => {
      act(() => {
        const store = useSettingsStore.getState();
        store.toggleNotification('dailyText');
      });

      expect(useSettingsStore.getState().notifications.dailyText.enabled).toBe(false);

      act(() => {
        useSettingsStore.getState().toggleNotification('dailyText');
      });

      expect(useSettingsStore.getState().notifications.dailyText.enabled).toBe(true);
    });

    it('should set notification time', () => {
      act(() => {
        useSettingsStore.getState().setNotificationTime('dailyText', '08:30');
      });

      expect(useSettingsStore.getState().notifications.dailyText.time).toBe('08:30');
    });

    it('should set bible reading notification time', () => {
      act(() => {
        useSettingsStore.getState().setNotificationTime('bibleReading', '21:00');
      });

      expect(useSettingsStore.getState().notifications.bibleReading.time).toBe('21:00');
    });

    it('should update notification with partial updates', () => {
      act(() => {
        useSettingsStore.getState().updateNotification('meetingPrep', { enabled: false, time: '18:00' });
      });

      const notification = useSettingsStore.getState().notifications.meetingPrep;
      expect(notification.enabled).toBe(false);
      expect(notification.time).toBe('18:00');
    });
  });

  describe('Theme settings', () => {
    it('should set theme to dark', () => {
      act(() => {
        useSettingsStore.getState().setTheme('dark');
      });

      expect(useSettingsStore.getState().theme).toBe('dark');
    });

    it('should set theme to light', () => {
      act(() => {
        useSettingsStore.getState().setTheme('light');
      });

      expect(useSettingsStore.getState().theme).toBe('light');
    });
  });

  describe('Bible reading schedule', () => {
    it('should update bible reading schedule', () => {
      act(() => {
        useSettingsStore.getState().setBibleReadingSchedule({ startingScheduleDay: 50, readingPace: 2 });
      });

      const schedule = useSettingsStore.getState().bibleReadingSchedule;
      expect(schedule.startingScheduleDay).toBe(50);
      expect(schedule.readingPace).toBe(2);
    });

    it('should set bible reading start day', () => {
      act(() => {
        useSettingsStore.getState().setBibleReadingStartDay(100);
      });

      expect(useSettingsStore.getState().bibleReadingSchedule.startingScheduleDay).toBe(100);
    });

    it('should set bible reading pace', () => {
      act(() => {
        useSettingsStore.getState().setBibleReadingPace(3);
      });

      expect(useSettingsStore.getState().bibleReadingSchedule.readingPace).toBe(3);
    });

    it('should reset bible reading schedule', () => {
      act(() => {
        useSettingsStore.getState().setBibleReadingSchedule({ startingScheduleDay: 100, readingPace: 3 });
        useSettingsStore.getState().resetBibleReadingSchedule();
      });

      const schedule = useSettingsStore.getState().bibleReadingSchedule;
      expect(schedule.startingScheduleDay).toBe(1);
      expect(schedule.readingPace).toBe(1);
    });

    it('should calculate effective schedule day', () => {
      const day = useSettingsStore.getState().getEffectiveScheduleDay();
      expect(day).toBeGreaterThanOrEqual(1);
      expect(day).toBeLessThanOrEqual(366);
    });
  });
});