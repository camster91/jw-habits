/**
 * InstallPrompt Component
 * Shows a small pill banner above the bottom nav, suggesting PWA install.
 * Auto-dismisses after 10s; once dismissed, stays dismissed for 7 days.
 */

import { useState, useEffect } from 'react';
import { Download, X, Smartphone } from 'lucide-react';
import { usePWA } from '../hooks/usePWA';
import { haptics } from '../utils/native';

function isDismissedInitially() {
  try {
    const dismissedUntil = localStorage.getItem('installPromptDismissed');
    if (dismissedUntil) {
      const dismissedDate = new Date(dismissedUntil);
      if (dismissedDate > new Date()) {
        return true;
      }
    }
  } catch {
    // Private mode / disabled storage — show the prompt.
  }
  return false;
}

function InstallPrompt() {
  const { canInstall, promptInstall, isAppInstalled } = usePWA();
  const [dismissed, setDismissed] = useState(isDismissedInitially);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    if (canInstall && !isAppInstalled && !dismissed) {
      const showTimer = setTimeout(() => setShowBanner(true), 3000);
      return () => clearTimeout(showTimer);
    }
  }, [canInstall, isAppInstalled, dismissed]);

  const handleInstall = async () => {
    haptics.medium();
    try {
      const result = await promptInstall();
      if (result?.success || result?.outcome === 'accepted') {
        setShowBanner(false);
      }
    } catch {
      // Install prompt can throw if the browser cancels it.
    }
  };

  const handleDismiss = () => {
    haptics.light();
    setShowBanner(false);
    setDismissed(true);
    // Don't show again for 7 days
    try {
      const dismissUntil = new Date();
      dismissUntil.setDate(dismissUntil.getDate() + 7);
      localStorage.setItem('installPromptDismissed', dismissUntil.toISOString());
    } catch {
      // ignore storage failures
    }
  };

  useEffect(() => {
    if (!showBanner) return;
    const autoDismiss = setTimeout(() => {
      handleDismiss();
    }, 12000);
    return () => clearTimeout(autoDismiss);
  }, [showBanner]);

  if (!showBanner || dismissed || isAppInstalled) {
    return null;
  }

  return (
    <div className="fixed top-14 left-3 right-3 z-30 animate-slide-down pointer-events-none">
      <div
        className="pointer-events-auto flex items-center gap-2.5 bg-base-100/95 backdrop-blur-md text-base-content shadow-lg border border-base-300/60 rounded-full pl-3 pr-2 py-2"
        role="status"
        aria-label="Install JW Habits"
      >
        <div className="p-1.5 bg-primary/10 rounded-full">
          <Smartphone className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium leading-tight truncate">Add to your home screen</p>
        </div>
        <button onClick={handleInstall} className="btn btn-primary btn-xs gap-1 rounded-full">
          <Download className="w-3 h-3" />
          Install
        </button>
        <button
          onClick={handleDismiss}
          className="btn btn-ghost btn-xs btn-circle"
          aria-label="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

export default InstallPrompt;
