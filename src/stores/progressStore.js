import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { format, getDayOfYear, startOfWeek } from 'date-fns';

const useProgressStore = create(
  persist(
    (set, get) => ({
      // Daily Text Progress - Simplified to single checkbox
      dailyTexts: {},
      updateDailyTextProgress: (date, field, value) => set((state) => {
        const existing = state.dailyTexts[date] || {
          readScripture: false,
          progress: 0,
          timestamp: null
        };
        const updated = { ...existing, [field]: value, timestamp: new Date().toISOString() };
        // Single checkbox = 100% when checked
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
        return state.dailyTexts[date]?.read || state.dailyTexts[date]?.readScripture || false;
      },
      getDailyTextProgress: (date) => {
        const state = get();
        return state.dailyTexts[date] || {
          readScripture: false,
          progress: 0
        };
      },

      // Daily Prayer Tracking
      prayers: {},
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
        return state.prayers[date] || {
          morning: false,
          afternoon: false,
          evening: false
        };
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

      // Weekly Family Worship Tracking
      familyWorship: {},
      updateFamilyWorship: (weekKey, data) => set((state) => {
        const existing = state.familyWorship[weekKey] || {
          completed: false,
          date: null,
          topic: '',
          notes: '',
          studyLinks: [],
          timestamp: null
        };
        return {
          familyWorship: {
            ...state.familyWorship,
            [weekKey]: { ...existing, ...data, timestamp: new Date().toISOString() }
          }
        };
      }),
      toggleFamilyWorshipComplete: (weekKey) => set((state) => {
        const existing = state.familyWorship[weekKey] || {
          completed: false,
          date: null,
          topic: '',
          notes: '',
          studyLinks: []
        };
        return {
          familyWorship: {
            ...state.familyWorship,
            [weekKey]: { ...existing, completed: !existing.completed, timestamp: new Date().toISOString() }
          }
        };
      }),
      addStudyLink: (weekKey, link) => set((state) => {
        const existing = state.familyWorship[weekKey] || {
          completed: false,
          date: null,
          topic: '',
          notes: '',
          studyLinks: []
        };
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
        return state.familyWorship[weekKey] || {
          completed: false,
          date: null,
          topic: '',
          notes: '',
          studyLinks: []
        };
      },
      getWeekKey: (date = new Date()) => {
        const weekStart = startOfWeek(date, { weekStartsOn: 1 }); // Monday start
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

      // Bible Reading Progress - Enhanced with chapter-based tracking
      bibleReadings: {},
      bibleChapters: {}, // Track individual chapter completion per day

      // Toggle a specific chapter as complete/incomplete
      toggleBibleChapter: (dayOfYear, chapterIndex) => set((state) => {
        const existing = state.bibleChapters[dayOfYear] || {};
        const newChapters = { ...existing, [chapterIndex]: !existing[chapterIndex] };
        return {
          bibleChapters: {
            ...state.bibleChapters,
            [dayOfYear]: newChapters
          }
        };
      }),

      // Get chapter progress for a specific day
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
        // Check if all chapters are marked complete
        const chapters = state.bibleChapters[dayOfYear] || {};
        const completedCount = Object.values(chapters).filter(Boolean).length;
        // Assume at least one chapter needs to be marked
        if (completedCount > 0) {
          // We need to know how many total chapters - for now check if any are false
          const hasIncomplete = Object.values(chapters).some(v => v === false);
          if (!hasIncomplete && completedCount > 0) return true;
        }
        // Fall back to legacy check
        return state.bibleReadings[dayOfYear]?.read || state.bibleReadings[dayOfYear]?.progress === 100 || false;
      },
      getBibleReadingProgress: (dayOfYear) => {
        const state = get();
        return state.bibleReadings[dayOfYear]?.progress || 0;
      },

      // Meeting Preparation Progress - Enhanced with detailed parts
      meetings: {},
      updateMeetingPartProgress: (weekOf, meetingType, partKey, completed) => set((state) => {
        const key = `${weekOf}-${meetingType}`;
        const existing = state.meetings[key] || { parts: {}, progress: 0, prepared: false };
        const parts = { ...existing.parts, [partKey]: completed };

        // Calculate overall progress
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
        const existing = state.meetings[key] || {};
        const parts = existing.parts || {};
        // Initialize parts that don't exist yet
        const initializedParts = { ...parts };
        partKeys.forEach(k => {
          if (!(k in initializedParts)) {
            initializedParts[k] = false;
          }
        });
        return {
          meetings: {
            ...state.meetings,
            [key]: { ...existing, parts: initializedParts }
          }
        };
      }),
      getMeetingProgress: (weekOf, meetingType) => {
        const state = get();
        const key = `${weekOf}-${meetingType}`;
        return state.meetings[key] || { parts: {}, progress: 0, prepared: false };
      },
      markMeetingPrepared: (weekOf, meetingType, studyTime = 0) => set((state) => ({
        meetings: {
          ...state.meetings,
          [`${weekOf}-${meetingType}`]: {
            ...state.meetings[`${weekOf}-${meetingType}`],
            prepared: true,
            progress: 100,
            timestamp: new Date().toISOString(),
            studyTime
          }
        }
      })),
      isMeetingPrepared: (weekOf, meetingType) => {
        const state = get();
        const meeting = state.meetings[`${weekOf}-${meetingType}`];
        return meeting?.prepared || meeting?.progress === 100 || false;
      },

      // Streaks Calculation
      getDailyTextStreak: () => {
        const state = get();
        let streak = 0;
        const today = new Date();

        for (let i = 0; i < 365; i++) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          const dateStr = format(date, 'yyyy-MM-dd');

          if (state.dailyTexts[dateStr]?.read) {
            streak++;
          } else {
            break;
          }
        }
        return streak;
      },

      getBibleReadingStreak: () => {
        const state = get();
        let streak = 0;
        const today = new Date();

        for (let i = 0; i < 365; i++) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          const day = getDayOfYear(date);

          if (state.bibleReadings[day]?.read) {
            streak++;
          } else {
            break;
          }
        }
        return streak;
      },

      getMeetingPrepStreak: () => {
        const state = get();
        let streak = 0;
        const today = new Date();

        for (let i = 0; i < 52; i++) {
          const date = new Date(today);
          date.setDate(date.getDate() - (i * 7));
          const weekStart = startOfWeek(date, { weekStartsOn: 1 });
          const weekOf = format(weekStart, 'yyyy-MM-dd');

          // Check if either meeting type was prepared this week
          const midweek = state.meetings[`${weekOf}-midweek`];
          const weekend = state.meetings[`${weekOf}-weekend`];

          if (midweek?.prepared || weekend?.prepared) {
            streak++;
          } else {
            break;
          }
        }
        return streak;
      },

      // Get all streaks for display
      getAllStreaks: () => {
        const state = get();
        return {
          dailyText: get().getDailyTextStreak(),
          bibleReading: get().getBibleReadingStreak(),
          prayer: get().getPrayerStreak(),
          familyWorship: get().getFamilyWorshipStreak(),
          meetingPrep: get().getMeetingPrepStreak()
        };
      },

      // Statistics
      getCompletionRate: (type, days = 7) => {
        const state = get();
        let completed = 0;
        const today = new Date();

        for (let i = 0; i < days; i++) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);

          if (type === 'dailyText') {
            const dateStr = format(date, 'yyyy-MM-dd');
            if (state.dailyTexts[dateStr]?.read) completed++;
          } else if (type === 'bibleReading') {
            const day = getDayOfYear(date);
            if (state.bibleReadings[day]?.read) completed++;
          }
        }

        return Math.round((completed / days) * 100);
      },

      // Clear all data (for testing)
      clearAll: () => set({
        dailyTexts: {},
        bibleReadings: {},
        bibleChapters: {},
        meetings: {},
        prayers: {},
        familyWorship: {}
      })
    }),
    {
      name: 'jw-progress-storage', // LocalStorage key
      version: 2
    }
  )
);

export default useProgressStore;
