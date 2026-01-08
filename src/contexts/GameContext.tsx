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
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Finger game
  const [fingerPlayers, setFingerPlayers] = useState<Player[]>([]);
  const [fingerComments, setFingerComments] = useState<Comment[]>([]);
  const [fingerPoolValue, setFingerPoolValueState] = useState(0);
  const [fingerGameActive, setFingerGameActiveState] = useState(false);
  const [hasJoinedFinger, setHasJoinedFinger] = useState(false);
  const [fingerPosition, setFingerPositionState] = useState<number | null>(null);
  
  // Pool game
  const [poolParticipants, setPoolParticipants] = useState<Player[]>([]);
  const [poolValue, setPoolValueState] = useState(0);
  const [hasJoinedPool, setHasJoinedPool] = useState(false);
  
  // Activity feed - starts empty, populated from real data
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  
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
    setFingerPoolValueState(0);
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
    setPoolValueState(0);
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
