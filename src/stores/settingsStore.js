import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Default notification settings
const DEFAULT_NOTIFICATIONS = {
  // Master toggle
  enabled: false,

  // Daily Text reminders
  dailyText: {
    enabled: true,
    time: '07:00',
    label: 'Daily Text'
  },

  // Prayer reminders
  morningPrayer: {
    enabled: true,
    time: '06:30',
    label: 'Morning Prayer'
  },
  afternoonPrayer: {
    enabled: true,
    time: '12:00',
    label: 'Afternoon Prayer'
  },
  eveningPrayer: {
    enabled: true,
    time: '21:00',
    label: 'Evening Prayer'
  },

  // Bible reading
  bibleReading: {
    enabled: true,
    time: '20:00',
    label: 'Bible Reading'
  },

  // Family worship (weekly)
  familyWorship: {
    enabled: true,
    dayOfWeek: 1, // Monday
    time: '19:00',
    label: 'Family Worship'
  },

  // Meeting preparation
  meetingPrep: {
    enabled: true,
    daysBefore: 1, // Remind 1 day before meeting
    time: '19:00',
    label: 'Meeting Preparation'
  },

  // Streak motivation
  streakMotivation: {
    enabled: true,
    time: '10:00',
    label: 'Keep Your Streak'
  }
};

const useSettingsStore = create(
  persist(
    (set, get) => ({
      // Notification settings (expanded)
      notifications: DEFAULT_NOTIFICATIONS,

      // Legacy compatibility
      notificationsEnabled: false,
      dailyTextReminderTime: '07:00',
      bibleReadingReminderTime: '20:00',
      meetingReminderEnabled: true,

      // Theme settings
      theme: 'light',

      // Actions
      setNotificationsEnabled: (enabled) =>
        set((state) => ({
          notificationsEnabled: enabled,
          notifications: { ...state.notifications, enabled }
        })),

      // Update a specific notification setting
      updateNotification: (key, updates) =>
        set((state) => ({
          notifications: {
            ...state.notifications,
            [key]: { ...state.notifications[key], ...updates }
          }
        })),

      // Toggle a specific notification on/off
      toggleNotification: (key) =>
        set((state) => ({
          notifications: {
            ...state.notifications,
            [key]: {
              ...state.notifications[key],
              enabled: !state.notifications[key]?.enabled
            }
          }
        })),

      // Set notification time
      setNotificationTime: (key, time) =>
        set((state) => ({
          notifications: {
            ...state.notifications,
            [key]: { ...state.notifications[key], time }
          }
        })),

      setDailyTextReminderTime: (time) =>
        set((state) => ({
          dailyTextReminderTime: time,
          notifications: {
            ...state.notifications,
            dailyText: { ...state.notifications.dailyText, time }
          }
        })),

      setBibleReadingReminderTime: (time) =>
        set((state) => ({
          bibleReadingReminderTime: time,
          notifications: {
            ...state.notifications,
            bibleReading: { ...state.notifications.bibleReading, time }
          }
        })),

      setMeetingReminderEnabled: (enabled) =>
        set((state) => ({
          meetingReminderEnabled: enabled,
          notifications: {
            ...state.notifications,
            meetingPrep: { ...state.notifications.meetingPrep, enabled }
          }
        })),

      setTheme: (theme) => {
        document.documentElement.setAttribute('data-theme', theme);
        set({ theme });
      },

      // Reset notifications to default
      resetNotifications: () =>
        set({ notifications: DEFAULT_NOTIFICATIONS }),

      // Get all settings
      getSettings: () => ({
        notifications: get().notifications,
        notificationsEnabled: get().notificationsEnabled,
        dailyTextReminderTime: get().dailyTextReminderTime,
        bibleReadingReminderTime: get().bibleReadingReminderTime,
        meetingReminderEnabled: get().meetingReminderEnabled,
        theme: get().theme,
      }),

      // Get notification permission status
      getNotificationPermission: () => {
        if ('Notification' in window) {
          return Notification.permission;
        }
        return 'unsupported';
      },

      // Request notification permission
      requestNotificationPermission: async () => {
        if ('Notification' in window) {
          const permission = await Notification.requestPermission();
          if (permission === 'granted') {
            set((state) => ({
              notificationsEnabled: true,
              notifications: { ...state.notifications, enabled: true }
            }));
          }
          return permission;
        }
        return 'unsupported';
      }
    }),
    {
      name: 'jw-progress-settings',
      version: 2,
      migrate: (persistedState, version) => {
        if (version < 2) {
          // Migrate from old settings format
          return {
            ...persistedState,
            notifications: {
              ...DEFAULT_NOTIFICATIONS,
              enabled: persistedState?.notificationsEnabled || false,
              dailyText: {
                ...DEFAULT_NOTIFICATIONS.dailyText,
                time: persistedState?.dailyTextReminderTime || '07:00'
              },
              bibleReading: {
                ...DEFAULT_NOTIFICATIONS.bibleReading,
                time: persistedState?.bibleReadingReminderTime || '20:00'
              },
              meetingPrep: {
                ...DEFAULT_NOTIFICATIONS.meetingPrep,
                enabled: persistedState?.meetingReminderEnabled || true
              }
            }
          };
        }
        return persistedState;
      }
    }
  )
);

export default useSettingsStore;
