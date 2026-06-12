import { describe, it, expect, vi } from 'vitest';

// Mock all the Capacitor plugins BEFORE importing native.js, so the
// `isNative` constant is computed from the mock. In jsdom (test env),
// Capacitor.isNativePlatform() returns false by default — the real
// platform is "web".
vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => false,
    getPlatform: () => 'web',
  },
}));
vi.mock('@capacitor/haptics', () => ({
  Haptics: {
    impact: vi.fn(() => Promise.resolve()),
    notification: vi.fn(() => Promise.resolve()),
    selectionChanged: vi.fn(() => Promise.resolve()),
  },
  ImpactStyle: { Light: 'LIGHT', Medium: 'MEDIUM', Heavy: 'HEAVY' },
  NotificationType: { Success: 'SUCCESS', Warning: 'WARNING', Error: 'ERROR' },
}));
vi.mock('@capacitor/status-bar', () => ({
  StatusBar: {
    setStyle: vi.fn(() => Promise.resolve()),
    setBackgroundColor: vi.fn(() => Promise.resolve()),
    hide: vi.fn(() => Promise.resolve()),
    show: vi.fn(() => Promise.resolve()),
  },
  Style: { Light: 'LIGHT', Dark: 'DARK' },
}));
vi.mock('@capacitor/keyboard', () => ({
  Keyboard: {
    hide: vi.fn(() => Promise.resolve()),
    addListener: vi.fn(() => Promise.resolve({ remove: vi.fn() })),
  },
}));
vi.mock('@capacitor/app', () => ({
  App: {
    addListener: vi.fn(() => Promise.resolve({ remove: vi.fn() })),
    getInfo: vi.fn(() => Promise.resolve({ name: 'test', version: '1.0.0' })),
    exitApp: vi.fn(),
  },
}));
vi.mock('@capacitor/splash-screen', () => ({
  SplashScreen: {
    hide: vi.fn(() => Promise.resolve()),
    show: vi.fn(() => Promise.resolve()),
  },
}));

import { haptics, statusBar, keyboard, appLifecycle, splash, isNative, isIOS, isAndroid, isWeb, initializeNative } from './native.js';
import { Haptics } from '@capacitor/haptics';
import { StatusBar } from '@capacitor/status-bar';
import { Keyboard } from '@capacitor/keyboard';
import { App } from '@capacitor/app';
import { SplashScreen } from '@capacitor/splash-screen';

describe('platform detection', () => {
  it('isNative is false in the test env (jsdom)', () => {
    expect(isNative).toBe(false);
  });
  it('isWeb is true in the test env', () => {
    expect(isWeb).toBe(true);
  });
  it('isIOS and isAndroid are both false in the test env', () => {
    expect(isIOS).toBe(false);
    expect(isAndroid).toBe(false);
  });
});

describe('haptics (no-ops on web)', () => {
  it('light() does not call Haptics.impact on web', async () => {
    const before = Haptics.impact.mock.calls.length;
    await haptics.light();
    expect(Haptics.impact.mock.calls.length).toBe(before);
  });

  it('medium() does not call Haptics.impact on web', async () => {
    const before = Haptics.impact.mock.calls.length;
    await haptics.medium();
    expect(Haptics.impact.mock.calls.length).toBe(before);
  });

  it('heavy() does not call Haptics.impact on web', async () => {
    const before = Haptics.impact.mock.calls.length;
    await haptics.heavy();
    expect(Haptics.impact.mock.calls.length).toBe(before);
  });

  it('success/warning/error do not call Haptics.notification on web', async () => {
    const before = Haptics.notification.mock.calls.length;
    await haptics.success();
    await haptics.warning();
    await haptics.error();
    expect(Haptics.notification.mock.calls.length).toBe(before);
  });

  it('selection() does not call Haptics.selectionChanged on web', async () => {
    const before = Haptics.selectionChanged.mock.calls.length;
    await haptics.selection();
    expect(Haptics.selectionChanged.mock.calls.length).toBe(before);
  });

  it('all haptics methods are no-ops (resolve to undefined)', async () => {
    expect(await haptics.light()).toBeUndefined();
    expect(await haptics.medium()).toBeUndefined();
    expect(await haptics.heavy()).toBeUndefined();
    expect(await haptics.success()).toBeUndefined();
    expect(await haptics.warning()).toBeUndefined();
    expect(await haptics.error()).toBeUndefined();
    expect(await haptics.selection()).toBeUndefined();
  });
});

describe('statusBar (no-ops on web)', () => {
  it('does not call StatusBar methods on web', async () => {
    const before = {
      setStyle: StatusBar.setStyle.mock.calls.length,
      hide: StatusBar.hide.mock.calls.length,
      show: StatusBar.show.mock.calls.length,
    };
    await statusBar.setLight();
    await statusBar.setDark();
    await statusBar.hide();
    await statusBar.show();
    expect(StatusBar.setStyle.mock.calls.length).toBe(before.setStyle);
    expect(StatusBar.hide.mock.calls.length).toBe(before.hide);
    expect(StatusBar.show.mock.calls.length).toBe(before.show);
  });

  it('setBackgroundColor is a no-op on web (also gated on isAndroid)', async () => {
    const before = StatusBar.setBackgroundColor.mock.calls.length;
    await statusBar.setBackgroundColor('#FF0000');
    expect(StatusBar.setBackgroundColor.mock.calls.length).toBe(before);
  });
});

describe('keyboard (no-ops on web)', () => {
  it('hide() does not call Keyboard.hide on web', async () => {
    const before = Keyboard.hide.mock.calls.length;
    await keyboard.hide();
    expect(Keyboard.hide.mock.calls.length).toBe(before);
  });

  it('onShow returns a no-op unsubscribe function on web', () => {
    const unsub = keyboard.onShow(() => {});
    expect(typeof unsub).toBe('function');
    // Calling the unsub should not throw
    expect(() => unsub()).not.toThrow();
  });

  it('onHide returns a no-op unsubscribe function on web', () => {
    const unsub = keyboard.onHide(() => {});
    expect(typeof unsub).toBe('function');
    expect(() => unsub()).not.toThrow();
  });
});

describe('appLifecycle (no-ops on web)', () => {
  it('onBackButton returns a no-op unsubscribe function on web', () => {
    const unsub = appLifecycle.onBackButton(() => {});
    expect(typeof unsub).toBe('function');
    expect(() => unsub()).not.toThrow();
  });

  it('onStateChange returns a no-op unsubscribe function on web', () => {
    const unsub = appLifecycle.onStateChange(() => {});
    expect(typeof unsub).toBe('function');
    expect(() => unsub()).not.toThrow();
  });

  it('getInfo returns null on web', async () => {
    expect(await appLifecycle.getInfo()).toBeNull();
  });

  it('exit() does not call App.exitApp on web (also gated on isAndroid)', () => {
    appLifecycle.exit();
    // We never called App.exitApp, so the mock should not have been called
    expect(App.exitApp).not.toHaveBeenCalled();
  });
});

describe('splash (no-ops on web)', () => {
  it('hide() does not call SplashScreen.hide on web', async () => {
    const before = SplashScreen.hide.mock.calls.length;
    await splash.hide();
    expect(SplashScreen.hide.mock.calls.length).toBe(before);
  });

  it('show() does not call SplashScreen.show on web', async () => {
    const before = SplashScreen.show.mock.calls.length;
    await splash.show();
    expect(SplashScreen.show.mock.calls.length).toBe(before);
  });
});

describe('initializeNative', () => {
  it('does nothing on web (early return)', async () => {
    const before = {
      setStyle: StatusBar.setStyle.mock.calls.length,
      setBackgroundColor: StatusBar.setBackgroundColor.mock.calls.length,
      hide: SplashScreen.hide.mock.calls.length,
    };
    await initializeNative();
    expect(StatusBar.setStyle.mock.calls.length).toBe(before.setStyle);
    expect(StatusBar.setBackgroundColor.mock.calls.length).toBe(before.setBackgroundColor);
    expect(SplashScreen.hide.mock.calls.length).toBe(before.hide);
  });
});
