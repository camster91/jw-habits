import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createSafeStorage } from '../utils/storageErrorHandler';

const useServiceStore = create(
  persist(
    (set, get) => ({
      entries: [],
      monthlyGoalHours: 10,

      // Add a new service entry
      addEntry: (entry) =>
        set((state) => ({
          entries: [
            ...state.entries,
            {
              ...entry,
              id: crypto.randomUUID(),
              date: entry.date || new Date().toISOString().split('T')[0],
              hours: Number(entry.hours) || 0,
              note: entry.note || '',
              createdAt: new Date().toISOString(),
            },
          ],
        })),

      // Remove an entry by id
      removeEntry: (id) =>
        set((state) => ({
          entries: state.entries.filter((entry) => entry.id !== id),
        })),

      // Update monthly goal hours
      setMonthlyGoal: (hours) =>
        set(() => ({
          monthlyGoalHours: Number(hours) || 10,
        })),

      // Get start of current week (Sunday)
      getWeekStart: () => {
        const now = new Date();
        const day = now.getDay();
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - day);
        weekStart.setHours(0, 0, 0, 0);
        return weekStart.toISOString().split('T')[0];
      },

      // Get start of current month
      getMonthStart: () => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      },

      // Get today's entries
      getTodaysEntries: () => {
        const today = new Date().toISOString().split('T')[0];
        return get().entries.filter((entry) => entry.date === today);
      },

      // Get this week's entries
      getWeeklyEntries: () => {
        const weekStart = get().getWeekStart();
        return get().entries.filter((entry) => entry.date >= weekStart);
      },

      // Get this month's entries
      getMonthlyEntries: () => {
        const monthStart = get().getMonthStart();
        return get().entries.filter((entry) => entry.date >= monthStart);
      },

      // Get weekly total hours
      getWeeklyTotal: () => {
        const weeklyEntries = get().getWeeklyEntries();
        return weeklyEntries.reduce((sum, entry) => sum + entry.hours, 0);
      },

      // Get monthly total hours
      getMonthlyTotal: () => {
        const monthlyEntries = get().getMonthlyEntries();
        return monthlyEntries.reduce((sum, entry) => sum + entry.hours, 0);
      },
    }),
    {
      name: 'jw-service-storage',
      storage: createSafeStorage('jw-service-storage'),
      version: 1,
      partialize: (state) => ({
        entries: state.entries,
        monthlyGoalHours: state.monthlyGoalHours,
      }),
    }
  )
);

export default useServiceStore;
