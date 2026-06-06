interface Reflection {
    content: string;
    updatedAt: string;
    createdAt: string;
}
interface MemoriesState {
    reflections: Record<string, Reflection>;
}
interface MemoriesActions {
    saveReflection: (date: string, content: string) => void;
    getReflection: (date: string) => string;
    getAllReflections: () => ({
        date: string;
    } & Reflection)[];
    getReflectionsByMonth: (year: number, month: number) => ({
        date: string;
    } & Reflection)[];
    deleteReflection: (date: string) => void;
    getReflectionCount: () => number;
    searchReflections: (query: string) => ({
        date: string;
    } & Reflection)[];
}
declare const useMemoriesStore: import("zustand").UseBoundStore<Omit<import("zustand").StoreApi<MemoriesState & MemoriesActions>, "setState" | "persist"> & {
    setState(partial: (MemoriesState & MemoriesActions) | Partial<MemoriesState & MemoriesActions> | ((state: MemoriesState & MemoriesActions) => (MemoriesState & MemoriesActions) | Partial<MemoriesState & MemoriesActions>), replace?: false | undefined): unknown;
    setState(state: (MemoriesState & MemoriesActions) | ((state: MemoriesState & MemoriesActions) => MemoriesState & MemoriesActions), replace: true): unknown;
    persist: {
        setOptions: (options: Partial<import("zustand/middleware").PersistOptions<MemoriesState & MemoriesActions, {
            reflections: Record<string, Reflection>;
        }, unknown>>) => void;
        clearStorage: () => void;
        rehydrate: () => Promise<void> | void;
        hasHydrated: () => boolean;
        onHydrate: (fn: (state: MemoriesState & MemoriesActions) => void) => () => void;
        onFinishHydration: (fn: (state: MemoriesState & MemoriesActions) => void) => () => void;
        getOptions: () => Partial<import("zustand/middleware").PersistOptions<MemoriesState & MemoriesActions, {
            reflections: Record<string, Reflection>;
        }, unknown>>;
    };
}>;
export default useMemoriesStore;
//# sourceMappingURL=memoriesStore.d.ts.map