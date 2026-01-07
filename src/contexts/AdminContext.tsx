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
  name: string;
  status: 'waiting' | 'opening' | 'live' | 'ending' | 'settled' | 'cancelled';
  poolValue: number;
  participants: number;
  entryFee: number;
  startTime: string;
  endTime?: string;
  winners?: string[];
  countdown: number;
  payoutType: 'winner_takes_all' | 'top3' | 'top5' | 'top10';
  payoutDistribution: number[];
  commentTimer: number;
  maxDuration: number;
  minParticipants: number;
  visibility: 'public' | 'private';
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

interface CreateGameConfig {
  name: string;
  entry_fee: number;
  max_duration: number;
  comment_timer: number;
  payout_type: string;
  payout_distribution: number[];
  min_participants: number;
  countdown: number;
  // Scheduling
  go_live_type?: 'immediate' | 'scheduled';
  scheduled_at?: string | null;
  recurrence_type?: string | null;
  recurrence_interval?: number | null;
  // Sponsored games
  is_sponsored?: boolean;
  sponsored_amount?: number | null;
  platform_cut_percentage?: number;
  description?: string | null;
  // New automation fields
  auto_restart?: boolean;
  fixed_daily_time?: string | null;
  entry_wait_seconds?: number;
  min_participants_action?: 'reset' | 'cancel' | 'start_anyway';
  // Music settings
  music_type?: 'generated' | 'uploaded';
  lobby_music_url?: string | null;
  arena_music_url?: string | null;
  tense_music_url?: string | null;
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
  createGameWithConfig: (config: CreateGameConfig) => Promise<void>;
  updateGame: (gameId: string, config: Partial<CreateGameConfig>) => Promise<void>;
  cloneGame: (gameId: string) => Promise<void>;
  toggleVisibility: (gameId: string) => Promise<void>;
  startGame: (gameId?: string) => Promise<void>;
  endGame: (gameId?: string) => Promise<void>;
  cancelGame: (gameId: string, reason: string) => Promise<void>;
  deleteGame: (gameId: string) => Promise<void>;
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
          status: 'active' as const,
          joinedAt: p.created_at,
          email: p.email,
        }));
        setUsers(mappedUsers);
        
        const totalUserBalances = profiles.reduce((sum, p) => sum + p.wallet_balance, 0);
        setStats(prev => ({ ...prev, totalUserBalances }));
      }

      // Fetch game cycles with template info
      const { data: cyclesData } = await supabase
        .from('game_cycles')
        .select(`
          *,
          game_templates!inner(name, game_type)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (cyclesData) {
        const mappedGames: AdminGame[] = cyclesData.map(c => ({
          id: c.id,
          name: (c.game_templates as any)?.name || 'Royal Rumble',
          status: c.status as AdminGame['status'],
          poolValue: c.pool_value,
          participants: c.participant_count,
          entryFee: c.entry_fee,
          startTime: c.live_start_at || c.created_at,
          endTime: c.actual_end_at || undefined,
          countdown: c.countdown,
          payoutType: 'top3' as AdminGame['payoutType'],
          payoutDistribution: c.prize_distribution.map(n => Number(n) / 100),
          commentTimer: c.comment_timer || 60,
          maxDuration: 15, // Default from template
          minParticipants: c.min_participants || 2,
          visibility: 'public' as AdminGame['visibility'],
        }));
        setGames(mappedGames);
        
        // Find current live game (first one if multiple)
        const liveGame = mappedGames.find(g => g.status === 'live');
        if (liveGame) {
          setCurrentGame(liveGame);
          setIsSimulating(true);
        } else {
          const waitingGame = mappedGames.find(g => g.status === 'waiting' || g.status === 'opening');
          if (waitingGame) {
            setCurrentGame(waitingGame);
          }
        }
        
        const activeGames = mappedGames.filter(g => ['live', 'waiting', 'opening', 'ending'].includes(g.status)).length;
        setStats(prev => ({ ...prev, activeGames }));
      }

      // Fetch transactions
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      
      const { data: txData } = await supabase
        .from('wallet_transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (txData) {
        // Fetch usernames separately
        const userIds = [...new Set(txData.map(t => t.user_id))];
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, username')
          .in('id', userIds);
        
        const usernameMap = new Map(profilesData?.map(p => [p.id, p.username]) || []);
        
        const mappedTx: AdminTransaction[] = txData.map(t => ({
          id: t.id,
          type: t.type,
          userId: t.user_id,
          username: usernameMap.get(t.user_id) || 'Unknown',
          amount: t.amount,
          gameId: t.game_id || undefined,
          status: 'completed' as const,
          createdAt: t.created_at,
        }));
        setTransactions(mappedTx);
        
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
    const cyclesChannel = supabase
      .channel('admin-cycles')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'game_cycles' },
        () => refreshData()
      )
      .subscribe();

    const commentsChannel = supabase
      .channel('admin-cycle-comments')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'cycle_comments' },
        async (payload) => {
          const newComment = payload.new as any;
          
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

    const participantsChannel = supabase
      .channel('admin-cycle-participants')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cycle_participants' },
        () => refreshData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(cyclesChannel);
      supabase.removeChannel(commentsChannel);
      supabase.removeChannel(participantsChannel);
    };
  }, [refreshData]);

  // Load comments for current game (cycle)
  useEffect(() => {
    if (!currentGame) {
      setLiveComments([]);
      return;
    }

    const loadComments = async () => {
      const { data: comments } = await supabase
        .from('cycle_comments')
        .select('*')
        .eq('cycle_id', currentGame.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (comments) {
        const userIds = [...new Set(comments.map(c => c.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, avatar')
          .in('id', userIds);
        
        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
        
        const mapped: LiveComment[] = comments.map(c => ({
          id: c.id,
          userId: c.user_id,
          username: profileMap.get(c.user_id)?.username || 'Unknown',
          avatar: profileMap.get(c.user_id)?.avatar || '🎮',
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
      if (data?.error) throw new Error(data.error);

      toast({ title: 'Game Created', description: 'New game scheduled successfully' });
      refreshData();
    } catch (error: any) {
      console.error('Create game error:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  }, [refreshData, toast]);

  const createGameWithConfig = useCallback(async (config: CreateGameConfig) => {
    try {
      const { data, error } = await supabase.functions.invoke('game-manager', {
        body: { 
          action: 'create_game',
          config,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({ title: 'Game Created', description: `${config.name} scheduled successfully` });
      refreshData();
    } catch (error: any) {
      console.error('Create game error:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  }, [refreshData, toast]);

  const updateGame = useCallback(async (gameId: string, config: Partial<CreateGameConfig>) => {
    try {
      const { data, error } = await supabase.functions.invoke('game-manager', {
        body: { 
          action: 'update_game',
          gameId,
          config,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({ title: 'Game Updated', description: `Game updated successfully` });
      refreshData();
    } catch (error: any) {
      console.error('Update game error:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  }, [refreshData, toast]);

  const cloneGame = useCallback(async (gameId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('game-manager', {
        body: { 
          action: 'clone_game',
          gameId,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({ title: 'Game Cloned', description: `Game duplicated as draft (unpublished)` });
      refreshData();
    } catch (error: any) {
      console.error('Clone game error:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  }, [refreshData, toast]);

  const toggleVisibility = useCallback(async (gameId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('game-manager', {
        body: { 
          action: 'toggle_visibility',
          gameId,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const newVisibility = data.visibility === 'public' ? 'Published' : 'Unpublished';
      toast({ title: 'Visibility Updated', description: `Game is now ${newVisibility}` });
      refreshData();
    } catch (error: any) {
      console.error('Toggle visibility error:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  }, [refreshData, toast]);

  const startGame = useCallback(async (gameId?: string) => {
    const targetGame = gameId ? games.find(g => g.id === gameId) : currentGame;
    if (!targetGame) return;
    
    try {
      const { data, error } = await supabase.functions.invoke('game-manager', {
        body: { action: 'start_game', gameId: targetGame.id },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setIsSimulating(true);
      toast({ title: 'Game Started', description: `${targetGame.name || 'Game'} is now live!` });
      refreshData();
    } catch (error: any) {
      console.error('Start game error:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  }, [currentGame, games, refreshData, toast]);

  const endGame = useCallback(async (gameId?: string) => {
    const targetGame = gameId ? games.find(g => g.id === gameId) : currentGame;
    if (!targetGame) return;
    
    try {
      const { data, error } = await supabase.functions.invoke('game-manager', {
        body: { action: 'end_game', gameId: targetGame.id },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (targetGame.id === currentGame?.id) {
        setCurrentGame(null);
        setIsSimulating(false);
        setLiveComments([]);
      }
      toast({ title: 'Game Ended', description: 'Game has been ended and winners determined' });
      refreshData();
    } catch (error: any) {
      console.error('End game error:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  }, [currentGame, games, refreshData, toast]);

  const resetGame = useCallback(() => {
    setCurrentGame(null);
    setLiveComments([]);
    setIsSimulating(false);
  }, []);

  const cancelGame = useCallback(async (gameId: string, reason: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('game-manager', {
        body: { action: 'cancel_game', gameId, reason },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (gameId === currentGame?.id) {
        setCurrentGame(null);
        setIsSimulating(false);
        setLiveComments([]);
      }
      toast({ title: 'Game Cancelled', description: 'Game has been cancelled and participants will be refunded' });
      refreshData();
    } catch (error: any) {
      console.error('Cancel game error:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  }, [currentGame, refreshData, toast]);

  const deleteGame = useCallback(async (gameId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('game-manager', {
        body: { action: 'delete_game', gameId },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (gameId === currentGame?.id) {
        setCurrentGame(null);
        setIsSimulating(false);
        setLiveComments([]);
      }
      toast({ title: 'Game Deleted', description: 'Game has been permanently deleted' });
      refreshData();
    } catch (error: any) {
      console.error('Delete game error:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  }, [currentGame, refreshData, toast]);

  const pauseSimulation = useCallback(() => setIsSimulating(false), []);
  const resumeSimulation = useCallback(() => setIsSimulating(true), []);

  const updateSettings = useCallback((newSettings: Partial<AdminSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
    toast({ title: 'Settings Updated', description: 'Default settings have been updated' });
  }, [toast]);

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
      if (data?.error) throw new Error(data.error);

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
      createGame, createGameWithConfig, updateGame, cloneGame, toggleVisibility, startGame, endGame, cancelGame, deleteGame, resetGame, pauseSimulation, resumeSimulation,
      updateSettings, suspendUser, flagUser, activateUser, approvePayout, triggerWeeklyReset, simulateHighTraffic, refreshData,
    }}>
      {children}
    </AdminContext.Provider>
  );
};