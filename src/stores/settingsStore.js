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
    meetingDays: [0, 4], // Sunday and Thursday (common meeting days)
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

// Default Bible reading schedule settings
const DEFAULT_BIBLE_READING_SETTINGS = {
  // The schedule day number the user is starting from (1-341, not review days)
  startingScheduleDay: 1,
  // The date when the user set this custom start (to calculate offset)
  customStartDate: null,
  // Whether user is using custom schedule or default (Jan 1 start)
  useCustomSchedule: false,
};

const useSettingsStore = create(
  persist(
    (set, get) => ({
      // Notification settings (expanded)
      notifications: DEFAULT_NOTIFICATIONS,

      // Bible reading schedule settings
      bibleReadingSchedule: DEFAULT_BIBLE_READING_SETTINGS,

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

      // Bible reading schedule actions
      setBibleReadingStartDay: (scheduleDay) =>
        set((state) => ({
          bibleReadingSchedule: {
            ...state.bibleReadingSchedule,
            startingScheduleDay: scheduleDay,
            customStartDate: new Date().toISOString().split('T')[0],
            useCustomSchedule: true,
          }
        })),

      resetBibleReadingSchedule: () =>
        set({ bibleReadingSchedule: DEFAULT_BIBLE_READING_SETTINGS }),

      // Get the effective schedule day for today based on custom settings
      getEffectiveScheduleDay: (todayDayOfYear) => {
        const { bibleReadingSchedule } = get();

        if (!bibleReadingSchedule?.useCustomSchedule || !bibleReadingSchedule?.customStartDate) {
          return todayDayOfYear;
        }

        // Parse the date string as local time (YYYY-MM-DD format)
        // Using new Date(dateString) interprets as UTC, causing timezone issues
        const [year, month, day] = bibleReadingSchedule.customStartDate.split('-').map(Number);
        const startDate = new Date(year, month - 1, day); // month is 0-indexed
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        startDate.setHours(0, 0, 0, 0);

        const daysElapsed = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));
        let effectiveDay = bibleReadingSchedule.startingScheduleDay + daysElapsed;

        // Wrap around if exceeded 341 (skip review days)
        if (effectiveDay > 341) {
          effectiveDay = ((effectiveDay - 1) % 341) + 1;
        }

        return effectiveDay;
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
        bibleReadingSchedule: get().bibleReadingSchedule,
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
      version: 3,
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
            },
            bibleReadingSchedule: DEFAULT_BIBLE_READING_SETTINGS
          };
        }
        if (version < 3) {
          // Add Bible reading schedule settings
          return {
            ...persistedState,
            bibleReadingSchedule: DEFAULT_BIBLE_READING_SETTINGS
          };
        }
        return persistedState;
      }
    }
  )
);

export default useSettingsStore;
