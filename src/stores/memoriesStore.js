import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createSafeStorage } from '../utils/storageErrorHandler.js';
const useMemoriesStore = create()(persist((set, get) => ({
    reflections: {},
    saveReflection: (date, content) => set((state) => ({
        reflections: {
            ...state.reflections,
            [date]: {
                content,
                updatedAt: new Date().toISOString(),
                createdAt: state.reflections[date]?.createdAt || new Date().toISOString(),
            },
        },
    })),
    getReflection: (date) => {
        const state = get();
        return state.reflections[date]?.content || '';
    },
    getAllReflections: () => {
        const state = get();
        return Object.entries(state.reflections)
            .map(([date, data]) => ({
            date,
            ...data,
        }))
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    },
    getReflectionsByMonth: (year, month) => {
        const state = get();
        const prefix = `${year}-${String(month).padStart(2, '0')}`;
        return Object.entries(state.reflections)
            .filter(([date]) => date.startsWith(prefix))
            .map(([date, data]) => ({ date, ...data }))
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    },
    deleteReflection: (date) => set((state) => {
        const { [date]: _removed, ...rest } = state.reflections;
        return { reflections: rest };
    }),
    getReflectionCount: () => {
        const state = get();
        return Object.keys(state.reflections).length;
    },
    searchReflections: (query) => {
        const state = get();
        const lowerQuery = query.toLowerCase();
        return Object.entries(state.reflections)
            .filter(([, data]) => data.content.toLowerCase().includes(lowerQuery))
            .map(([date, data]) => ({ date, ...data }))
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    },
}), {
    name: 'jw-memories-storage',
    version: 1,
    storage: createSafeStorage('jw-memories-storage'),
    partialize: (state) => ({
        reflections: state.reflections,
    }),
}));
export default useMemoriesStore;
//# sourceMappingURL=memoriesStore.js.map