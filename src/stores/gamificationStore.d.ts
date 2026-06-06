interface Achievement {
    id: string;
    name: string;
    description: string;
    icon: string;
    points: number;
    category: string;
}
export declare const ACHIEVEMENTS: Achievement[];
interface UserAchievement {
    id: string;
    unlockedAt: string;
}
interface GamificationState {
    points: number;
    currentStreak: number;
    longestStreak: number;
    lastActivityDate: string | null;
    prayerStreak: number;
    longestPrayerStreak: number;
    lastPrayerDate: string | null;
    familyWorshipStreak: number;
    longestFamilyWorshipStreak: number;
    dailyTextCompletions: number;
    reflectionsWritten: number;
    newsRead: number;
    bibleReadingsCompleted: number;
    goalsCompleted: number;
    projectsCompleted: number;
    meetingsPrepared: number;
    prayersCompleted: number;
    serviceEntries: number;
    serviceHours: number;
    recentAchievements: Achievement[];
    unlockedAchievements: UserAchievement[];
}
interface AchievementWithStatus extends Achievement {
    unlocked: boolean;
    unlockedAt?: string;
}
interface GamificationStats {
    points: number;
    currentStreak: number;
    longestStreak: number;
    dailyTextCompletions: number;
    bibleReadingsCompleted: number;
    prayersCompleted: number;
    familyWorshipCompleted: number;
    reflectionsWritten: number;
    newsRead: number;
    goalsCompleted: number;
    projectsCompleted: number;
    meetingsPrepared: number;
    achievementsUnlocked: number;
    totalAchievements: number;
}
interface GamificationActions {
    addPoints: (points: number) => void;
    updateStreak: (date: string) => void;
    updatePrayerStreak: (date: string) => void;
    updateFamilyWorshipStreak: (weekKey: string, completed: boolean) => void;
    incrementActivity: (category: string) => void;
    getLevel: () => number;
    getPointsToNextLevel: () => number;
    getStats: () => GamificationStats;
    getAllAchievements: () => AchievementWithStatus[];
    recordDailyTextCompletion: () => void;
    recordReflection: () => void;
    recordNewsRead: () => void;
    recordBibleReading: () => void;
    recordGoalCompleted: () => void;
    recordProjectCompleted: () => void;
    recordMeetingPrepared: () => void;
    recordPrayerCompleted: () => void;
    recordPrayerCompletion: (allDone: boolean) => void;
    recordFamilyWorshipCompletion: () => void;
    recordServiceActivity: (hours: number, contacts: number, placements: number) => void;
    checkAndUnlockAchievements: () => void;
    clearRecentAchievements: () => void;
}
declare const useGamificationStore: import("zustand").UseBoundStore<Omit<import("zustand").StoreApi<GamificationState & GamificationActions>, "setState" | "persist"> & {
    setState(partial: (GamificationState & GamificationActions) | Partial<GamificationState & GamificationActions> | ((state: GamificationState & GamificationActions) => (GamificationState & GamificationActions) | Partial<GamificationState & GamificationActions>), replace?: false | undefined): unknown;
    setState(state: (GamificationState & GamificationActions) | ((state: GamificationState & GamificationActions) => GamificationState & GamificationActions), replace: true): unknown;
    persist: {
        setOptions: (options: Partial<import("zustand/middleware").PersistOptions<GamificationState & GamificationActions, unknown, unknown>>) => void;
        clearStorage: () => void;
        rehydrate: () => Promise<void> | void;
        hasHydrated: () => boolean;
        onHydrate: (fn: (state: GamificationState & GamificationActions) => void) => () => void;
        onFinishHydration: (fn: (state: GamificationState & GamificationActions) => void) => () => void;
        getOptions: () => Partial<import("zustand/middleware").PersistOptions<GamificationState & GamificationActions, unknown, unknown>>;
    };
}>;
export default useGamificationStore;
//# sourceMappingURL=gamificationStore.d.ts.map