import { useCallback, useRef, useEffect } from 'react';
import { useAudio } from '@/contexts/AudioContext';

// Crusader - The fun game host!
const CRUSADER_PHRASES = {
  lobby_welcome: [
    "Yo yo yo! Crusader here! Welcome to the arena, legends!",
    "What's good everyone! Your boy Crusader is hyped for this one!",
    "Ladies and gentlemen, Crusader in the building! Let's get this money!",
    "Hey hey! Crusader here, ready to see some CHAOS!",
  ],
  game_start: [
    "And we're LIVE! Let the madness begin!",
    "GO GO GO! Fingers on keyboards, people!",
    "The game is ON! Show me what you got!",
    "BOOM! We're live! Fight for that lead!",
    "Alright legends, it's showtime! Make Crusader proud!",
  ],
  leader_change: [
    "OH SNAP! {name} just stole the crown!",
    "Look at {name} making moves! New leader!",
    "{name} said 'move over!' and took that top spot!",
    "Wait wait wait... {name} is leading now! Drama!",
    "The crowd goes WILD! {name} takes the throne!",
    "{name} came outta NOWHERE with that takeover!",
    "Ladies and gents, your new leader: {name}!",
  ],
  timer_60: [
    "Fresh minute on the clock! Who's hungry?",
    "60 seconds reset! The battle continues!",
    "New timer! Keep that energy up!",
  ],
  timer_30: [
    "30 seconds left! Things are getting SPICY!",
    "Half a minute! Who's gonna choke?",
    "30 on the clock! The tension is REAL!",
  ],
  timer_15: [
    "15 SECONDS! My heart can't take this!",
    "We're in the danger zone now! 15 seconds!",
    "FIFTEEN! Someone DO something!",
  ],
  timer_10: [
    "TEN SECONDS! This is IT!",
    "10! 9! This could be the end!",
    "SINGLE DIGITS! Who wants it MORE?!",
  ],
  timer_5: [
    "FIVE SECONDS! TYPE SOMETHING!",
    "5! 4! 3! — Wait, someone reset it!",
    "FIVE! THE SUSPENSE IS KILLING ME!",
  ],
  close_call: [
    "OH! That was SO close!",
    "By the SKIN of their teeth!",
    "CLUTCH! Just in time!",
    "My heart just skipped! What a save!",
  ],
  game_over: [
    "AND THAT'S A WRAP! We have our winners!",
    "GAME OVER! What a BATTLE that was!",
    "It's done! Crusader is EXHAUSTED!",
    "The dust has settled! Champions have risen!",
  ],
  winner_announce: [
    "Give it up for {name}! CHAMPION!",
    "{name} just secured the BAG! Let's go!",
    "Victory for {name}! Absolutely LEGENDARY!",
  ],
  hype_random: [
    "This is getting INTENSE!",
    "The energy in here is ELECTRIC!",
    "I love this game! You guys are CRAZY!",
    "Shoutout to everyone competing! You're all legends!",
    "Who's gonna take this home?!",
    "The chat is FLYING! I can barely keep up!",
  ],
};

export const useCrusader = () => {
  const { settings } = useAudio();
  const enabledRef = useRef(true);
  const lastAnnouncementRef = useRef<number>(0);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const minIntervalRef = useRef(3000); // Minimum 3s between announcements

  useEffect(() => {
    enabledRef.current = settings.commentaryEnabled;
  }, [settings.commentaryEnabled]);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
    }
    return () => {
      synthRef.current?.cancel();
    };
  }, []);

  const speak = useCallback((text: string, rate = 1.15, pitch = 1.05) => {
    if (!synthRef.current || !enabledRef.current) return;
    
    const now = Date.now();
    if (now - lastAnnouncementRef.current < minIntervalRef.current) return;
    lastAnnouncementRef.current = now;

    synthRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = 0.8;
    
    const voices = synthRef.current.getVoices();
    const preferredVoice = voices.find(v => 
      v.lang.startsWith('en') && (v.name.includes('Male') || v.name.includes('Daniel') || v.name.includes('Google'))
    ) || voices.find(v => v.lang.startsWith('en'));
    
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    synthRef.current.speak(utterance);
  }, []);

  const getRandomPhrase = (category: keyof typeof CRUSADER_PHRASES, replacements?: Record<string, string>) => {
    const phrases = CRUSADER_PHRASES[category];
    let phrase = phrases[Math.floor(Math.random() * phrases.length)];
    if (replacements) {
      Object.entries(replacements).forEach(([key, value]) => {
        phrase = phrase.replace(`{${key}}`, value);
      });
    }
    return phrase;
  };

  const welcomeLobby = useCallback(() => {
    speak(getRandomPhrase('lobby_welcome'), 1.1, 1.0);
  }, [speak]);

  const announceGameStart = useCallback(() => {
    speak(getRandomPhrase('game_start'), 1.2, 1.1);
  }, [speak]);

  const announceLeaderChange = useCallback((leaderName: string) => {
    speak(getRandomPhrase('leader_change', { name: leaderName }), 1.2, 1.1);
  }, [speak]);

  const announceTimerReset = useCallback(() => {
    if (Math.random() > 0.7) { // Only 30% chance to avoid spam
      speak(getRandomPhrase('timer_60'), 1.1, 1.0);
    }
  }, [speak]);

  const announceTimerLow = useCallback((seconds: number) => {
    if (seconds === 30) {
      speak(getRandomPhrase('timer_30'), 1.3, 1.15);
    } else if (seconds === 15) {
      speak(getRandomPhrase('timer_15'), 1.4, 1.2);
    } else if (seconds === 10) {
      speak(getRandomPhrase('timer_10'), 1.5, 1.25);
    } else if (seconds === 5) {
      speak(getRandomPhrase('timer_5'), 1.6, 1.3);
    }
  }, [speak]);

  const announceCloseCall = useCallback(() => {
    speak(getRandomPhrase('close_call'), 1.3, 1.2);
  }, [speak]);

  const announceGameOver = useCallback(() => {
    speak(getRandomPhrase('game_over'), 1.2, 1.1);
  }, [speak]);

  const announceWinner = useCallback((winnerName: string) => {
    setTimeout(() => {
      speak(getRandomPhrase('winner_announce', { name: winnerName }), 1.2, 1.1);
    }, 1500);
  }, [speak]);

  const randomHype = useCallback(() => {
    speak(getRandomPhrase('hype_random'), 1.15, 1.05);
  }, [speak]);

  const setEnabled = useCallback((enabled: boolean) => {
    enabledRef.current = enabled;
    if (!enabled) {
      synthRef.current?.cancel();
    }
  }, []);

  return {
    welcomeLobby,
    announceGameStart,
    announceLeaderChange,
    announceTimerReset,
    announceTimerLow,
    announceCloseCall,
    announceGameOver,
    announceWinner,
    randomHype,
    setEnabled,
  };
};
