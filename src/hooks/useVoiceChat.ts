import { useCallback, useRef, useEffect } from 'react';
import { useAudio } from '@/contexts/AudioContext';

// Simulated player voice chat phrases
const PLAYER_CHAT_PHRASES = [
  "Let's go!",
  "I got this!",
  "No way!",
  "Watch me!",
  "Too easy!",
  "Come on!",
  "Yes!",
  "Mine!",
  "Ha!",
  "Wooo!",
  "Get out!",
  "Nope!",
];

// Different voice characteristics for variety
const VOICE_PROFILES = [
  { pitch: 1.0, rate: 1.0 },
  { pitch: 1.2, rate: 1.1 },
  { pitch: 0.8, rate: 0.95 },
  { pitch: 1.1, rate: 1.15 },
  { pitch: 0.9, rate: 1.0 },
  { pitch: 1.15, rate: 0.9 },
];

export const useVoiceChat = () => {
  const { settings } = useAudio();
  const enabledRef = useRef(true);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const lastVoiceRef = useRef<number>(0);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    enabledRef.current = settings.sfxEnabled;
  }, [settings.sfxEnabled]);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
      
      // Load voices
      const loadVoices = () => {
        voicesRef.current = synthRef.current?.getVoices() || [];
      };
      
      loadVoices();
      synthRef.current.onvoiceschanged = loadVoices;
    }
    
    return () => {
      synthRef.current?.cancel();
    };
  }, []);

  const simulatePlayerVoice = useCallback((playerName?: string) => {
    if (!synthRef.current || !enabledRef.current) return;
    
    // Throttle to prevent overlap
    const now = Date.now();
    if (now - lastVoiceRef.current < 2000) return;
    lastVoiceRef.current = now;

    const phrase = PLAYER_CHAT_PHRASES[Math.floor(Math.random() * PLAYER_CHAT_PHRASES.length)];
    const profile = VOICE_PROFILES[Math.floor(Math.random() * VOICE_PROFILES.length)];
    
    const utterance = new SpeechSynthesisUtterance(phrase);
    utterance.rate = profile.rate;
    utterance.pitch = profile.pitch;
    utterance.volume = settings.volume * 0.3; // Quieter than Crusader
    
    // Try to use different voices for variety
    const englishVoices = voicesRef.current.filter(v => v.lang.startsWith('en'));
    if (englishVoices.length > 0) {
      const randomVoice = englishVoices[Math.floor(Math.random() * englishVoices.length)];
      utterance.voice = randomVoice;
    }

    synthRef.current.speak(utterance);
  }, [settings.volume]);

  const startVoiceChatSimulation = useCallback(() => {
    // This would be called periodically to simulate players talking
  }, []);

  return {
    simulatePlayerVoice,
    startVoiceChatSimulation,
  };
};
