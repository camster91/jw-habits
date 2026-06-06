interface DailyTextData {
    readScripture: boolean;
    progress: number;
    read?: boolean;
    timestamp: string | null;
}
interface PrayerData {
    morning: boolean;
    afternoon: boolean;
    evening: boolean;
    timestamp: string | null;
}
interface StudyLink {
    id: string;
    url: string;
    title: string;
}
interface FamilyWorshipData {
    completed: boolean;
    date: string | null;
    topic: string;
    notes: string;
    studyLinks: StudyLink[];
    timestamp: string | null;
}
interface MeetingPartData {
    parts: Record<string, boolean>;
    progress: number;
    prepared: boolean;
    timestamp: string | null;
}
interface BibleReadingData {
    progress: number;
    chaptersRead?: number[];
    read: boolean;
    status: 'not_started' | 'in_progress' | 'completed';
    timestamp: string | null;
}
interface WeeklyReadingData {
    chapters: Record<number, boolean>;
    completed: boolean;
    totalChapters: number;
    timestamp: string | null;
}
interface ProgressState {
    dailyTexts: Record<string, DailyTextData>;
    prayers: Record<string, PrayerData>;
    familyWorship: Record<string, FamilyWorshipData>;
    bibleReadings: Record<string, BibleReadingData>;
    bibleChapters: Record<string, Record<number, boolean>>;
    meetings: Record<string, MeetingPartData>;
    weeklyReadings: Record<string, WeeklyReadingData>;
}
interface ProgressActions {
    updateDailyTextProgress: (date: string, field: keyof DailyTextData, value: boolean | number | string | null) => void;
    markDailyTextRead: (date: string) => void;
    isDailyTextRead: (date: string) => boolean;
    getDailyTextProgress: (date: string) => DailyTextData | {
        readScripture: boolean;
        progress: number;
    };
    updatePrayerProgress: (date: string, prayerType: keyof PrayerData, value: boolean) => void;
    getPrayerProgress: (date: string) => PrayerData | {
        morning: boolean;
        afternoon: boolean;
        evening: boolean;
    };
    getAllPrayersComplete: (date: string) => boolean | undefined;
    getPrayerStreak: () => number;
    updateFamilyWorship: (weekKey: string, data: Partial<FamilyWorshipData>) => void;
    toggleFamilyWorshipComplete: (weekKey: string) => void;
    addStudyLink: (weekKey: string, link: Omit<StudyLink, 'id'>) => void;
    removeStudyLink: (weekKey: string, linkId: string) => void;
    getFamilyWorship: (weekKey: string) => FamilyWorshipData;
    getWeekKey: (date?: Date) => string;
    getFamilyWorshipStreak: () => number;
    getDailyTextStreak: () => number;
    getBibleReadingStreak: () => number;
    getCompletionRate: (category: string, days: number) => number;
    toggleBibleChapter: (dayOfYear: string, chapterIndex: number) => void;
    getBibleChapterProgress: (dayOfYear: string) => Record<number, boolean>;
    updateBibleReadingProgress: (dayOfYear: string, progress: number, chaptersRead?: number[]) => void;
    markBibleReadingComplete: (dayOfYear: string) => void;
    isBibleReadingComplete: (dayOfYear: string) => boolean;
    getBibleReadingProgress: (dayOfYear: string) => number;
    getWeeklyReadingProgress: (weekKey: string) => WeeklyReadingData;
    toggleWeeklyChapter: (weekKey: string, chapterIndex: number) => void;
    isWeeklyReadingComplete: (weekKey: string, totalChapters: number) => boolean;
    markWeeklyReadingComplete: (weekKey: string, totalChapters: number) => void;
    getWeeklyReadingStreak: () => number;
    getMeetingProgress: (weekOf: string, meetingType: string) => MeetingPartData;
    isMeetingPrepared: (weekOf: string, meetingType: string) => boolean;
    markMeetingPrepared: (weekOf: string, meetingType: string, duration?: number) => void;
    updateMeetingPartProgress: (weekOf: string, meetingType: string, partKey: string, completed: boolean) => void;
    initMeetingParts: (weekOf: string, meetingType: string, partKeys: string[]) => void;
    clearAll: () => void;
}
declare const useProgressStore: import("zustand").UseBoundStore<Omit<import("zustand").StoreApi<ProgressState & ProgressActions>, "setState" | "persist"> & {
    setState(partial: (ProgressState & ProgressActions) | Partial<ProgressState & ProgressActions> | ((state: ProgressState & ProgressActions) => (ProgressState & ProgressActions) | Partial<ProgressState & ProgressActions>), replace?: false | undefined): unknown;
    setState(state: (ProgressState & ProgressActions) | ((state: ProgressState & ProgressActions) => ProgressState & ProgressActions), replace: true): unknown;
    persist: {
        setOptions: (options: Partial<import("zustand/middleware").PersistOptions<ProgressState & ProgressActions, {
            dailyTexts: Record<string, DailyTextData>;
            prayers: Record<string, PrayerData>;
            familyWorship: Record<string, FamilyWorshipData>;
            bibleReadings: Record<string, BibleReadingData>;
            bibleChapters: Record<string, Record<number, boolean>>;
            meetings: Record<string, MeetingPartData>;
            weeklyReadings: Record<string, WeeklyReadingData>;
        }, unknown>>) => void;
        clearStorage: () => void;
        rehydrate: () => Promise<void> | void;
        hasHydrated: () => boolean;
        onHydrate: (fn: (state: ProgressState & ProgressActions) => void) => () => void;
        onFinishHydration: (fn: (state: ProgressState & ProgressActions) => void) => () => void;
        getOptions: () => Partial<import("zustand/middleware").PersistOptions<ProgressState & ProgressActions, {
            dailyTexts: Record<string, DailyTextData>;
            prayers: Record<string, PrayerData>;
            familyWorship: Record<string, FamilyWorshipData>;
            bibleReadings: Record<string, BibleReadingData>;
            bibleChapters: Record<string, Record<number, boolean>>;
            meetings: Record<string, MeetingPartData>;
            weeklyReadings: Record<string, WeeklyReadingData>;
        }, unknown>>;
    };
}>;
export default useProgressStore;
//# sourceMappingURL=progressStore.d.ts.map