import { useCallback, useRef, useEffect } from 'react';

type SoundType = 'click' | 'success' | 'win' | 'error' | 'timer' | 'countdown' | 'notification' | 'coin' | 'send' | 'tick' | 'urgent' | 'gameOver' | 'leaderChange' | 'prizeWin' | 'gameStart';

// Create audio context lazily
const createAudioContext = () => {
  if (typeof window === 'undefined') return null;
  return new (window.AudioContext || (window as any).webkitAudioContext)();
};

export const useSounds = () => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const enabledRef = useRef(true);

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
    if (!ctx || !enabledRef.current) return;

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
    oscillator.type = type;

    gainNode.gain.setValueAtTime(volume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

    oscillator.start();
    oscillator.stop(ctx.currentTime + duration);
  }, [getContext]);

  const play = useCallback((sound: SoundType) => {
    if (!enabledRef.current) return;

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
    }
  }, [playTone]);

  const setEnabled = useCallback((enabled: boolean) => {
    enabledRef.current = enabled;
  }, []);

  return { play, setEnabled };
};
