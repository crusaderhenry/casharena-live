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
      
      // Use Supabase RPC to get current server time (PostgreSQL now())
      const { data, error } = await supabase.rpc('get_server_time');

      const clientAfter = Date.now();
      const roundTrip = clientAfter - clientBefore;
      
      if (error) {
        // Fallback: assume no offset if we can't get server time
        console.warn('Could not sync server time, using local time:', error.message);
        setSync({
          serverTime: new Date(),
          offset: 0,
          synced: true, // Mark as synced anyway to avoid blocking
        });
        return;
      }

      // Calculate offset between server and client
      const serverTimestamp = new Date(data).getTime();
      // Account for network latency (assume half round trip to server)
      const estimatedServerTime = serverTimestamp + (roundTrip / 2);
      const offset = estimatedServerTime - clientAfter;

      setSync({
        serverTime: new Date(clientAfter + offset),
        offset,
        synced: true,
      });

      console.log('Server time synced, offset:', Math.round(offset), 'ms');
    } catch (err) {
      console.error('Failed to sync server time:', err);
      // Fallback to local time
      setSync({
        serverTime: new Date(),
        offset: 0,
        synced: true,
      });
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
 * 
 * Provides unified countdown for all game phases:
 * - Scheduled: countdown to open (scheduled_at)
 * - Open: countdown to go live (start_time + countdown)
 * - Live: countdown to game end (start_time + lobby + max_duration)
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
  const [countdownToOpen, setCountdownToOpen] = useState(0);
  const [countdownToLive, setCountdownToLive] = useState(0);
  const [countdownToEnd, setCountdownToEnd] = useState(0);
  const [phase, setPhase] = useState<'scheduled' | 'open' | 'live' | 'ended'>('scheduled');

  useEffect(() => {
    if (!game || !synced) return;

    const updateTimers = () => {
      const status = game.status as string;
      
      if (status === 'scheduled') {
        setPhase('scheduled');
        
        if (game.scheduled_at) {
          // Countdown to when entries open
          const remaining = getSecondsUntil(game.scheduled_at);
          setCountdownToOpen(remaining);
          setLobbyCountdown(remaining);
        } else {
          // Waiting for manual open
          setCountdownToOpen(-1);
          setLobbyCountdown(-1);
        }
        setCountdownToLive(0);
        setCountdownToEnd(0);
        
      } else if (status === 'open') {
        setPhase('open');
        setCountdownToOpen(0);
        
        if (game.start_time) {
          // Countdown to go live = start_time + lobby countdown
          const lobbyDuration = game.countdown || 60;
          const lobbyEndTime = new Date(new Date(game.start_time).getTime() + lobbyDuration * 1000);
          const remaining = getSecondsUntil(lobbyEndTime);
          setCountdownToLive(remaining);
          setLobbyCountdown(remaining);
        } else {
          setCountdownToLive(game.countdown);
          setLobbyCountdown(game.countdown);
        }
        setCountdownToEnd(0);
        
      } else if (status === 'live') {
        setPhase('live');
        setCountdownToOpen(0);
        setCountdownToLive(0);
        
        if (game.start_time) {
          // Game started when it went live
          // Calculate remaining game time based on when it went live
          const lobbyDuration = game.countdown || 60;
          const startTime = new Date(game.start_time).getTime();
          const liveStartTime = startTime + (lobbyDuration * 1000);
          const maxDurationMs = game.max_duration * 60 * 1000;
          const gameEndTime = new Date(liveStartTime + maxDurationMs);
          
          const remaining = getSecondsUntil(gameEndTime);
          setCountdownToEnd(remaining);
          setGameTimeRemaining(remaining);
        }
        
        // Comment timer from server
        setCommentTimer(game.countdown || game.comment_timer);
        setLobbyCountdown(0);
        
      } else {
        setPhase('ended');
        setCountdownToOpen(0);
        setCountdownToLive(0);
        setCountdownToEnd(0);
        setLobbyCountdown(0);
        setGameTimeRemaining(0);
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
    countdownToOpen,
    countdownToLive,
    countdownToEnd,
    phase,
    synced,
  };
};
