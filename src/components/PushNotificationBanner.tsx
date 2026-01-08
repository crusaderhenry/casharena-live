import { useState, useEffect } from 'react';
import { Bell, X, BellOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useAuth } from '@/contexts/AuthContext';

export function PushNotificationBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const { user } = useAuth();
  const { permission, isSubscribed, isLoading, subscribe, isSupported } = usePushNotifications();

  useEffect(() => {
    // Only show banner if:
    // 1. User is logged in
    // 2. Push is supported
    // 3. Not already subscribed
    // 4. Permission not denied
    // 5. User hasn't dismissed recently
    if (!user || !isSupported || isSubscribed || permission === 'denied') {
      setShowBanner(false);
      return;
    }

    const dismissedAt = localStorage.getItem('push-banner-dismissed');
    if (dismissedAt) {
      const daysSinceDismissed =
        (Date.now() - new Date(dismissedAt).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < 3) {
        return;
      }
    }

    // Delay showing banner
    const timer = setTimeout(() => setShowBanner(true), 5000);
    return () => clearTimeout(timer);
  }, [user, isSupported, isSubscribed, permission]);

  const handleEnable = async () => {
    const success = await subscribe();
    if (success) {
      setShowBanner(false);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem('push-banner-dismissed', new Date().toISOString());
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-gradient-to-r from-accent/90 to-primary/90 backdrop-blur-lg rounded-2xl p-4 shadow-2xl border border-white/20">
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 p-1 rounded-full hover:bg-white/20 transition-colors"
        >
          <X className="h-4 w-4 text-white/80" />
        </button>

        <div className="flex items-center gap-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
            <Bell className="h-6 w-6 text-white" />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-white text-sm">Enable Notifications</h3>
            <p className="text-white/80 text-xs mt-0.5">
              Get alerts when games start & when you win!
            </p>
          </div>

          <Button
            onClick={handleEnable}
            disabled={isLoading}
            size="sm"
            className="flex-shrink-0 bg-white text-primary hover:bg-white/90 font-semibold gap-1.5"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            ) : (
              <>
                <Bell className="h-4 w-4" />
                Enable
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Toggle button for profile/settings pages
export function PushNotificationToggle() {
  const { permission, isSubscribed, isLoading, subscribe, unsubscribe, isSupported } =
    usePushNotifications();

  if (!isSupported) {
    return (
      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
        <div className="flex items-center gap-3">
          <BellOff className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">Push Notifications</p>
            <p className="text-xs text-muted-foreground">Not supported in this browser</p>
          </div>
        </div>
      </div>
    );
  }

  const handleRequestAgain = () => {
    alert('To enable notifications:\n\n1. Tap the 🔒 icon in your browser\'s address bar\n2. Find "Notifications" in site settings\n3. Change to "Allow"\n4. The page will reload after you close this');
    window.location.reload();
  };

  if (permission === 'denied') {
    return (
      <div className="flex items-center justify-between p-4 bg-destructive/10 rounded-xl border border-destructive/20">
        <div className="flex items-center gap-3">
          <BellOff className="h-5 w-5 text-destructive" />
          <div>
            <p className="text-sm font-medium text-foreground">Push Notifications</p>
            <p className="text-xs text-destructive">Blocked by browser</p>
            <p className="text-[10px] text-muted-foreground mt-1">
              Tap the 🔒 icon in your browser's address bar → Site settings → Allow notifications
            </p>
          </div>
        </div>
        <Button
          onClick={handleRequestAgain}
          variant="outline"
          size="sm"
          className="flex-shrink-0 text-xs"
        >
          Request Again
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
      <div className="flex items-center gap-3">
        <Bell className={`h-5 w-5 ${isSubscribed ? 'text-primary' : 'text-muted-foreground'}`} />
        <div>
          <p className="text-sm font-medium">Push Notifications</p>
          <p className="text-xs text-muted-foreground">
            {isSubscribed ? 'Enabled - receiving alerts' : 'Get game & win alerts'}
          </p>
        </div>
      </div>
      <Button
        onClick={isSubscribed ? unsubscribe : subscribe}
        disabled={isLoading}
        variant={isSubscribed ? 'outline' : 'default'}
        size="sm"
      >
        {isLoading ? (
          <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
        ) : isSubscribed ? (
          'Disable'
        ) : (
          'Enable'
        )}
      </Button>
    </div>
  );
}
