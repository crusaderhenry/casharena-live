import { useCallback, useRef, useEffect, useState } from 'react';
import { useAudio } from '@/contexts/AudioContext';
import { supabase } from '@/integrations/supabase/client';

// Crusader - Your custom voice game host with game-aware commentary
interface GameState {
  timer: number;
  leader: string | null;
  participantCount: number;
  poolValue: number;
  isLive: boolean;
  commentCount: number;
}

// Voice ID for your custom cloned voice
const CRUSADER_VOICE_ID = "I26ofw8CwlRZ6PZzoFaX";

// Game-aware phrases that reference actual game state
const GAME_PHRASES = {
  welcome: (participants: number, pool: number) => [
    `Welcome to the arena! We've got ${participants} players fighting for ${pool} naira! Let's get it!`,
    `${participants} legends in the building! ${pool} naira on the line! This is gonna be EPIC!`,
    `Crusader here! ${participants} players, ${pool} naira prize pool! Let the battle begin!`,
  ],
  
  game_start: (participants: number) => [
    `And we're LIVE! ${participants} players ready to rumble!`,
    `GO GO GO! ${participants} of you fighting for glory!`,
    `The game is ON! Show me what you got, all ${participants} of you!`,
  ],
  
  leader_change: (name: string, timer: number) => [
    `OH SNAP! ${name} just stole the crown with ${timer} seconds left!`,
    `${name} takes the lead! ${timer} seconds on the clock!`,
    `New leader alert! ${name} is on top! Only ${timer} seconds remain!`,
    `${name} said 'move over!' and took that top spot!`,
    `The crowd goes WILD! ${name} takes the throne!`,
  ],
  
  timer_60: (leader: string | null) => leader ? [
    `One minute left! ${leader} is leading but anything can happen!`,
    `60 seconds! ${leader} better watch their back!`,
  ] : [
    `One minute on the clock! Who's gonna step up?`,
    `60 seconds left! The tension is building!`,
  ],
  
  timer_30: (leader: string | null, comments: number) => [
    `30 seconds left! ${comments} comments so far! Things are getting SPICY!`,
    `Half a minute! ${leader ? `${leader} still on top!` : 'No clear leader!'} Who's gonna choke?`,
    `30 on the clock! The tension is REAL!`,
  ],
  
  timer_15: (leader: string | null) => [
    `15 SECONDS! My heart can't take this!${leader ? ` ${leader} is sweating!` : ''}`,
    `We're in the danger zone now! 15 seconds!`,
    `FIFTEEN! Someone DO something!`,
  ],
  
  timer_10: (leader: string | null) => [
    `TEN SECONDS! ${leader ? `${leader} is holding on!` : 'This is IT!'}`,
    `10! 9! This could be the end!`,
    `SINGLE DIGITS! Who wants it MORE?!`,
  ],
  
  timer_5: () => [
    `FIVE SECONDS! TYPE SOMETHING!`,
    `5! 4! 3! Oh this is tense!`,
    `FIVE! THE SUSPENSE IS KILLING ME!`,
  ],
  
  close_call: (name: string) => [
    `OH! ${name} with the CLUTCH save!`,
    `${name} just in time! That was SO close!`,
    `By the SKIN of their teeth! ${name} survives!`,
  ],
  
  game_over: (winner: string, prize: number) => [
    `GAME OVER! ${winner} takes home ${prize} naira! What a BATTLE!`,
    `AND THAT'S A WRAP! ${winner} is our champion with ${prize} naira!`,
    `The dust has settled! ${winner} claims victory and ${prize} naira!`,
  ],
  
  hype: (participants: number, comments: number) => [
    `${participants} players, ${comments} comments! This is CHAOS and I love it!`,
    `The energy in here is ELECTRIC! Keep those comments coming!`,
    `Shoutout to everyone competing! You're all legends!`,
    `The chat is FLYING! I can barely keep up!`,
  ],
  
  quiet_game: () => [
    `Come on people! Where's the energy? TYPE SOMETHING!`,
    `It's too quiet in here! Let's see some action!`,
    `Who wants to win? Show me that hunger!`,
  ],
};

export const useCrusaderHost = () => {
  const { settings } = useAudio();
  const [isEnabled, setIsEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [lastPhrase, setLastPhrase] = useState('');
  
  const enabledRef = useRef(true);
  const lastAnnouncementRef = useRef<number>(0);
  const minIntervalRef = useRef(3000); // Minimum 3 seconds between announcements
  const audioQueueRef = useRef<HTMLAudioElement[]>([]);
  const isPlayingRef = useRef(false);
  const gameStateRef = useRef<GameState>({
    timer: 60,
    leader: null,
    participantCount: 0,
    poolValue: 0,
    isLive: false,
    commentCount: 0,
  });

  useEffect(() => {
    enabledRef.current = settings.commentaryEnabled && isEnabled;
  }, [settings.commentaryEnabled, isEnabled]);

  // Update game state
  const updateGameState = useCallback((state: Partial<GameState>) => {
    gameStateRef.current = { ...gameStateRef.current, ...state };
  }, []);

  // Play next audio in queue
  const playNextInQueue = useCallback(() => {
    if (audioQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      setIsSpeaking(false);
      return;
    }

    isPlayingRef.current = true;
    setIsSpeaking(true);
    const audio = audioQueueRef.current.shift();
    
    if (audio) {
      audio.volume = settings.volume * 0.8;
      audio.onended = () => playNextInQueue();
      audio.onerror = () => {
        console.error('Audio playback error');
        playNextInQueue();
      };
      audio.play().catch((err) => {
        console.error('Audio play failed:', err);
        playNextInQueue();
      });
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

  // Generate TTS using ElevenLabs with your cloned voice
  const speak = useCallback(async (text: string) => {
    if (!enabledRef.current) return;
    
    const now = Date.now();
    if (now - lastAnnouncementRef.current < minIntervalRef.current) return;
    lastAnnouncementRef.current = now;

    setLastPhrase(text);
    console.log('[Crusader]:', text);

    try {
      const { data, error } = await supabase.functions.invoke('crusader-tts', {
        body: { text, voiceId: CRUSADER_VOICE_ID },
      });

      if (error) {
        console.error('TTS error:', error);
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

  // Fallback to Web Speech API
  const fallbackSpeak = useCallback((text: string) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const synth = window.speechSynthesis;
      synth.cancel();
      
      setIsSpeaking(true);
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.1;
      utterance.pitch = 0.85;
      utterance.volume = settings.volume * 0.7;
      
      const voices = synth.getVoices();
      const preferredVoice = voices.find(v => 
        v.lang.startsWith('en') && v.name.toLowerCase().includes('male')
      ) || voices.find(v => v.lang.startsWith('en'));
      
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      synth.speak(utterance);
    }
  }, [settings.volume]);

  // Get random phrase from array
  const getRandomPhrase = (phrases: string[]): string => {
    return phrases[Math.floor(Math.random() * phrases.length)];
  };

  // Game-aware announcements
  const welcomeToArena = useCallback(() => {
    const { participantCount, poolValue } = gameStateRef.current;
    const phrases = GAME_PHRASES.welcome(participantCount, poolValue);
    speak(getRandomPhrase(phrases));
  }, [speak]);

  const announceGameStart = useCallback(() => {
    const { participantCount } = gameStateRef.current;
    const phrases = GAME_PHRASES.game_start(participantCount);
    speak(getRandomPhrase(phrases));
  }, [speak]);

  const announceLeaderChange = useCallback((leaderName: string) => {
    const { timer } = gameStateRef.current;
    const phrases = GAME_PHRASES.leader_change(leaderName, timer);
    speak(getRandomPhrase(phrases));
  }, [speak]);

  const announceTimerLow = useCallback((seconds: number) => {
    const { leader, commentCount } = gameStateRef.current;
    
    let phrases: string[] = [];
    
    if (seconds === 60) {
      phrases = GAME_PHRASES.timer_60(leader);
    } else if (seconds === 30) {
      phrases = GAME_PHRASES.timer_30(leader, commentCount);
    } else if (seconds === 15) {
      phrases = GAME_PHRASES.timer_15(leader);
    } else if (seconds === 10) {
      phrases = GAME_PHRASES.timer_10(leader);
    } else if (seconds === 5) {
      phrases = GAME_PHRASES.timer_5();
    }
    
    if (phrases.length > 0) {
      speak(getRandomPhrase(phrases));
    }
  }, [speak]);

  const announceCloseCall = useCallback((playerName?: string) => {
    const { leader } = gameStateRef.current;
    const name = playerName || leader || 'Someone';
    const phrases = GAME_PHRASES.close_call(name);
    speak(getRandomPhrase(phrases));
  }, [speak]);

  const announceGameOver = useCallback((winnerName?: string, prize?: number) => {
    const { leader, poolValue } = gameStateRef.current;
    const winner = winnerName || leader || 'The champion';
    const prizeAmount = prize || Math.floor(poolValue * 0.5);
    const phrases = GAME_PHRASES.game_over(winner, prizeAmount);
    speak(getRandomPhrase(phrases));
  }, [speak]);

  const randomHype = useCallback(() => {
    const { participantCount, commentCount } = gameStateRef.current;
    
    // If game is quiet, encourage participation
    if (commentCount < 5 && gameStateRef.current.isLive) {
      const phrases = GAME_PHRASES.quiet_game();
      speak(getRandomPhrase(phrases));
    } else {
      const phrases = GAME_PHRASES.hype(participantCount, commentCount);
      speak(getRandomPhrase(phrases));
    }
  }, [speak]);

  const announceWinners = useCallback((winners: Array<{ name: string; position: number; prize: number }>) => {
    if (winners.length === 0) return;
    
    // Announce in sequence with delays
    winners.forEach((winner, index) => {
      setTimeout(() => {
        const positionText = winner.position === 1 ? 'first place' : 
                            winner.position === 2 ? 'second place' : 'third place';
        speak(`${positionText} goes to ${winner.name} with ${winner.prize} naira!`);
      }, index * 3000);
    });
  }, [speak]);

  const setEnabled = useCallback((enabled: boolean) => {
    setIsEnabled(enabled);
    enabledRef.current = enabled;
  }, []);

  // Stop all audio
  const stopSpeaking = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    audioQueueRef.current.forEach(audio => {
      audio.pause();
      audio.src = '';
    });
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    setIsSpeaking(false);
  }, []);

  return {
    isSpeaking,
    isEnabled,
    lastPhrase,
    setEnabled,
    updateGameState,
    welcomeToArena,
    announceGameStart,
    announceLeaderChange,
    announceTimerLow,
    announceCloseCall,
    announceGameOver,
    announceWinners,
    randomHype,
    speak,
    stopSpeaking,
  };
};
