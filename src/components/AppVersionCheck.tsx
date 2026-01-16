import { useEffect, useState } from 'react';
import { RefreshCw, X } from 'lucide-react';

// Declare the global constant injected by Vite at build time
declare const __BUILD_TIMESTAMP__: string;

// Use the build-time constant (stays the same across page reloads within the same build)
const BUILD_VERSION = typeof __BUILD_TIMESTAMP__ !== 'undefined' ? __BUILD_TIMESTAMP__ : Date.now().toString();
const VERSION_KEY = 'app_build_version';
const DISMISS_KEY = 'app_update_dismissed';
const CHECK_INTERVAL = 5 * 60 * 1000; // Check every 5 minutes

export const AppVersionCheck = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    // Check on mount
    checkForUpdates();

    // Set up periodic checks
    const interval = setInterval(checkForUpdates, CHECK_INTERVAL);
    
    return () => clearInterval(interval);
  }, []);

  const checkForUpdates = () => {
    const storedVersion = localStorage.getItem(VERSION_KEY);
    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    
    // First visit - store the current version
    if (!storedVersion) {
      localStorage.setItem(VERSION_KEY, BUILD_VERSION);
      return;
    }

    // If version changed and not recently dismissed
    if (storedVersion !== BUILD_VERSION) {
      // Check if dismissed in last 10 minutes
      if (dismissedAt) {
        const dismissTime = parseInt(dismissedAt, 10);
        if (Date.now() - dismissTime < 10 * 60 * 1000) {
          return; // Still within dismiss window
        }
      }
      
      setShowBanner(true);
    }
  };

  const handleUpdate = () => {
    setIsUpdating(true);
    
    // Update stored version BEFORE reload
    localStorage.setItem(VERSION_KEY, BUILD_VERSION);
    localStorage.removeItem(DISMISS_KEY);
    
    // Clear any cached data
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => caches.delete(name));
      });
    }
    
    // Hard reload to bypass cache
    window.location.reload();
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-[100] animate-slide-in-bottom md:left-auto md:right-4 md:w-80">
      <div className="bg-primary text-primary-foreground rounded-2xl shadow-2xl p-4 border border-primary-foreground/20">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-foreground/20 flex items-center justify-center shrink-0">
            <RefreshCw className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm">Update Available!</p>
            <p className="text-xs text-primary-foreground/80 mt-0.5">
              A new version is ready. Refresh to get the latest features.
            </p>
          </div>
          <button 
            onClick={handleDismiss}
            className="p-1 hover:bg-primary-foreground/20 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <button
          onClick={handleUpdate}
          disabled={isUpdating}
          className="w-full mt-3 py-2.5 bg-primary-foreground text-primary rounded-xl font-semibold text-sm hover:bg-primary-foreground/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isUpdating ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Updating...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              Refresh Now
            </>
          )}
        </button>
      </div>
    </div>
  );
};
