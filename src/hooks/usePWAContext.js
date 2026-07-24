import { useContext } from 'react';
import { PWAContext } from '../components/pwaContext';

/** Read shared PWA state from the single <PWAProvider> mount. */
export function usePWAContext() {
  const ctx = useContext(PWAContext);
  if (!ctx) {
    throw new Error('usePWAContext must be used within <PWAProvider>');
  }
  return ctx;
}
