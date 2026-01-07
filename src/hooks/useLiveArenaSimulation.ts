import { useState, useEffect, useRef, useCallback } from 'react';

interface SimulatedComment {
  id: string;
  cycle_id: string;
  user_id: string;
  content: string;
  server_timestamp: string;
  username: string;
  avatar: string;
}

interface SimulatedVoiceParticipant {
  user_id: string;
  username: string;
  avatar: string;
  is_speaking: boolean;
  is_muted: boolean;
}

// 100 mock players with diverse Nigerian/crypto/gaming themed names
const MOCK_PLAYERS = [
  { username: 'FastFingers', avatar: '🖐️' },
  { username: 'QuickDraw', avatar: '🔥' },
  { username: 'TypeMaster', avatar: '⌨️' },
  { username: 'RapidRex', avatar: '🦖' },
  { username: 'SwiftStar', avatar: '⭐' },
  { username: 'BlazeRunner', avatar: '🔥' },
  { username: 'NimbleNinja', avatar: '🥷' },
  { username: 'FlashTyper', avatar: '💨' },
  { username: 'ThunderThumb', avatar: '👍' },
  { username: 'SilentStrike', avatar: '🎯' },
  { username: 'VelocityVic', avatar: '🚀' },
  { username: 'TurboTypist', avatar: '💪' },
  { username: 'AcePlayer', avatar: '🃏' },
  { username: 'SpeedKing', avatar: '⚡' },
  { username: 'LuckyCharm', avatar: '🍀' },
  { username: 'WarriorTapper', avatar: '🦁' },
  { username: 'AnonLord', avatar: '🔱' },
  { username: 'FastKing301', avatar: '🎲' },
  { username: 'ObiChief', avatar: '🦁' },
  { username: 'KolaGirl770', avatar: '💪' },
  { username: 'QuickTapper', avatar: '🏆' },
  { username: 'SolLegend', avatar: '💪' },
  { username: 'SwiftHunter', avatar: '⚔️' },
  { username: 'FirePro767', avatar: '🐯' },
  { username: 'DarkTapper', avatar: '⚡' },
  { username: 'TokenKing', avatar: '☀️' },
  { username: 'NnamdiBaller', avatar: '🐯' },
  { username: 'RapidFingers', avatar: '🚀' },
  { username: 'FunkeOga', avatar: '🦅' },
  { username: 'RektChad', avatar: '💫' },
  { username: 'FastPro', avatar: '🐯' },
  { username: 'NGMIQueen', avatar: '💫' },
  { username: 'TurboBeast', avatar: '🦁' },
  { username: 'SwiftHands', avatar: '💰' },
  { username: 'AdeDon214', avatar: '🦁' },
  { username: 'SatoshiTrader', avatar: '☀️' },
  { username: 'IceKing', avatar: '🦈' },
  { username: 'QuickBeast', avatar: '🎮' },
  { username: 'ObinnaMaster', avatar: '🌟' },
  { username: 'AnonTrader', avatar: '🦁' },
  { username: 'DragonLegend', avatar: '🚀' },
  { username: 'LightMaster', avatar: '💪' },
  { username: 'MetaApe', avatar: '✨' },
  { username: 'IkennaOga', avatar: '🎲' },
  { username: 'EmekaPro', avatar: '🦁' },
  { username: 'LolaFlash', avatar: '🎪' },
  { username: 'BullSlayer', avatar: '🦊' },
  { username: 'BolaQueen', avatar: '🎮' },
  { username: 'KolaKing', avatar: '🧿' },
  { username: 'WhaleHunter', avatar: '🔱' },
  { username: 'NnekaPro', avatar: '🐯' },
  { username: 'YemiLegend', avatar: '⚔️' },
  { username: 'Web3Trader', avatar: '🌟' },
  { username: 'SpeedClicker', avatar: '🌙' },
  { username: 'Web3Bull', avatar: '💰' },
  { username: 'MetaBoss', avatar: '🔱' },
  { username: 'SamuraiSlayer', avatar: '🔱' },
  { username: 'KunleFlash', avatar: '🎲' },
  { username: 'ChainKing', avatar: '🌟' },
  { username: 'LightChamp', avatar: '🐉' },
  { username: 'ChainDegen', avatar: '🎪' },
  { username: 'CryptoKing', avatar: '👑' },
  { username: 'LuckyAce', avatar: '🎰' },
  { username: 'FastHands', avatar: '⚡' },
  { username: 'GoldRush', avatar: '💰' },
  { username: 'NightOwl', avatar: '🦉' },
  { username: 'StarPlayer', avatar: '⭐' },
  { username: 'DiamondPro', avatar: '💎' },
  { username: 'ThunderBolt', avatar: '🌩️' },
  { username: 'SilverFox', avatar: '🦊' },
  { username: 'MoonRider', avatar: '🌙' },
  { username: 'FireStorm', avatar: '🔥' },
  { username: 'IceQueen', avatar: '❄️' },
  { username: 'ShadowNinja', avatar: '🥷' },
  { username: 'RocketMan', avatar: '🚀' },
  { username: 'GoldenEagle', avatar: '🦅' },
  { username: 'BlueWave', avatar: '🌊' },
  { username: 'RedPhoenix', avatar: '🐦‍🔥' },
  { username: 'GreenLantern', avatar: '💚' },
  { username: 'PurpleHaze', avatar: '💜' },
  { username: 'OrangeBlaze', avatar: '🧡' },
  { username: 'ChiNaija', avatar: '🇳🇬' },
  { username: 'LagosBoss', avatar: '🏙️' },
  { username: 'AbujaPrince', avatar: '👑' },
  { username: 'WarriKing', avatar: '⚡' },
  { username: 'EkoMaster', avatar: '🎯' },
  { username: 'NaijaHustler', avatar: '💵' },
  { username: 'DeltaFlash', avatar: '⚡' },
  { username: 'IbadanBeast', avatar: '🦁' },
  { username: 'KanoKiller', avatar: '🔥' },
  { username: 'PHTycoon', avatar: '💎' },
  { username: 'EdomBaller', avatar: '🏆' },
  { username: 'CrossGod', avatar: '✝️' },
  { username: 'RiversDon', avatar: '🌊' },
  { username: 'OyoChief', avatar: '👑' },
  { username: 'OgunWarrior', avatar: '⚔️' },
  { username: 'OsunQueen', avatar: '👸' },
  { username: 'KogiKing', avatar: '🤴' },
  { username: 'BenueLion', avatar: '🦁' },
  { username: 'PlateauPro', avatar: '⛰️' },
];

const MOCK_COMMENTS = [
  "Let's go!", "I'm winning this!", "Rumble time!", "Too fast for you!",
  "Come on come on!", "Winner here!", "Speed demon!", "Taking the lead!",
  "Focus focus!", "Alert alert!", "Lightning fast!", "On fire!",
  "Can't stop me!", "Final push!", "Ez clap!", "No chance for you!",
  "I need this W!", "Hands ready!", "Coming through!", "Watch out!",
  "Champion moves!", "🔥🔥🔥", "💪 Let's get it!", "👀 Eyes on the prize",
  "⚡ Lightning fast", "🏆 Victory incoming", "Clutch time!", "Now now now!",
  "Type faster!", "On fire today!", "Send it!", "Go go go!",
  "Here we go!", "Pay attention!", "Winner winner!", "Taking over!",
  "My moment!", "Stay sharp!", "Keep typing!", "Last one standing!",
  "Who's next?!", "Catch me if you can!", "Top 3 loading...", "Prize is mine!",
  "Fastest finger!", "Still here!", "Not giving up!", "Watch the timer!",
  "Close one!", "Almost got it!", "Keep it up!", "Don't stop!",
];

export const useLiveArenaSimulation = (
  isEnabled: boolean,
  cycleId: string | null,
  realUserId?: string,
  realUserProfile?: { username: string; avatar: string }
) => {
  const [simulatedComments, setSimulatedComments] = useState<SimulatedComment[]>([]);
  const [voiceParticipants, setVoiceParticipants] = useState<SimulatedVoiceParticipant[]>([]);
  const [countdown, setCountdown] = useState(60);
  const [winnerSelected, setWinnerSelected] = useState(false);
  const [winner, setWinner] = useState<SimulatedComment | null>(null);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const voiceIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const commentIdRef = useRef(0);
  const activePlayersRef = useRef<typeof MOCK_PLAYERS>([]);

  // Initialize 100 players for simulation
  useEffect(() => {
    if (!isEnabled || !cycleId) {
      setSimulatedComments([]);
      setVoiceParticipants([]);
      activePlayersRef.current = [];
      return;
    }

    // Use all 100 players
    activePlayersRef.current = [...MOCK_PLAYERS];
    
    // Initialize 50 voice participants
    const voiceUsers = MOCK_PLAYERS.slice(0, 50).map((p, i) => ({
      user_id: `mock-voice-${i}`,
      username: p.username,
      avatar: p.avatar,
      is_speaking: false,
      is_muted: Math.random() > 0.8, // 20% muted
    }));
    setVoiceParticipants(voiceUsers);
    
    // Add initial comments from various players
    const initialComments: SimulatedComment[] = [];
    for (let i = 0; i < 10; i++) {
      const player = MOCK_PLAYERS[Math.floor(Math.random() * MOCK_PLAYERS.length)];
      const content = MOCK_COMMENTS[Math.floor(Math.random() * MOCK_COMMENTS.length)];
      commentIdRef.current += 1;
      
      initialComments.push({
        id: `sim-${Date.now()}-${commentIdRef.current}`,
        cycle_id: cycleId,
        user_id: `mock-${player.username}`,
        content,
        server_timestamp: new Date(Date.now() - (10 - i) * 2000).toISOString(),
        username: player.username,
        avatar: player.avatar,
      });
    }
    setSimulatedComments(initialComments);
  }, [isEnabled, cycleId]);

  // Simulate rapid comments from 100 players
  useEffect(() => {
    if (!isEnabled || !cycleId) {
      if (intervalRef.current) clearTimeout(intervalRef.current);
      return;
    }

    const addComment = () => {
      if (winnerSelected) return;
      
      const player = MOCK_PLAYERS[Math.floor(Math.random() * MOCK_PLAYERS.length)];
      const content = MOCK_COMMENTS[Math.floor(Math.random() * MOCK_COMMENTS.length)];
      commentIdRef.current += 1;

      const newComment: SimulatedComment = {
        id: `sim-${Date.now()}-${commentIdRef.current}`,
        cycle_id: cycleId,
        user_id: `mock-${player.username}`,
        content,
        server_timestamp: new Date().toISOString(),
        username: player.username,
        avatar: player.avatar,
      };

      setSimulatedComments(prev => [newComment, ...prev].slice(0, 100));
      setCountdown(60); // Reset countdown on comment

      // Schedule next comment (0.5-2 seconds for intense action)
      intervalRef.current = setTimeout(addComment, 500 + Math.random() * 1500);
    };

    intervalRef.current = setTimeout(addComment, 1000);

    return () => {
      if (intervalRef.current) clearTimeout(intervalRef.current);
    };
  }, [isEnabled, cycleId, winnerSelected]);

  // Simulate voice activity
  useEffect(() => {
    if (!isEnabled || voiceParticipants.length === 0) {
      if (voiceIntervalRef.current) clearInterval(voiceIntervalRef.current);
      return;
    }

    voiceIntervalRef.current = setInterval(() => {
      setVoiceParticipants(prev => {
        const available = prev.filter(p => !p.is_muted);
        if (available.length === 0) return prev;

        // 3-6 people speaking at once for chaotic energy
        const numSpeaking = 3 + Math.floor(Math.random() * 4);
        const speakerIds = new Set<string>();

        for (let i = 0; i < numSpeaking; i++) {
          const speaker = available[Math.floor(Math.random() * available.length)];
          if (speaker) speakerIds.add(speaker.user_id);
        }

        return prev.map(p => ({
          ...p,
          is_speaking: speakerIds.has(p.user_id),
        }));
      });
    }, 600 + Math.random() * 800);

    return () => {
      if (voiceIntervalRef.current) clearInterval(voiceIntervalRef.current);
    };
  }, [isEnabled, voiceParticipants.length]);

  // Countdown simulation
  useEffect(() => {
    if (!isEnabled) {
      if (countdownRef.current) clearInterval(countdownRef.current);
      return;
    }

    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1 && !winnerSelected) {
          // Time's up - select winner
          setWinnerSelected(true);
          const lastComment = simulatedComments[0];
          if (lastComment) setWinner(lastComment);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [isEnabled, winnerSelected, simulatedComments]);

  // Add user's own comment
  const addUserComment = useCallback((content: string) => {
    if (!cycleId || !realUserId) return;

    commentIdRef.current += 1;
    const newComment: SimulatedComment = {
      id: `user-${Date.now()}-${commentIdRef.current}`,
      cycle_id: cycleId,
      user_id: realUserId,
      content,
      server_timestamp: new Date().toISOString(),
      username: realUserProfile?.username || 'You',
      avatar: realUserProfile?.avatar || '🎮',
    };

    setSimulatedComments(prev => [newComment, ...prev].slice(0, 100));
    setCountdown(60);
  }, [cycleId, realUserId, realUserProfile]);

  // Get ordered commenters (for leaderboard)
  const getOrderedCommenters = useCallback(() => {
    const seen = new Set<string>();
    const ordered: SimulatedComment[] = [];

    for (const comment of simulatedComments) {
      if (!seen.has(comment.user_id)) {
        seen.add(comment.user_id);
        ordered.push(comment);
      }
    }

    return ordered;
  }, [simulatedComments]);

  // Trigger winner scenario (mock user wins)
  const triggerMockWinner = useCallback(() => {
    setWinnerSelected(true);
    // Get a random mock user as winner (not the real user)
    const mockComments = simulatedComments.filter(c => c.user_id !== realUserId);
    if (mockComments.length > 0) {
      setWinner(mockComments[0]);
    }
  }, [simulatedComments, realUserId]);

  return {
    simulatedComments,
    voiceParticipants,
    countdown,
    winnerSelected,
    winner,
    addUserComment,
    getOrderedCommenters,
    triggerMockWinner,
    participantCount: 101, // 100 mock + 1 real user
  };
};
