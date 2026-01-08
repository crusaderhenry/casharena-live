import { useState, useEffect } from "react";
import { X, Download, Smartphone, Share, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    // Detect iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    // Check if user dismissed before (with 7-day cooldown)
    const dismissedAt = localStorage.getItem("pwa-install-dismissed");
    if (dismissedAt) {
      const dismissedDate = new Date(dismissedAt);
      const daysSinceDismissed = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < 7) {
        return;
      }
    }

    // For iOS, show the banner after a delay
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

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    setShowIOSInstructions(false);
    localStorage.setItem("pwa-install-dismissed", new Date().toISOString());
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
      <div className="fixed inset-0 z-50 flex items-end justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="w-full max-w-sm bg-card rounded-2xl p-5 shadow-2xl border border-border animate-in slide-in-from-bottom-4 duration-300">
          <button
            onClick={handleDismiss}
            className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-muted transition-colors"
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
          
          <div className="text-center mb-5">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <Smartphone className="h-7 w-7 text-primary" />
            </div>
            <h3 className="font-bold text-foreground text-lg">Install FortunesHQ</h3>
            <p className="text-muted-foreground text-sm mt-1">
              Add to your home screen in 2 easy steps
            </p>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-xl">
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-primary">1</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Tap the Share button</p>
                <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                  Look for <Share className="w-3 h-3 inline" /> at the bottom of Safari
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-xl">
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-primary">2</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Add to Home Screen</p>
                <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                  Scroll and tap <Plus className="w-3 h-3 inline" /> "Add to Home Screen"
                </p>
              </div>
            </div>
          </div>
          
          <Button
            onClick={handleDismiss}
            className="w-full mt-5"
            variant="outline"
          >
            Got it!
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-gradient-to-r from-primary/90 to-accent/90 backdrop-blur-lg rounded-2xl p-4 shadow-2xl border border-white/20">
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 p-1 rounded-full hover:bg-white/20 transition-colors"
        >
          <X className="h-4 w-4 text-white/80" />
        </button>
        
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
            <Smartphone className="h-6 w-6 text-white" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-white text-sm">Install FortunesHQ</h3>
            <p className="text-white/80 text-xs mt-0.5">
              {isIOS ? "Add to home screen for the full app experience" : "Add to home screen for the best experience"}
            </p>
          </div>
          
          <Button
            onClick={handleInstall}
            size="sm"
            className="flex-shrink-0 bg-white text-primary hover:bg-white/90 font-semibold gap-1.5"
          >
            {isIOS ? (
              <>
                <Share className="h-4 w-4" />
                How?
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Install
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}