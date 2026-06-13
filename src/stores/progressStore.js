import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { format, startOfWeek } from 'date-fns';
import { createSafeStorage } from '../utils/storageErrorHandler.js';

// Bible reading data is now keyed by yyyy-MM-dd (date string) rather
// than 1-366 (day-of-year). The old 1-366 shape silently clobbered
// prior-year data when a user's usage crossed a year boundary — day
// 1 of 2025 overwrote day 1 of 2024 — and the streak algorithm
// couldn't walk back more than 365 days without crossing into the
// wrong year. The migration in onRehydrateStorage copies any
// legacy 1-366 keys into the current year's date-keyed slots and
// drops the old keys.

/**
 * One-time migration from the old dayOfYear-keyed shape to the new
 * date-keyed shape. Called on every persist rehydration (idempotent —
 * a no-op once the migration has run).
 *
 * Heuristic: keys in [bibleReadings, bibleChapters] that are all
 * digits and parse to integers in [1, 366] are treated as legacy
 * dayOfYear. They are copied to a yyyy-MM-dd key representing
 * "dayOfYear in the current year" and the original key is removed.
 *
 * Lossy boundary case: if a user opens the app for the first time
 * in 2026 but their old data is from 2025, the migration maps
 * day 100 → 2026-04-10 (April 10, 2026) instead of 2025-04-10. The
 * old shape had no year, so this is the best we can do without a
 * full date history. Most users opening the app at least once per
 * year will see their current-year data correctly preserved.
 */
export function migrateBibleKeys(state) {
    if (!state) return state;
    let bibleReadings = state.bibleReadings || {};
    let bibleChapters = state.bibleChapters || {};
    let changed = false;
    const now = new Date();
    const year = now.getFullYear();

    const isLegacyKey = (k) => /^\d{1,3}$/.test(k) && Number(k) >= 1 && Number(k) <= 366;

    if (Object.keys(bibleReadings).some(isLegacyKey)) {
        const next = {};
        for (const [k, v] of Object.entries(bibleReadings)) {
            if (isLegacyKey(k)) {
                const dayOfYear = Number(k);
                // dayOfYear in [1, 366] → date in current year.
                const date = new Date(year, 0, dayOfYear);
                const dateStr = format(date, 'yyyy-MM-dd');
                next[dateStr] = v;
            } else {
                next[k] = v;
            }
        }
        bibleReadings = next;
        changed = true;
    }
    if (Object.keys(bibleChapters).some(isLegacyKey)) {
        const next = {};
        for (const [k, v] of Object.entries(bibleChapters)) {
            if (isLegacyKey(k)) {
                const dayOfYear = Number(k);
                const date = new Date(year, 0, dayOfYear);
                const dateStr = format(date, 'yyyy-MM-dd');
                next[dateStr] = v;
            } else {
                next[k] = v;
            }
        }
        bibleChapters = next;
        changed = true;
    }
    if (!changed) return state;
    return { ...state, bibleReadings, bibleChapters };
}

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
        return existing ? {
            familyWorship: {
                ...state.familyWorship,
                [weekKey]: {
                    ...existing,
                    studyLinks: existing.studyLinks.filter(l => l.id !== linkId),
                    timestamp: new Date().toISOString()
                }
            }
        } : state;
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
        // Walks back 365 days from today, looking up each date in
        // bibleReadings. Keys are now yyyy-MM-dd, so this works across
        // year boundaries (the old 1-366-keyed shape did not).
        const state = get();
        let streak = 0;
        const today = new Date();
        for (let i = 0; i < 365; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = format(date, 'yyyy-MM-dd');
            const data = state.bibleReadings[dateStr];
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
                const dateStr = format(date, 'yyyy-MM-dd');
                const data = state.bibleReadings[dateStr];
                if (data?.read || data?.progress === 100)
                    completed++;
            }
        }
        return Math.round((completed / days) * 100);
    },
    // All bible-chapter and bible-reading functions below now take
    // a yyyy-MM-dd DATE STRING (not a 1-366 dayOfYear). Caller-side
    // change: BibleReadingCard.jsx used to pass `safeScheduleDay`
    // (a number). It now passes `format(targetDate, 'yyyy-MM-dd')`.
    // The migration in onRehydrateStorage preserves existing data.
    toggleBibleChapter: (dateStr, chapterIndex) => set((state) => ({
        bibleChapters: {
            ...state.bibleChapters,
            [dateStr]: {
                ...(state.bibleChapters[dateStr] || {}),
                [chapterIndex]: !(state.bibleChapters[dateStr] || {})[chapterIndex]
            }
        }
    })),
    getBibleChapterProgress: (dateStr) => {
        const state = get();
        return state.bibleChapters[dateStr] || {};
    },
    updateBibleReadingProgress: (dateStr, progress, chaptersRead = []) => set((state) => ({
        bibleReadings: {
            ...state.bibleReadings,
            [dateStr]: {
                progress,
                chaptersRead,
                read: progress === 100,
                status: progress === 0 ? 'not_started' : progress === 100 ? 'completed' : 'in_progress',
                timestamp: new Date().toISOString()
            }
        }
    })),
    markBibleReadingComplete: (dateStr) => set((state) => ({
        bibleReadings: {
            ...state.bibleReadings,
            [dateStr]: {
                progress: 100,
                read: true,
                status: 'completed',
                timestamp: new Date().toISOString()
            }
        }
    })),
    isBibleReadingComplete: (dateStr) => {
        const state = get();
        const chapters = state.bibleChapters[dateStr] || {};
        const completedCount = Object.values(chapters).filter(Boolean).length;
        if (completedCount > 0) {
            const hasIncomplete = Object.values(chapters).some(v => v === false);
            if (!hasIncomplete && completedCount > 0)
                return true;
        }
        return state.bibleReadings[dateStr]?.read || state.bibleReadings[dateStr]?.progress === 100 || false;
    },
    getBibleReadingProgress: (dateStr) => {
        const state = get();
        return state.bibleReadings[dateStr]?.progress || 0;
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
        return Object.values(data.chapters).filter(Boolean).length >= totalChapters && totalChapters > 0;
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
                [key]: { ...existing, parts, progress: 100, prepared: true, timestamp: new Date().toISOString() }
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
                [key]: { ...existing, parts, progress, prepared: progress === 100, timestamp: new Date().toISOString() }
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
    clearAll: () => set({ dailyTexts: {}, prayers: {}, familyWorship: {}, bibleReadings: {}, bibleChapters: {}, meetings: {}, weeklyReadings: {} }),
}), {
    name: 'jw-progress-storage',
    storage: createSafeStorage('jw-progress-storage'),
    // Run the dayOfYear → yyyy-MM-dd migration on every rehydrate
    // (idempotent — a no-op after the first run).
    onRehydrateStorage: () => (state) => migrateBibleKeys(state),
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
