import { useCallback, useRef, useEffect } from 'react';
import { useAudio } from '@/contexts/AudioContext';

type CommentaryType = 'leader_change' | 'timer_low' | 'game_start' | 'game_end' | 'close_call';

// Using Web Speech API for commentary
export const useCommentary = () => {
  const { settings } = useAudio();
  const enabledRef = useRef(true);
  const lastAnnouncementRef = useRef<number>(0);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  // Update enabledRef when host is muted and stop any playing speech
  useEffect(() => {
    enabledRef.current = settings.commentaryEnabled && !settings.hostMuted;
    
    // If muted, cancel any ongoing speech immediately
    if (settings.hostMuted && synthRef.current) {
      synthRef.current.cancel();
    }
  }, [settings.commentaryEnabled, settings.hostMuted]);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
    }
    return () => {
      synthRef.current?.cancel();
    };
  }, []);

  const speak = useCallback((text: string, rate = 1.1, pitch = 1.0) => {
    // Double-check mute state when speaking
    if (!synthRef.current || !enabledRef.current || settings.hostMuted) return;
    
    // Throttle announcements to prevent overlap
    const now = Date.now();
    if (now - lastAnnouncementRef.current < 2000) return;
    lastAnnouncementRef.current = now;

    // Cancel any ongoing speech
    synthRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = 0.7;
    
    // Try to use a more dynamic voice
    const voices = synthRef.current.getVoices();
    const preferredVoice = voices.find(v => 
      v.lang.startsWith('en') && (v.name.includes('Male') || v.name.includes('Daniel'))
    ) || voices.find(v => v.lang.startsWith('en'));
    
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    synthRef.current.speak(utterance);
  }, [settings.hostMuted]);

  const announceLeaderChange = useCallback((leaderName: string) => {
    const phrases = [
      `${leaderName} takes the lead!`,
      `New leader! ${leaderName}!`,
      `${leaderName} is now in first!`,
      `Watch out! ${leaderName} just took over!`,
      `${leaderName} claims the top spot!`,
    ];
    const phrase = phrases[Math.floor(Math.random() * phrases.length)];
    speak(phrase, 1.2, 1.1);
  }, [speak]);

  const announceTimerLow = useCallback((seconds: number) => {
    if (seconds === 30) {
      speak('30 seconds remaining!', 1.3, 1.2);
    } else if (seconds === 15) {
      speak('15 seconds! Its getting tense!', 1.4, 1.3);
    } else if (seconds === 10) {
      speak('10 seconds! Who will win?', 1.5, 1.4);
    } else if (seconds === 5) {
      speak('5 seconds!', 1.6, 1.5);
    }
  }, [speak]);

  const announceGameStart = useCallback(() => {
    speak('Game on! Fight for the lead!', 1.2, 1.1);
  }, [speak]);

  const announceGameEnd = useCallback((winnerName: string) => {
    speak(`Game over! ${winnerName} wins!`, 1.3, 1.2);
  }, [speak]);

  const announceCloseCall = useCallback(() => {
    const phrases = [
      'Close call!',
      'Just in time!',
      'Cutting it close!',
      'That was tight!',
    ];
    const phrase = phrases[Math.floor(Math.random() * phrases.length)];
    speak(phrase, 1.3, 1.2);
  }, [speak]);

  const setEnabled = useCallback((enabled: boolean) => {
    enabledRef.current = enabled;
    if (!enabled) {
      synthRef.current?.cancel();
    }
  }, []);

  return {
    announceLeaderChange,
    announceTimerLow,
    announceGameStart,
    announceGameEnd,
    announceCloseCall,
    setEnabled,
  };
};
