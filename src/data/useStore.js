import { createContext, useContext } from 'react';

/** Holds `{store, update, today}`; provided by StoreProvider. */
export const StoreContext = createContext(null);

/**
 * @returns {{store: object, update: (fn: (store: object) => object) => void, today: string}}
 */
export function useStore() {
  const value = useContext(StoreContext);
  if (!value) throw new Error('useStore must be used inside <StoreProvider>');
  return value;
}
