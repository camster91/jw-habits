import { createContext, useContext } from 'react';

export const DrawerContext = createContext();

export function useDrawer() {
  return useContext(DrawerContext);
}
