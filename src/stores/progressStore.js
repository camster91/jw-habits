import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { format, getDayOfYear, startOfWeek } from 'date-fns';
import { createSafeStorage } from '../utils/storageErrorHandler.js';
const useProgressStore = create()(persist((set, get) => ({
    dailyTexts: {},
    prayers: {},
    familyWorship: {},
    bibleReadings: {},
    bibleChapters: {},
    weeklyReadings: {},
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
            }
            else {
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
                    studyLinks: [...existing.studyLinks, { id: crypto.randomUUID(), ...link }],
                    timestamp: new Date().toISOString()
                }
            }
        };
    }),
    removeStudyLink: (weekKey, linkId) => set((state) => {
        const existing = state.familyWorship[weekKey];
        if (!existing)
            return state;
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
            }
            else {
                break;
            }
        }
        return streak;
    },
    getDailyTextStreak: () => {
        const state = get();
        let streak = 0;
        const today = new Date();
        for (let i = 0; i < 365; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = format(date, 'yyyy-MM-dd');
            const data = state.dailyTexts[dateStr];
            if (data?.readScripture || data?.read) {
                streak++;
            }
            else {
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
            const dayOfYear = String(getDayOfYear(date));
            const data = state.bibleReadings[dayOfYear];
            if (data?.read || data?.progress === 100) {
                streak++;
            }
            else {
                break;
            }
        }
        return streak;
    },
    getCompletionRate: (category, days) => {
        const state = get();
        let completed = 0;
        const today = new Date();
        for (let i = 0; i < days; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            if (category === 'dailyText') {
                const dateStr = format(date, 'yyyy-MM-dd');
                const data = state.dailyTexts[dateStr];
                if (data?.readScripture || data?.read)
                    completed++;
            }
            else if (category === 'bibleReading') {
                const dayOfYear = String(getDayOfYear(date));
                const data = state.bibleReadings[dayOfYear];
                if (data?.read || data?.progress === 100)
                    completed++;
            }
        }
        return Math.round((completed / days) * 100);
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
            if (!hasIncomplete && completedCount > 0)
                return true;
        }
        return state.bibleReadings[dayOfYear]?.read || state.bibleReadings[dayOfYear]?.progress === 100 || false;
    },
    getBibleReadingProgress: (dayOfYear) => {
        const state = get();
        return state.bibleReadings[dayOfYear]?.progress || 0;
    },
    getWeeklyReadingProgress: (weekKey) => {
        const state = get();
        return state.weeklyReadings[weekKey] || { chapters: {}, completed: false, totalChapters: 0, timestamp: null };
    },
    toggleWeeklyChapter: (weekKey, chapterIndex) => set((state) => {
        const existing = state.weeklyReadings[weekKey] || { chapters: {}, completed: false, totalChapters: 0, timestamp: null };
        const chapters = { ...existing.chapters, [chapterIndex]: !existing.chapters[chapterIndex] };
        return {
            weeklyReadings: {
                ...state.weeklyReadings,
                [weekKey]: { ...existing, chapters, timestamp: new Date().toISOString() }
            }
        };
    }),
    isWeeklyReadingComplete: (weekKey, totalChapters) => {
        const state = get();
        const data = state.weeklyReadings[weekKey];
        if (!data)
            return false;
        if (data.completed)
            return true;
        const completedCount = Object.values(data.chapters).filter(Boolean).length;
        return completedCount >= totalChapters && totalChapters > 0;
    },
    markWeeklyReadingComplete: (weekKey, totalChapters) => set((state) => {
        const existing = state.weeklyReadings[weekKey] || { chapters: {}, completed: false, totalChapters: 0, timestamp: null };
        const chapters = { ...existing.chapters };
        for (let i = 0; i < totalChapters; i++) {
            chapters[i] = true;
        }
        return {
            weeklyReadings: {
                ...state.weeklyReadings,
                [weekKey]: { chapters, completed: true, totalChapters, timestamp: new Date().toISOString() }
            }
        };
    }),
    getWeeklyReadingStreak: () => {
        const state = get();
        let streak = 0;
        const today = new Date();
        for (let i = 0; i < 52; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() - (i * 7));
            const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
            const dayNum = d.getUTCDay() || 7;
            d.setUTCDate(d.getUTCDate() + 4 - dayNum);
            const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
            const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
            const weekKey = `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
            if (state.weeklyReadings[weekKey]?.completed) {
                streak++;
            }
            else {
                break;
            }
        }
        return streak;
    },
    getMeetingProgress: (weekOf, meetingType) => {
        const state = get();
        const key = `${weekOf}-${meetingType}`;
        return state.meetings[key] || { parts: {}, progress: 0, prepared: false, timestamp: null };
    },
    isMeetingPrepared: (weekOf, meetingType) => {
        const state = get();
        const key = `${weekOf}-${meetingType}`;
        return state.meetings[key]?.prepared || false;
    },
    markMeetingPrepared: (weekOf, meetingType) => set((state) => {
        const key = `${weekOf}-${meetingType}`;
        const existing = state.meetings[key] || { parts: {}, progress: 0, prepared: false, timestamp: null };
        const parts = { ...existing.parts };
        Object.keys(parts).forEach(k => { parts[k] = true; });
        return {
            meetings: {
                ...state.meetings,
                [key]: {
                    ...existing,
                    parts,
                    progress: 100,
                    prepared: true,
                    timestamp: new Date().toISOString()
                }
            }
        };
    }),
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
            if (!(k in parts))
                parts[k] = false;
        });
        return {
            meetings: {
                ...state.meetings,
                [key]: { ...existing, parts }
            }
        };
    }),
    clearAll: () => set({ dailyTexts: {}, prayers: {}, familyWorship: {}, bibleReadings: {}, bibleChapters: {}, meetings: {}, weeklyReadings: {} }),
}), {
    name: 'jw-progress-storage',
    storage: createSafeStorage('jw-progress-storage'),
    partialize: (state) => ({
        dailyTexts: state.dailyTexts,
        prayers: state.prayers,
        familyWorship: state.familyWorship,
        bibleReadings: state.bibleReadings,
        bibleChapters: state.bibleChapters,
        meetings: state.meetings,
        weeklyReadings: state.weeklyReadings,
    }),
}));
export default useProgressStore;
//# sourceMappingURL=progressStore.js.map