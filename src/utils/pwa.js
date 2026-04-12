/**
 * PWA Utilities
 * Handles service worker registration, push notifications, and install prompts
 */

// Check if running in a browser that supports PWA features
export const isPWACapable = () => {
  return 'serviceWorker' in navigator;
};

// Check if app is installed (standalone mode)
export const isInstalled = () => {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true ||
    document.referrer.includes('android-app://')
  );
};

// Import notification functions from notifications.js (single source of truth)
// Used locally by scheduleDailyReminder and re-exported for consumers
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  showNotification,
} from './notifications.js';

// Re-export for consumers that import from pwa.js
export {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  showNotification,
};

// Schedule a daily reminder notification
export const scheduleDailyReminder = async (hour = 7, minute = 0) => {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return false;
  }

  // Store the reminder time in localStorage
  localStorage.setItem('dailyReminderTime', JSON.stringify({ hour, minute }));

  // The service worker will handle the actual scheduling
  try {
    const registration = await navigator.serviceWorker.ready;
    if (registration.periodicSync) {
      await registration.periodicSync.register('daily-reminder', {
        minInterval: 24 * 60 * 60 * 1000, // 24 hours
      });
      return true;
    }
  } catch {
    console.log('Periodic sync not supported, using fallback');
  }

  return false;
};

// Check for app updates
export const checkForUpdates = async () => {
  if (!isPWACapable()) return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.update();
    return true;
  } catch (error) {
    console.error('Error checking for updates:', error);
    return false;
  }
};

// Force refresh to update the app
export const forceUpdate = () => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => {
        registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
      });
    });
  }
  window.location.reload();
};

// Get install prompt event (stored from beforeinstallprompt)
let deferredPrompt = null;

export const setDeferredPrompt = (event) => {
  deferredPrompt = event;
};

export const getDeferredPrompt = () => deferredPrompt;

export const clearDeferredPrompt = () => {
  deferredPrompt = null;
};

// Trigger the install prompt
export const triggerInstallPrompt = async () => {
  if (!deferredPrompt) {
    return { outcome: 'unavailable' };
  }

  try {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    clearDeferredPrompt();
    return { outcome };
  } catch (error) {
    console.error('Error triggering install prompt:', error);
    return { outcome: 'error', error };
  }
};

// Check online status
export const isOnline = () => navigator.onLine;

// Register online/offline listeners
export const registerConnectivityListeners = (onOnline, onOffline) => {
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);

  return () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
  };
};

// Cache status utilities
export const getCacheStatus = async () => {
  if (!('caches' in window)) {
    return { supported: false };
  }

  try {
    const cacheNames = await caches.keys();
    let totalSize = 0;

    for (const name of cacheNames) {
      const cache = await caches.open(name);
      const keys = await cache.keys();
      totalSize += keys.length;
    }

    return {
      supported: true,
      cacheCount: cacheNames.length,
      totalEntries: totalSize,
      cacheNames,
    };
  } catch (error) {
    return { supported: true, error };
  }
};

// Clear all caches
export const clearAllCaches = async () => {
  if (!('caches' in window)) return false;

  try {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((name) => caches.delete(name)));
    return true;
  } catch (error) {
    console.error('Error clearing caches:', error);
    return false;
  }
};

// Storage estimate
export const getStorageEstimate = async () => {
  if (!('storage' in navigator) || !('estimate' in navigator.storage)) {
    return { supported: false };
  }

  try {
    const estimate = await navigator.storage.estimate();
    return {
      supported: true,
      usage: estimate.usage,
      quota: estimate.quota,
      usagePercent: ((estimate.usage / estimate.quota) * 100).toFixed(2),
    };
  } catch (error) {
    return { supported: true, error };
  }
};

// Request persistent storage
export const requestPersistentStorage = async () => {
  if (!('storage' in navigator) || !('persist' in navigator.storage)) {
    return { supported: false };
  }

  try {
    const persisted = await navigator.storage.persist();
    return { supported: true, persisted };
  } catch (error) {
    return { supported: true, error };
  }
};

export default {
  isPWACapable,
  isInstalled,
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  showNotification,
  scheduleDailyReminder,
  checkForUpdates,
  forceUpdate,
  setDeferredPrompt,
  getDeferredPrompt,
  clearDeferredPrompt,
  triggerInstallPrompt,
  isOnline,
  registerConnectivityListeners,
  getCacheStatus,
  clearAllCaches,
  getStorageEstimate,
  requestPersistentStorage,
};
