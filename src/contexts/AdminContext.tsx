import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';

interface MockUser {
  id: string;
  username: string;
  avatar: string;
  balance: number;
  gamesPlayed: number;
  wins: number;
  rank: number;
  rankPoints: number;
  status: 'active' | 'suspended' | 'flagged';
  joinedAt: string;
}

interface MockTransaction {
  id: string;
  type: 'entry' | 'win' | 'platform_cut' | 'payout';
  userId: string;
  username: string;
  amount: number;
  gameId?: string;
  status: 'completed' | 'pending';
  createdAt: string;
}

interface MockGame {
  id: string;
  status: 'scheduled' | 'live' | 'ended';
  poolValue: number;
  participants: number;
  entryFee: number;
  startTime: string;
  endTime?: string;
  winners?: string[];
  countdown: number;
}

interface LiveComment {
  id: string;
  userId: string;
  username: string;
  avatar: string;
  message: string;
  timestamp: number;
}

interface AdminSettings {
  platformName: string;
  platformCut: number;
  testMode: boolean;
  maintenanceMode: boolean;
  maxGameDuration: number;
  countdownTimer: number;
  entryFee: number;
}

interface AdminStats {
  activeGames: number;
  totalEntriesToday: number;
  totalPayoutsToday: number;
  platformRevenueToday: number;
  totalPlatformBalance: number;
  totalUserBalances: number;
  pendingPayouts: number;
  completedPayouts: number;
  dau: number;
  mau: number;
}

interface AdminContextType {
  // State
  users: MockUser[];
  transactions: MockTransaction[];
  games: MockGame[];
  currentGame: MockGame | null;
  liveComments: LiveComment[];
  settings: AdminSettings;
  stats: AdminStats;
  isSimulating: boolean;
  
  // Actions
  createGame: () => void;
  startGame: () => void;
  endGame: () => void;
  resetGame: () => void;
  pauseSimulation: () => void;
  resumeSimulation: () => void;
  updateSettings: (settings: Partial<AdminSettings>) => void;
  suspendUser: (userId: string) => void;
  flagUser: (userId: string) => void;
  activateUser: (userId: string) => void;
  approvePayout: (transactionId: string) => void;
  triggerWeeklyReset: () => void;
  simulateHighTraffic: () => void;
}

const AdminContext = createContext<AdminContextType | null>(null);

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) throw new Error('useAdmin must be used within AdminProvider');
  return context;
};

// Generate mock data
const generateMockUsers = (): MockUser[] => {
  const avatars = ['🎮', '🎯', '⚡', '🔥', '💎', '🚀', '👑', '🦁', '🐯', '🦊'];
  const names = ['CryptoKing', 'LuckyAce', 'FastHands', 'NightOwl', 'TurboMax', 'SwiftNinja', 'GoldRush', 'ThunderBolt', 'SilverFox', 'IronWill', 'StormChaser', 'BlazeRunner', 'PhantomX', 'NeonDrift', 'PixelPro'];
  
  return names.map((name, i) => ({
    id: `user_${i + 1}`,
    username: name,
    avatar: avatars[i % avatars.length],
    balance: Math.floor(Math.random() * 50000) + 1000,
    gamesPlayed: Math.floor(Math.random() * 100) + 5,
    wins: Math.floor(Math.random() * 20),
    rank: i + 1,
    rankPoints: Math.floor(Math.random() * 5000) + 100,
    status: 'active' as const,
    joinedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
  }));
};

const generateMockTransactions = (users: MockUser[]): MockTransaction[] => {
  const transactions: MockTransaction[] = [];
  const types: MockTransaction['type'][] = ['entry', 'win', 'platform_cut', 'payout'];
  
  for (let i = 0; i < 50; i++) {
    const user = users[Math.floor(Math.random() * users.length)];
    const type = types[Math.floor(Math.random() * types.length)];
    transactions.push({
      id: `txn_${i + 1}`,
      type,
      userId: user.id,
      username: user.username,
      amount: type === 'entry' ? 700 : type === 'platform_cut' ? Math.floor(Math.random() * 1000) + 100 : Math.floor(Math.random() * 5000) + 500,
      gameId: `game_${Math.floor(Math.random() * 10) + 1}`,
      status: Math.random() > 0.2 ? 'completed' : 'pending',
      createdAt: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
    });
  }
  return transactions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

const generateMockGames = (): MockGame[] => {
  return [
    { id: 'game_1', status: 'ended', poolValue: 16100, participants: 23, entryFee: 700, startTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), endTime: new Date(Date.now() - 1.5 * 60 * 60 * 1000).toISOString(), winners: ['CryptoKing', 'LuckyAce', 'FastHands'], countdown: 0 },
    { id: 'game_2', status: 'ended', poolValue: 21000, participants: 30, entryFee: 700, startTime: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), endTime: new Date(Date.now() - 3.5 * 60 * 60 * 1000).toISOString(), winners: ['NightOwl', 'TurboMax', 'SwiftNinja'], countdown: 0 },
  ];
};

export const AdminProvider = ({ children }: { children: ReactNode }) => {
  const [users, setUsers] = useState<MockUser[]>(generateMockUsers());
  const [transactions, setTransactions] = useState<MockTransaction[]>([]);
  const [games, setGames] = useState<MockGame[]>(generateMockGames());
  const [currentGame, setCurrentGame] = useState<MockGame | null>(null);
  const [liveComments, setLiveComments] = useState<LiveComment[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  
  const [settings, setSettings] = useState<AdminSettings>({
    platformName: 'FortunesHQ',
    platformCut: 10,
    testMode: false,
    maintenanceMode: false,
    maxGameDuration: 20,
    countdownTimer: 60,
    entryFee: 700,
  });

  const [stats, setStats] = useState<AdminStats>({
    activeGames: 0,
    totalEntriesToday: 23,
    totalPayoutsToday: 14490,
    platformRevenueToday: 1610,
    totalPlatformBalance: 245000,
    totalUserBalances: 1250000,
    pendingPayouts: 12500,
    completedPayouts: 890000,
    dau: 156,
    mau: 2340,
  });

  // Initialize transactions after users are set
  useEffect(() => {
    setTransactions(generateMockTransactions(users));
  }, []);

  // Simulate live game
  useEffect(() => {
    if (!currentGame || currentGame.status !== 'live' || !isSimulating) return;

    const commentInterval = setInterval(() => {
      const randomUser = users[Math.floor(Math.random() * users.length)];
      const messages = ['🔥', 'Let\'s go!', 'My turn!', '💪', 'Keep it up!', 'Come on!', '⚡', 'Winner!'];
      
      const newComment: LiveComment = {
        id: `comment_${Date.now()}`,
        userId: randomUser.id,
        username: randomUser.username,
        avatar: randomUser.avatar,
        message: messages[Math.floor(Math.random() * messages.length)],
        timestamp: Date.now(),
      };

      setLiveComments(prev => [newComment, ...prev].slice(0, 50));
      
      // Reset countdown on comment
      setCurrentGame(prev => prev ? { ...prev, countdown: settings.countdownTimer, poolValue: prev.poolValue + (Math.random() > 0.7 ? settings.entryFee : 0) } : null);
    }, 2000 + Math.random() * 3000);

    const countdownInterval = setInterval(() => {
      setCurrentGame(prev => {
        if (!prev || prev.countdown <= 0) return prev;
        return { ...prev, countdown: prev.countdown - 1 };
      });
    }, 1000);

    return () => {
      clearInterval(commentInterval);
      clearInterval(countdownInterval);
    };
  }, [currentGame?.status, isSimulating, users, settings]);

  const createGame = useCallback(() => {
    const newGame: MockGame = {
      id: `game_${Date.now()}`,
      status: 'scheduled',
      poolValue: 0,
      participants: 0,
      entryFee: settings.entryFee,
      startTime: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      countdown: settings.countdownTimer,
    };
    setCurrentGame(newGame);
    setGames(prev => [newGame, ...prev]);
  }, [settings]);

  const startGame = useCallback(() => {
    if (!currentGame) return;
    const startedGame = { 
      ...currentGame, 
      status: 'live' as const, 
      startTime: new Date().toISOString(),
      poolValue: Math.floor(Math.random() * 10000) + 5000,
      participants: Math.floor(Math.random() * 20) + 10,
    };
    setCurrentGame(startedGame);
    setGames(prev => prev.map(g => g.id === currentGame.id ? startedGame : g));
    setIsSimulating(true);
    setStats(prev => ({ ...prev, activeGames: 1 }));
    setLiveComments([]);
  }, [currentGame]);

  const endGame = useCallback(() => {
    if (!currentGame) return;
    const winners = users.slice(0, 3).map(u => u.username);
    const endedGame = { 
      ...currentGame, 
      status: 'ended' as const, 
      endTime: new Date().toISOString(),
      winners,
    };
    setCurrentGame(null);
    setGames(prev => prev.map(g => g.id === currentGame.id ? endedGame : g));
    setIsSimulating(false);
    setStats(prev => ({ 
      ...prev, 
      activeGames: 0,
      totalPayoutsToday: prev.totalPayoutsToday + Math.floor(endedGame.poolValue * 0.9),
      platformRevenueToday: prev.platformRevenueToday + Math.floor(endedGame.poolValue * 0.1),
    }));
  }, [currentGame, users]);

  const resetGame = useCallback(() => {
    setCurrentGame(null);
    setLiveComments([]);
    setIsSimulating(false);
    setStats(prev => ({ ...prev, activeGames: 0 }));
  }, []);

  const pauseSimulation = useCallback(() => setIsSimulating(false), []);
  const resumeSimulation = useCallback(() => setIsSimulating(true), []);

  const updateSettings = useCallback((newSettings: Partial<AdminSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  const suspendUser = useCallback((userId: string) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: 'suspended' as const } : u));
  }, []);

  const flagUser = useCallback((userId: string) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: 'flagged' as const } : u));
  }, []);

  const activateUser = useCallback((userId: string) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: 'active' as const } : u));
  }, []);

  const approvePayout = useCallback((transactionId: string) => {
    setTransactions(prev => prev.map(t => t.id === transactionId ? { ...t, status: 'completed' as const } : t));
  }, []);

  const triggerWeeklyReset = useCallback(() => {
    setUsers(prev => prev.map(u => ({ ...u, rankPoints: 0 })));
  }, []);

  const simulateHighTraffic = useCallback(() => {
    // Add more users and increase stats
    const newUsers = generateMockUsers().map(u => ({ ...u, id: `user_sim_${Date.now()}_${Math.random()}` }));
    setUsers(prev => [...prev, ...newUsers.slice(0, 5)]);
    setStats(prev => ({
      ...prev,
      dau: prev.dau + Math.floor(Math.random() * 50),
      totalEntriesToday: prev.totalEntriesToday + Math.floor(Math.random() * 20),
    }));
  }, []);

  return (
    <AdminContext.Provider value={{
      users, transactions, games, currentGame, liveComments, settings, stats, isSimulating,
      createGame, startGame, endGame, resetGame, pauseSimulation, resumeSimulation,
      updateSettings, suspendUser, flagUser, activateUser, approvePayout, triggerWeeklyReset, simulateHighTraffic,
    }}>
      {children}
    </AdminContext.Provider>
  );
};
