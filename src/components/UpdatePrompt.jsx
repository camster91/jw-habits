/**
 * UpdatePrompt Component
 * Shows a dismissible pill banner at the top of the screen when a
 * new version of the app is available.
 *
 * Design notes:
 * - Subtle (neutral background, not a loud brand color)
 * - Rounded pill that matches the rest of the iOS design language
 * - Dismissable so the user can defer the update
 * - Auto-reappears on the next reload if the SW still hasn't activated
 */

import { RefreshCw, X } from 'lucide-react';
import { useLayoutEffect, useRef, useState } from 'react';
import { usePWAContext } from '../hooks/usePWAContext';
import { haptics } from '../utils/native';
import { safeSessionGetItem, safeSessionSetItem } from '../utils/safeStorage';

const DISMISS_KEY = 'jw-update-prompt-dismissed';

function UpdatePrompt() {
  const { updateAvailable, applyUpdate } = usePWAContext();
  // Read once on mount; if the user dismissed this session, don't
  // show it again. We don't persist across sessions — on next reload
  // we'll re-evaluate. sessionStorage can throw in private mode.
  const [dismissed, setDismissed] = useState(() => safeSessionGetItem(DISMISS_KEY) === '1');
  const bannerRef = useRef(null);
  const visible = updateAvailable && !dismissed;

  useLayoutEffect(() => {
    if (!visible) return;
    const root = document.documentElement;
    const measure = () => {
      if (!bannerRef.current) return;
      root.style.setProperty(
        '--fd-update-clearance',
        `${bannerRef.current.getBoundingClientRect().bottom}px`
      );
      root.setAttribute('data-fd-update-visible', 'true');
    };
    measure();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(bannerRef.current);
    window.addEventListener('resize', measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', measure);
      root.style.removeProperty('--fd-update-clearance');
      root.removeAttribute('data-fd-update-visible');
    };
  }, [visible]);

  if (!visible) {
    return null;
  }

  const handleUpdate = () => {
    haptics.medium();
    applyUpdate();
  };

  const handleDismiss = () => {
    haptics.light();
    safeSessionSetItem(DISMISS_KEY, '1');
    setDismissed(true);
  };

  return (
    <div
      ref={bannerRef}
      className="fixed top-2 left-0 right-0 z-40 px-[12px] safe-area-top pointer-events-none"
    >
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-auto mx-auto max-w-md flex items-center gap-[8px]
                   bg-base-100/90 backdrop-blur-md border border-base-300/60
                   text-base-content rounded-2xl pl-[12px] pr-[8px] py-1.5
                   shadow-xs"
      >
        <RefreshCw aria-hidden="true" className="w-[16px] h-[16px] text-base-content/70 shrink-0" />
        <span className="min-w-0 flex-1 text-xs font-medium break-words">
          New version available
        </span>
        <button
          onClick={handleUpdate}
          className="min-h-[44px] min-w-[44px] shrink-0 text-xs font-semibold text-primary
                     hover:text-primary/80 transition-colors px-[8px] py-[8px]
                     rounded-full"
        >
          Update
        </button>
        <button
          onClick={handleDismiss}
          aria-label="Dismiss update notification"
          className="min-h-[44px] min-w-[44px] h-[44px] w-[44px] shrink-0 btn btn-ghost btn-circle text-base-content/60"
        >
          <X aria-hidden="true" className="w-[16px] h-[16px]" />
        </button>
      </div>
    </div>
  );
}

export default UpdatePrompt;
