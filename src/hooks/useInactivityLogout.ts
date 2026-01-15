import { useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const INACTIVITY_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

/**
 * Monitors user inactivity and automatically logs out users
 * who have been inactive for more than 24 hours.
 */
export const useInactivityLogout = () => {
  const { profile, signOut, user } = useAuth();
  const hasCheckedRef = useRef(false);

  const checkInactivity = useCallback(async () => {
    if (!user || !profile?.last_active_at) return;

    const lastActiveTime = new Date(profile.last_active_at).getTime();
    const now = Date.now();
    const inactiveTime = now - lastActiveTime;

    if (inactiveTime > INACTIVITY_TIMEOUT) {
      console.log('[Session] Logging out due to inactivity:', {
        lastActive: profile.last_active_at,
        inactiveHours: Math.round(inactiveTime / (60 * 60 * 1000)),
      });

      await signOut();
      
      toast.info('Session expired', {
        description: 'You were logged out due to 24 hours of inactivity.',
        duration: 6000,
      });
    }
  }, [user, profile?.last_active_at, signOut]);

  // Check on mount (only once per session)
  useEffect(() => {
    if (!user || !profile?.last_active_at || hasCheckedRef.current) return;
    
    hasCheckedRef.current = true;
    checkInactivity();
  }, [user, profile?.last_active_at, checkInactivity]);

  // Check when tab becomes visible
  useEffect(() => {
    if (!user) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkInactivity();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, checkInactivity]);

  // Reset the check flag when user changes (re-login)
  useEffect(() => {
    if (!user) {
      hasCheckedRef.current = false;
    }
  }, [user]);
};
