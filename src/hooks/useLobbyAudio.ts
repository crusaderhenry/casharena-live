import { useEffect, useRef, useCallback, useState } from 'react';
import { useAudio } from '@/contexts/AudioContext';
import { useSounds } from '@/hooks/useSounds';

interface UseLobbyAudioOptions {
  timeUntilLive: number;
  isInLobby: boolean;
}

export const useLobbyAudio = ({ timeUntilLive, isInLobby }: UseLobbyAudioOptions) => {
  const { playBackgroundMusic, stopBackgroundMusic, settings } = useAudio();
  const { play } = useSounds();
  const [tickingSoundEnabled, setTickingSoundEnabled] = useState(true);
  const lastTickRef = useRef<number | null>(null);
  const musicStartedRef = useRef(false);

  // Start lobby music when entering lobby
  useEffect(() => {
    if (isInLobby && settings.musicEnabled && !musicStartedRef.current) {
      playBackgroundMusic('lobby');
      musicStartedRef.current = true;
    }
    
    return () => {
      if (musicStartedRef.current) {
        stopBackgroundMusic();
        musicStartedRef.current = false;
      }
    };
  }, [isInLobby, settings.musicEnabled, playBackgroundMusic, stopBackgroundMusic]);

  // Countdown tick sounds in last 30 seconds
  useEffect(() => {
    if (!isInLobby || !settings.sfxEnabled || !tickingSoundEnabled) return;
    
    // Only tick in the last 30 seconds
    if (timeUntilLive <= 30 && timeUntilLive > 0) {
      // Prevent duplicate ticks for the same second
      if (lastTickRef.current !== timeUntilLive) {
        lastTickRef.current = timeUntilLive;
        
        // Different sound intensity based on time remaining
        if (timeUntilLive <= 5) {
          play('urgent');
        } else if (timeUntilLive <= 10) {
          play('countdown');
        } else {
          play('tick');
        }
      }
    }
  }, [timeUntilLive, isInLobby, settings.sfxEnabled, tickingSoundEnabled, play]);

  // Reset tick ref when timer resets
  useEffect(() => {
    if (timeUntilLive > 30) {
      lastTickRef.current = null;
    }
  }, [timeUntilLive]);

  const toggleTickingSound = useCallback(() => {
    setTickingSoundEnabled(prev => !prev);
  }, []);

  return {
    tickingSoundEnabled,
    toggleTickingSound,
    isMusicPlaying: musicStartedRef.current && settings.musicEnabled,
  };
};
