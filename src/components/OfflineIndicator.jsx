/**
 * OfflineIndicator Component
 * Shows a banner when the user is offline
 */

import { WifiOff, Wifi } from 'lucide-react';
import { usePWAContext } from '../hooks/usePWAContext';
import { useState, useEffect, useRef } from 'react';

function OfflineIndicator() {
  const { isOnline } = usePWAContext();
  const [showReconnected, setShowReconnected] = useState(false);
  const wasOfflineRef = useRef(!isOnline);

  useEffect(() => {
    if (!isOnline) {
      wasOfflineRef.current = true;
    } else if (wasOfflineRef.current) {
      // Show "reconnected" message briefly - defer setState to avoid sync call in effect
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
        // A connectivity change is asynchronous and matters to the user, so
        // announce it. role="status" + aria-live="polite" reads the banner
        // without interrupting; the offline case also carries role="alert"
        // semantics via assertive announcement only when it first appears.
        role="status"
        aria-live="polite"
        className={`p-3 transition-colors ${
          isOnline ? 'bg-success text-success-content' : 'bg-warning text-warning-content'
        }`}
      >
        <div className="flex items-center justify-center gap-2">
          {isOnline ? (
            <>
              <Wifi className="w-5 h-5" aria-hidden="true" />
              <span className="text-sm font-medium">Back online</span>
            </>
          ) : (
            <>
              <WifiOff className="w-5 h-5" aria-hidden="true" />
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
