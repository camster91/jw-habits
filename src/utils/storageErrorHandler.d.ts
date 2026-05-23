export declare function createStorageErrorHandler(storeName: string): (error: any) => void;
export declare function createSafeStorage(storeName: string): {
  getItem: (name: string) => string | null;
  setItem: (name: string, value: string) => void;
  removeItem: (name: string) => void;
};
