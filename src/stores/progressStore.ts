import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { format, getDayOfYear, startOfWeek } from 'date-fns';

interface DailyTextData {
  readScripture: boolean;
  progress: number;
  read?: boolean;
  timestamp: string | null;
}

interface PrayerData {
  morning: boolean;
  afternoon: boolean;
  evening: boolean;
  timestamp: string | null;
}

interface StudyLink {
  id: number;
  url: string;
  title: string;
}

interface FamilyWorshipData {
  completed: boolean;
  date: string | null;
  topic: string;
  notes: string;
  studyLinks: StudyLink[];
  timestamp: string | null;
}

interface MeetingPartData {
  parts: Record<string, boolean>;
  progress: number;
  prepared: boolean;
  timestamp: string | null;
}

interface BibleReadingData {
  progress: number;
  chaptersRead?: number[];
  read: boolean;
  status: 'not_started' | 'in_progress' | 'completed';
  timestamp: string | null;
}

interface ProgressState {
  dailyTexts: Record<string, DailyTextData>;
  prayers: Record<string, PrayerData>;
  familyWorship: Record<string, FamilyWorshipData>;
  bibleReadings: Record<string, BibleReadingData>;
  bibleChapters: Record<string, Record<number, boolean>>;
  meetings: Record<string, MeetingPartData>;
}

interface ProgressActions {
  updateDailyTextProgress: (date: string, field: keyof DailyTextData, value: any) => void;
  markDailyTextRead: (date: string) => void;
  isDailyTextRead: (date: string) => boolean;
  getDailyTextProgress: (date: string) => DailyTextData | { readScripture: boolean; progress: number };
  updatePrayerProgress: (date: string, prayerType: keyof PrayerData, value: boolean) => void;
  getPrayerProgress: (date: string) => PrayerData | { morning: boolean; afternoon: boolean; evening: boolean };
  getAllPrayersComplete: (date: string) => boolean | undefined;
  getPrayerStreak: () => number;
  updateFamilyWorship: (weekKey: string, data: Partial<FamilyWorshipData>) => void;
  toggleFamilyWorshipComplete: (weekKey: string) => void;
  addStudyLink: (weekKey: string, link: Omit<StudyLink, 'id'>) => void;
  removeStudyLink: (weekKey: string, linkId: number) => void;
  getFamilyWorship: (weekKey: string) => FamilyWorshipData;
  getWeekKey: (date?: Date) => string;
  getFamilyWorshipStreak: () => number;
  toggleBibleChapter: (dayOfYear: string, chapterIndex: number) => void;
  getBibleChapterProgress: (dayOfYear: string) => Record<number, boolean>;
  updateBibleReadingProgress: (dayOfYear: string, progress: number, chaptersRead?: number[]) => void;
  markBibleReadingComplete: (dayOfYear: string) => void;
  isBibleReadingComplete: (dayOfYear: string) => boolean;
  getBibleReadingProgress: (dayOfYear: string) => number;
  updateMeetingPartProgress: (weekOf: string, meetingType: string, partKey: string, completed: boolean) => void;
  initMeetingParts: (weekOf: string, meetingType: string, partKeys: string[]) => void;
  clearAll: () => void;
}

const useProgressStore = create<ProgressState & ProgressActions>()(
  persist(
    (set, get) => ({
      dailyTexts: {},
      prayers: {},
      familyWorship: {},
      bibleReadings: {},
      bibleChapters: {},
      meetings: {},

      updateDailyTextProgress: (date, field, value) => set((state) => {
        const existing = state.dailyTexts[date] || {
          readScripture: false,
          progress: 0,
          timestamp: null
        };
        const updated = { ...existing, [field]: value, timestamp: new Date().toISOString() };
        updated.progress = updated.readScripture ? 100 : 0;
        updated.read = updated.readScripture;
        return {
          dailyTexts: { ...state.dailyTexts, [date]: updated }
        };
      }),

      markDailyTextRead: (date) => set((state) => ({
        dailyTexts: {
          ...state.dailyTexts,
          [date]: {
            readScripture: true,
            progress: 100,
            read: true,
            timestamp: new Date().toISOString()
          }
        }
      })),

      isDailyTextRead: (date) => {
        const state = get();
        const data = state.dailyTexts[date];
        return data?.read || data?.readScripture || false;
      },

      getDailyTextProgress: (date) => {
        const state = get();
        return state.dailyTexts[date] || { readScripture: false, progress: 0 };
      },

      updatePrayerProgress: (date, prayerType, value) => set((state) => {
        const existing = state.prayers[date] || {
          morning: false,
          afternoon: false,
          evening: false,
          timestamp: null
        };
        const updated = { ...existing, [prayerType]: value, timestamp: new Date().toISOString() };
        return {
          prayers: { ...state.prayers, [date]: updated }
        };
      }),

      getPrayerProgress: (date) => {
        const state = get();
        return state.prayers[date] || { morning: false, afternoon: false, evening: false };
      },

      getAllPrayersComplete: (date) => {
        const state = get();
        const prayers = state.prayers[date];
        return prayers?.morning && prayers?.afternoon && prayers?.evening;
      },

      getPrayerStreak: () => {
        const state = get();
        let streak = 0;
        const today = new Date();
        for (let i = 0; i < 365; i++) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          const dateStr = format(date, 'yyyy-MM-dd');
          const prayers = state.prayers[dateStr];
          if (prayers?.morning && prayers?.afternoon && prayers?.evening) {
            streak++;
          } else {
            break;
          }
        }
        return streak;
      },

      updateFamilyWorship: (weekKey, data) => set((state) => ({
        familyWorship: {
          ...state.familyWorship,
          [weekKey]: { ...(state.familyWorship[weekKey] || { completed: false, date: null, topic: '', notes: '', studyLinks: [], timestamp: null }), ...data, timestamp: new Date().toISOString() }
        }
      })),

      toggleFamilyWorshipComplete: (weekKey) => set((state) => {
        const existing = state.familyWorship[weekKey] || { completed: false, date: null, topic: '', notes: '', studyLinks: [], timestamp: null };
        return {
          familyWorship: {
            ...state.familyWorship,
            [weekKey]: { ...existing, completed: !existing.completed, timestamp: new Date().toISOString() }
          }
        };
      }),

      addStudyLink: (weekKey, link) => set((state) => {
        const existing = state.familyWorship[weekKey] || { completed: false, date: null, topic: '', notes: '', studyLinks: [], timestamp: null };
        return {
          familyWorship: {
            ...state.familyWorship,
            [weekKey]: {
              ...existing,
              studyLinks: [...existing.studyLinks, { id: Date.now(), ...link }],
              timestamp: new Date().toISOString()
            }
          }
        };
      }),

      removeStudyLink: (weekKey, linkId) => set((state) => {
        const existing = state.familyWorship[weekKey];
        if (!existing) return state;
        return {
          familyWorship: {
            ...state.familyWorship,
            [weekKey]: {
              ...existing,
              studyLinks: existing.studyLinks.filter(l => l.id !== linkId),
              timestamp: new Date().toISOString()
            }
          }
        };
      }),

      getFamilyWorship: (weekKey) => {
        const state = get();
        return state.familyWorship[weekKey] || { completed: false, date: null, topic: '', notes: '', studyLinks: [], timestamp: null };
      },

      getWeekKey: (date = new Date()) => {
        const weekStart = startOfWeek(date, { weekStartsOn: 1 });
        return format(weekStart, 'yyyy-MM-dd');
      },

      getFamilyWorshipStreak: () => {
        const state = get();
        let streak = 0;
        const today = new Date();
        for (let i = 0; i < 52; i++) {
          const date = new Date(today);
          date.setDate(date.getDate() - (i * 7));
          const weekKey = get().getWeekKey(date);
          if (state.familyWorship[weekKey]?.completed) {
            streak++;
          } else {
            break;
          }
        }
        return streak;
      },

      toggleBibleChapter: (dayOfYear, chapterIndex) => set((state) => ({
        bibleChapters: {
          ...state.bibleChapters,
          [dayOfYear]: {
            ...(state.bibleChapters[dayOfYear] || {}),
            [chapterIndex]: !(state.bibleChapters[dayOfYear] || {})[chapterIndex]
          }
        }
      })),

      getBibleChapterProgress: (dayOfYear) => {
        const state = get();
        return state.bibleChapters[dayOfYear] || {};
      },

      updateBibleReadingProgress: (dayOfYear, progress, chaptersRead = []) => set((state) => ({
        bibleReadings: {
          ...state.bibleReadings,
          [dayOfYear]: {
            progress,
            chaptersRead,
            read: progress === 100,
            status: progress === 0 ? 'not_started' : progress === 100 ? 'completed' : 'in_progress',
            timestamp: new Date().toISOString()
          }
        }
      })),

      markBibleReadingComplete: (dayOfYear) => set((state) => ({
        bibleReadings: {
          ...state.bibleReadings,
          [dayOfYear]: {
            progress: 100,
            read: true,
            status: 'completed',
            timestamp: new Date().toISOString()
          }
        }
      })),

      isBibleReadingComplete: (dayOfYear) => {
        const state = get();
        const chapters = state.bibleChapters[dayOfYear] || {};
        const completedCount = Object.values(chapters).filter(Boolean).length;
        if (completedCount > 0) {
          const hasIncomplete = Object.values(chapters).some(v => v === false);
          if (!hasIncomplete && completedCount > 0) return true;
        }
        return state.bibleReadings[dayOfYear]?.read || state.bibleReadings[dayOfYear]?.progress === 100 || false;
      },

      getBibleReadingProgress: (dayOfYear) => {
        const state = get();
        return state.bibleReadings[dayOfYear]?.progress || 0;
      },

      updateMeetingPartProgress: (weekOf, meetingType, partKey, completed) => set((state) => {
        const key = `${weekOf}-${meetingType}`;
        const existing = state.meetings[key] || { parts: {}, progress: 0, prepared: false, timestamp: null };
        const parts = { ...existing.parts, [partKey]: completed };
        const totalParts = Object.keys(parts).length;
        const completedParts = Object.values(parts).filter(Boolean).length;
        const progress = totalParts > 0 ? Math.round((completedParts / totalParts) * 100) : 0;
        return {
          meetings: {
            ...state.meetings,
            [key]: {
              ...existing,
              parts,
              progress,
              prepared: progress === 100,
              timestamp: new Date().toISOString()
            }
          }
        };
      }),

      initMeetingParts: (weekOf, meetingType, partKeys) => set((state) => {
        const key = `${weekOf}-${meetingType}`;
        const existing = state.meetings[key] || { parts: {}, progress: 0, prepared: false, timestamp: null };
        const parts = { ...existing.parts };
        partKeys.forEach(k => {
          if (!(k in parts)) parts[k] = false;
        });
        return {
          meetings: {
            ...state.meetings,
            [key]: { ...existing, parts }
          }
        };
      }),

      clearAll: () => set({ dailyTexts: {}, prayers: {}, familyWorship: {}, bibleReadings: {}, bibleChapters: {}, meetings: {} }),
    }),
    {
      name: 'jw-progress-storage',
      partialize: (state) => ({
        dailyTexts: state.dailyTexts,
        prayers: state.prayers,
        familyWorship: state.familyWorship,
        bibleReadings: state.bibleReadings,
        bibleChapters: state.bibleChapters,
        meetings: state.meetings,
      }),
    }
  )
);

export default useProgressStore;
