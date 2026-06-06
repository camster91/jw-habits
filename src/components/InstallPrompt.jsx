/**
 * InstallPrompt Component
 * Shows a banner prompting users to install the PWA
 */

import { useState, useEffect } from 'react';
import { Download, X, Smartphone } from 'lucide-react';
import { usePWA } from '../hooks/usePWA';
import { haptics } from '../utils/native';

// Check if dismiss is still valid
function isDismissedInitially() {
  const dismissedUntil = localStorage.getItem('installPromptDismissed');
  if (dismissedUntil) {
    const dismissedDate = new Date(dismissedUntil);
    if (dismissedDate > new Date()) {
      return true;
    }
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
    const result = await promptInstall();
    if (result.success) {
      setShowBanner(false);
    }
  };

  const handleDismiss = () => {
    haptics.light();
    setShowBanner(false);
    setDismissed(true);
    // Don't show again for 7 days
    const dismissUntil = new Date();
    dismissUntil.setDate(dismissUntil.getDate() + 7);
    localStorage.setItem('installPromptDismissed', dismissUntil.toISOString());
  };

  useEffect(() => {
    if (!showBanner) return;
    const autoDismiss = setTimeout(() => {
      handleDismiss();
    }, 10000);
    return () => clearTimeout(autoDismiss);
  }, [showBanner]);

  if (!showBanner || dismissed || isAppInstalled) {
    return null;
  }

  return (
    <div className="fixed bottom-16 left-0 right-0 z-40 animate-slide-up">
      <div className="bg-primary/95 backdrop-blur-sm text-white shadow-lg border-t border-white/10">
        <div className="px-4 py-3">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <Smartphone className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold">Install JW Habits</h3>
              <p className="text-sm text-white/80 mt-1">
                Add to your home screen for the best experience with offline access
              </p>
            </div>
            <button
              onClick={handleDismiss}
              className="btn btn-ghost btn-sm btn-circle text-white"
              aria-label="Dismiss"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleInstall}
              className="btn btn-sm flex-1 btn-primary"
            >
              <Download className="w-4 h-4" />
              Install App
            </button>
            <button
              onClick={handleDismiss}
              className="btn btn-sm btn-ghost text-white/80 hover:text-white hover:bg-white/10"
            >
              Maybe Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default InstallPrompt;
