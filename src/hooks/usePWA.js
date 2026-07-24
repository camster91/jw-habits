/**
 * usePWA Hook
 * Manages PWA state: install prompt, install status, connectivity,
 * service worker updates.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  isPWACapable,
  isInstalled,
  isOnline as checkOnline,
  setDeferredPrompt,
  getDeferredPrompt,
  triggerInstallPrompt,
  registerConnectivityListeners,
  checkForUpdates,
  forceUpdate,
} from '../utils/pwa';

export function usePWA() {
  const [canInstall, setCanInstall] = useState(false);
  const [isAppInstalled, setIsAppInstalled] = useState(isInstalled());
  const [isOnline, setIsOnline] = useState(checkOnline());
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const updateListenersRef = useRef([]);

  // Handle beforeinstallprompt event
  useEffect(() => {
    if (!isPWACapable()) return;

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstall(true);
    };

    const handleAppInstalled = () => {
      setIsAppInstalled(true);
      setCanInstall(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Handle connectivity changes
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    return registerConnectivityListeners(handleOnline, handleOffline);
  }, []);

  // Listen for service worker updates (single registration path)
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    let cancelled = false;
    const cleanups = [];

    navigator.serviceWorker.ready
      .then((registration) => {
        if (cancelled) return;

        if (registration.waiting) {
          setUpdateAvailable(true);
        }

        const onUpdateFound = () => {
          const newWorker = registration.installing;
          if (!newWorker) return;
          const onStateChange = () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setUpdateAvailable(true);
            }
          };
          newWorker.addEventListener('statechange', onStateChange);
          cleanups.push(() => newWorker.removeEventListener('statechange', onStateChange));
        };

        registration.addEventListener('updatefound', onUpdateFound);
        cleanups.push(() => registration.removeEventListener('updatefound', onUpdateFound));
        updateListenersRef.current = cleanups;
      })
      .catch(() => {
        // SW unavailable (private mode / blocked)
      });

    return () => {
      cancelled = true;
      for (const fn of updateListenersRef.current) {
        try {
          fn();
        } catch {
          /* ignore */
        }
      }
      updateListenersRef.current = [];
      for (const fn of cleanups) {
        try {
          fn();
        } catch {
          /* ignore */
        }
      }
    };
  }, []);

  // Prompt to install the app
  const promptInstall = useCallback(async () => {
    if (!getDeferredPrompt()) {
      return { success: false, reason: 'no-prompt' };
    }

    try {
      const result = await triggerInstallPrompt();
      if (result.outcome === 'accepted') {
        setCanInstall(false);
        return { success: true };
      }
      return { success: false, reason: result.outcome };
    } catch {
      return { success: false, reason: 'error' };
    }
  }, []);

  // Apply pending update
  const applyUpdate = useCallback(() => {
    forceUpdate();
  }, []);

  // Check for updates manually
  const checkUpdates = useCallback(async () => {
    await checkForUpdates();
  }, []);

  return {
    // State
    canInstall,
    isAppInstalled,
    isOnline,
    updateAvailable,
    isPWACapable: isPWACapable(),

    // Actions
    promptInstall,
    applyUpdate,
    checkUpdates,
  };
}

export default usePWA;
