import { useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const INACTIVITY_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

/**
 * Monitors user inactivity and automatically logs out users
 * who have been inactive for more than 24 hours.
 */
export const useInactivityLogout = () => {
  const { signOut, user } = useAuth();
  const hasCheckedRef = useRef(false);

  const checkInactivity = useCallback(async () => {
    if (!user) return;

    // Fetch fresh last_active_at from database instead of using stale context
    const { data: freshProfile, error } = await supabase
      .from('profiles')
      .select('last_active_at')
      .eq('id', user.id)
      .single();

    if (error || !freshProfile?.last_active_at) {
      console.log('[Session] Could not fetch fresh profile for inactivity check');
      return;
    }

    const lastActiveTime = new Date(freshProfile.last_active_at).getTime();
    const now = Date.now();
    const inactiveTime = now - lastActiveTime;

    if (inactiveTime > INACTIVITY_TIMEOUT) {
      console.log('[Session] Logging out due to inactivity:', {
        lastActive: freshProfile.last_active_at,
        inactiveHours: Math.round(inactiveTime / (60 * 60 * 1000)),
      });

      await signOut();
      
      toast.info('Session expired', {
        description: 'You were logged out due to 24 hours of inactivity.',
        duration: 6000,
      });
    }
  }, [user, signOut]);

  // Check on mount (only once per session)
  useEffect(() => {
    if (!user || hasCheckedRef.current) return;
    
    hasCheckedRef.current = true;
    checkInactivity();
  }, [user, checkInactivity]);

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
