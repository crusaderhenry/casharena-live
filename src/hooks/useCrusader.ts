import { useCallback, useRef, useEffect, useMemo } from 'react';
import { useAudio } from '@/contexts/AudioContext';
import { supabase } from '@/integrations/supabase/client';

// Crusader - The African bold man voice game host!
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
    "5! 4! 3! Oh this is tense!",
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
  winner_announce_1st: [
    "Give it up for {name}! CHAMPION! First place baby!",
    "{name} just secured the BAG! Our number one winner!",
    "Victory for {name}! First place, absolutely LEGENDARY!",
    "And your CHAMPION is {name}! Taking home the gold!",
  ],
  winner_announce_2nd: [
    "In second place, we have {name}! Silver medalist!",
    "{name} grabs that second spot! Great run!",
    "Runner up is {name}! So close to the crown!",
  ],
  winner_announce_3rd: [
    "And bronze goes to {name}! Third place finisher!",
    "{name} rounds out our top 3! Well played!",
    "Taking third place, give it up for {name}!",
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

// Voice ID for custom cloned voice - user's personal Crusader voice
const CRUSADER_VOICE_ID = "I26ofw8CwlRZ6PZzoFaX"; // Custom clone

export const useCrusader = () => {
  const { settings } = useAudio();
  const enabledRef = useRef(true);
  const lastAnnouncementRef = useRef<number>(0);
  const minIntervalRef = useRef(3500);
  const audioQueueRef = useRef<HTMLAudioElement[]>([]);
  const isPlayingRef = useRef(false);

  useEffect(() => {
    enabledRef.current = settings.commentaryEnabled;
  }, [settings.commentaryEnabled]);

  // Play audio from queue
  const playNextInQueue = useCallback(() => {
    if (audioQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      return;
    }

    isPlayingRef.current = true;
    const audio = audioQueueRef.current.shift();
    if (audio) {
      audio.volume = settings.volume * 0.8;
      audio.onended = () => playNextInQueue();
      audio.onerror = () => playNextInQueue();
      audio.play().catch(() => playNextInQueue());
    }
  }, [settings.volume]);

  // Queue audio for playback
  const queueAudio = useCallback((audioUrl: string) => {
    const audio = new Audio(audioUrl);
    audioQueueRef.current.push(audio);
    
    if (!isPlayingRef.current) {
      playNextInQueue();
    }
  }, [playNextInQueue]);

  // Generate TTS using ElevenLabs
  const speak = useCallback(async (text: string) => {
    if (!enabledRef.current) return;
    
    const now = Date.now();
    if (now - lastAnnouncementRef.current < minIntervalRef.current) return;
    lastAnnouncementRef.current = now;

    try {
      const { data, error } = await supabase.functions.invoke('crusader-tts', {
        body: { text, voiceId: CRUSADER_VOICE_ID },
      });

      if (error) {
        console.error('TTS error:', error);
        // Fallback to Web Speech API
        fallbackSpeak(text);
        return;
      }

      if (data?.audioContent) {
        const audioUrl = `data:audio/mpeg;base64,${data.audioContent}`;
        queueAudio(audioUrl);
      }
    } catch (err) {
      console.error('TTS request failed:', err);
      fallbackSpeak(text);
    }
  }, [queueAudio]);

  // Fallback to Web Speech API if TTS fails
  const fallbackSpeak = useCallback((text: string) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const synth = window.speechSynthesis;
      synth.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.15;
      utterance.pitch = 0.9; // Lower pitch for bold voice
      utterance.volume = 0.7;
      
      const voices = synth.getVoices();
      const preferredVoice = voices.find(v => 
        v.lang.startsWith('en') && v.name.includes('Male')
      ) || voices.find(v => v.lang.startsWith('en'));
      
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      synth.speak(utterance);
    }
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
    speak(getRandomPhrase('lobby_welcome'));
  }, [speak]);

  const announceGameStart = useCallback(() => {
    speak(getRandomPhrase('game_start'));
  }, [speak]);

  const announceLeaderChange = useCallback((leaderName: string) => {
    speak(getRandomPhrase('leader_change', { name: leaderName }));
  }, [speak]);

  const announceTimerLow = useCallback((seconds: number) => {
    if (seconds === 30) {
      speak(getRandomPhrase('timer_30'));
    } else if (seconds === 15) {
      speak(getRandomPhrase('timer_15'));
    } else if (seconds === 10) {
      speak(getRandomPhrase('timer_10'));
    } else if (seconds === 5) {
      speak(getRandomPhrase('timer_5'));
    }
  }, [speak]);

  const announceCloseCall = useCallback(() => {
    speak(getRandomPhrase('close_call'));
  }, [speak]);

  const announceGameOver = useCallback(() => {
    speak(getRandomPhrase('game_over'));
  }, [speak]);

  const announceWinner = useCallback((winnerName: string, position?: number) => {
    setTimeout(() => {
      const category = position === 2 ? 'winner_announce_2nd' : position === 3 ? 'winner_announce_3rd' : 'winner_announce_1st';
      speak(getRandomPhrase(category, { name: winnerName }));
    }, 1500);
  }, [speak]);

  const randomHype = useCallback(() => {
    speak(getRandomPhrase('hype_random'));
  }, [speak]);

  const setEnabled = useCallback((enabled: boolean) => {
    enabledRef.current = enabled;
  }, []);

  return useMemo(
    () => ({
      welcomeLobby,
      announceGameStart,
      announceLeaderChange,
      announceTimerLow,
      announceCloseCall,
      announceGameOver,
      announceWinner,
      randomHype,
      setEnabled,
    }),
    [
      welcomeLobby,
      announceGameStart,
      announceLeaderChange,
      announceTimerLow,
      announceCloseCall,
      announceGameOver,
      announceWinner,
      randomHype,
      setEnabled,
    ]
  );
};
