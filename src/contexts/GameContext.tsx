import React, { createContext, useContext, useState, useCallback } from 'react';

interface GameContextType {
  // Onboarding
  hasCompletedOnboarding: boolean;
  playStyle: string | null;
  completeOnboarding: () => void;
  setPlayStyle: (style: string) => void;
  
  // Arena
  arenaScore: number;
  arenaRank: number;
  hasJoinedArena: boolean;
  joinArena: () => void;
  submitArenaScore: (score: number) => void;
  
  // Streak
  currentStreak: number;
  streakCompleted: boolean;
  hasJoinedStreak: boolean;
  joinStreak: () => void;
  completeStreakTask: () => void;
  breakStreak: () => void;
  
  // Pool
  poolOdds: number;
  hasJoinedPool: boolean;
  joinPool: () => void;
  drawPool: () => { winner: boolean; amount: number };
  
  // Fastest Finger
  hasJoinedFinger: boolean;
  fingerPosition: number | null;
  joinFinger: () => void;
  setFingerPosition: (position: number) => void;
  resetFinger: () => void;
  
  // Recent Activity
  recentActivity: Array<{ id: string; text: string; type: string; timestamp: Date }>;
  addActivity: (text: string, type: string) => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Onboarding state
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [playStyle, setPlayStyleState] = useState<string | null>(null);
  
  // Arena state
  const [arenaScore, setArenaScore] = useState(0);
  const [arenaRank, setArenaRank] = useState(0);
  const [hasJoinedArena, setHasJoinedArena] = useState(false);
  
  // Streak state
  const [currentStreak, setCurrentStreak] = useState(0);
  const [streakCompleted, setStreakCompleted] = useState(false);
  const [hasJoinedStreak, setHasJoinedStreak] = useState(false);
  
  // Pool state
  const [poolOdds, setPoolOdds] = useState(1);
  const [hasJoinedPool, setHasJoinedPool] = useState(false);
  
  // Fastest Finger state
  const [hasJoinedFinger, setHasJoinedFinger] = useState(false);
  const [fingerPosition, setFingerPositionState] = useState<number | null>(null);
  
  // Recent Activity
  const [recentActivity, setRecentActivity] = useState<Array<{ id: string; text: string; type: string; timestamp: Date }>>([
    { id: '1', text: 'Welcome to CashArena!', type: 'info', timestamp: new Date() },
  ]);

  const completeOnboarding = useCallback(() => {
    setHasCompletedOnboarding(true);
  }, []);

  const setPlayStyle = useCallback((style: string) => {
    setPlayStyleState(style);
  }, []);

  const joinArena = useCallback(() => {
    setHasJoinedArena(true);
  }, []);

  const submitArenaScore = useCallback((score: number) => {
    setArenaScore(score);
    setArenaRank(Math.floor(Math.random() * 10) + 1);
  }, []);

  const joinStreak = useCallback(() => {
    setHasJoinedStreak(true);
    setCurrentStreak(0);
    setStreakCompleted(false);
  }, []);

  const completeStreakTask = useCallback(() => {
    setCurrentStreak(prev => prev + 1);
    setStreakCompleted(true);
  }, []);

  const breakStreak = useCallback(() => {
    setCurrentStreak(0);
    setStreakCompleted(false);
  }, []);

  const joinPool = useCallback(() => {
    setHasJoinedPool(true);
    setPoolOdds(prev => Math.min(prev + 0.5, 5));
  }, []);

  const drawPool = useCallback(() => {
    const isWinner = Math.random() < (poolOdds * 0.1);
    const amount = isWinner ? Math.floor(Math.random() * 50000) + 10000 : 0;
    setHasJoinedPool(false);
    setPoolOdds(1);
    return { winner: isWinner, amount };
  }, [poolOdds]);

  const joinFinger = useCallback(() => {
    setHasJoinedFinger(true);
    setFingerPositionState(null);
  }, []);

  const setFingerPosition = useCallback((position: number) => {
    setFingerPositionState(position);
  }, []);

  const resetFinger = useCallback(() => {
    setHasJoinedFinger(false);
    setFingerPositionState(null);
  }, []);

  const addActivity = useCallback((text: string, type: string) => {
    const newActivity = {
      id: `activity_${Date.now()}`,
      text,
      type,
      timestamp: new Date(),
    };
    setRecentActivity(prev => [newActivity, ...prev.slice(0, 9)]);
  }, []);

  return (
    <GameContext.Provider value={{
      hasCompletedOnboarding,
      playStyle,
      completeOnboarding,
      setPlayStyle,
      arenaScore,
      arenaRank,
      hasJoinedArena,
      joinArena,
      submitArenaScore,
      currentStreak,
      streakCompleted,
      hasJoinedStreak,
      joinStreak,
      completeStreakTask,
      breakStreak,
      poolOdds,
      hasJoinedPool,
      joinPool,
      drawPool,
      hasJoinedFinger,
      fingerPosition,
      joinFinger,
      setFingerPosition,
      resetFinger,
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
