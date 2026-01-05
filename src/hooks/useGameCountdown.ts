import { useState, useEffect, useCallback } from 'react';

interface GameSchedule {
  status: 'scheduled' | 'live' | 'ended';
  countdown?: number;
  start_time?: string | null;
  end_time?: string | null;
  max_duration?: number;
  scheduled_at?: string | null;
}

interface CountdownResult {
  label: string;
  value: string;
  isUrgent: boolean;
  isLive: boolean;
  isEnding: boolean;
  secondsRemaining: number;
}

export const useGameCountdown = (game: GameSchedule | null): CountdownResult => {
  const [result, setResult] = useState<CountdownResult>({
    label: '',
    value: '',
    isUrgent: false,
    isLive: false,
    isEnding: false,
    secondsRemaining: 0,
  });

  const calculateCountdown = useCallback(() => {
    if (!game) {
      return {
        label: '',
        value: '',
        isUrgent: false,
        isLive: false,
        isEnding: false,
        secondsRemaining: 0,
      };
    }

    const now = Date.now();

    // For live games - show time until game ends
    if (game.status === 'live') {
      if (game.start_time && game.max_duration) {
        const startTime = new Date(game.start_time).getTime();
        const endTime = startTime + (game.max_duration * 60 * 1000);
        const remaining = Math.max(0, Math.floor((endTime - now) / 1000));

        return {
          label: 'Ending In',
          value: formatDuration(remaining),
          isUrgent: remaining < 60,
          isLive: true,
          isEnding: remaining < 300,
          secondsRemaining: remaining,
        };
      }
      
      // Fallback to countdown timer for comment reset
      return {
        label: 'Timer',
        value: `${game.countdown || 0}s`,
        isUrgent: (game.countdown || 0) < 15,
        isLive: true,
        isEnding: false,
        secondsRemaining: game.countdown || 0,
      };
    }

    // For scheduled games - show time until game starts
    if (game.status === 'scheduled') {
      const scheduledTime = game.scheduled_at || game.start_time;
      
      if (scheduledTime) {
        const targetTime = new Date(scheduledTime).getTime();
        const remaining = Math.max(0, Math.floor((targetTime - now) / 1000));

        return {
          label: 'Starting In',
          value: formatDuration(remaining),
          isUrgent: remaining < 60,
          isLive: false,
          isEnding: false,
          secondsRemaining: remaining,
        };
      }
      
      // Fallback to countdown
      return {
        label: 'Starting In',
        value: formatDuration(game.countdown || 0),
        isUrgent: (game.countdown || 0) < 30,
        isLive: false,
        isEnding: false,
        secondsRemaining: game.countdown || 0,
      };
    }

    // Ended games
    return {
      label: 'Ended',
      value: 'Game Over',
      isUrgent: false,
      isLive: false,
      isEnding: false,
      secondsRemaining: 0,
    };
  }, [game]);

  useEffect(() => {
    setResult(calculateCountdown());

    const interval = setInterval(() => {
      setResult(calculateCountdown());
    }, 1000);

    return () => clearInterval(interval);
  }, [calculateCountdown]);

  return result;
};

export const formatDuration = (seconds: number): string => {
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

export const getGameStatusLabel = (status: string): { label: string; color: string } => {
  switch (status) {
    case 'live':
      return { label: 'LIVE', color: 'green' };
    case 'scheduled':
      return { label: 'COMING SOON', color: 'yellow' };
    case 'ended':
      return { label: 'ENDED', color: 'muted' };
    default:
      return { label: status.toUpperCase(), color: 'muted' };
  }
};
