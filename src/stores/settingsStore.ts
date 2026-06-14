import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { differenceInCalendarDays, getDayOfYear, parseISO } from 'date-fns';
import { createSafeStorage } from '../utils/storageErrorHandler.js';

interface NotificationSetting {
  enabled: boolean;
  time: string;
  label: string;
  dayOfWeek?: number;
  daysBefore?: number;
  meetingDays?: number[];
}

export interface Notifications {
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
  userName: string;
  publisherStatus: 'pioneer' | 'regular' | 'none';
  // Categories the user has opted to track. Drives the
  // habit-picker persistence and the home card visibility.
  // Empty array = nothing tracked yet (will show the picker).
  // The picker writes/reads this list via setTrackedHabits.
  trackedHabits: string[];
  ai: {
    provider: 'ollama' | 'none';
    ollamaBaseUrl: string;
    ollamaApiKey: string;
    ollamaModel: string;
  };
}

interface SettingsActions {
  setNotificationsEnabled: (enabled: boolean) => void;
  toggleNotification: (key: keyof Notifications) => void;
  setNotificationTime: (key: keyof Notifications, time: string) => void;
  updateNotification: (key: keyof Notifications, updates: Partial<NotificationSetting>) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  setUserName: (name: string) => void;
  setPublisherStatus: (status: 'pioneer' | 'regular' | 'none') => void;
  setBibleReadingSchedule: (schedule: Partial<BibleReadingSchedule>) => void;
  getEffectiveScheduleDay: () => number;
  setBibleReadingStartDay: (day: number) => void;
  setBibleReadingPace: (pace: number) => void;
  resetBibleReadingSchedule: () => void;
  setTrackedHabits: (habits: string[]) => void;
  toggleTrackedHabit: (habit: string) => void;
  setAiSettings: (settings: Partial<SettingsState['ai']>) => void;
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
      userName: '',
      publisherStatus: 'none',
      trackedHabits: [],
      ai: {
        provider: 'none',
        ollamaBaseUrl: 'https://ollama.com',
        ollamaApiKey: '',
        ollamaModel: 'llama3.2',
      },

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
      setUserName: (name) => set({ userName: name }),
      setPublisherStatus: (status) => set({ publisherStatus: status }),
      setBibleReadingSchedule: (schedule) =>
        set((state) => ({
          bibleReadingSchedule: { ...state.bibleReadingSchedule, ...schedule },
        })),
      getEffectiveScheduleDay: () => {
        const state = get();
        const { startingScheduleDay, readingPace, customStartDate, useCustomSchedule } = state.bibleReadingSchedule;
        if (useCustomSchedule && customStartDate) {
          // Use differenceInCalendarDays (DST-safe) rather than a
          // literal ms subtraction. On a spring-forward DST day
          // (24h → 23h) or fall-back (24h → 25h) the literal
          // arithmetic can produce an off-by-one schedule day.
          const start = parseISO(customStartDate);
          const today = new Date();
          const diffDays = differenceInCalendarDays(today, start);
          return Math.max(1, (diffDays * readingPace) + 1);
        }
        // Default schedule: use date-fns getDayOfYear (1-366, DST-safe)
        // and offset by the user's starting day. The previous
        // implementation used `new Date(year, 0, 0)` which is
        // Dec 31 of the previous year (not Jan 1) and combined with
        // the `dayOfYear - 1 + startingScheduleDay - 1` math produced
        // an off-by-one on Jan 1.
        const now = new Date();
        const dayOfYear = getDayOfYear(now);
        return ((dayOfYear - 1 + (startingScheduleDay - 1)) % 366) + 1;
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
      setTrackedHabits: (habits) => set({ trackedHabits: habits }),
      toggleTrackedHabit: (habit) =>
        set((state) => {
          const has = state.trackedHabits.includes(habit);
          return {
            trackedHabits: has
              ? state.trackedHabits.filter((h) => h !== habit)
              : [...state.trackedHabits, habit],
          };
        }),
      setAiSettings: (settings) =>
        set((state) => ({
          ai: { ...state.ai, ...settings },
        })),
    }),
    {
      name: 'jw-progress-settings',
      storage: createSafeStorage('jw-progress-settings') as any,
      // Persist plain data fields. AI keys are excluded to avoid storing secrets
      // in localStorage. We do NOT exclude action functions because zustand's
      // persist middleware would then drop them from the live state after
      // rehydration, causing selectors like useSettingsStore(s => s.setX) to
      // return undefined. JSON.stringify already drops function values, so
      // there's no security/correctness benefit to excluding them here.
      partialize: (state) => {
        const { ai: _ai, ...rest } = state;
        return rest;
      },
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
