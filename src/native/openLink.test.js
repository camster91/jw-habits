import { describe, it, expect, vi, beforeEach } from 'vitest';

const launcher = vi.hoisted(() => ({ openUrl: vi.fn() }));
const native = vi.hoisted(() => ({ isNative: true }));

vi.mock('@capacitor/app-launcher', () => ({ AppLauncher: launcher }));
vi.mock('../utils/native.js', () => ({
  get isNative() {
    return native.isNative;
  },
}));

import { openLink } from './openLink.js';

const URL1 = 'https://www.jw.org/finder?wtlocale=E';

beforeEach(() => {
  launcher.openUrl.mockReset();
  native.isNative = true;
  window.open = vi.fn();
});

describe('openLink', () => {
  it('opens once through the launcher on native', async () => {
    launcher.openUrl.mockResolvedValue({ completed: true });
    await openLink(URL1);
    expect(launcher.openUrl).toHaveBeenCalledTimes(1);
    expect(launcher.openUrl).toHaveBeenCalledWith({ url: URL1 });
    expect(window.open).not.toHaveBeenCalled();
  });
  it('falls back to window.open when the launcher rejects, and never throws', async () => {
    launcher.openUrl.mockRejectedValue(new Error('no'));
    await expect(openLink(URL1)).resolves.toBeUndefined();
    expect(window.open).toHaveBeenCalledWith(URL1, '_blank', 'noopener');
  });
  it('uses window.open on the web', async () => {
    native.isNative = false;
    await openLink(URL1);
    expect(launcher.openUrl).not.toHaveBeenCalled();
    expect(window.open).toHaveBeenCalledWith(URL1, '_blank', 'noopener');
  });
  it('never throws even when window.open does', async () => {
    native.isNative = false;
    window.open = vi.fn(() => {
      throw new Error('blocked');
    });
    await expect(openLink(URL1)).resolves.toBeUndefined();
  });
});
