import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

// This hook polls the countdown-ticker edge function to keep all game countdowns in sync
// It only runs when there's an active live game to minimize unnecessary calls

export const useCountdownTicker = (
  isLiveGame: boolean,
  isTestMode: boolean,
  gameId?: string
) => {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastTickRef = useRef<number>(0);

  const tickCountdown = useCallback(async () => {
    if (!isLiveGame || isTestMode || !gameId) return;

    // Prevent ticking more than once per second
    const now = Date.now();
    if (now - lastTickRef.current < 900) return;
    lastTickRef.current = now;

    try {
      const { data, error } = await supabase.functions.invoke('countdown-ticker', {
        body: {},
      });

      if (error) {
        console.error('[useCountdownTicker] Error:', error);
      }
    } catch (err) {
      console.error('[useCountdownTicker] Failed to tick:', err);
    }
  }, [isLiveGame, isTestMode, gameId]);

  useEffect(() => {
    if (!isLiveGame || isTestMode) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Tick immediately
    tickCountdown();

    // Then tick every second
    intervalRef.current = setInterval(tickCountdown, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isLiveGame, isTestMode, tickCountdown]);

  return { tickCountdown };
};