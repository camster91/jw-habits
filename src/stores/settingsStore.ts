import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createSafeStorage } from '../utils/storageErrorHandler';

interface NotificationSetting {
  enabled: boolean;
  time: string;
  label: string;
  dayOfWeek?: number;
  daysBefore?: number;
  meetingDays?: number[];
}

interface Notifications {
  enabled: boolean;
  dailyText: NotificationSetting;
  morningPrayer: NotificationSetting;
  afternoonPrayer: NotificationSetting;
  eveningPrayer: NotificationSetting;
  bibleReading: NotificationSetting;
  familyWorship: NotificationSetting;
  meetingPrep: NotificationSetting;
  streakMotivation: NotificationSetting;
}

interface BibleReadingSchedule {
  startingScheduleDay: number;
  customStartDate: string | null;
  useCustomSchedule: boolean;
  readingPace: number;
}

interface SettingsState {
  notifications: Notifications;
  bibleReadingSchedule: BibleReadingSchedule;
  notificationsEnabled: boolean;
  theme: 'light' | 'dark';
}

interface SettingsActions {
  setNotificationsEnabled: (enabled: boolean) => void;
  toggleNotification: (key: keyof Notifications) => void;
  setNotificationTime: (key: keyof Notifications, time: string) => void;
  updateNotification: (key: keyof Notifications, updates: Partial<NotificationSetting>) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  setBibleReadingSchedule: (schedule: Partial<BibleReadingSchedule>) => void;
  getEffectiveScheduleDay: () => number;
  setBibleReadingStartDay: (day: number) => void;
  setBibleReadingPace: (pace: number) => void;
  resetBibleReadingSchedule: () => void;
}

const DEFAULT_NOTIFICATIONS: Notifications = {
  enabled: false,
  dailyText: { enabled: true, time: '07:00', label: 'Daily Text' },
  morningPrayer: { enabled: true, time: '06:30', label: 'Morning Prayer' },
  afternoonPrayer: { enabled: true, time: '12:00', label: 'Afternoon Prayer' },
  eveningPrayer: { enabled: true, time: '21:00', label: 'Evening Prayer' },
  bibleReading: { enabled: true, time: '20:00', label: 'Bible Reading' },
  familyWorship: { enabled: true, dayOfWeek: 1, time: '19:00', label: 'Family Worship' },
  meetingPrep: { enabled: true, daysBefore: 1, meetingDays: [0, 4], time: '19:00', label: 'Meeting Preparation' },
  streakMotivation: { enabled: true, time: '10:00', label: 'Keep Your Streak' },
};

const DEFAULT_BIBLE_READING_SETTINGS: BibleReadingSchedule = {
  startingScheduleDay: 1,
  customStartDate: null,
  useCustomSchedule: false,
  readingPace: 1,
};

const useSettingsStore = create<SettingsState & SettingsActions>()(
  persist(
    (set, get) => ({
      notifications: DEFAULT_NOTIFICATIONS,
      bibleReadingSchedule: DEFAULT_BIBLE_READING_SETTINGS,
      notificationsEnabled: false,
      theme: 'light',

      setNotificationsEnabled: (enabled) => set({ notificationsEnabled: enabled }),
      toggleNotification: (key) =>
        set((state) => ({
          notifications: {
            ...state.notifications,
            [key]: {
              ...(state.notifications[key] as NotificationSetting),
              enabled: !(state.notifications[key] as NotificationSetting).enabled,
            },
          },
        })),
      setNotificationTime: (key, time) =>
        set((state) => ({
          notifications: {
            ...state.notifications,
            [key]: { ...(state.notifications[key] as NotificationSetting), time },
          },
        })),
      updateNotification: (key, updates) =>
        set((state) => ({
          notifications: {
            ...state.notifications,
            [key]: { ...(state.notifications[key] as NotificationSetting), ...updates },
          },
        })),
      setTheme: (theme) => set({ theme }),
      setBibleReadingSchedule: (schedule) =>
        set((state) => ({
          bibleReadingSchedule: { ...state.bibleReadingSchedule, ...schedule },
        })),
      getEffectiveScheduleDay: () => {
        const state = get();
        const { startingScheduleDay, readingPace, customStartDate, useCustomSchedule } = state.bibleReadingSchedule;
        if (useCustomSchedule && customStartDate) {
          const start = new Date(customStartDate);
          const today = new Date();
          const diffDays = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
          return Math.max(1, (diffDays * readingPace) + 1);
        }
        const now = new Date();
        const startOfYear = new Date(now.getFullYear(), 0, 0);
        const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));
        return ((dayOfYear - 1 + startingScheduleDay - 1) % 366) + 1;
      },
      setBibleReadingStartDay: (day) =>
        set((state) => ({
          bibleReadingSchedule: { ...state.bibleReadingSchedule, startingScheduleDay: day },
        })),
      setBibleReadingPace: (pace) =>
        set((state) => ({
          bibleReadingSchedule: { ...state.bibleReadingSchedule, readingPace: pace },
        })),
      resetBibleReadingSchedule: () =>
        set({ bibleReadingSchedule: DEFAULT_BIBLE_READING_SETTINGS }),
    }),
    {
      name: 'jw-progress-settings',
      storage: createSafeStorage('jw-progress-settings'),
    }
  )
);

export const READING_PACE_OPTIONS = [
  { value: 1, label: '1 chapter/day', description: 'Steady pace - complete in ~3.3 years' },
  { value: 2, label: '2 chapters/day', description: 'Moderate pace - complete in ~1.6 years' },
  { value: 3, label: '3 chapters/day', description: 'Faster pace - complete in ~1.1 years' },
  { value: 4, label: '4 chapters/day', description: 'Quick pace - complete in ~9 months' },
];

export default useSettingsStore;
