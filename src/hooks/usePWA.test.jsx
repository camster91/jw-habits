import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { usePWA } from './usePWA.js';

const installDescriptor = Object.getOwnPropertyDescriptor(window, 'BeforeInstallPromptEvent');

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: false }));
});

afterEach(() => {
  vi.unstubAllGlobals();
  if (installDescriptor)
    Object.defineProperty(window, 'BeforeInstallPromptEvent', installDescriptor);
  else delete window.BeforeInstallPromptEvent;
});

describe('service-worker updates without an install prompt', () => {
  it('offers a waiting update and applies it without supporting install prompts', async () => {
    delete window.BeforeInstallPromptEvent;
    const waiting = { postMessage: vi.fn() };
    const registration = Object.assign(new EventTarget(), { waiting, installing: null });
    const serviceWorker = Object.assign(new EventTarget(), {
      controller: {},
      ready: Promise.resolve(registration),
      getRegistration: vi.fn().mockResolvedValue(registration),
    });
    vi.stubGlobal('navigator', { serviceWorker, onLine: true });
    const { result, unmount } = renderHook(() => usePWA());
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.isPWACapable).toBe(false);
    expect(result.current.canInstall).toBe(false);
    expect(result.current.updateAvailable).toBe(true);
    await act(async () => {
      result.current.applyUpdate();
      await Promise.resolve();
    });
    expect(waiting.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
    unmount();
  });

  it('ignores a registration that resolves after unmount', async () => {
    delete window.BeforeInstallPromptEvent;
    let resolveReady;
    const registration = Object.assign(new EventTarget(), { waiting: {}, installing: null });
    const watch = vi.spyOn(registration, 'addEventListener');
    const serviceWorker = Object.assign(new EventTarget(), {
      controller: {},
      ready: new Promise((resolve) => {
        resolveReady = resolve;
      }),
    });
    vi.stubGlobal('navigator', { serviceWorker, onLine: true });
    const { unmount } = renderHook(() => usePWA());
    unmount();
    await act(async () => {
      resolveReady(registration);
      await Promise.resolve();
    });
    expect(watch).not.toHaveBeenCalled();
  });
});
