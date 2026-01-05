import { useState, useEffect, useRef, useCallback } from 'react';

export interface MockComment {
  id: string;
  game_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profile?: {
    username: string;
    avatar: string;
  };
}

export interface MockVoiceParticipant {
  user_id: string;
  username: string;
  avatar: string;
  is_speaking: boolean;
  is_muted: boolean;
}

// Mock player names and avatars for realistic simulation
const MOCK_PLAYERS = [
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
];

// Mock comments that players would send in a real game
const MOCK_COMMENTS = [
  "Last comment wins!",
  "Come on come on!",
  "I'm winning this!",
  "Fastest finger!",
  "Let's go!",
  "Mine mine mine!",
  "Taking the lead!",
  "Too fast for you!",
  "Winner here!",
  "Speed demon!",
  "Ez clap",
  "No chance for you guys",
  "I need this W",
  "Focus focus!",
  "Don't sleep!",
  "Alert alert!",
  "Hands ready!",
  "Coming through!",
  "Watch out!",
  "Champion moves!",
  "🔥🔥🔥",
  "💪 Let's get it!",
  "👀 Eyes on the prize",
  "⚡ Lightning fast",
  "🏆 Victory incoming",
  "Clutch time!",
  "Final push!",
  "Now now now!",
  "Type faster!",
  "Can't stop me!",
  "On fire today!",
  "Send it!",
  "Go go go!",
  "Here we go!",
  "Pay attention!",
  "Winner winner!",
  "Taking over!",
  "My moment!",
  "Stay sharp!",
  "Keep typing!",
];

// Excited voice room reactions
const VOICE_REACTIONS = [
  "Yo that was close!",
  "Oooh nice one!",
  "Come on come on!",
  "HYPE HYPE!",
  "Let's GOOO!",
  "So fast!",
  "WHO GOT IT?",
  "I'm winning this!",
  "No way!",
  "That timing!",
];

export const useMockSimulation = (
  isEnabled: boolean,
  gameId?: string,
  onCommentAdded?: () => void // Callback when a mock comment is added (for timer reset)
) => {
  const [mockComments, setMockComments] = useState<MockComment[]>([]);
  const [mockVoiceParticipants, setMockVoiceParticipants] = useState<MockVoiceParticipant[]>([]);
  const [activeSpeaker, setActiveSpeaker] = useState<string | null>(null);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const voiceIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const commentIdRef = useRef(0);

  // Generate random mock comment
  const generateMockComment = useCallback((): MockComment => {
    const player = MOCK_PLAYERS[Math.floor(Math.random() * MOCK_PLAYERS.length)];
    const content = MOCK_COMMENTS[Math.floor(Math.random() * MOCK_COMMENTS.length)];
    commentIdRef.current += 1;
    
    return {
      id: `mock-${Date.now()}-${commentIdRef.current}`,
      game_id: gameId || 'test-game',
      user_id: `mock-user-${player.username}`,
      content,
      created_at: new Date().toISOString(),
      profile: {
        username: player.username,
        avatar: player.avatar,
      },
    };
  }, [gameId]);

  // Initialize mock voice participants
  useEffect(() => {
    if (!isEnabled) {
      setMockVoiceParticipants([]);
      return;
    }

    // Add 6-12 mock voice participants
    const numParticipants = 6 + Math.floor(Math.random() * 7);
    const shuffled = [...MOCK_PLAYERS].sort(() => Math.random() - 0.5);
    const participants = shuffled.slice(0, numParticipants).map((p, i) => ({
      user_id: `mock-voice-${i}`,
      username: p.username,
      avatar: p.avatar,
      is_speaking: false,
      is_muted: Math.random() > 0.7, // 30% chance of being muted
    }));
    
    setMockVoiceParticipants(participants);
  }, [isEnabled]);

  // Simulate comments streaming in
  useEffect(() => {
    if (!isEnabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setMockComments([]);
      return;
    }

    // Add initial batch of comments
    const initialComments: MockComment[] = [];
    for (let i = 0; i < 5; i++) {
      initialComments.push(generateMockComment());
    }
    setMockComments(initialComments);

    // Add new comments periodically (1-4 seconds randomly)
    const addComment = () => {
      const newComment = generateMockComment();
      setMockComments(prev => [newComment, ...prev].slice(0, 50));
      
      // Notify that a comment was added (so timer can reset)
      if (onCommentAdded) {
        onCommentAdded();
      }
      
      // Schedule next comment with random interval (faster when more intense)
      const nextDelay = 1000 + Math.random() * 3000; // 1-4 seconds
      intervalRef.current = setTimeout(addComment, nextDelay);
    };

    // Start the comment simulation
    intervalRef.current = setTimeout(addComment, 2000);

    return () => {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isEnabled, generateMockComment]);

  // Simulate voice activity (random users speaking)
  useEffect(() => {
    if (!isEnabled || mockVoiceParticipants.length === 0) {
      if (voiceIntervalRef.current) {
        clearInterval(voiceIntervalRef.current);
        voiceIntervalRef.current = null;
      }
      return;
    }

    // Randomly toggle speaking states
    voiceIntervalRef.current = setInterval(() => {
      setMockVoiceParticipants(prev => {
        // Find non-muted participants
        const available = prev.filter(p => !p.is_muted);
        if (available.length === 0) return prev;

        // Pick 0-2 random speakers
        const numSpeaking = Math.floor(Math.random() * 3);
        const speakerIds = new Set<string>();
        
        for (let i = 0; i < numSpeaking; i++) {
          const speaker = available[Math.floor(Math.random() * available.length)];
          if (speaker) speakerIds.add(speaker.user_id);
        }

        // Update active speaker for announcements
        if (speakerIds.size > 0) {
          const speakers = Array.from(speakerIds);
          setActiveSpeaker(speakers[0]);
        } else {
          setActiveSpeaker(null);
        }

        return prev.map(p => ({
          ...p,
          is_speaking: speakerIds.has(p.user_id),
        }));
      });
    }, 800 + Math.random() * 1200); // 0.8-2 seconds

    return () => {
      if (voiceIntervalRef.current) {
        clearInterval(voiceIntervalRef.current);
        voiceIntervalRef.current = null;
      }
    };
  }, [isEnabled, mockVoiceParticipants.length]);

  // Add a burst of comments (for intense moments)
  const triggerCommentBurst = useCallback((count: number = 5) => {
    if (!isEnabled) return;
    
    const burstComments: MockComment[] = [];
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        const newComment = generateMockComment();
        setMockComments(prev => [newComment, ...prev].slice(0, 50));
      }, i * 200); // 200ms apart
    }
  }, [isEnabled, generateMockComment]);

  // Clear all mock data
  const clearMockData = useCallback(() => {
    setMockComments([]);
    setMockVoiceParticipants([]);
    setActiveSpeaker(null);
    if (intervalRef.current) {
      clearTimeout(intervalRef.current);
      intervalRef.current = null;
    }
    if (voiceIntervalRef.current) {
      clearInterval(voiceIntervalRef.current);
      voiceIntervalRef.current = null;
    }
  }, []);

  return {
    mockComments,
    mockVoiceParticipants,
    activeSpeaker,
    triggerCommentBurst,
    clearMockData,
    MOCK_PLAYERS,
    VOICE_REACTIONS,
  };
};
