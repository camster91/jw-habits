import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useMemoriesStore = create(
  persist(
    (set, get) => ({
      // Daily Text reflections/notes
      reflections: {},

      // Save a reflection for a specific date
      saveReflection: (date, content) =>
        set((state) => ({
          reflections: {
            ...state.reflections,
            [date]: {
              content,
              updatedAt: new Date().toISOString(),
              createdAt: state.reflections[date]?.createdAt || new Date().toISOString(),
            },
          },
        })),

      // Get reflection for a specific date
      getReflection: (date) => {
        const state = get();
        return state.reflections[date]?.content || '';
      },

      // Get all reflections sorted by date (newest first)
      getAllReflections: () => {
        const state = get();
        return Object.entries(state.reflections)
          .map(([date, data]) => ({
            date,
            ...data,
          }))
          .sort((a, b) => new Date(b.date) - new Date(a.date));
      },

      // Get reflections for a specific month
      getReflectionsByMonth: (year, month) => {
        const state = get();
        const prefix = `${year}-${String(month).padStart(2, '0')}`;
        return Object.entries(state.reflections)
          .filter(([date]) => date.startsWith(prefix))
          .map(([date, data]) => ({ date, ...data }))
          .sort((a, b) => new Date(b.date) - new Date(a.date));
      },

      // Delete a reflection
      deleteReflection: (date) =>
        set((state) => {
          const { [date]: _removed, ...rest } = state.reflections;
          return { reflections: rest };
        }),

      // Get total reflection count
      getReflectionCount: () => {
        const state = get();
        return Object.keys(state.reflections).length;
      },

      // Search reflections by content
      searchReflections: (query) => {
        const state = get();
        const lowerQuery = query.toLowerCase();
        return Object.entries(state.reflections)
          .filter(([, data]) => data.content.toLowerCase().includes(lowerQuery))
          .map(([date, data]) => ({ date, ...data }))
          .sort((a, b) => new Date(b.date) - new Date(a.date));
      },
    }),
    {
      name: 'jw-memories-storage',
      version: 1,
    }
  )
);

export default useMemoriesStore;
