/**
 * Native mobile utilities for Capacitor
 * Provides haptic feedback, status bar control, and platform detection
 */

import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Keyboard } from '@capacitor/keyboard';
import { App } from '@capacitor/app';
import { SplashScreen } from '@capacitor/splash-screen';

// Platform detection
export const isNative = Capacitor.isNativePlatform();
export const isIOS = Capacitor.getPlatform() === 'ios';
export const isAndroid = Capacitor.getPlatform() === 'android';
export const isWeb = Capacitor.getPlatform() === 'web';

/**
 * Haptic feedback utilities
 */
export const haptics = {
  // Light tap - for selections, toggles
  light: async () => {
    if (!isNative) return;
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch (e) {
      console.warn('Haptics not available:', e);
    }
  },

  // Medium tap - for button presses
  medium: async () => {
    if (!isNative) return;
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch (e) {
      console.warn('Haptics not available:', e);
    }
  },

  // Heavy tap - for important actions
  heavy: async () => {
    if (!isNative) return;
    try {
      await Haptics.impact({ style: ImpactStyle.Heavy });
    } catch (e) {
      console.warn('Haptics not available:', e);
    }
  },

  // Success notification
  success: async () => {
    if (!isNative) return;
    try {
      await Haptics.notification({ type: NotificationType.Success });
    } catch (e) {
      console.warn('Haptics not available:', e);
    }
  },

  // Warning notification
  warning: async () => {
    if (!isNative) return;
    try {
      await Haptics.notification({ type: NotificationType.Warning });
    } catch (e) {
      console.warn('Haptics not available:', e);
    }
  },

  // Error notification
  error: async () => {
    if (!isNative) return;
    try {
      await Haptics.notification({ type: NotificationType.Error });
    } catch (e) {
      console.warn('Haptics not available:', e);
    }
  },

  // Selection changed
  selection: async () => {
    if (!isNative) return;
    try {
      await Haptics.selectionChanged();
    } catch (e) {
      console.warn('Haptics not available:', e);
    }
  },
};

/**
 * Status bar utilities
 */
export const statusBar = {
  // Set light content (white icons) - for dark backgrounds
  setLight: async () => {
    if (!isNative) return;
    try {
      await StatusBar.setStyle({ style: Style.Light });
    } catch (e) {
      console.warn('StatusBar not available:', e);
    }
  },

  // Set dark content (black icons) - for light backgrounds
  setDark: async () => {
    if (!isNative) return;
    try {
      await StatusBar.setStyle({ style: Style.Dark });
    } catch (e) {
      console.warn('StatusBar not available:', e);
    }
  },

  // Set background color (Android only)
  setBackgroundColor: async (color) => {
    if (!isNative || !isAndroid) return;
    try {
      await StatusBar.setBackgroundColor({ color });
    } catch (e) {
      console.warn('StatusBar not available:', e);
    }
  },

  // Hide status bar
  hide: async () => {
    if (!isNative) return;
    try {
      await StatusBar.hide();
    } catch (e) {
      console.warn('StatusBar not available:', e);
    }
  },

  // Show status bar
  show: async () => {
    if (!isNative) return;
    try {
      await StatusBar.show();
    } catch (e) {
      console.warn('StatusBar not available:', e);
    }
  },
};

/**
 * Keyboard utilities
 */
export const keyboard = {
  // Hide keyboard
  hide: async () => {
    if (!isNative) return;
    try {
      await Keyboard.hide();
    } catch (e) {
      console.warn('Keyboard not available:', e);
    }
  },

  // Add keyboard show listener
  onShow: (callback) => {
    if (!isNative) return () => {};
    const listener = Keyboard.addListener('keyboardWillShow', callback);
    return () => listener.then((l) => l.remove());
  },

  // Add keyboard hide listener
  onHide: (callback) => {
    if (!isNative) return () => {};
    const listener = Keyboard.addListener('keyboardWillHide', callback);
    return () => listener.then((l) => l.remove());
  },
};

/**
 * App lifecycle utilities
 */
export const appLifecycle = {
  // Add back button listener (Android)
  onBackButton: (callback) => {
    if (!isNative) return () => {};
    const listener = App.addListener('backButton', callback);
    return () => listener.then((l) => l.remove());
  },

  // Add app state change listener
  onStateChange: (callback) => {
    if (!isNative) return () => {};
    const listener = App.addListener('appStateChange', callback);
    return () => listener.then((l) => l.remove());
  },

  // Get app info
  getInfo: async () => {
    if (!isNative) return null;
    try {
      return await App.getInfo();
    } catch (e) {
      console.warn('App info not available:', e);
      return null;
    }
  },

  // Exit app (Android only)
  exit: () => {
    if (!isNative || !isAndroid) return;
    App.exitApp();
  },
};

/**
 * Splash screen utilities
 */
export const splash = {
  // Hide splash screen
  hide: async () => {
    if (!isNative) return;
    try {
      await SplashScreen.hide();
    } catch (e) {
      console.warn('SplashScreen not available:', e);
    }
  },

  // Show splash screen
  show: async () => {
    if (!isNative) return;
    try {
      await SplashScreen.show({
        autoHide: false,
      });
    } catch (e) {
      console.warn('SplashScreen not available:', e);
    }
  },
};

/**
 * Initialize native features
 * Call this once on app startup
 */
export const initializeNative = async () => {
  if (!isNative) return;

  try {
    // Set status bar style
    await StatusBar.setStyle({ style: Style.Light });

    // Set status bar background (Android)
    if (isAndroid) {
      await StatusBar.setBackgroundColor({ color: '#4A6FA4' });
    }

    // Hide splash screen after a short delay
    setTimeout(() => {
      SplashScreen.hide().catch(() => {
        /* splash already hidden / plugin unavailable */
      });
    }, 500);
  } catch (e) {
    console.warn('Failed to initialize native features:', e);
  }
};

export default {
  isNative,
  isIOS,
  isAndroid,
  isWeb,
  haptics,
  statusBar,
  keyboard,
  appLifecycle,
  splash,
  initializeNative,
};
