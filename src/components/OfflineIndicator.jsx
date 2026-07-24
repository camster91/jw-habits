/**
 * OfflineIndicator Component
 * Shows a banner when the user is offline
 */

import { WifiOff, Wifi } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

function OfflineIndicator({ isOnline }) {
  const [showReconnected, setShowReconnected] = useState(false);
  const wasOfflineRef = useRef(!isOnline);

  useEffect(() => {
    if (!isOnline) {
      wasOfflineRef.current = true;
    } else if (wasOfflineRef.current) {
      const showTimer = setTimeout(() => {
        setShowReconnected(true);
      }, 0);
      const hideTimer = setTimeout(() => {
        setShowReconnected(false);
        wasOfflineRef.current = false;
      }, 3000);
      return () => {
        clearTimeout(showTimer);
        clearTimeout(hideTimer);
      };
    }
  }, [isOnline]);

  if (isOnline && !showReconnected) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-40 safe-area-top">
      <div
        className={`p-3 transition-colors ${
          isOnline ? 'bg-success text-success-content' : 'bg-warning text-warning-content'
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
              <span className="text-sm font-medium">
                You&apos;re offline - Some features may be limited
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default OfflineIndicator;
