import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook to trigger mock user comments during live games.
 * This supplements the cycle-manager's tick function which may run too slowly
 * to generate consistent mock activity.
 */
export const useMockCommentTrigger = (
  cycleId: string | null,
  isLive: boolean,
  mockUsersEnabled: boolean = true
) => {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastTriggerRef = useRef<number>(0);

  useEffect(() => {
    if (!cycleId || !isLive || !mockUsersEnabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Trigger mock comments every 2-5 seconds during live games
    const triggerMockComments = async () => {
      // Rate limit - don't trigger more than once per 2 seconds
      const now = Date.now();
      if (now - lastTriggerRef.current < 2000) return;
      lastTriggerRef.current = now;

      try {
        // Random burst of 3-8 comments
        const burstCount = Math.floor(Math.random() * 6) + 3;
        
        const { error } = await supabase.functions.invoke('mock-user-service', {
          body: { 
            action: 'burst_comments', 
            cycleId, 
            count: burstCount 
          }
        });

        if (error) {
          console.log('[MockCommentTrigger] Error:', error);
        }
      } catch (e) {
        console.log('[MockCommentTrigger] Failed:', e);
      }
    };

    // Trigger immediately on mount
    triggerMockComments();

    // Then trigger every 3-5 seconds with some randomness
    intervalRef.current = setInterval(() => {
      const delay = Math.random() * 2000; // Add 0-2 second random delay
      setTimeout(triggerMockComments, delay);
    }, 3000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [cycleId, isLive, mockUsersEnabled]);
};
