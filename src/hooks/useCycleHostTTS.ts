import { useCallback, useRef, useEffect, useState } from 'react';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { getHostById, AVAILABLE_HOSTS } from '@/hooks/useCrusaderHost';
import { useAudio } from '@/contexts/AudioContext';
import { supabase } from '@/integrations/supabase/client';

interface TTSOptions {
  cycleId?: string;
  isLive: boolean;
  onSpeakingChange?: (isSpeaking: boolean) => void;
}

// Dynamic commentary phrases for varied, engaging commentary
const COMMENT_PHRASES = {
  newComment: [
    (name: string, content: string) => `${name} drops in with: ${content.substring(0, 40)}`,
    (name: string) => `${name} is making moves!`,
    (name: string) => `Look at ${name} keeping the pressure on!`,
    (name: string) => `${name} enters the fray!`,
    (name: string) => `Here comes ${name}!`,
    (name: string) => `${name} is hungry for that win!`,
  ],
  leaderChange: [
    (name: string, timer: number) => `${name} takes the lead with ${timer} seconds left!`,
    (name: string) => `New leader! ${name} is on top!`,
    (name: string) => `${name} just stole the crown!`,
    (name: string) => `OH! ${name} snatches the lead!`,
    (name: string) => `It's ${name}'s game now!`,
    (name: string) => `${name} is in control!`,
  ],
  timerWarning30: [
    (leader: string | null) => leader ? `30 seconds left! ${leader} is holding on!` : `30 seconds on the clock!`,
    (leader: string | null) => leader ? `Half a minute! Can anyone stop ${leader}?` : `30 seconds remaining! The tension is real!`,
    (leader: string | null) => `30 seconds! This is getting intense!`,
  ],
  timerWarning10: [
    (leader: string | null) => leader ? `10 seconds! ${leader} is sweating!` : `10 seconds! This is it!`,
    (leader: string | null) => leader ? `Final countdown! ${leader} better watch out!` : `10 seconds remaining!`,
    (leader: string | null) => `10 seconds! The pressure is REAL!`,
  ],
  timerWarning5: [
    () => `5 seconds! Type something NOW!`,
    () => `5! 4! 3!...`,
    () => `FINAL SECONDS!`,
  ],
  gameOver: [
    (winner: string, prize: string) => `Game over! ${winner} wins ${prize}! What a match!`,
    (winner: string, prize: string) => `${winner} takes home ${prize}! Incredible!`,
    (winner: string, prize: string) => `Congratulations ${winner}! ${prize} is yours!`,
    (winner: string, prize: string) => `AND THE WINNER IS ${winner} with ${prize}!`,
  ],
};

// Co-host banter phrases for natural interactions
const COHOST_BANTER = {
  reaction: [
    (hostName: string) => `Did you see that ${hostName}?!`,
    () => `Wow, I did NOT see that coming!`,
    () => `This is absolutely WILD!`,
    () => `The crowd is going crazy!`,
  ],
  agreement: [
    () => `Absolutely! This is peak entertainment!`,
    () => `Couldn't have said it better myself!`,
    () => `100%! These players are on fire!`,
    () => `Right?! The energy is unmatched!`,
  ],
  tension: [
    () => `I can barely watch!`,
    () => `My heart is racing here!`,
    () => `The suspense is killing me!`,
    () => `This is too close to call!`,
  ],
  excitement: [
    () => `Let's GOOO!`,
    () => `This is what we came for!`,
    () => `ELECTRIC atmosphere!`,
    () => `The arena is on FIRE!`,
  ],
};

export const useCycleHostTTS = ({ cycleId, isLive, onSpeakingChange }: TTSOptions) => {
  const { selectedHost, secondaryHost, isCoHostMode, enableCoHostBanter } = usePlatformSettings();
  const { settings: audioSettings } = useAudio();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const queueRef = useRef<Array<{ text: string; voiceId?: string }>>([]);
  const isSpeakingRef = useRef(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const lastCommentIdRef = useRef<string | null>(null);
  const lastBanterTimeRef = useRef<number>(0);
  const hostTurnRef = useRef<boolean>(true); // Alternates between main host and co-host
  
  // Banter is enabled only if co-host mode AND banter setting is on
  const banterEnabled = isCoHostMode && enableCoHostBanter;

  const host = getHostById(selectedHost);
  const coHost = secondaryHost ? getHostById(secondaryHost) : null;

  // Get voice ID for current or alternating host
  const getVoiceId = useCallback((forCoHost = false) => {
    if (isCoHostMode && coHost && forCoHost) {
      return coHost.voiceId;
    }
    return host.voiceId;
  }, [host, coHost, isCoHostMode]);

  // Get random phrase from array
  const getRandomPhrase = <T extends (...args: any[]) => string>(phrases: T[], ...args: Parameters<T>): string => {
    const phrase = phrases[Math.floor(Math.random() * phrases.length)];
    return phrase(...args);
  };

  // Play TTS audio
  const speakText = useCallback(async (text: string, voiceId?: string) => {
    if (audioSettings.hostMuted || !isLive) return;

    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      
      if (!token) {
        console.warn('[TTS] No auth token available');
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/crusader-tts`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ 
            text, 
            voiceId: voiceId || getVoiceId() 
          }),
        }
      );

      if (!response.ok) {
        console.warn('[TTS] Request failed:', response.status);
        return;
      }

      const data = await response.json();
      if (data.audioContent) {
        // Stop any current playback
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
        }

        const audioUrl = `data:audio/mpeg;base64,${data.audioContent}`;
        const audio = new Audio(audioUrl);
        audioRef.current = audio;

        isSpeakingRef.current = true;
        setIsSpeaking(true);
        onSpeakingChange?.(true);

        audio.onended = () => {
          isSpeakingRef.current = false;
          setIsSpeaking(false);
          onSpeakingChange?.(false);
          audioRef.current = null;
          processQueue();
        };

        audio.onerror = () => {
          isSpeakingRef.current = false;
          setIsSpeaking(false);
          onSpeakingChange?.(false);
          audioRef.current = null;
          processQueue();
        };

        await audio.play();
      }
    } catch (error) {
      console.error('[TTS] Error:', error);
      isSpeakingRef.current = false;
      setIsSpeaking(false);
      onSpeakingChange?.(false);
    }
  }, [audioSettings.hostMuted, isLive, getVoiceId, onSpeakingChange]);

  // Process queue with voice alternation
  const processQueue = useCallback(() => {
    if (queueRef.current.length > 0 && !isSpeakingRef.current) {
      const next = queueRef.current.shift();
      if (next) {
        speakText(next.text, next.voiceId);
      }
    }
  }, [speakText]);

  // Queue a message for TTS with optional voice override
  const queueMessage = useCallback((text: string, useCoHost = false) => {
    if (audioSettings.hostMuted || !isLive) return;
    
    const voiceId = useCoHost && isCoHostMode && coHost ? coHost.voiceId : host.voiceId;
    queueRef.current.push({ text, voiceId });
    
    if (!isSpeakingRef.current) {
      processQueue();
    }
  }, [audioSettings.hostMuted, isLive, processQueue, isCoHostMode, coHost, host]);

  // Add co-host banter reaction (respects platform setting)
  const addCoHostBanter = useCallback((banterType: keyof typeof COHOST_BANTER) => {
    if (!banterEnabled || !coHost || audioSettings.hostMuted) return;
    
    // Rate limit banter - at least 8 seconds between banter
    const now = Date.now();
    if (now - lastBanterTimeRef.current < 8000) return;
    lastBanterTimeRef.current = now;

    // 40% chance of banter response
    if (Math.random() > 0.4) return;

    const phrases = COHOST_BANTER[banterType];
    const phrase = banterType === 'reaction' 
      ? getRandomPhrase(phrases as Array<(hostName?: string) => string>, host.name)
      : getRandomPhrase(phrases as Array<() => string>);
    
    // Queue banter with co-host voice after a small delay
    setTimeout(() => {
      queueMessage(phrase, true);
    }, 500);
  }, [isCoHostMode, coHost, host.name, audioSettings.hostMuted, queueMessage]);

  // Announce new comment with dynamic phrases
  const announceComment = useCallback((username: string, content: string, commentId: string) => {
    if (commentId === lastCommentIdRef.current || audioSettings.hostMuted) return;
    lastCommentIdRef.current = commentId;

    // 15% chance to announce
    const shouldAnnounce = Math.random() < 0.15;
    if (!shouldAnnounce) return;

    // Alternate between hosts if co-host mode
    const useCoHost = isCoHostMode && coHost && !hostTurnRef.current;
    hostTurnRef.current = !hostTurnRef.current;

    // Get random phrase - some need content, some don't
    const phraseIndex = Math.floor(Math.random() * COMMENT_PHRASES.newComment.length);
    const phrase = phraseIndex === 0 
      ? COMMENT_PHRASES.newComment[0](username, content)
      : (COMMENT_PHRASES.newComment[phraseIndex] as (name: string) => string)(username);
    
    queueMessage(phrase, useCoHost);
    
    // Maybe add co-host reaction
    addCoHostBanter('reaction');
  }, [audioSettings.hostMuted, queueMessage, isCoHostMode, coHost, addCoHostBanter]);

  // Announce leader change with excitement
  const announceLeaderChange = useCallback((leaderName: string, timer: number) => {
    if (audioSettings.hostMuted) return;

    const phraseIndex = Math.floor(Math.random() * COMMENT_PHRASES.leaderChange.length);
    const phrase = phraseIndex === 0 
      ? COMMENT_PHRASES.leaderChange[0](leaderName, timer)
      : (COMMENT_PHRASES.leaderChange[phraseIndex] as (name: string) => string)(leaderName);
    
    speakText(phrase);
    
    // Add co-host excitement
    addCoHostBanter('excitement');
  }, [audioSettings.hostMuted, speakText, addCoHostBanter]);

  // Announce timer warnings with tension
  const announceTimerWarning = useCallback((seconds: number, leaderName: string | null) => {
    if (audioSettings.hostMuted) return;

    let phrase = '';
    if (seconds === 30) {
      phrase = getRandomPhrase(COMMENT_PHRASES.timerWarning30, leaderName);
      addCoHostBanter('tension');
    } else if (seconds === 10) {
      phrase = getRandomPhrase(COMMENT_PHRASES.timerWarning10, leaderName);
      addCoHostBanter('tension');
    } else if (seconds === 5) {
      phrase = getRandomPhrase(COMMENT_PHRASES.timerWarning5);
    }

    if (phrase) {
      speakText(phrase);
    }
  }, [audioSettings.hostMuted, speakText, addCoHostBanter]);

  // Announce game over with dramatic flair
  const announceGameOver = useCallback((winnerName: string, prizeAmount: number) => {
    if (audioSettings.hostMuted) return;

    const formattedPrize = prizeAmount >= 1000 
      ? `${Math.floor(prizeAmount / 1000)} thousand naira`
      : `${prizeAmount} naira`;

    const phrase = getRandomPhrase(COMMENT_PHRASES.gameOver, winnerName, formattedPrize);
    speakText(phrase);
    
    // Co-host celebration after main announcement
    if (isCoHostMode && coHost) {
      setTimeout(() => {
        const celebrationPhrases = [
          `What a game! ${winnerName} played that perfectly!`,
          `Unbelievable finish! ${winnerName} deserves every naira!`,
          `The crowd goes WILD for ${winnerName}!`,
        ];
        queueMessage(celebrationPhrases[Math.floor(Math.random() * celebrationPhrases.length)], true);
      }, 2000);
    }
  }, [audioSettings.hostMuted, speakText, isCoHostMode, coHost, queueMessage]);

  // Stop all audio when host muted or unmounted
  useEffect(() => {
    if (audioSettings.hostMuted && audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      isSpeakingRef.current = false;
      setIsSpeaking(false);
      queueRef.current = [];
    }
  }, [audioSettings.hostMuted]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      queueRef.current = [];
    };
  }, []);

  return {
    host,
    coHost,
    isCoHostMode,
    isSpeaking,
    speakText,
    queueMessage,
    announceComment,
    announceLeaderChange,
    announceTimerWarning,
    announceGameOver,
    addCoHostBanter,
    stopSpeaking: useCallback(() => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      isSpeakingRef.current = false;
      setIsSpeaking(false);
      queueRef.current = [];
    }, []),
  };
};
