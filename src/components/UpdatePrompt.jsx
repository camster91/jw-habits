/**
 * UpdatePrompt Component
 * Shows a dismissible pill banner at the top of the screen when a
 * new version of the app is available.
 */

import { RefreshCw, X } from 'lucide-react';
import { useState } from 'react';
import { haptics } from '../utils/native';

const DISMISS_KEY = 'jw-update-prompt-dismissed';

function readDismissed() {
  try {
    return sessionStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

function UpdatePrompt({ updateAvailable, applyUpdate }) {
  const [dismissed, setDismissed] = useState(readDismissed);

  if (!updateAvailable || dismissed) {
    return null;
  }

  const handleUpdate = () => {
    haptics.medium();
    applyUpdate();
  };

  const handleDismiss = () => {
    haptics.light();
    try {
      sessionStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // ignore
    }
    setDismissed(true);
  };

  return (
    <div className="fixed top-2 left-0 right-0 z-40 px-3 safe-area-top pointer-events-none">
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-auto mx-auto max-w-md flex items-center gap-2
                   bg-base-100/90 backdrop-blur-md border border-base-300/60
                   text-base-content rounded-full pl-3 pr-2 py-1.5
                   shadow-xs"
      >
        <RefreshCw className="w-4 h-4 text-base-content/70 shrink-0" />
        <span className="text-xs font-medium truncate">New version available</span>
        <button
          onClick={handleUpdate}
          className="ml-auto shrink-0 text-xs font-semibold text-primary
                     hover:text-primary/80 transition-colors px-2"
        >
          Update
        </button>
        <button
          onClick={handleDismiss}
          aria-label="Dismiss update notification"
          className="shrink-0 btn btn-ghost btn-xs btn-circle text-base-content/60"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

export default UpdatePrompt;
