import { useEffect, useRef } from 'react';
import { useAudio, AmbientMusicStyle } from '@/contexts/AudioContext';
import { useSounds } from '@/hooks/useSounds';

interface UseLobbyAudioOptions {
  timeUntilLive: number;
  isInLobby: boolean;
  ambientMusicStyle?: AmbientMusicStyle;
  customMusicUrl?: string | null;
}

export const useLobbyAudio = ({ timeUntilLive, isInLobby, ambientMusicStyle = 'chill', customMusicUrl }: UseLobbyAudioOptions) => {
  const { playBackgroundMusic, stopBackgroundMusic, settings } = useAudio();
  const { play } = useSounds();
  const lastTickRef = useRef<number | null>(null);
  const hasStartedRef = useRef(false);

  // Start/stop lobby music based on lobby state and music setting
  useEffect(() => {
    if (isInLobby && settings.musicEnabled) {
      // Start music with style if not already started or if re-enabled
      playBackgroundMusic('lobby', customMusicUrl, ambientMusicStyle);
      hasStartedRef.current = true;
    } else if (!settings.musicEnabled && hasStartedRef.current) {
      // Stop if music was disabled
      stopBackgroundMusic();
    }
    
    return () => {
      if (hasStartedRef.current) {
        stopBackgroundMusic();
        hasStartedRef.current = false;
      }
    };
  }, [isInLobby, settings.musicEnabled, playBackgroundMusic, stopBackgroundMusic, ambientMusicStyle, customMusicUrl]);

  // Countdown tick sounds in last 30 seconds
  useEffect(() => {
    if (!isInLobby || !settings.sfxEnabled || !settings.tickEnabled) return;
    
    // Only tick in the last 30 seconds
    if (timeUntilLive <= 30 && timeUntilLive > 0) {
      // Prevent duplicate ticks for the same second
      if (lastTickRef.current !== timeUntilLive) {
        lastTickRef.current = timeUntilLive;
        
        // Different sound intensity based on time remaining
        if (timeUntilLive <= 5) {
          // Critical - fast heartbeat + urgent tick
          play('heartbeatFast');
          play('urgent');
        } else if (timeUntilLive <= 10) {
          // Urgent - heartbeat + countdown
          play('heartbeat');
          play('countdown');
        } else {
          play('tick');
        }
      }
    }
  }, [timeUntilLive, isInLobby, settings.sfxEnabled, settings.tickEnabled, play]);

  // Reset tick ref when timer resets
  useEffect(() => {
    if (timeUntilLive > 30) {
      lastTickRef.current = null;
    }
  }, [timeUntilLive]);

  return {
    isMusicPlaying: hasStartedRef.current && settings.musicEnabled,
  };
};