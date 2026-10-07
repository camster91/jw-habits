import { AppLauncher } from '@capacitor/app-launcher';
import { isNative } from '../utils/native.js';

function openInBrowser(url) {
  try {
    window.open(url, '_blank', 'noopener');
  } catch (e) {
    console.warn('Could not open link:', e);
  }
}

/**
 * Opens a link through the OS launcher on a device (so JW Library can take a
 * jw.org finder link), or in a new tab on the web. Never throws.
 */
export async function openLink(url) {
  if (!isNative) return openInBrowser(url);
  try {
    await AppLauncher.openUrl({ url });
  } catch {
    openInBrowser(url);
  }
}
