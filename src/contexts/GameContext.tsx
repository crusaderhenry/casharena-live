import React, { createContext, useContext, useState, useCallback } from 'react';

export interface Player {
  id: string;
  name: string;
  avatar: string;
  isSpeaking?: boolean;
}

export interface Comment {
  id: string;
  playerId: string;
  playerName: string;
  playerAvatar: string;
  text: string;
  timestamp: Date;
}

export interface ActivityItem {
  id: string;
  type: 'finger_win' | 'pool_win' | 'pool_join' | 'rank_up';
  playerName: string;
  playerAvatar: string;
  amount?: number;
  position?: number;
  timestamp: Date;
}

interface GameContextType {
  // Finger game state
  fingerPlayers: Player[];
  fingerComments: Comment[];
  fingerPoolValue: number;
  fingerGameActive: boolean;
  hasJoinedFinger: boolean;
  fingerPosition: number | null;
  addFingerPlayer: (player: Player) => void;
  addFingerComment: (comment: Comment) => void;
  setFingerPoolValue: (value: number) => void;
  setFingerGameActive: (active: boolean) => void;
  joinFinger: () => void;
  setFingerPosition: (position: number) => void;
  resetFingerGame: () => void;
  
  // Pool game state
  poolParticipants: Player[];
  poolValue: number;
  hasJoinedPool: boolean;
  addPoolParticipant: (player: Player) => void;
  setPoolValue: (value: number) => void;
  joinPool: () => void;
  resetPoolGame: () => void;
  
  // Activity feed
  recentActivity: ActivityItem[];
  addActivity: (activity: Omit<ActivityItem, 'id' | 'timestamp'>) => void;
  
  // Test mode
  isTestMode: boolean;
  setTestMode: (active: boolean) => void;
  
  // User profile
  userProfile: {
    username: string;
    avatar: string;
    rank: number;
    gamesPlayed: number;
    wins: number;
    totalEarnings: number;
  };
  updateProfile: (updates: Partial<GameContextType['userProfile']>) => void;
}

export const mockPlayers: Player[] = [
  { id: '1', name: 'CryptoKing', avatar: '👑' },
  { id: '2', name: 'LuckyAce', avatar: '🎰' },
  { id: '3', name: 'FastHands', avatar: '⚡' },
  { id: '4', name: 'GoldRush', avatar: '💰' },
  { id: '5', name: 'NightOwl', avatar: '🦉' },
  { id: '6', name: 'StarPlayer', avatar: '⭐' },
  { id: '7', name: 'DiamondPro', avatar: '💎' },
  { id: '8', name: 'ThunderBolt', avatar: '🌩️' },
  { id: '9', name: 'SilverFox', avatar: '🦊' },
  { id: '10', name: 'MoonRider', avatar: '🌙' },
];

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Finger game
  const [fingerPlayers, setFingerPlayers] = useState<Player[]>([]);
  const [fingerComments, setFingerComments] = useState<Comment[]>([]);
  const [fingerPoolValue, setFingerPoolValueState] = useState(35000);
  const [fingerGameActive, setFingerGameActiveState] = useState(false);
  const [hasJoinedFinger, setHasJoinedFinger] = useState(false);
  const [fingerPosition, setFingerPositionState] = useState<number | null>(null);
  
  // Pool game
  const [poolParticipants, setPoolParticipants] = useState<Player[]>([]);
  const [poolValue, setPoolValueState] = useState(250000);
  const [hasJoinedPool, setHasJoinedPool] = useState(false);
  
  // Activity
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([
    {
      id: '1',
      type: 'finger_win',
      playerName: 'CryptoKing',
      playerAvatar: '👑',
      amount: 15750,
      position: 1,
      timestamp: new Date(Date.now() - 300000),
    },
    {
      id: '2',
      type: 'pool_join',
      playerName: 'LuckyAce',
      playerAvatar: '🎰',
      timestamp: new Date(Date.now() - 600000),
    },
    {
      id: '3',
      type: 'rank_up',
      playerName: 'FastHands',
      playerAvatar: '⚡',
      position: 5,
      timestamp: new Date(Date.now() - 900000),
    },
  ]);
  
  // Test mode
  const [isTestMode, setTestMode] = useState(false);
  
  // User profile
  const [userProfile, setUserProfile] = useState({
    username: 'Player1',
    avatar: '🎮',
    rank: 42,
    gamesPlayed: 15,
    wins: 3,
    totalEarnings: 25000,
  });
  
  // Finger actions
  const addFingerPlayer = useCallback((player: Player) => {
    setFingerPlayers(prev => [...prev, player]);
    setFingerPoolValueState(prev => prev + 700);
  }, []);
  
  const addFingerComment = useCallback((comment: Comment) => {
    setFingerComments(prev => [comment, ...prev].slice(0, 50));
  }, []);

  const setFingerPoolValue = useCallback((value: number) => {
    setFingerPoolValueState(value);
  }, []);

  const setFingerGameActive = useCallback((active: boolean) => {
    setFingerGameActiveState(active);
  }, []);

  const joinFinger = useCallback(() => {
    setHasJoinedFinger(true);
  }, []);

  const setFingerPosition = useCallback((position: number) => {
    setFingerPositionState(position);
  }, []);
  
  const resetFingerGame = useCallback(() => {
    setFingerPlayers([]);
    setFingerComments([]);
    setFingerPoolValueState(35000);
    setFingerGameActiveState(false);
    setHasJoinedFinger(false);
    setFingerPositionState(null);
  }, []);
  
  // Pool actions
  const addPoolParticipant = useCallback((player: Player) => {
    setPoolParticipants(prev => [...prev, player]);
    setPoolValueState(prev => prev + 1000);
  }, []);

  const setPoolValue = useCallback((value: number) => {
    setPoolValueState(value);
  }, []);

  const joinPool = useCallback(() => {
    setHasJoinedPool(true);
  }, []);
  
  const resetPoolGame = useCallback(() => {
    setPoolParticipants([]);
    setPoolValueState(250000);
    setHasJoinedPool(false);
  }, []);
  
  // Activity actions
  const addActivity = useCallback((activity: Omit<ActivityItem, 'id' | 'timestamp'>) => {
    const newActivity: ActivityItem = {
      ...activity,
      id: `act_${Date.now()}`,
      timestamp: new Date(),
    };
    setRecentActivity(prev => [newActivity, ...prev].slice(0, 10));
  }, []);

  // Profile actions
  const updateProfile = useCallback((updates: Partial<GameContextType['userProfile']>) => {
    setUserProfile(prev => ({ ...prev, ...updates }));
  }, []);

  return (
    <GameContext.Provider value={{
      fingerPlayers,
      fingerComments,
      fingerPoolValue,
      fingerGameActive,
      hasJoinedFinger,
      fingerPosition,
      addFingerPlayer,
      addFingerComment,
      setFingerPoolValue,
      setFingerGameActive,
      joinFinger,
      setFingerPosition,
      resetFingerGame,
      poolParticipants,
      poolValue,
      hasJoinedPool,
      addPoolParticipant,
      setPoolValue,
      joinPool,
      resetPoolGame,
      recentActivity,
      addActivity,
      isTestMode,
      setTestMode,
      userProfile,
      updateProfile,
    }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};
