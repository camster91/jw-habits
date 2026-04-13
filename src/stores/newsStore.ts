import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { startOfDay, isSameDay, parseISO } from 'date-fns';
import { createSafeStorage } from '../utils/storageErrorHandler';

interface NewsState {
  lastChecked: string | null;
  streak: number;
  history: string[];
  totalChecks: number;
}

interface NewsActions {
  checkToday: () => void;
  getHasCheckedToday: () => boolean;
  getStreak: () => number;
  getTotalChecks: () => number;
  getHistory: () => string[];
  resetStreak: () => void;
  resetHistory: () => void;
  resetAll: () => void;
}

type NewsStore = NewsState & NewsActions;

const useNewsStore = create<NewsStore>()(
  persist(
    (set, get) => ({
      lastChecked: null,
      streak: 0,
      history: [],
      totalChecks: 0,

      checkToday: () => {
        const now = new Date();
        const today = startOfDay(now);
        const state = get();

        if (state.lastChecked) {
          const lastCheckedDate = parseISO(state.lastChecked);
          if (isSameDay(lastCheckedDate, today)) {
            return;
          }
        }

        let newStreak = 1;
        if (state.lastChecked) {
          const lastCheckedDate = parseISO(state.lastChecked);
          const yesterday = startOfDay(new Date(now.getTime() - 24 * 60 * 60 * 1000));

          if (isSameDay(lastCheckedDate, yesterday)) {
            newStreak = state.streak + 1;
          } else if (!isSameDay(lastCheckedDate, today)) {
            newStreak = 1;
          }
        }

        const todayISO = today.toISOString();
        const newHistory = [...state.history, todayISO].sort().filter((date, index, arr) =>
          index === arr.findIndex(d => isSameDay(parseISO(d), parseISO(date)))
        );

        set({
          lastChecked: todayISO,
          streak: newStreak,
          history: newHistory,
          totalChecks: state.totalChecks + 1,
        });
      },

      getHasCheckedToday: () => {
        const state = get();
        if (!state.lastChecked) return false;
        const lastCheckedDate = parseISO(state.lastChecked);
        const today = startOfDay(new Date());
        return isSameDay(lastCheckedDate, today);
      },

      getStreak: () => get().streak,
      getTotalChecks: () => get().totalChecks,
      getHistory: () => get().history,

      resetStreak: () => set({ streak: 0 }),
      resetHistory: () => set({ history: [], totalChecks: 0 }),
      resetAll: () => set({ lastChecked: null, streak: 0, history: [], totalChecks: 0 }),
    }),
    {
      name: 'jw-news-store',
      storage: createSafeStorage('jw-news-store'),
      partialize: (state) => ({
        lastChecked: state.lastChecked,
        streak: state.streak,
        history: state.history,
        totalChecks: state.totalChecks,
      }),
    }
  )
);

export default useNewsStore;