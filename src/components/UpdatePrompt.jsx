/**
 * UpdatePrompt Component
 * Shows a banner when a new version of the app is available
 */

import { RefreshCw } from 'lucide-react';
import { usePWA } from '../hooks/usePWA';
import { haptics } from '../utils/native';

function UpdatePrompt() {
  const { updateAvailable, applyUpdate } = usePWA();

  const handleUpdate = () => {
    haptics.medium();
    applyUpdate();
  };

  if (!updateAvailable) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 safe-area-top">
      <div className="bg-success text-success-content p-3">
        <div className="flex items-center justify-between gap-3 max-w-lg mx-auto">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            <span className="text-sm font-medium">New version available!</span>
          </div>
          <button
            onClick={handleUpdate}
            className="btn btn-sm bg-white text-success hover:bg-white/90"
          >
            Update Now
          </button>
        </div>
      </div>
    </div>
  );
}

export default UpdatePrompt;
