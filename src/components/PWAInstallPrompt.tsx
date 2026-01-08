import { useState, useEffect, memo } from "react";
import { X, Download, Smartphone, Share, Plus, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export const PWAInstallPrompt = memo(function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
    // Check if already installed
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches 
      || (window.navigator as any).standalone 
      || document.referrer.includes('android-app://');
    
    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // Detect iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    // Check if user dismissed before (with 3-day cooldown - reduced from 7)
    const dismissedAt = localStorage.getItem("pwa-install-dismissed");
    if (dismissedAt) {
      const dismissedTime = parseInt(dismissedAt, 10);
      const threeDays = 3 * 24 * 60 * 60 * 1000;
      if (Date.now() - dismissedTime < threeDays) {
        return;
      }
    }

    // For iOS, show the banner after a shorter delay (3 seconds)
    if (isIOSDevice) {
      setTimeout(() => setShowBanner(true), 3000);
      return;
    }

    // For Android/Chrome, listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => setShowBanner(true), 3000);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowBanner(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (isIOS) {
      setShowIOSInstructions(true);
      return;
    }

    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === "accepted") {
        setShowBanner(false);
      }
      setDeferredPrompt(null);
    } catch (error) {
      console.error('Error showing install prompt:', error);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    setShowIOSInstructions(false);
    localStorage.setItem("pwa-install-dismissed", Date.now().toString());
  };

  const handleNeverShow = () => {
    setShowBanner(false);
    setShowIOSInstructions(false);
    // Set to far future date
    localStorage.setItem("pwa-install-dismissed", (Date.now() + 365 * 24 * 60 * 60 * 1000).toString());
  };

  if (!showBanner || isInstalled) {
    return null;
  }

  // Don't show for Android if no deferred prompt available
  if (!isIOS && !deferredPrompt) {
    return null;
  }

  // iOS Instructions Modal
  if (showIOSInstructions) {
    return (
      <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
        <div className="w-full max-w-lg bg-card border-t border-border rounded-t-3xl p-6 pb-safe animate-slide-up">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-foreground">Install FortunesHQ</h3>
            <button 
              onClick={handleDismiss}
              className="w-8 h-8 rounded-full bg-muted flex items-center justify-center active:scale-95 active:opacity-80 transition-transform"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
          
          <div className="space-y-6">
            {/* Step 1 */}
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                <span className="text-primary font-bold">1</span>
              </div>
              <div className="flex-1">
                <p className="font-medium text-foreground mb-2">Tap the Share button</p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                    <Share className="w-5 h-5 text-primary" />
                  </div>
                  <span>at the bottom of Safari</span>
                </div>
              </div>
            </div>

            {/* Arrow indicator */}
            <div className="flex justify-center">
              <ChevronDown className="w-6 h-6 text-muted-foreground animate-bounce" />
            </div>

            {/* Step 2 */}
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                <span className="text-primary font-bold">2</span>
              </div>
              <div className="flex-1">
                <p className="font-medium text-foreground mb-2">Scroll down and tap</p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                    <Plus className="w-5 h-5" />
                  </div>
                  <span className="font-medium text-foreground">"Add to Home Screen"</span>
                </div>
              </div>
            </div>

            {/* Visual hint for share button location */}
            <div className="relative p-4 bg-muted/50 rounded-xl border border-border/50">
              <p className="text-center text-sm text-muted-foreground mb-3">
                Look for this button at the bottom ↓
              </p>
              <div className="flex justify-center">
                <div className="w-14 h-14 rounded-xl bg-primary/20 border-2 border-primary border-dashed flex items-center justify-center animate-pulse">
                  <Share className="w-7 h-7 text-primary" />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3 mt-6">
            <button
              onClick={handleDismiss}
              className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-bold active:scale-[0.98] transition-transform"
            >
              Got it! 👍
            </button>
            <button
              onClick={handleNeverShow}
              className="w-full py-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Don't show again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main Install Banner - positioned above BottomNav
  return (
    <div className="fixed bottom-24 left-4 right-4 z-50 animate-slide-up">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/20 via-card to-card border border-primary/30 p-4 shadow-xl backdrop-blur-md">
        {/* Glow effect */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/20 rounded-full blur-3xl" />
        
        {/* Pulsing indicator for attention */}
        <div className="absolute top-3 left-3 w-2 h-2 bg-primary rounded-full animate-ping" />
        <div className="absolute top-3 left-3 w-2 h-2 bg-primary rounded-full" />
        
        <div className="relative flex items-center gap-4">
          {/* App Icon */}
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center flex-shrink-0 shadow-lg">
            <span className="text-2xl">⚡</span>
          </div>
          
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-foreground">Install FortunesHQ</h4>
            <p className="text-sm text-muted-foreground truncate">
              {isIOS ? "Add to Home Screen for best experience" : "Faster access & offline play"}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleDismiss}
              className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center active:scale-95 transition-transform"
              aria-label="Dismiss"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
            <Button
              onClick={handleInstall}
              size="sm"
              className="px-4 py-2.5 font-bold text-sm gap-2"
            >
              {isIOS ? (
                <>
                  <Share className="w-4 h-4" />
                  How
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Install
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
});
