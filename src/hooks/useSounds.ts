import { useCallback, useRef, useEffect } from 'react';
import { useAudio } from '@/contexts/AudioContext';

type SoundType = 'click' | 'success' | 'win' | 'error' | 'timer' | 'countdown' | 'notification' | 'coin' | 'send' | 'tick' | 'urgent' | 'gameOver' | 'leaderChange' | 'prizeWin' | 'gameStart' | 'drumroll' | 'crowdCheer' | 'victoryFanfare' | 'tenseCrescendo' | 'heartbeat' | 'heartbeatFast' | 'welcomeBonus';

// Global event for triggering sounds from non-hook contexts
export const SOUND_EVENT = 'global-sound';
export const triggerSound = (sound: SoundType) => {
  window.dispatchEvent(new CustomEvent(SOUND_EVENT, { detail: { sound } }));
};

// Create audio context lazily
const createAudioContext = () => {
  if (typeof window === 'undefined') return null;
  return new (window.AudioContext || (window as any).webkitAudioContext)();
};

export const useSounds = () => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const { settings } = useAudio();

  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const getContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = createAudioContext();
    }
    return audioContextRef.current;
  }, []);

  const playTone = useCallback((frequency: number, duration: number, type: OscillatorType = 'sine', volume = 0.1) => {
    const ctx = getContext();
    if (!ctx || !settings.sfxEnabled) return;

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
    oscillator.type = type;

    // Apply master volume to all sound effects
    const adjustedVolume = volume * settings.volume;
    gainNode.gain.setValueAtTime(adjustedVolume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

    oscillator.start();
    oscillator.stop(ctx.currentTime + duration);
  }, [getContext, settings.sfxEnabled, settings.volume]);

  const play = useCallback((sound: SoundType) => {
    if (!settings.sfxEnabled) return;

    switch (sound) {
      case 'click':
        playTone(800, 0.05, 'sine', 0.05);
        break;
      case 'success':
        playTone(523.25, 0.1, 'sine', 0.1);
        setTimeout(() => playTone(659.25, 0.1, 'sine', 0.1), 100);
        setTimeout(() => playTone(783.99, 0.15, 'sine', 0.1), 200);
        break;
      case 'win':
        playTone(523.25, 0.15, 'sine', 0.15);
        setTimeout(() => playTone(659.25, 0.15, 'sine', 0.15), 150);
        setTimeout(() => playTone(783.99, 0.15, 'sine', 0.15), 300);
        setTimeout(() => playTone(1046.50, 0.3, 'sine', 0.15), 450);
        break;
      case 'error':
        playTone(200, 0.2, 'sawtooth', 0.08);
        break;
      case 'timer':
        playTone(440, 0.1, 'sine', 0.08);
        break;
      case 'countdown':
        playTone(880, 0.05, 'sine', 0.1);
        break;
      case 'notification':
        playTone(587.33, 0.1, 'sine', 0.08);
        setTimeout(() => playTone(880, 0.15, 'sine', 0.08), 100);
        break;
      case 'coin':
        playTone(1318.51, 0.08, 'sine', 0.1);
        setTimeout(() => playTone(1567.98, 0.12, 'sine', 0.1), 80);
        break;
      case 'send':
        playTone(600, 0.05, 'sine', 0.08);
        setTimeout(() => playTone(900, 0.05, 'sine', 0.08), 50);
        break;
      case 'tick':
        playTone(440, 0.03, 'sine', 0.03);
        break;
      case 'urgent':
        playTone(880, 0.1, 'square', 0.1);
        setTimeout(() => playTone(880, 0.1, 'square', 0.1), 150);
        break;
      case 'gameOver':
        playTone(392, 0.3, 'sine', 0.15);
        setTimeout(() => playTone(330, 0.3, 'sine', 0.15), 300);
        setTimeout(() => playTone(262, 0.5, 'sine', 0.15), 600);
        break;
      case 'leaderChange':
        playTone(523.25, 0.1, 'sine', 0.1);
        setTimeout(() => playTone(659.25, 0.1, 'sine', 0.1), 100);
        break;
      case 'prizeWin':
        // Triumphant fanfare for winning prizes
        playTone(523.25, 0.2, 'sine', 0.2);
        setTimeout(() => playTone(659.25, 0.2, 'sine', 0.2), 200);
        setTimeout(() => playTone(783.99, 0.2, 'sine', 0.2), 400);
        setTimeout(() => playTone(1046.50, 0.4, 'sine', 0.25), 600);
        setTimeout(() => playTone(1318.51, 0.5, 'sine', 0.2), 1000);
        break;
      case 'gameStart':
        // Alert sound for game starting
        playTone(440, 0.15, 'sine', 0.15);
        setTimeout(() => playTone(554.37, 0.15, 'sine', 0.15), 150);
        setTimeout(() => playTone(659.25, 0.15, 'sine', 0.15), 300);
        setTimeout(() => playTone(880, 0.25, 'sine', 0.15), 450);
        break;
      case 'drumroll':
        // Dramatic drumroll building tension
        for (let i = 0; i < 20; i++) {
          setTimeout(() => {
            playTone(150 + Math.random() * 50, 0.08, 'triangle', 0.1 + (i * 0.01));
          }, i * 80);
        }
        break;
      case 'crowdCheer':
        // Crowd cheering simulation with noise bursts
        for (let i = 0; i < 8; i++) {
          setTimeout(() => {
            playTone(800 + Math.random() * 400, 0.15, 'sawtooth', 0.08);
            playTone(1200 + Math.random() * 600, 0.12, 'sine', 0.06);
          }, i * 150);
        }
        // Add celebratory high notes
        setTimeout(() => playTone(1046.50, 0.2, 'sine', 0.15), 1000);
        setTimeout(() => playTone(1318.51, 0.2, 'sine', 0.15), 1150);
        setTimeout(() => playTone(1567.98, 0.3, 'sine', 0.15), 1300);
        break;
      case 'victoryFanfare':
        // Epic victory fanfare with brass-like tones
        playTone(392, 0.2, 'sawtooth', 0.12);
        playTone(493.88, 0.2, 'sawtooth', 0.1);
        setTimeout(() => {
          playTone(523.25, 0.2, 'sawtooth', 0.12);
          playTone(659.25, 0.2, 'sawtooth', 0.1);
        }, 250);
        setTimeout(() => {
          playTone(659.25, 0.3, 'sawtooth', 0.15);
          playTone(783.99, 0.3, 'sawtooth', 0.12);
        }, 500);
        setTimeout(() => {
          playTone(783.99, 0.5, 'sawtooth', 0.18);
          playTone(987.77, 0.5, 'sawtooth', 0.15);
          playTone(1174.66, 0.5, 'sawtooth', 0.12);
        }, 800);
        break;
      case 'tenseCrescendo':
        // Building tension crescendo
        for (let i = 0; i < 10; i++) {
          setTimeout(() => {
            const freq = 200 + (i * 80);
            const vol = 0.05 + (i * 0.015);
            playTone(freq, 0.3, 'sine', vol);
          }, i * 200);
        }
        // Final burst
        setTimeout(() => {
          playTone(880, 0.4, 'sine', 0.2);
          playTone(1046.50, 0.4, 'sine', 0.18);
        }, 2000);
        break;
      case 'heartbeat':
        // Low thump heartbeat - slower rhythm (matches 1s pulse)
        playTone(60, 0.15, 'sine', 0.25);
        setTimeout(() => playTone(55, 0.12, 'sine', 0.2), 120);
        break;
      case 'heartbeatFast':
        // Fast intense heartbeat - matches 0.3-0.5s pulse
        playTone(70, 0.1, 'sine', 0.3);
        setTimeout(() => playTone(60, 0.08, 'sine', 0.25), 80);
        setTimeout(() => playTone(75, 0.1, 'sine', 0.3), 300);
        setTimeout(() => playTone(65, 0.08, 'sine', 0.25), 380);
        break;
      case 'welcomeBonus':
        // Celebratory coins and chime cascade for welcome bonus
        // Coin shower effect
        for (let i = 0; i < 6; i++) {
          setTimeout(() => {
            playTone(1318.51 + (i * 100), 0.1, 'sine', 0.12);
            playTone(1567.98 + (i * 80), 0.08, 'sine', 0.1);
          }, i * 100);
        }
        // Rising celebration notes
        setTimeout(() => playTone(523.25, 0.15, 'sine', 0.15), 600);
        setTimeout(() => playTone(659.25, 0.15, 'sine', 0.15), 750);
        setTimeout(() => playTone(783.99, 0.15, 'sine', 0.15), 900);
        setTimeout(() => playTone(1046.50, 0.25, 'sine', 0.2), 1050);
        // Final sparkle
        setTimeout(() => {
          playTone(1567.98, 0.15, 'sine', 0.15);
          playTone(2093.00, 0.2, 'sine', 0.12);
        }, 1300);
        break;
    }
  }, [playTone, settings.sfxEnabled]);

  return { play };
};
