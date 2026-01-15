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

// Dynamic commentary phrases for varied, engaging commentary - MORE VARIETY!
const COMMENT_PHRASES = {
  newComment: [
    (name: string, content: string) => `${name} drops in with: ${content.substring(0, 40)}`,
    (name: string) => `${name} is making moves!`,
    (name: string) => `Look at ${name} keeping the pressure on!`,
    (name: string) => `${name} enters the fray!`,
    (name: string) => `Here comes ${name}!`,
    (name: string) => `${name} is hungry for that win!`,
    (name: string) => `${name} just reset the timer! The battle continues!`,
    (name: string) => `Oooh! ${name} is fighting for that crown!`,
    (name: string) => `${name} is NOT backing down!`,
    (name: string) => `The pressure is on, but ${name} is pushing through!`,
    (name: string) => `${name}, you legend! Keep it going!`,
    (name: string) => `Watch out everyone, ${name} is ON FIRE!`,
  ],
  timerActivated: [
    (name: string) => `${name} activated the timer! THE BATTLE BEGINS!`,
    (name: string) => `FIRST COMMENT from ${name}! Game ON people!`,
    (name: string) => `${name} just started the countdown! Let's GOOO!`,
    (name: string) => `The wait is over! ${name} kicks things off!`,
    (name: string) => `${name} fires the first shot! The timer is now LIVE!`,
  ],
  leaderChange: [
    (name: string, timer: number) => `${name} takes the lead with ${timer} seconds left!`,
    (name: string) => `New leader! ${name} is on top!`,
    (name: string) => `${name} just stole the crown!`,
    (name: string) => `OH! ${name} snatches the lead!`,
    (name: string) => `It's ${name}'s game now!`,
    (name: string) => `${name} is in control!`,
    (name: string) => `LEADER CHANGE! ${name} takes the throne!`,
    (name: string) => `Wetin dey happen?! ${name} don collect am!`,
    (name: string) => `${name} just did THAT! New leader!`,
    (name: string) => `The crown has moved! ${name} is wearing it now!`,
  ],
  timerWarning30: [
    (leader: string | null) => leader ? `30 seconds left! ${leader} is holding on!` : `30 seconds on the clock!`,
    (leader: string | null) => leader ? `Half a minute! Can anyone stop ${leader}?` : `30 seconds remaining! The tension is real!`,
    (leader: string | null) => `30 seconds! This is getting intense!`,
    (leader: string | null) => leader ? `30 ticks on the clock! ${leader} is sweating!` : `30 seconds! Things are heating up!`,
  ],
  timerWarning10: [
    (leader: string | null) => leader ? `10 seconds! ${leader} is sweating!` : `10 seconds! This is it!`,
    (leader: string | null) => leader ? `Final countdown! ${leader} better watch out!` : `10 seconds remaining!`,
    (leader: string | null) => `10 seconds! The pressure is REAL!`,
    (leader: string | null) => leader ? `TEN SECONDS! Will ${leader} hold on?!` : `10 seconds left! Someone better TYPE!`,
    (leader: string | null) => `CRITICAL! 10 seconds to go!`,
  ],
  timerWarning5: [
    () => `5 seconds! Type something NOW!`,
    () => `5! 4! 3!...`,
    () => `FINAL SECONDS!`,
    () => `This is IT! 5 seconds!`,
    () => `SOMEBODY DO SOMETHING! 5 seconds!`,
  ],
  gameOver: [
    (winner: string, prize: string) => `Game over! ${winner} wins ${prize}! What a match!`,
    (winner: string, prize: string) => `${winner} takes home ${prize}! Incredible!`,
    (winner: string, prize: string) => `Congratulations ${winner}! ${prize} is yours!`,
    (winner: string, prize: string) => `AND THE WINNER IS ${winner} with ${prize}!`,
    (winner: string, prize: string) => `${winner} has done it! ${prize} in the bag!`,
    (winner: string, prize: string) => `What a performance! ${winner} claims ${prize}!`,
  ],
  periodicHype: [
    () => `The energy in here is UNMATCHED!`,
    () => `Keep those comments coming people!`,
    () => `This is what we live for! Pure competition!`,
    () => `The arena is ALIVE right now!`,
    () => `I can feel the tension through the screen!`,
    () => `Nobody wants to lose! I love this energy!`,
  ],
  welcome: [
    (name: string) => `Welcome to the arena, ${name}! Get ready to rumble!`,
    (name: string) => `${name} has entered the battle! Let's see what you've got!`,
    (name: string) => `Good luck ${name}! May the fastest finger win!`,
  ],
};

// Co-host banter phrases for natural interactions - MORE ENERGY!
const COHOST_BANTER = {
  reaction: [
    (hostName: string) => `Did you see that ${hostName}?!`,
    () => `Wow, I did NOT see that coming!`,
    () => `This is absolutely WILD!`,
    () => `The crowd is going crazy!`,
    () => `I can't believe what I'm seeing!`,
    () => `That was INSANE!`,
  ],
  agreement: [
    () => `Absolutely! This is peak entertainment!`,
    () => `Couldn't have said it better myself!`,
    () => `100%! These players are on fire!`,
    () => `Right?! The energy is unmatched!`,
    () => `Facts! This is incredible!`,
    () => `Exactly what I was thinking!`,
  ],
  tension: [
    () => `I can barely watch!`,
    () => `My heart is racing here!`,
    () => `The suspense is killing me!`,
    () => `This is too close to call!`,
    () => `I'm literally on the edge of my seat!`,
    () => `The tension is PALPABLE!`,
  ],
  excitement: [
    () => `Let's GOOO!`,
    () => `This is what we came for!`,
    () => `ELECTRIC atmosphere!`,
    () => `The arena is on FIRE!`,
    () => `THIS IS AMAZING!`,
    () => `I'm losing my mind over here!`,
    () => `PURE ENTERTAINMENT!`,
  ],
  firstComment: [
    () => `HERE WE GO! It's started!`,
    () => `Finally! The wait is over!`,
    () => `Game time! Let's see who wants it more!`,
    () => `The timer is live! This is getting REAL!`,
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

  // Track if quota is exceeded to skip API calls
  const quotaExceededRef = useRef(false);
  
  // Ref to trigger queue processing without circular dependencies
  const triggerQueueProcessRef = useRef<(() => void) | null>(null);

  // Helper to trigger queue processing safely
  const triggerNextInQueue = useCallback(() => {
    // Use setTimeout to break the synchronous call chain and avoid hook order issues
    setTimeout(() => {
      triggerQueueProcessRef.current?.();
    }, 50);
  }, []);

  // Voice profiles for fallback (simulating host personalities)
  const FALLBACK_VOICE_PROFILES: Record<string, { basePitch: number; baseRate: number; gender: 'male' | 'female' }> = {
    crusader: { basePitch: 1.15, baseRate: 1.12, gender: 'male' },  // Energetic male
    mark: { basePitch: 0.95, baseRate: 1.0, gender: 'male' },       // Calm male
    adaobi: { basePitch: 1.2, baseRate: 1.08, gender: 'female' },   // Energetic female
    default: { basePitch: 1.0, baseRate: 1.05, gender: 'male' },
  };

  // Emotion modifiers for dynamic speech
  const EMOTION_MODIFIERS: Record<string, { pitchMod: number; rateMod: number }> = {
    excited: { pitchMod: 0.15, rateMod: 0.1 },    // Fast and high for celebrations
    tense: { pitchMod: 0.08, rateMod: 0.12 },     // Urgent for countdowns
    calm: { pitchMod: 0, rateMod: 0 },            // Neutral
  };

  // Fallback to Web Speech API when ElevenLabs quota is exceeded
  const fallbackSpeak = useCallback((text: string, emotion: 'excited' | 'tense' | 'calm' = 'calm') => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      console.warn('[TTS Fallback] SpeechSynthesis not available');
      triggerNextInQueue();
      return;
    }

    const synth = window.speechSynthesis;
    synth.cancel(); // Stop any current speech

    // Get host profile based on selectedHost
    const profile = FALLBACK_VOICE_PROFILES[selectedHost] || FALLBACK_VOICE_PROFILES.default;
    const emotionMod = EMOTION_MODIFIERS[emotion];

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = Math.min(Math.max(profile.baseRate + emotionMod.rateMod, 0.8), 1.5);
    utterance.pitch = Math.min(Math.max(profile.basePitch + emotionMod.pitchMod, 0.5), 2.0);
    utterance.volume = audioSettings.volume; // Respect user volume setting

    // Get voices - may need to wait for them to load
    const trySpeak = () => {
      const voices = synth.getVoices();
      
      if (voices.length === 0) {
        // Voices not loaded yet, wait and retry
        console.log('[TTS Fallback] Waiting for voices to load...');
        synth.onvoiceschanged = () => {
          synth.onvoiceschanged = null;
          trySpeak();
        };
        // Also set a timeout in case onvoiceschanged never fires
        setTimeout(() => {
          if (synth.getVoices().length > 0) {
            synth.onvoiceschanged = null;
            trySpeak();
          } else {
            console.warn('[TTS Fallback] No voices available after timeout');
            triggerNextInQueue();
          }
        }, 500);
        return;
      }
      
      const isFemalHost = profile.gender === 'female';
      
      // Try to find a matching gendered voice
      let selectedVoice = voices.find(v => 
        v.lang.startsWith('en') && 
        (isFemalHost 
          ? (v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('samantha') || v.name.toLowerCase().includes('victoria') || v.name.toLowerCase().includes('karen') || v.name.toLowerCase().includes('fiona'))
          : (v.name.toLowerCase().includes('male') || v.name.toLowerCase().includes('daniel') || v.name.toLowerCase().includes('david') || v.name.toLowerCase().includes('james') || v.name.toLowerCase().includes('alex'))
        )
      );
      
      // Fallback to any English voice
      if (!selectedVoice) {
        selectedVoice = voices.find(v => v.lang.startsWith('en'));
      }
      
      // Final fallback - any voice
      if (!selectedVoice && voices.length > 0) {
        selectedVoice = voices[0];
      }
      
      if (selectedVoice) {
        utterance.voice = selectedVoice;
        console.log(`[TTS Fallback] Using voice: ${selectedVoice.name}`);
      }

      isSpeakingRef.current = true;
      setIsSpeaking(true);
      onSpeakingChange?.(true);

      utterance.onend = () => {
        isSpeakingRef.current = false;
        setIsSpeaking(false);
        onSpeakingChange?.(false);
        triggerNextInQueue();
      };

      utterance.onerror = (e) => {
        console.warn('[TTS Fallback] Speech error:', e.error);
        isSpeakingRef.current = false;
        setIsSpeaking(false);
        onSpeakingChange?.(false);
        triggerNextInQueue();
      };

      synth.speak(utterance);
      console.log(`[TTS Fallback] Speaking: "${text.substring(0, 30)}..."`);
    };
    
    trySpeak();
  }, [onSpeakingChange, triggerNextInQueue, selectedHost, audioSettings.volume]);

  // Play TTS audio with ElevenLabs, fallback to Web Speech API
  const speakText = useCallback(async (text: string, voiceId?: string) => {
    if (audioSettings.hostMuted || !isLive) {
      console.log('[TTS] Skipping: hostMuted or not live');
      return;
    }

    // If quota was exceeded, use fallback directly with emotion
    if (quotaExceededRef.current) {
      console.log('[TTS] Using Web Speech fallback (quota exceeded)');
      // Determine emotion from text content
      const emotion = text.includes('!') && (text.includes('WIN') || text.includes('FIRE') || text.includes('GOOO') || text.includes('WILD'))
        ? 'excited' 
        : (text.includes('second') || text.includes('FINAL') || text.includes('CRITICAL'))
          ? 'tense'
          : 'calm';
      fallbackSpeak(text, emotion);
      return;
    }

    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      
      if (!token) {
        console.warn('[TTS] No auth token available, using fallback');
        fallbackSpeak(text);
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
        const errorData = await response.json().catch(() => ({}));
        
        // Check for rate limit or quota exceeded - switch to fallback permanently for this session
        if (response.status === 429 || response.status === 503 || errorData.error === 'quota_exceeded') {
          console.warn('[TTS] Rate limit or quota exceeded, switching to Web Speech API fallback');
          quotaExceededRef.current = true;
          fallbackSpeak(text);
          return;
        }
        
        console.warn('[TTS] Request failed:', response.status);
        fallbackSpeak(text);
        return;
      }

      const data = await response.json();
      
      // Check for app-level error (e.g., quota exceeded or rate limited returned as HTTP 200)
      if (data.error === 'quota_exceeded' || data.error === 'rate_limited') {
        console.warn('[TTS] Rate limit or quota exceeded, switching to Web Speech API fallback');
        quotaExceededRef.current = true;
        fallbackSpeak(text);
        return;
      }
      
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
          triggerNextInQueue();
        };

        audio.onerror = () => {
          isSpeakingRef.current = false;
          setIsSpeaking(false);
          onSpeakingChange?.(false);
          audioRef.current = null;
          triggerNextInQueue();
        };

        await audio.play();
      } else {
        // No audio content received, use fallback
        fallbackSpeak(text);
      }
    } catch (error) {
      console.error('[TTS] Error, using fallback:', error);
      fallbackSpeak(text);
    }
  }, [audioSettings.hostMuted, isLive, getVoiceId, onSpeakingChange, fallbackSpeak, triggerNextInQueue]);

  // Process queue with voice alternation
  const processQueue = useCallback(() => {
    if (queueRef.current.length > 0 && !isSpeakingRef.current) {
      const next = queueRef.current.shift();
      if (next) {
        speakText(next.text, next.voiceId);
      }
    }
  }, [speakText]);

  // Wire up the ref so fallbackSpeak can trigger queue processing
  useEffect(() => {
    triggerQueueProcessRef.current = processQueue;
  }, [processQueue]);

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

  // Track if first comment has been announced
  const firstCommentAnnouncedRef = useRef(false);
  const periodicHypeIntervalRef = useRef<number | null>(null);
  const commentCountRef = useRef(0);
  
  // Reset first comment flag when cycle changes
  useEffect(() => {
    firstCommentAnnouncedRef.current = false;
    commentCountRef.current = 0;
  }, [cycleId]);

  // Announce new comment with dynamic phrases - MUCH HIGHER FREQUENCY
  const announceComment = useCallback((username: string, content: string, commentId: string, isTimerPaused?: boolean) => {
    if (commentId === lastCommentIdRef.current || audioSettings.hostMuted) return;
    lastCommentIdRef.current = commentId;
    commentCountRef.current += 1;

    // Special announcement for FIRST COMMENT (timer activation)
    if (!firstCommentAnnouncedRef.current) {
      firstCommentAnnouncedRef.current = true;
      const phrase = getRandomPhrase(COMMENT_PHRASES.timerActivated, username);
      speakText(phrase);
      addCoHostBanter('firstComment');
      return;
    }

    // 45% chance to announce regular comments (up from 15%)
    const shouldAnnounce = Math.random() < 0.45;
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
    
    // Maybe add co-host reaction (50% chance, up from 40%)
    if (Math.random() < 0.5) {
      addCoHostBanter('reaction');
    }
  }, [audioSettings.hostMuted, queueMessage, speakText, isCoHostMode, coHost, addCoHostBanter]);
  
  // Announce periodic hype during active games
  const announcePeriodicHype = useCallback(() => {
    if (audioSettings.hostMuted || !isLive) return;
    
    // 60% chance to announce periodic hype
    if (Math.random() > 0.6) return;
    
    const phrase = getRandomPhrase(COMMENT_PHRASES.periodicHype);
    queueMessage(phrase, false);
    
    // Add co-host excitement
    addCoHostBanter('excitement');
  }, [audioSettings.hostMuted, isLive, queueMessage, addCoHostBanter]);
  
  // Announce welcome message for new users
  const announceWelcome = useCallback((username: string) => {
    if (audioSettings.hostMuted) return;
    
    const phrase = getRandomPhrase(COMMENT_PHRASES.welcome, username);
    queueMessage(phrase, false);
  }, [audioSettings.hostMuted, queueMessage]);

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
    announceWelcome,
    announcePeriodicHype,
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
