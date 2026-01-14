import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { format, getDayOfYear } from 'date-fns';

const useProgressStore = create(
  persist(
    (set, get) => ({
      // Daily Text Progress
      dailyTexts: {},
      markDailyTextRead: (date) => set((state) => ({
        dailyTexts: {
          ...state.dailyTexts,
          [date]: { read: true, timestamp: new Date().toISOString() }
        }
      })),
      isDailyTextRead: (date) => {
        const state = get();
        return state.dailyTexts[date]?.read || false;
      },

      // Bible Reading Progress
      bibleReadings: {},
      markBibleReadingComplete: (dayOfYear) => set((state) => ({
        bibleReadings: {
          ...state.bibleReadings,
          [dayOfYear]: {
            read: true,
            timestamp: new Date().toISOString()
          }
        }
      })),
      isBibleReadingComplete: (dayOfYear) => {
        const state = get();
        return state.bibleReadings[dayOfYear]?.read || false;
      },

      // Meeting Preparation Progress
      meetings: {},
      markMeetingPrepared: (weekOf, meetingType, studyTime = 0) => set((state) => ({
        meetings: {
          ...state.meetings,
          [`${weekOf}-${meetingType}`]: {
            prepared: true,
            timestamp: new Date().toISOString(),
            studyTime
          }
        }
      })),
      isMeetingPrepared: (weekOf, meetingType) => {
        const state = get();
        return state.meetings[`${weekOf}-${meetingType}`]?.prepared || false;
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
