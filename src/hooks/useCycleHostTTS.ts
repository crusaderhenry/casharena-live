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

export const useCycleHostTTS = ({ cycleId, isLive, onSpeakingChange }: TTSOptions) => {
  const { selectedHost, secondaryHost, isCoHostMode } = usePlatformSettings();
  const { settings: audioSettings } = useAudio();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const queueRef = useRef<string[]>([]);
  const isSpeakingRef = useRef(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const lastCommentIdRef = useRef<string | null>(null);

  const host = getHostById(selectedHost);
  const coHost = secondaryHost ? getHostById(secondaryHost) : null;

  // Get voice ID for current or alternating host
  const getVoiceId = useCallback((forCoHost = false) => {
    if (isCoHostMode && coHost && forCoHost) {
      return coHost.voiceId;
    }
    return host.voiceId;
  }, [host, coHost, isCoHostMode]);

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

  // Process queue
  const processQueue = useCallback(() => {
    if (queueRef.current.length > 0 && !isSpeakingRef.current) {
      const nextText = queueRef.current.shift();
      if (nextText) {
        speakText(nextText);
      }
    }
  }, [speakText]);

  // Queue a message for TTS
  const queueMessage = useCallback((text: string) => {
    if (audioSettings.hostMuted || !isLive) return;
    
    queueRef.current.push(text);
    if (!isSpeakingRef.current) {
      processQueue();
    }
  }, [audioSettings.hostMuted, isLive, processQueue]);

  // Announce new comment (with rate limiting)
  const announceComment = useCallback((username: string, content: string, commentId: string) => {
    // Skip if same comment or host is muted
    if (commentId === lastCommentIdRef.current || audioSettings.hostMuted) return;
    lastCommentIdRef.current = commentId;

    // Only announce some comments to avoid spam
    const shouldAnnounce = Math.random() < 0.15; // 15% chance
    if (!shouldAnnounce) return;

    const phrases = [
      `${username} says: ${content.substring(0, 50)}`,
      `${username} is in the game!`,
      `Look at ${username} keeping it alive!`,
    ];
    
    const phrase = phrases[Math.floor(Math.random() * phrases.length)];
    queueMessage(phrase);
  }, [audioSettings.hostMuted, queueMessage]);

  // Announce leader change
  const announceLeaderChange = useCallback((leaderName: string, timer: number) => {
    if (audioSettings.hostMuted) return;

    const phrases = [
      `${leaderName} takes the lead with ${timer} seconds left!`,
      `New leader! ${leaderName} is on top!`,
      `${leaderName} just stole the crown!`,
    ];
    
    const phrase = phrases[Math.floor(Math.random() * phrases.length)];
    speakText(phrase);
  }, [audioSettings.hostMuted, speakText]);

  // Announce timer warnings
  const announceTimerWarning = useCallback((seconds: number, leaderName: string | null) => {
    if (audioSettings.hostMuted) return;

    let phrase = '';
    if (seconds === 30) {
      phrase = leaderName 
        ? `30 seconds left! ${leaderName} is leading!`
        : `30 seconds on the clock!`;
    } else if (seconds === 10) {
      phrase = leaderName
        ? `10 seconds! ${leaderName} is sweating!`
        : `10 seconds! This is it!`;
    } else if (seconds === 5) {
      phrase = `5 seconds! Type something!`;
    }

    if (phrase) {
      speakText(phrase);
    }
  }, [audioSettings.hostMuted, speakText]);

  // Announce game over
  const announceGameOver = useCallback((winnerName: string, prizeAmount: number) => {
    if (audioSettings.hostMuted) return;

    const formattedPrize = prizeAmount >= 1000 
      ? `${Math.floor(prizeAmount / 1000)} thousand naira`
      : `${prizeAmount} naira`;

    const phrase = `Game over! ${winnerName} wins ${formattedPrize}! Congratulations!`;
    speakText(phrase);
  }, [audioSettings.hostMuted, speakText]);

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
