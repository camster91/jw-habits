interface NotificationSetting {
    enabled: boolean;
    time: string;
    label: string;
    dayOfWeek?: number;
    daysBefore?: number;
    meetingDays?: number[];
}
export interface Notifications {
    enabled: boolean;
    dailyText: NotificationSetting;
    morningPrayer: NotificationSetting;
    afternoonPrayer: NotificationSetting;
    eveningPrayer: NotificationSetting;
    bibleReading: NotificationSetting;
    familyWorship: NotificationSetting;
    meetingPrep: NotificationSetting;
    streakMotivation: NotificationSetting;
}
interface BibleReadingSchedule {
    startingScheduleDay: number;
    customStartDate: string | null;
    useCustomSchedule: boolean;
    readingPace: number;
}
interface SettingsState {
    notifications: Notifications;
    bibleReadingSchedule: BibleReadingSchedule;
    notificationsEnabled: boolean;
    theme: 'light' | 'dark';
    ai: {
        provider: 'ollama' | 'none';
        ollamaBaseUrl: string;
        ollamaApiKey: string;
        ollamaModel: string;
    };
}
interface SettingsActions {
    setNotificationsEnabled: (enabled: boolean) => void;
    toggleNotification: (key: keyof Notifications) => void;
    setNotificationTime: (key: keyof Notifications, time: string) => void;
    updateNotification: (key: keyof Notifications, updates: Partial<NotificationSetting>) => void;
    setTheme: (theme: 'light' | 'dark') => void;
    setBibleReadingSchedule: (schedule: Partial<BibleReadingSchedule>) => void;
    getEffectiveScheduleDay: () => number;
    setBibleReadingStartDay: (day: number) => void;
    setBibleReadingPace: (pace: number) => void;
    resetBibleReadingSchedule: () => void;
    setAiSettings: (settings: Partial<SettingsState['ai']>) => void;
}
declare const useSettingsStore: import("zustand").UseBoundStore<Omit<import("zustand").StoreApi<SettingsState & SettingsActions>, "setState" | "persist"> & {
    setState(partial: (SettingsState & SettingsActions) | Partial<SettingsState & SettingsActions> | ((state: SettingsState & SettingsActions) => (SettingsState & SettingsActions) | Partial<SettingsState & SettingsActions>), replace?: false | undefined): unknown;
    setState(state: (SettingsState & SettingsActions) | ((state: SettingsState & SettingsActions) => SettingsState & SettingsActions), replace: true): unknown;
    persist: {
        setOptions: (options: Partial<import("zustand/middleware").PersistOptions<SettingsState & SettingsActions, {
            notifications: Notifications;
            bibleReadingSchedule: BibleReadingSchedule;
            notificationsEnabled: boolean;
            theme: "light" | "dark";
            setNotificationsEnabled: (enabled: boolean) => void;
            toggleNotification: (key: keyof Notifications) => void;
            setNotificationTime: (key: keyof Notifications, time: string) => void;
            updateNotification: (key: keyof Notifications, updates: Partial<NotificationSetting>) => void;
            setTheme: (theme: "light" | "dark") => void;
            setBibleReadingSchedule: (schedule: Partial<BibleReadingSchedule>) => void;
            getEffectiveScheduleDay: () => number;
            setBibleReadingStartDay: (day: number) => void;
            setBibleReadingPace: (pace: number) => void;
            resetBibleReadingSchedule: () => void;
            setAiSettings: (settings: Partial<SettingsState["ai"]>) => void;
        }, unknown>>) => void;
        clearStorage: () => void;
        rehydrate: () => Promise<void> | void;
        hasHydrated: () => boolean;
        onHydrate: (fn: (state: SettingsState & SettingsActions) => void) => () => void;
        onFinishHydration: (fn: (state: SettingsState & SettingsActions) => void) => () => void;
        getOptions: () => Partial<import("zustand/middleware").PersistOptions<SettingsState & SettingsActions, {
            notifications: Notifications;
            bibleReadingSchedule: BibleReadingSchedule;
            notificationsEnabled: boolean;
            theme: "light" | "dark";
            setNotificationsEnabled: (enabled: boolean) => void;
            toggleNotification: (key: keyof Notifications) => void;
            setNotificationTime: (key: keyof Notifications, time: string) => void;
            updateNotification: (key: keyof Notifications, updates: Partial<NotificationSetting>) => void;
            setTheme: (theme: "light" | "dark") => void;
            setBibleReadingSchedule: (schedule: Partial<BibleReadingSchedule>) => void;
            getEffectiveScheduleDay: () => number;
            setBibleReadingStartDay: (day: number) => void;
            setBibleReadingPace: (pace: number) => void;
            resetBibleReadingSchedule: () => void;
            setAiSettings: (settings: Partial<SettingsState["ai"]>) => void;
        }, unknown>>;
    };
}>;
export declare const READING_PACE_OPTIONS: {
    value: number;
    label: string;
    description: string;
}[];
export default useSettingsStore;
//# sourceMappingURL=settingsStore.d.ts.map