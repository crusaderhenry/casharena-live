import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

// VAPID public key for Web Push authentication
// To generate new keys, run: npx web-push generate-vapid-keys
// Then add the private key to your backend secrets as VAPID_PRIVATE_KEY
const VAPID_PUBLIC_KEY = 'BCjTvE7KQPl9RYPh6mYpTvKxWHRLrRCr4HqDQ1jKdNzgxOHjz3KJ4WUE_Pw9kv0J6BQzKhC2h7lZVqJRjXlCBj0';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  // Check current permission and subscription status
  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }

    const checkSubscription = async () => {
      if (!('serviceWorker' in navigator) || !user) return;

      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        setIsSubscribed(!!subscription);
      } catch (error) {
        console.error('Error checking subscription:', error);
      }
    };

    checkSubscription();
  }, [user]);

  const subscribe = useCallback(async () => {
    if (!user) {
      toast({
        title: 'Login Required',
        description: 'Please log in to enable notifications',
        variant: 'destructive',
      });
      return false;
    }

    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      toast({
        title: 'Not Supported',
        description: 'Push notifications are not supported in this browser',
        variant: 'destructive',
      });
      return false;
    }

    setIsLoading(true);

    try {
      // Request permission
      const permission = await Notification.requestPermission();
      setPermission(permission);

      if (permission !== 'granted') {
        toast({
          title: 'Permission Denied',
          description: 'Please enable notifications in your browser settings',
          variant: 'destructive',
        });
        setIsLoading(false);
        return false;
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Check for existing subscription
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        // Create new subscription
        const vapidKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: vapidKey.buffer as ArrayBuffer,
        });
      }

      // Extract keys
      const p256dh = subscription.getKey('p256dh');
      const auth = subscription.getKey('auth');

      if (!p256dh || !auth) {
        throw new Error('Failed to get push subscription keys');
      }

      // Convert to base64
      const p256dhArray = new Uint8Array(p256dh);
      const authArray = new Uint8Array(auth);
      const p256dhBase64 = btoa(String.fromCharCode(...p256dhArray));
      const authBase64 = btoa(String.fromCharCode(...authArray));

      // Save to database
      const { error } = await supabase.from('push_subscriptions').upsert(
        {
          user_id: user.id,
          endpoint: subscription.endpoint,
          p256dh: p256dhBase64,
          auth: authBase64,
        },
        { onConflict: 'endpoint' }
      );

      if (error) throw error;

      setIsSubscribed(true);
      toast({
        title: 'Notifications Enabled',
        description: "You'll be notified when games start and when you win!",
      });

      return true;
    } catch (error) {
      console.error('Error subscribing to push:', error);
      toast({
        title: 'Error',
        description: 'Failed to enable notifications',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  const unsubscribe = useCallback(async () => {
    if (!user) return false;

    setIsLoading(true);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();

        // Remove from database
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('endpoint', subscription.endpoint);
      }

      setIsSubscribed(false);
      toast({
        title: 'Notifications Disabled',
        description: 'You will no longer receive push notifications',
      });

      return true;
    } catch (error) {
      console.error('Error unsubscribing from push:', error);
      toast({
        title: 'Error',
        description: 'Failed to disable notifications',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  return {
    permission,
    isSubscribed,
    isLoading,
    subscribe,
    unsubscribe,
    isSupported: 'Notification' in window && 'serviceWorker' in navigator,
  };
}
