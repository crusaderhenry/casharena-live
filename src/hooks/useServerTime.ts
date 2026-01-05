import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ServerTimeState {
  serverTime: number; // Server time in milliseconds
  offset: number; // Difference between server and client time
  synced: boolean;
  lastSync: number;
}

// Global time state shared across all hooks
let globalTimeState: ServerTimeState = {
  serverTime: Date.now(),
  offset: 0,
  synced: false,
  lastSync: 0,
};

let syncPromise: Promise<void> | null = null;

// Sync server time globally
async function syncServerTime(): Promise<void> {
  if (syncPromise) return syncPromise;

  syncPromise = (async () => {
    try {
      const clientBefore = Date.now();
      const { data, error } = await supabase.rpc('get_server_time');
      const clientAfter = Date.now();

      if (error) {
        console.error('[useServerTime] Sync error:', error);
        return;
      }

      // Calculate round-trip time and estimate server time
      const roundTrip = clientAfter - clientBefore;
      const serverTime = new Date(data).getTime();
      const estimatedServerTime = serverTime + roundTrip / 2;
      const offset = estimatedServerTime - clientAfter;

      globalTimeState = {
        serverTime: estimatedServerTime,
        offset,
        synced: true,
        lastSync: clientAfter,
      };

      console.log(`[useServerTime] Synced. Offset: ${offset}ms, RTT: ${roundTrip}ms`);
    } catch (err) {
      console.error('[useServerTime] Sync failed:', err);
    } finally {
      syncPromise = null;
    }
  })();

  return syncPromise;
}

export const useServerTime = () => {
  const [, forceRender] = useState(0);

  // Initial sync
  useEffect(() => {
    if (!globalTimeState.synced || Date.now() - globalTimeState.lastSync > 60000) {
      syncServerTime().then(() => forceRender(n => n + 1));
    }

    // Re-sync every 60 seconds
    const interval = setInterval(() => {
      syncServerTime().then(() => forceRender(n => n + 1));
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  // Get corrected current time - always read from global state for fresh offset
  const getServerTime = useCallback(() => {
    return Date.now() + globalTimeState.offset;
  }, []);

  // Calculate seconds until a target time
  const secondsUntil = useCallback((targetTime: string | Date | null): number => {
    if (!targetTime) return 0;
    const target = typeof targetTime === 'string' ? new Date(targetTime).getTime() : targetTime.getTime();
    const now = Date.now() + globalTimeState.offset;
    return Math.max(0, Math.floor((target - now) / 1000));
  }, []);

  // Calculate seconds since a start time
  const secondsSince = useCallback((startTime: string | Date | null): number => {
    if (!startTime) return 0;
    const start = typeof startTime === 'string' ? new Date(startTime).getTime() : startTime.getTime();
    const now = getServerTime();
    return Math.max(0, Math.floor((now - start) / 1000));
  }, [getServerTime]);

  // Calculate remaining game time
  const gameTimeRemaining = useCallback((
    startTime: string | Date | null,
    maxDurationMinutes: number
  ): number => {
    if (!startTime) return maxDurationMinutes * 60;
    const elapsed = secondsSince(startTime);
    return Math.max(0, (maxDurationMinutes * 60) - elapsed);
  }, [secondsSince]);

  return {
    synced: globalTimeState.synced,
    offset: globalTimeState.offset,
    getServerTime,
    secondsUntil,
    secondsSince,
    gameTimeRemaining,
    resync: syncServerTime,
  };
};

// Hook specifically for game countdown display
export const useGameTimer = (
  startTime: string | null,
  maxDurationMinutes: number,
  serverCountdown: number,
  status: string
) => {
  const { synced, gameTimeRemaining, secondsSince } = useServerTime();
  const [displayTime, setDisplayTime] = useState({ gameTime: 0, countdown: 0, isEndingSoon: false });
  const countdownRef = useRef(serverCountdown);

  // Update countdown ref when server sends update
  useEffect(() => {
    countdownRef.current = serverCountdown;
  }, [serverCountdown]);

  useEffect(() => {
    if (status !== 'live') {
      setDisplayTime({ gameTime: maxDurationMinutes * 60, countdown: serverCountdown, isEndingSoon: false });
      return;
    }

    const updateTimers = () => {
      const remaining = gameTimeRemaining(startTime, maxDurationMinutes);
      const isEndingSoon = remaining <= 300; // Last 5 minutes

      setDisplayTime({
        gameTime: remaining,
        countdown: countdownRef.current,
        isEndingSoon,
      });
    };

    updateTimers();
    const interval = setInterval(updateTimers, 1000);
    return () => clearInterval(interval);
  }, [startTime, maxDurationMinutes, status, synced, gameTimeRemaining, serverCountdown]);

  return displayTime;
};

// Format seconds to display string
export const formatGameTime = (seconds: number): string => {
  if (seconds <= 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const formatCountdown = (seconds: number): string => {
  if (seconds <= 0) return '0s';
  
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
};