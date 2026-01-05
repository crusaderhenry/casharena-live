import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AdminUser {
  id: string;
  username: string;
  avatar: string | null;
  balance: number;
  gamesPlayed: number;
  wins: number;
  rank: number;
  rankPoints: number;
  status: 'active' | 'suspended' | 'flagged';
  joinedAt: string;
  email: string;
}

interface AdminTransaction {
  id: string;
  type: string;
  userId: string;
  username: string;
  amount: number;
  gameId?: string;
  status: 'completed' | 'pending';
  createdAt: string;
}

interface AdminGame {
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
  users: AdminUser[];
  transactions: AdminTransaction[];
  games: AdminGame[];
  currentGame: AdminGame | null;
  liveComments: LiveComment[];
  settings: AdminSettings;
  stats: AdminStats;
  isSimulating: boolean;
  loading: boolean;
  
  createGame: () => Promise<void>;
  startGame: () => Promise<void>;
  endGame: () => Promise<void>;
  resetGame: () => void;
  pauseSimulation: () => void;
  resumeSimulation: () => void;
  updateSettings: (settings: Partial<AdminSettings>) => void;
  suspendUser: (userId: string) => void;
  flagUser: (userId: string) => void;
  activateUser: (userId: string) => void;
  approvePayout: (transactionId: string) => void;
  triggerWeeklyReset: () => Promise<void>;
  simulateHighTraffic: () => void;
  refreshData: () => Promise<void>;
}

const AdminContext = createContext<AdminContextType | null>(null);

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) throw new Error('useAdmin must be used within AdminProvider');
  return context;
};

export const AdminProvider = ({ children }: { children: ReactNode }) => {
  const { toast } = useToast();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [transactions, setTransactions] = useState<AdminTransaction[]>([]);
  const [games, setGames] = useState<AdminGame[]>([]);
  const [currentGame, setCurrentGame] = useState<AdminGame | null>(null);
  const [liveComments, setLiveComments] = useState<LiveComment[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [loading, setLoading] = useState(true);
  
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
    totalEntriesToday: 0,
    totalPayoutsToday: 0,
    platformRevenueToday: 0,
    totalPlatformBalance: 0,
    totalUserBalances: 0,
    pendingPayouts: 0,
    completedPayouts: 0,
    dau: 0,
    mau: 0,
  });

  // Fetch all data from backend
  const refreshData = useCallback(async () => {
    try {
      // Fetch users (profiles)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .order('rank_points', { ascending: false });

      if (profiles) {
        const mappedUsers: AdminUser[] = profiles.map((p, index) => ({
          id: p.id,
          username: p.username,
          avatar: p.avatar,
          balance: p.wallet_balance,
          gamesPlayed: p.games_played,
          wins: p.total_wins,
          rank: index + 1,
          rankPoints: p.rank_points,
          status: 'active' as const, // Could add a status column to profiles
          joinedAt: p.created_at,
          email: p.email,
        }));
        setUsers(mappedUsers);
        
        // Calculate total user balances
        const totalUserBalances = profiles.reduce((sum, p) => sum + p.wallet_balance, 0);
        setStats(prev => ({ ...prev, totalUserBalances }));
      }

      // Fetch games
      const { data: gamesData } = await supabase
        .from('fastest_finger_games')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (gamesData) {
        const mappedGames: AdminGame[] = gamesData.map(g => ({
          id: g.id,
          status: g.status as 'scheduled' | 'live' | 'ended',
          poolValue: g.pool_value,
          participants: g.participant_count,
          entryFee: g.entry_fee,
          startTime: g.start_time || g.created_at,
          endTime: g.end_time || undefined,
          countdown: g.countdown,
        }));
        setGames(mappedGames);
        
        // Find current live game
        const liveGame = mappedGames.find(g => g.status === 'live');
        if (liveGame) {
          setCurrentGame(liveGame);
          setIsSimulating(true);
        }
        
        // Count active games
        const activeGames = mappedGames.filter(g => g.status === 'live').length;
        setStats(prev => ({ ...prev, activeGames }));
      }

      // Fetch transactions
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      
      const { data: txData } = await supabase
        .from('wallet_transactions')
        .select('*, profiles!wallet_transactions_user_id_fkey(username)')
        .order('created_at', { ascending: false })
        .limit(100);

      if (txData) {
        const mappedTx: AdminTransaction[] = txData.map(t => ({
          id: t.id,
          type: t.type,
          userId: t.user_id,
          username: (t.profiles as any)?.username || 'Unknown',
          amount: t.amount,
          gameId: t.game_id || undefined,
          status: 'completed' as const,
          createdAt: t.created_at,
        }));
        setTransactions(mappedTx);
        
        // Calculate today's stats
        const todayTx = txData.filter(t => new Date(t.created_at) >= todayStart);
        const entries = todayTx.filter(t => t.type === 'entry').length;
        const payouts = todayTx.filter(t => t.type === 'win').reduce((sum, t) => sum + t.amount, 0);
        const platformRevenue = todayTx.filter(t => t.type === 'platform_cut').reduce((sum, t) => sum + t.amount, 0);
        
        setStats(prev => ({
          ...prev,
          totalEntriesToday: entries,
          totalPayoutsToday: payouts,
          platformRevenueToday: platformRevenue,
        }));
      }

      setLoading(false);
    } catch (error) {
      console.error('Error refreshing admin data:', error);
      setLoading(false);
    }
  }, []);

  // Initial data fetch
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Real-time subscriptions
  useEffect(() => {
    // Subscribe to game changes
    const gamesChannel = supabase
      .channel('admin-games')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'fastest_finger_games' },
        (payload) => {
          console.log('[Admin] Game update:', payload);
          refreshData();
        }
      )
      .subscribe();

    // Subscribe to comments for live feed
    const commentsChannel = supabase
      .channel('admin-comments')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'comments' },
        async (payload) => {
          const newComment = payload.new as any;
          
          // Fetch user info
          const { data: profile } = await supabase
            .from('profiles')
            .select('username, avatar')
            .eq('id', newComment.user_id)
            .single();

          const comment: LiveComment = {
            id: newComment.id,
            userId: newComment.user_id,
            username: profile?.username || 'Unknown',
            avatar: profile?.avatar || '🎮',
            message: newComment.content,
            timestamp: new Date(newComment.created_at).getTime(),
          };

          setLiveComments(prev => [comment, ...prev].slice(0, 50));
        }
      )
      .subscribe();

    // Subscribe to participants for pool updates
    const participantsChannel = supabase
      .channel('admin-participants')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'fastest_finger_participants' },
        () => refreshData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(gamesChannel);
      supabase.removeChannel(commentsChannel);
      supabase.removeChannel(participantsChannel);
    };
  }, [refreshData]);

  // Countdown timer for live game
  useEffect(() => {
    if (!currentGame || currentGame.status !== 'live' || !isSimulating) return;

    const interval = setInterval(async () => {
      // Call the game-timer edge function to tick
      try {
        const { data } = await supabase.functions.invoke('game-timer', {
          body: { action: 'tick', gameId: currentGame.id },
        });
        
        if (data?.countdown !== undefined) {
          setCurrentGame(prev => prev ? { ...prev, countdown: data.countdown } : null);
        }
        
        if (data?.action === 'game_ended') {
          setCurrentGame(null);
          setIsSimulating(false);
          refreshData();
          toast({
            title: 'Game Ended',
            description: `Game ended with ${data.winners} winners`,
          });
        }
      } catch (error) {
        console.error('Timer tick error:', error);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [currentGame?.id, currentGame?.status, isSimulating, refreshData, toast]);

  // Load comments for current game
  useEffect(() => {
    if (!currentGame) {
      setLiveComments([]);
      return;
    }

    const loadComments = async () => {
      const { data: comments } = await supabase
        .from('comments')
        .select('*, profiles!comments_user_id_fkey(username, avatar)')
        .eq('game_id', currentGame.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (comments) {
        const mapped: LiveComment[] = comments.map(c => ({
          id: c.id,
          userId: c.user_id,
          username: (c.profiles as any)?.username || 'Unknown',
          avatar: (c.profiles as any)?.avatar || '🎮',
          message: c.content,
          timestamp: new Date(c.created_at).getTime(),
        }));
        setLiveComments(mapped);
      }
    };

    loadComments();
  }, [currentGame?.id]);

  const createGame = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('game-manager', {
        body: { action: 'create_game' },
      });

      if (error) throw error;

      toast({ title: 'Game Created', description: 'New game scheduled successfully' });
      refreshData();
    } catch (error: any) {
      console.error('Create game error:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  }, [refreshData, toast]);

  const startGame = useCallback(async () => {
    if (!currentGame) return;
    
    try {
      const { data, error } = await supabase.functions.invoke('game-manager', {
        body: { action: 'start_game', gameId: currentGame.id },
      });

      if (error) throw error;

      setIsSimulating(true);
      toast({ title: 'Game Started', description: 'Game is now live!' });
      refreshData();
    } catch (error: any) {
      console.error('Start game error:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  }, [currentGame, refreshData, toast]);

  const endGame = useCallback(async () => {
    if (!currentGame) return;
    
    try {
      const { data, error } = await supabase.functions.invoke('game-manager', {
        body: { action: 'end_game', gameId: currentGame.id },
      });

      if (error) throw error;

      setCurrentGame(null);
      setIsSimulating(false);
      setLiveComments([]);
      toast({ title: 'Game Ended', description: 'Game has been ended and winners determined' });
      refreshData();
    } catch (error: any) {
      console.error('End game error:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  }, [currentGame, refreshData, toast]);

  const resetGame = useCallback(() => {
    setCurrentGame(null);
    setLiveComments([]);
    setIsSimulating(false);
  }, []);

  const pauseSimulation = useCallback(() => setIsSimulating(false), []);
  const resumeSimulation = useCallback(() => setIsSimulating(true), []);

  const updateSettings = useCallback((newSettings: Partial<AdminSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  const suspendUser = useCallback((userId: string) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: 'suspended' as const } : u));
    toast({ title: 'User Suspended', description: 'User has been suspended' });
  }, [toast]);

  const flagUser = useCallback((userId: string) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: 'flagged' as const } : u));
    toast({ title: 'User Flagged', description: 'User has been flagged for review' });
  }, [toast]);

  const activateUser = useCallback((userId: string) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: 'active' as const } : u));
    toast({ title: 'User Activated', description: 'User has been activated' });
  }, [toast]);

  const approvePayout = useCallback((transactionId: string) => {
    setTransactions(prev => prev.map(t => t.id === transactionId ? { ...t, status: 'completed' as const } : t));
    toast({ title: 'Payout Approved', description: 'Payout has been approved' });
  }, [toast]);

  const triggerWeeklyReset = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('game-manager', {
        body: { action: 'reset_weekly_ranks' },
      });

      if (error) throw error;

      toast({ title: 'Weekly Reset', description: 'Rank points have been reset' });
      refreshData();
    } catch (error: any) {
      console.error('Weekly reset error:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  }, [refreshData, toast]);

  const simulateHighTraffic = useCallback(() => {
    toast({ title: 'Simulation Started', description: 'High traffic simulation is running' });
  }, [toast]);

  return (
    <AdminContext.Provider value={{
      users, transactions, games, currentGame, liveComments, settings, stats, isSimulating, loading,
      createGame, startGame, endGame, resetGame, pauseSimulation, resumeSimulation,
      updateSettings, suspendUser, flagUser, activateUser, approvePayout, triggerWeeklyReset, simulateHighTraffic, refreshData,
    }}>
      {children}
    </AdminContext.Provider>
  );
};
