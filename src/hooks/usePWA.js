/**
 * usePWA Hook
 * Manages PWA state: install prompt, install status, connectivity,
 * service worker updates. Does NOT handle notifications; the
 * launchpad version of the app does not schedule local
 * notifications.
 */

import { useState, useEffect, useCallback } from 'react';
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

  // Listen for service worker updates
  useEffect(() => {
    if (!isPWACapable()) return;

    const handleControllerChange = () => {
      setUpdateAvailable(true);
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    // Check for waiting service worker
    navigator.serviceWorker.ready.then((registration) => {
      if (registration.waiting) {
        setUpdateAvailable(true);
      }

      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setUpdateAvailable(true);
            }
          });
        }
      });
    });

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);

  // Prompt to install the app
  const promptInstall = useCallback(async () => {
    if (!getDeferredPrompt()) {
      return { success: false, reason: 'no-prompt' };
    }

    const result = await triggerInstallPrompt();

    if (result.outcome === 'accepted') {
      setCanInstall(false);
      return { success: true };
    }

    return { success: false, reason: result.outcome };
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
