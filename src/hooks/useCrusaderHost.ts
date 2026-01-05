import { useCallback, useRef, useEffect, useState } from 'react';
import { useAudio } from '@/contexts/AudioContext';
import { supabase } from '@/integrations/supabase/client';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';

// Game Host with game-aware commentary
interface GameState {
  timer: number;
  gameTimeRemaining: number;
  leader: string | null;
  participantCount: number;
  poolValue: number;
  sponsoredAmount: number;
  isSponsored: boolean;
  entryFee: number;
  isLive: boolean;
  commentCount: number;
  chatIntensity: 'low' | 'medium' | 'high';
}

// Host configurations
export interface HostConfig {
  id: string;
  name: string;
  voiceId: string;
  emoji: string;
  description: string;
}

export const AVAILABLE_HOSTS: HostConfig[] = [
  {
    id: 'crusader',
    name: 'Crusader',
    voiceId: 'I26ofw8CwlRZ6PZzoFaX',
    emoji: '🎙️',
    description: 'Bold African voice, high energy hype man',
  },
  {
    id: 'mark',
    name: 'Mark',
    voiceId: 'owJJWiaBmclx8j0HiPWm',
    emoji: '🎤',
    description: 'Smooth and confident host',
  },
];

// Get host by ID
export const getHostById = (hostId: string): HostConfig => {
  return AVAILABLE_HOSTS.find(h => h.id === hostId) || AVAILABLE_HOSTS[0];
};

// Prize milestone thresholds for callouts
const PRIZE_MILESTONES = [5000, 10000, 20000, 50000, 100000, 250000, 500000];

// Format pool value for speech (e.g., 50000 -> "fifty thousand")
const formatPoolForSpeech = (amount: number): string => {
  if (amount >= 1000000) {
    const millions = amount / 1000000;
    return millions === 1 ? 'one million' : `${millions} million`;
  }
  if (amount >= 1000) {
    const thousands = Math.floor(amount / 1000);
    const remainder = amount % 1000;
    if (remainder === 0) {
      return `${thousands} thousand`;
    }
    return `${thousands} thousand ${remainder}`;
  }
  return amount.toString();
};

// Default prize callout phrases (used by Crusader and Mark)
const DEFAULT_PRIZE_CALLOUT_PHRASES = {
  value_highlight: (pool: number, isSponsored: boolean) => {
    const formattedPool = formatPoolForSpeech(pool);
    const sponsorNote = isSponsored ? ' And this one is sponsored!' : '';
    return [
      `Just a reminder... ${formattedPool} naira is on the line right now.${sponsorNote}`,
      `That's ${formattedPool} naira waiting for someone to claim it.`,
      `We're playing for ${formattedPool} naira here... that's real money!`,
      `Don't forget what's at stake... ${formattedPool} naira!`,
    ];
  },
  value_vague: () => [
    `That prize is serious... someone's about to get paid!`,
    `Real money sitting there... waiting for a name.`,
    `This could pay someone's bills... just saying!`,
    `Whoever wins this... is walking away happy!`,
    `That amount is life-changing for someone in here!`,
  ],
  milestone: (pool: number, _isSponsored: boolean) => {
    const formattedPool = formatPoolForSpeech(pool);
    return [
      `Woah! Prize pool just hit ${formattedPool} naira! This is getting BIG!`,
      `${formattedPool} naira now! The stakes keep rising!`,
      `We just crossed ${formattedPool} naira! The competition is heating up!`,
    ];
  },
  danger_mode: (pool: number) => {
    const formattedPool = formatPoolForSpeech(pool);
    return [
      `Clock is running out... and ${formattedPool} naira is still unclaimed!`,
      `Time is ticking! That ${formattedPool} naira could be yours!`,
      `We're in danger mode now... ${formattedPool} naira waiting for a winner!`,
      `Last stretch! Someone is about to walk away with ${formattedPool} naira!`,
    ];
  },
  leader_prize: (name: string, pool: number) => {
    const formattedPool = formatPoolForSpeech(pool);
    return [
      `${name} is now holding onto ${formattedPool} naira! Can they keep it?`,
      `New leader! ${name} has their eyes on that ${formattedPool} naira!`,
      `${name} just took control of ${formattedPool} naira!`,
    ];
  },
  sponsored: (pool: number, sponsoredAmount: number) => {
    const formattedSponsored = formatPoolForSpeech(sponsoredAmount);
    return [
      `This one is sponsored! ${formattedSponsored} naira... FREE ENTRY, REAL MONEY!`,
      `Sponsored game alert! Someone is getting ${formattedSponsored} naira for FREE!`,
      `No entry fee on this one... but the prize is REAL! ${formattedSponsored} naira!`,
    ];
  },
  silence_breaker: (pool: number) => {
    const formattedPool = formatPoolForSpeech(pool);
    return [
      `It's quiet in here... but ${formattedPool} naira is still up for grabs!`,
      `Hello? Is anyone going to fight for this ${formattedPool} naira?`,
      `${formattedPool} naira just sitting there... who wants it?!`,
    ];
  },
  late_game: (pool: number, leader: string | null) => {
    const formattedPool = formatPoolForSpeech(pool);
    return leader ? [
      `${leader} is this close to ${formattedPool} naira... will someone stop them?`,
      `${formattedPool} naira is about to go to ${leader}!`,
      `Someone better act fast... ${leader} is running away with ${formattedPool} naira!`,
    ] : [
      `${formattedPool} naira is waiting for a name!`,
      `Someone is about to claim ${formattedPool} naira!`,
      `The prize is right there... ${formattedPool} naira for the taking!`,
    ];
  },
};

// Get prize callout phrases based on host
const getPrizeCalloutPhrases = (_hostId: string) => {
  return DEFAULT_PRIZE_CALLOUT_PHRASES;
};

// Default game-aware phrases (used by Crusader and Mark)
const DEFAULT_GAME_PHRASES = {
  welcome: (participants: number, pool: number) => [
    `Welcome to the arena! We've got ${participants} players fighting for ${formatPoolForSpeech(pool)} naira! Let's get it!`,
    `${participants} legends in the building! ${formatPoolForSpeech(pool)} naira on the line! This is gonna be EPIC!`,
    `${participants} players, ${formatPoolForSpeech(pool)} naira prize pool! Let the battle begin!`,
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
    `GAME OVER! ${winner} takes home ${formatPoolForSpeech(prize)} naira! What a BATTLE!`,
    `AND THAT'S A WRAP! ${winner} is our champion with ${formatPoolForSpeech(prize)} naira!`,
    `The dust has settled! ${winner} claims victory and ${formatPoolForSpeech(prize)} naira!`,
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

// Get game phrases based on host
const getGamePhrases = (_hostId: string) => {
  return DEFAULT_GAME_PHRASES;
};

export const useCrusaderHost = () => {
  const { settings } = useAudio();
  const { selectedHost } = usePlatformSettings();
  const [isEnabled, setIsEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [lastPhrase, setLastPhrase] = useState('');
  
  // Get the current host configuration
  const currentHost = getHostById(selectedHost);
  const enabledRef = useRef(true);
  const lastAnnouncementRef = useRef<number>(0);
  const minIntervalRef = useRef(3000); // Minimum 3 seconds between announcements
  const audioQueueRef = useRef<HTMLAudioElement[]>([]);
  const isPlayingRef = useRef(false);
  
  // Prize callout tracking refs
  const lastPrizeCalloutRef = useRef<number>(0);
  const prizeCalloutCountRef = useRef<number>(0);
  const lastMilestoneRef = useRef<number>(0);
  const lastPrizeCalloutTypeRef = useRef<string>('');
  const dangerModeAnnouncedRef = useRef<boolean>(false);
  
  // Minimum interval between prize callouts (45 seconds)
  const PRIZE_CALLOUT_MIN_INTERVAL = 45000;
  // Maximum prize callouts per game
  const MAX_PRIZE_CALLOUTS_PER_GAME = 8;
  
  const gameStateRef = useRef<GameState>({
    timer: 60,
    gameTimeRemaining: 20 * 60,
    leader: null,
    participantCount: 0,
    poolValue: 0,
    sponsoredAmount: 0,
    isSponsored: false,
    entryFee: 0,
    isLive: false,
    commentCount: 0,
    chatIntensity: 'low',
  });

  useEffect(() => {
    enabledRef.current = settings.commentaryEnabled && isEnabled;
  }, [settings.commentaryEnabled, isEnabled]);

  // Calculate chat intensity based on comment velocity
  const calculateChatIntensity = useCallback((commentCount: number): 'low' | 'medium' | 'high' => {
    // This is a simplified calculation - in reality you'd track velocity
    if (commentCount > 50) return 'high';
    if (commentCount > 20) return 'medium';
    return 'low';
  }, []);

  // Update game state
  const updateGameState = useCallback((state: Partial<GameState>) => {
    const newState = { ...gameStateRef.current, ...state };
    
    // Auto-calculate chat intensity
    if (state.commentCount !== undefined) {
      newState.chatIntensity = calculateChatIntensity(state.commentCount);
    }
    
    gameStateRef.current = newState;
  }, [calculateChatIntensity]);

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

  // Generate TTS using ElevenLabs with the selected host's voice
  const speak = useCallback(async (text: string) => {
    if (!enabledRef.current) return;
    
    const now = Date.now();
    if (now - lastAnnouncementRef.current < minIntervalRef.current) return;
    lastAnnouncementRef.current = now;

    setLastPhrase(text);
    console.log(`[${currentHost.name}]:`, text);

    try {
      const { data, error } = await supabase.functions.invoke('crusader-tts', {
        body: { text, voiceId: currentHost.voiceId },
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
  }, [queueAudio, currentHost]);

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

  // Check if prize callout is allowed (anti-spam)
  const canCalloutPrize = useCallback((type: string): boolean => {
    const now = Date.now();
    const state = gameStateRef.current;
    
    // Check max callouts
    if (prizeCalloutCountRef.current >= MAX_PRIZE_CALLOUTS_PER_GAME) {
      return false;
    }
    
    // Check interval (except for milestones which are event-driven)
    if (type !== 'milestone' && now - lastPrizeCalloutRef.current < PRIZE_CALLOUT_MIN_INTERVAL) {
      return false;
    }
    
    // Don't callout if chat is very intense (let the action speak)
    if (state.chatIntensity === 'high' && type !== 'milestone' && type !== 'danger_mode') {
      return false;
    }
    
    // Avoid repeating the same type consecutively
    if (type === lastPrizeCalloutTypeRef.current && type !== 'danger_mode') {
      return false;
    }
    
    return true;
  }, []);

  // Record a prize callout
  const recordPrizeCallout = useCallback((type: string) => {
    lastPrizeCalloutRef.current = Date.now();
    prizeCalloutCountRef.current += 1;
    lastPrizeCalloutTypeRef.current = type;
  }, []);

  // Strategic prize callout function
  const calloutPrize = useCallback((
    reason: 'milestone' | 'danger_mode' | 'leader_change' | 'silence_breaker' | 'reminder' | 'sponsored' | 'late_game'
  ) => {
    if (!canCalloutPrize(reason)) return;
    
    const state = gameStateRef.current;
    const { poolValue, isSponsored, sponsoredAmount, leader, participantCount, entryFee } = state;
    
    // Get host-specific phrases
    const PRIZE_PHRASES = getPrizeCalloutPhrases(currentHost.id);
    
    // Adapt intensity based on game size
    const isSmallGame = participantCount < 10;
    
    let phrases: string[] = [];
    
    switch (reason) {
      case 'milestone':
        phrases = PRIZE_PHRASES.milestone(poolValue, isSponsored);
        break;
        
      case 'danger_mode':
        phrases = PRIZE_PHRASES.danger_mode(poolValue);
        break;
        
      case 'leader_change':
        if (leader) {
          phrases = PRIZE_PHRASES.leader_prize(leader, poolValue);
        }
        break;
        
      case 'silence_breaker':
        phrases = PRIZE_PHRASES.silence_breaker(poolValue);
        break;
        
      case 'sponsored':
        if (isSponsored) {
          phrases = PRIZE_PHRASES.sponsored(poolValue, sponsoredAmount || poolValue);
        }
        break;
        
      case 'late_game':
        phrases = PRIZE_PHRASES.late_game(poolValue, leader);
        break;
        
      case 'reminder':
      default:
        // Alternate between specific and vague mentions for variety
        if (Math.random() > 0.4) {
          phrases = PRIZE_PHRASES.value_highlight(poolValue, isSponsored);
        } else {
          phrases = PRIZE_PHRASES.value_vague();
        }
        break;
    }
    
    // For small games, tone down the hype
    if (isSmallGame && reason !== 'milestone') {
      // Use vague phrases more often for small games
      if (Math.random() > 0.3) {
        phrases = PRIZE_PHRASES.value_vague();
      }
    }
    
    if (phrases.length > 0) {
      speak(getRandomPhrase(phrases));
      recordPrizeCallout(reason);
    }
  }, [canCalloutPrize, recordPrizeCallout, speak, currentHost.id]);

  // Check for prize milestones
  const checkPrizeMilestone = useCallback((newPoolValue: number) => {
    const crossedMilestone = PRIZE_MILESTONES.find(
      milestone => newPoolValue >= milestone && lastMilestoneRef.current < milestone
    );
    
    if (crossedMilestone) {
      lastMilestoneRef.current = crossedMilestone;
      calloutPrize('milestone');
    }
  }, [calloutPrize]);

  // Check for danger mode entry (last 5 minutes)
  const checkDangerMode = useCallback((gameTimeRemaining: number) => {
    const isDangerMode = gameTimeRemaining <= 5 * 60 && gameTimeRemaining > 0;
    
    if (isDangerMode && !dangerModeAnnouncedRef.current) {
      dangerModeAnnouncedRef.current = true;
      // Slight delay to avoid overlap with other announcements
      setTimeout(() => calloutPrize('danger_mode'), 2000);
    }
  }, [calloutPrize]);

  // Game-aware announcements
  const welcomeToArena = useCallback(() => {
    const { participantCount, poolValue } = gameStateRef.current;
    const PHRASES = getGamePhrases(currentHost.id);
    const phrases = PHRASES.welcome(participantCount, poolValue);
    speak(getRandomPhrase(phrases));
  }, [speak, currentHost.id]);

  const announceGameStart = useCallback(() => {
    const { participantCount, isSponsored } = gameStateRef.current;
    const PHRASES = getGamePhrases(currentHost.id);
    const phrases = PHRASES.game_start(participantCount);
    speak(getRandomPhrase(phrases));
    
    // Reset prize callout tracking for new game
    prizeCalloutCountRef.current = 0;
    lastPrizeCalloutRef.current = 0;
    lastMilestoneRef.current = 0;
    dangerModeAnnouncedRef.current = false;
    
    // If sponsored, announce it shortly after start
    if (isSponsored) {
      setTimeout(() => calloutPrize('sponsored'), 5000);
    }
  }, [speak, calloutPrize, currentHost.id]);

  const announceLeaderChange = useCallback((leaderName: string) => {
    const { timer, poolValue, participantCount } = gameStateRef.current;
    const PHRASES = getGamePhrases(currentHost.id);
    const phrases = PHRASES.leader_change(leaderName, timer);
    speak(getRandomPhrase(phrases));
    
    // Occasionally add prize context to leader changes (20% chance for large pools)
    const isLargePool = poolValue >= 20000;
    const isLateGame = timer <= 30;
    
    if (isLargePool && isLateGame && Math.random() < 0.3 && participantCount >= 10) {
      setTimeout(() => calloutPrize('leader_change'), 3000);
    }
  }, [speak, calloutPrize, currentHost.id]);

  const announceTimerLow = useCallback((seconds: number) => {
    const { leader, commentCount, gameTimeRemaining } = gameStateRef.current;
    const PHRASES = getGamePhrases(currentHost.id);
    
    // Check danger mode when timer warnings happen
    checkDangerMode(gameTimeRemaining);
    
    let phrases: string[] = [];
    
    if (seconds === 60) {
      phrases = PHRASES.timer_60(leader);
    } else if (seconds === 30) {
      phrases = PHRASES.timer_30(leader, commentCount);
    } else if (seconds === 15) {
      phrases = PHRASES.timer_15(leader);
    } else if (seconds === 10) {
      phrases = PHRASES.timer_10(leader);
      // Late game pressure callout
      if (Math.random() < 0.4) {
        setTimeout(() => calloutPrize('late_game'), 2000);
      }
    } else if (seconds === 5) {
      phrases = PHRASES.timer_5();
    }
    
    if (phrases.length > 0) {
      speak(getRandomPhrase(phrases));
    }
  }, [speak, checkDangerMode, calloutPrize, currentHost.id]);

  const announceCloseCall = useCallback((playerName?: string) => {
    const { leader } = gameStateRef.current;
    const PHRASES = getGamePhrases(currentHost.id);
    const name = playerName || leader || 'Someone';
    const phrases = PHRASES.close_call(name);
    speak(getRandomPhrase(phrases));
  }, [speak, currentHost.id]);

  const announceGameOver = useCallback((winnerName?: string, prize?: number) => {
    const { leader, poolValue } = gameStateRef.current;
    const PHRASES = getGamePhrases(currentHost.id);
    const winner = winnerName || leader || 'The champion';
    const prizeAmount = prize || Math.floor(poolValue * 0.5);
    const phrases = PHRASES.game_over(winner, prizeAmount);
    speak(getRandomPhrase(phrases));
  }, [speak, currentHost.id]);

  const randomHype = useCallback(() => {
    const { participantCount, commentCount, chatIntensity, poolValue } = gameStateRef.current;
    const PHRASES = getGamePhrases(currentHost.id);
    
    // If game is quiet, sometimes use silence breaker with prize mention
    if (commentCount < 5 && gameStateRef.current.isLive) {
      // 30% chance to use prize-focused silence breaker
      if (Math.random() < 0.3 && poolValue > 0) {
        calloutPrize('silence_breaker');
      } else {
        const phrases = PHRASES.quiet_game();
        speak(getRandomPhrase(phrases));
      }
    } else {
      // Regular hype, occasionally with prize reminder
      if (chatIntensity !== 'high' && Math.random() < 0.15 && poolValue >= 10000) {
        calloutPrize('reminder');
      } else {
        const phrases = PHRASES.hype(participantCount, commentCount);
        speak(getRandomPhrase(phrases));
      }
    }
  }, [speak, calloutPrize, currentHost.id]);

  const announceWinners = useCallback((winners: Array<{ name: string; position: number; prize: number }>) => {
    if (winners.length === 0) return;
    
    // Announce in sequence with delays
    winners.forEach((winner, index) => {
      setTimeout(() => {
        const positionText = winner.position === 1 ? 'first place' : 
                            winner.position === 2 ? 'second place' : 'third place';
        speak(`${positionText} goes to ${winner.name} with ${formatPoolForSpeech(winner.prize)} naira!`);
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
    currentHost,
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
    calloutPrize,
    checkPrizeMilestone,
    checkDangerMode,
    speak,
    stopSpeaking,
  };
};
