import { useState, useEffect } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { forceUpdate } from '@/utils/cacheUtils';

export const UpdateBanner = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    // Listen for service worker update events
    const handleUpdateAvailable = () => {
      console.log('[UpdateBanner] New version available');
      setShowBanner(true);
    };

    window.addEventListener('sw-update-available', handleUpdateAvailable);

    // Also check on mount if there's a waiting service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then(registration => {
        if (registration?.waiting) {
          setShowBanner(true);
        }
      });
    }

    return () => {
      window.removeEventListener('sw-update-available', handleUpdateAvailable);
    };
  }, []);

  const handleUpdate = async () => {
    setIsUpdating(true);
    try {
      await forceUpdate();
    } catch (error) {
      console.error('[UpdateBanner] Failed to update:', error);
      setIsUpdating(false);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-primary text-primary-foreground px-4 py-3 shadow-lg animate-in slide-in-from-top duration-300">
      <div className="flex items-center justify-between max-w-lg mx-auto">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-5 h-5 animate-spin-slow" />
          <div>
            <p className="font-semibold text-sm">New version available!</p>
            <p className="text-xs opacity-90">Update now for the latest features</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handleUpdate}
            disabled={isUpdating}
            className="px-3 py-1.5 bg-primary-foreground text-primary rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isUpdating ? 'Updating...' : 'Update'}
          </button>
          <button
            onClick={handleDismiss}
            className="p-1.5 hover:bg-primary-foreground/20 rounded-lg transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
