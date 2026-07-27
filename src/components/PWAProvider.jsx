/**
 * PWAProvider — single mount for PWA listeners.
 *
 * InstallPrompt, UpdatePrompt, and OfflineIndicator each used to call
 * usePWA(), which registered triplicate beforeinstallprompt /
 * controllerchange / connectivity listeners. This provider owns the
 * hook once; consumers read via usePWAContext().
 */

import { usePWA } from '../hooks/usePWA';
import { PWAContext } from './pwaContext';

export function PWAProvider({ children }) {
  const value = usePWA();
  return <PWAContext.Provider value={value}>{children}</PWAContext.Provider>;
}

export default PWAProvider;
