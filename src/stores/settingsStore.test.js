import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act } from '@testing-library/react';

// Mock document.documentElement.setAttribute
vi.spyOn(document.documentElement, 'setAttribute').mockImplementation(() => {});

// Import after setup
const { default: useSettingsStore } = await import('./settingsStore.js');

describe('settingsStore', () => {
  beforeEach(() => {
    // Reset store to default values
    act(() => {
      const store = useSettingsStore.getState();
      store.setNotificationsEnabled(false);
      store.setDailyTextReminderTime('07:00');
      store.setBibleReadingReminderTime('20:00');
      store.setMeetingReminderEnabled(true);
      store.setTheme('light');
    });
  });

  describe('Default values', () => {
    it('should have correct default values', () => {
      const state = useSettingsStore.getState();
      expect(state.notificationsEnabled).toBe(false);
      expect(state.dailyTextReminderTime).toBe('07:00');
      expect(state.bibleReadingReminderTime).toBe('20:00');
      expect(state.meetingReminderEnabled).toBe(true);
      expect(state.theme).toBe('light');
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
  });

  describe('Reminder times', () => {
    it('should set daily text reminder time', () => {
      act(() => {
        useSettingsStore.getState().setDailyTextReminderTime('08:30');
      });

      expect(useSettingsStore.getState().dailyTextReminderTime).toBe('08:30');
    });

    it('should set bible reading reminder time', () => {
      act(() => {
        useSettingsStore.getState().setBibleReadingReminderTime('21:00');
      });

      expect(useSettingsStore.getState().bibleReadingReminderTime).toBe('21:00');
    });

    it('should toggle meeting reminder', () => {
      act(() => {
        useSettingsStore.getState().setMeetingReminderEnabled(false);
      });

      expect(useSettingsStore.getState().meetingReminderEnabled).toBe(false);
    });
  });

  describe('Theme settings', () => {
    it('should set theme to dark', () => {
      act(() => {
        useSettingsStore.getState().setTheme('dark');
      });

      expect(useSettingsStore.getState().theme).toBe('dark');
      expect(document.documentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'dark');
    });

    it('should set theme to light', () => {
      act(() => {
        useSettingsStore.getState().setTheme('light');
      });

      expect(useSettingsStore.getState().theme).toBe('light');
    });
  });

  describe('getSettings', () => {
    it('should return all settings', () => {
      act(() => {
        const store = useSettingsStore.getState();
        store.setNotificationsEnabled(true);
        store.setDailyTextReminderTime('09:00');
        store.setTheme('dark');
      });

      const settings = useSettingsStore.getState().getSettings();

      expect(settings).toEqual({
        notificationsEnabled: true,
        dailyTextReminderTime: '09:00',
        bibleReadingReminderTime: '20:00',
        meetingReminderEnabled: true,
        theme: 'dark',
      });
    });
  });
});
