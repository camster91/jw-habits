import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createSafeStorage } from '../utils/storageErrorHandler';

const useServiceStore = create(
  persist(
    (set, get) => ({
      entries: [],
      monthlyGoalHours: 10,

      // ── Add entry ────────────────────────────────────────────
      addEntry: (entry) =>
        set((state) => ({
          entries: [
            ...state.entries,
            {
              ...entry,
              id: crypto.randomUUID(),
              date: entry.date || new Date().toISOString().split('T')[0],
              hours: Number(entry.hours) || 0,
              // New fields — track beyond just hours
              placements: Number(entry.placements) || 0,
              returnVisits: Number(entry.returnVisits) || 0,
              bibleStudies: Number(entry.bibleStudies) || 0,
              startTime: entry.startTime || null,
              endTime: entry.endTime || null,
              breaks: Number(entry.breaks) || 0,
              note: entry.note || '',
              type: entry.type || 'field-service',
              createdAt: new Date().toISOString(),
            },
          ],
        })),

      // ── Remove entry ─────────────────────────────────────────
      removeEntry: (id) =>
        set((state) => ({
          entries: state.entries.filter((entry) => entry.id !== id),
        })),

      // ── Monthly goal ─────────────────────────────────────────
      setMonthlyGoal: (hours) =>
        set(() => ({
          monthlyGoalHours: Number(hours) || 10,
        })),

      // ── Date helpers ─────────────────────────────────────────
      getWeekStart: () => {
        const now = new Date();
        const day = now.getDay();
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - day);
        weekStart.setHours(0, 0, 0, 0);
        return weekStart.toISOString().split('T')[0];
      },

      getMonthStart: () => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      },

      // ── Filtered queries ─────────────────────────────────────
      getTodaysEntries: () => {
        const today = new Date().toISOString().split('T')[0];
        return get().entries.filter((entry) => entry.date === today);
      },

      getWeeklyEntries: () => {
        const weekStart = get().getWeekStart();
        return get().entries.filter((entry) => entry.date >= weekStart);
      },

      getMonthlyEntries: () => {
        const monthStart = get().getMonthStart();
        return get().entries.filter((entry) => entry.date >= monthStart);
      },

      // ── Totals ───────────────────────────────────────────────
      getWeeklyTotal: () => {
        const weeklyEntries = get().getWeeklyEntries();
        return weeklyEntries.reduce((sum, entry) => sum + entry.hours, 0);
      },

      getMonthlyTotal: () => {
        const monthlyEntries = get().getMonthlyEntries();
        return monthlyEntries.reduce((sum, entry) => sum + entry.hours, 0);
      },

      // ── New: Placement/Return Visit/Bible Study totals ────────
      getWeeklyPlacements: () => {
        return get().getWeeklyEntries().reduce((sum, e) => sum + (e.placements || 0), 0);
      },

      getWeeklyReturnVisits: () => {
        return get().getWeeklyEntries().reduce((sum, e) => sum + (e.returnVisits || 0), 0);
      },

      getWeeklyBibleStudies: () => {
        return get().getWeeklyEntries().reduce((sum, e) => sum + (e.bibleStudies || 0), 0);
      },

      getMonthlyPlacements: () => {
        return get().getMonthlyEntries().reduce((sum, e) => sum + (e.placements || 0), 0);
      },

      getMonthlyReturnVisits: () => {
        return get().getMonthlyEntries().reduce((sum, e) => sum + (e.returnVisits || 0), 0);
      },

      getMonthlyBibleStudies: () => {
        return get().getMonthlyEntries().reduce((sum, e) => sum + (e.bibleStudies || 0), 0);
      },

      // ── Today's totals ───────────────────────────────────────
      getTodaysHours: () => {
        return get().getTodaysEntries().reduce((sum, e) => sum + e.hours, 0);
      },

      getTodaysPlacements: () => {
        return get().getTodaysEntries().reduce((sum, e) => sum + (e.placements || 0), 0);
      },

      getTodaysReturnVisits: () => {
        return get().getTodaysEntries().reduce((sum, e) => sum + (e.returnVisits || 0), 0);
      },

      getTodaysBibleStudies: () => {
        return get().getTodaysEntries().reduce((sum, e) => sum + (e.bibleStudies || 0), 0);
      },
    }),
    {
      name: 'jw-service-storage',
      storage: createSafeStorage('jw-service-storage'),
      version: 2,
      partialize: (state) => ({
        entries: state.entries,
        monthlyGoalHours: state.monthlyGoalHours,
      }),
    }
  )
);

export default useServiceStore;
