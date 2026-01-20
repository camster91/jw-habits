import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { format, getDayOfYear } from 'date-fns';

const useProgressStore = create(
  persist(
    (set, get) => ({
      // Daily Text Progress - Enhanced with checklist
      dailyTexts: {},
      updateDailyTextProgress: (date, field, value) => set((state) => {
        const existing = state.dailyTexts[date] || {
          readScripture: false,
          readComments: false,
          meditated: false,
          progress: 0,
          timestamp: null
        };
        const updated = { ...existing, [field]: value, timestamp: new Date().toISOString() };
        // Calculate progress from checkboxes
        const checks = [updated.readScripture, updated.readComments, updated.meditated];
        updated.progress = Math.round((checks.filter(Boolean).length / 3) * 100);
        // Legacy compatibility
        updated.read = updated.progress === 100;
        return {
          dailyTexts: { ...state.dailyTexts, [date]: updated }
        };
      }),
      markDailyTextRead: (date) => set((state) => ({
        dailyTexts: {
          ...state.dailyTexts,
          [date]: {
            readScripture: true,
            readComments: true,
            meditated: true,
            progress: 100,
            read: true,
            timestamp: new Date().toISOString()
          }
        }
      })),
      isDailyTextRead: (date) => {
        const state = get();
        return state.dailyTexts[date]?.read || state.dailyTexts[date]?.progress === 100 || false;
      },
      getDailyTextProgress: (date) => {
        const state = get();
        return state.dailyTexts[date] || {
          readScripture: false,
          readComments: false,
          meditated: false,
          progress: 0
        };
      },

      // Bible Reading Progress - Enhanced with partial tracking
      bibleReadings: {},
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
        meetings: {}
      })
    }),
    {
      name: 'jw-progress-storage', // LocalStorage key
      version: 1
    }
  )
);

export default useProgressStore;
