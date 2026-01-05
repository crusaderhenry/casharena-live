import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ServerTimeSync {
  serverTime: Date;
  offset: number; // Difference between server and client time in ms
  synced: boolean;
}

/**
 * Hook to synchronize with server time for accurate countdowns
 * This ensures all users see the same time regardless of their device clock
 */
export const useServerTime = () => {
  const [sync, setSync] = useState<ServerTimeSync>({
    serverTime: new Date(),
    offset: 0,
    synced: false,
  });

  const syncTime = useCallback(async () => {
    try {
      const clientBefore = Date.now();
      
      // Use Supabase to get server time
      const { data, error } = await supabase
        .from('platform_settings')
        .select('updated_at')
        .limit(1)
        .single();

      const clientAfter = Date.now();
      const roundTrip = clientAfter - clientBefore;
      
      if (error) {
        console.error('Error syncing time:', error);
        return;
      }

      // Estimate server time accounting for network latency
      const serverTimestamp = new Date(data.updated_at).getTime();
      const estimatedServerTime = serverTimestamp + (roundTrip / 2);
      const offset = estimatedServerTime - clientAfter;

      setSync({
        serverTime: new Date(clientAfter + offset),
        offset,
        synced: true,
      });

      console.log('Server time synced, offset:', offset, 'ms');
    } catch (err) {
      console.error('Failed to sync server time:', err);
    }
  }, []);

  // Initial sync
  useEffect(() => {
    syncTime();

    // Re-sync every 5 minutes
    const interval = setInterval(syncTime, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [syncTime]);

  // Get current server time
  const getServerTime = useCallback(() => {
    return new Date(Date.now() + sync.offset);
  }, [sync.offset]);

  // Calculate seconds remaining until a target time
  const getSecondsUntil = useCallback((targetTime: Date | string) => {
    const target = new Date(targetTime).getTime();
    const now = Date.now() + sync.offset;
    return Math.max(0, Math.floor((target - now) / 1000));
  }, [sync.offset]);

  // Calculate seconds elapsed since a start time
  const getSecondsElapsed = useCallback((startTime: Date | string) => {
    const start = new Date(startTime).getTime();
    const now = Date.now() + sync.offset;
    return Math.max(0, Math.floor((now - start) / 1000));
  }, [sync.offset]);

  return {
    serverTime: sync.serverTime,
    synced: sync.synced,
    offset: sync.offset,
    getServerTime,
    getSecondsUntil,
    getSecondsElapsed,
    resync: syncTime,
  };
};

/**
 * Hook for real-time game countdown based on server state
 */
export const useGameTimer = (game: {
  status: string;
  countdown: number;
  start_time: string | null;
  scheduled_at?: string | null;
  max_duration: number;
  comment_timer: number;
} | null) => {
  const { getSecondsUntil, getSecondsElapsed, synced } = useServerTime();
  const [lobbyCountdown, setLobbyCountdown] = useState(60);
  const [gameTimeRemaining, setGameTimeRemaining] = useState(0);
  const [commentTimer, setCommentTimer] = useState(60);

  useEffect(() => {
    if (!game || !synced) return;

    const updateTimers = () => {
      if (game.status === 'scheduled') {
        // Calculate lobby countdown
        if (game.scheduled_at) {
          // Scheduled game: count down to scheduled_at
          const remaining = getSecondsUntil(game.scheduled_at);
          setLobbyCountdown(remaining);
        } else {
          // Immediate game: use the countdown field from server
          setLobbyCountdown(game.countdown);
        }
      } else if (game.status === 'live' && game.start_time) {
        // Calculate time remaining in game
        const elapsed = getSecondsElapsed(game.start_time);
        const maxDurationSeconds = game.max_duration * 60;
        setGameTimeRemaining(Math.max(0, maxDurationSeconds - elapsed));

        // Comment timer comes from game state (resets on each comment, server-controlled)
        setCommentTimer(game.countdown || game.comment_timer);
      }
    };

    // Update immediately
    updateTimers();

    // Update every second
    const interval = setInterval(updateTimers, 1000);
    return () => clearInterval(interval);
  }, [game, synced, getSecondsUntil, getSecondsElapsed]);

  return {
    lobbyCountdown,
    gameTimeRemaining,
    commentTimer,
    synced,
  };
};
