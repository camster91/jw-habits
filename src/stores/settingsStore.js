import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useSettingsStore = create(
  persist(
    (set, get) => ({
      // Notification settings
      notificationsEnabled: false,
      dailyTextReminderTime: '07:00',
      bibleReadingReminderTime: '20:00',
      meetingReminderEnabled: true,

      // Theme settings
      theme: 'light',

      // Actions
      setNotificationsEnabled: (enabled) =>
        set({ notificationsEnabled: enabled }),

      setDailyTextReminderTime: (time) =>
        set({ dailyTextReminderTime: time }),

      setBibleReadingReminderTime: (time) =>
        set({ bibleReadingReminderTime: time }),

      setMeetingReminderEnabled: (enabled) =>
        set({ meetingReminderEnabled: enabled }),

      setTheme: (theme) => {
        document.documentElement.setAttribute('data-theme', theme);
        set({ theme });
      },

      // Get all settings
      getSettings: () => ({
        notificationsEnabled: get().notificationsEnabled,
        dailyTextReminderTime: get().dailyTextReminderTime,
        bibleReadingReminderTime: get().bibleReadingReminderTime,
        meetingReminderEnabled: get().meetingReminderEnabled,
        theme: get().theme,
      }),
    }),
    {
      name: 'jw-progress-settings',
    }
  )
);

export default useSettingsStore;
