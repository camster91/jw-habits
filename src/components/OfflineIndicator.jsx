/**
 * OfflineIndicator Component
 * Shows a banner when the user is offline
 */

import { WifiOff, Wifi } from 'lucide-react';
import { usePWA } from '../hooks/usePWA';
import { useState, useEffect } from 'react';

function OfflineIndicator() {
  const { isOnline } = usePWA();
  const [showReconnected, setShowReconnected] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
    } else if (wasOffline) {
      // Show "reconnected" message briefly
      setShowReconnected(true);
      const timer = setTimeout(() => {
        setShowReconnected(false);
        setWasOffline(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  if (isOnline && !showReconnected) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 safe-area-top">
      <div
        className={`p-3 transition-colors ${
          isOnline
            ? 'bg-success text-success-content'
            : 'bg-warning text-warning-content'
        }`}
      >
        <div className="flex items-center justify-center gap-2">
          {isOnline ? (
            <>
              <Wifi className="w-5 h-5" />
              <span className="text-sm font-medium">Back online</span>
            </>
          ) : (
            <>
              <WifiOff className="w-5 h-5" />
              <span className="text-sm font-medium">You&apos;re offline - Some features may be limited</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default OfflineIndicator;
