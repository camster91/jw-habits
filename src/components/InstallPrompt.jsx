/**
 * InstallPrompt Component
 * Shows a banner prompting users to install the PWA
 */

import { useState, useEffect } from 'react';
import { Download, X, Smartphone } from 'lucide-react';
import { usePWA } from '../hooks/usePWA';
import { haptics } from '../utils/native';

function InstallPrompt() {
  const { canInstall, promptInstall, isAppInstalled } = usePWA();
  const [dismissed, setDismissed] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Check if user has dismissed the banner before
    const dismissedUntil = localStorage.getItem('installPromptDismissed');
    if (dismissedUntil) {
      const dismissedDate = new Date(dismissedUntil);
      if (dismissedDate > new Date()) {
        setDismissed(true);
        return;
      }
    }

    // Show banner after a short delay
    if (canInstall && !isAppInstalled) {
      const timer = setTimeout(() => {
        setShowBanner(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [canInstall, isAppInstalled]);

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

  if (!showBanner || dismissed || isAppInstalled) {
    return null;
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 z-40 animate-slide-up">
      <div className="card bg-gradient-to-r from-primary to-secondary text-white shadow-xl">
        <div className="card-body p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <Smartphone className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold">Install JW Progress</h3>
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
              className="btn btn-sm flex-1 bg-white text-primary hover:bg-white/90"
            >
              <Download className="w-4 h-4" />
              Install App
            </button>
            <button
              onClick={handleDismiss}
              className="btn btn-sm btn-ghost text-white"
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
