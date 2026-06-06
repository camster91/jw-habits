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
declare const useNewsStore: import("zustand").UseBoundStore<Omit<import("zustand").StoreApi<NewsStore>, "setState" | "persist"> & {
    setState(partial: NewsStore | Partial<NewsStore> | ((state: NewsStore) => NewsStore | Partial<NewsStore>), replace?: false | undefined): unknown;
    setState(state: NewsStore | ((state: NewsStore) => NewsStore), replace: true): unknown;
    persist: {
        setOptions: (options: Partial<import("zustand/middleware").PersistOptions<NewsStore, {
            lastChecked: string | null;
            streak: number;
            history: string[];
            totalChecks: number;
        }, unknown>>) => void;
        clearStorage: () => void;
        rehydrate: () => Promise<void> | void;
        hasHydrated: () => boolean;
        onHydrate: (fn: (state: NewsStore) => void) => () => void;
        onFinishHydration: (fn: (state: NewsStore) => void) => () => void;
        getOptions: () => Partial<import("zustand/middleware").PersistOptions<NewsStore, {
            lastChecked: string | null;
            streak: number;
            history: string[];
            totalChecks: number;
        }, unknown>>;
    };
}>;
export default useNewsStore;
//# sourceMappingURL=newsStore.d.ts.map