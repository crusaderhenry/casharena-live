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
  ambient_music_style?: 'chill' | 'intense' | 'retro' | 'none';
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
      // Get or create a default template
      const { data: templates } = await supabase
        .from('game_templates')
        .select('id')
        .eq('is_active', true)
        .limit(1);

      if (!templates || templates.length === 0) {
        throw new Error('No active game template found');
      }

      // Trigger cycle-manager to create a new cycle
      const { error } = await supabase.functions.invoke('cycle-manager', {
        body: { action: 'create_cycle', templateId: templates[0].id },
      });

      if (error) throw error;

      toast({ title: 'Game Created', description: 'New game cycle scheduled successfully' });
      refreshData();
    } catch (error: any) {
      console.error('Create game error:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  }, [refreshData, toast]);

  const createGameWithConfig = useCallback(async (config: CreateGameConfig) => {
    try {
      // Create or update a game template first
      const { data: template, error: templateError } = await supabase
        .from('game_templates')
        .insert({
          name: config.name,
          entry_fee: config.entry_fee,
          max_live_duration: config.max_duration,
          comment_timer: config.comment_timer,
          min_participants: config.min_participants,
          platform_cut_percentage: config.platform_cut_percentage || 10,
          prize_distribution: config.payout_distribution.map(p => p * 100),
          winner_count: config.payout_distribution.length,
          sponsored_prize_amount: config.sponsored_amount || 0,
          recurrence_type: config.recurrence_type || 'infinity',
          is_active: true,
        })
        .select()
        .single();

      if (templateError) throw templateError;

      // Trigger cycle-manager to create first cycle from this template
      const { error: cycleError } = await supabase.functions.invoke('cycle-manager', {
        body: { action: 'create_cycle', templateId: template.id },
      });

      if (cycleError) throw cycleError;

      toast({ title: 'Game Created', description: `${config.name} scheduled successfully` });
      refreshData();
    } catch (error: any) {
      console.error('Create game error:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  }, [refreshData, toast]);

  const updateGame = useCallback(async (gameId: string, config: Partial<CreateGameConfig>) => {
    try {
      // Update the cycle directly
      const updateData: Record<string, any> = {};
      
      if (config.entry_fee !== undefined) updateData.entry_fee = config.entry_fee;
      if (config.comment_timer !== undefined) updateData.comment_timer = config.comment_timer;
      if (config.min_participants !== undefined) updateData.min_participants = config.min_participants;
      if (config.platform_cut_percentage !== undefined) updateData.platform_cut_percentage = config.platform_cut_percentage;
      if (config.payout_distribution) {
        updateData.prize_distribution = config.payout_distribution.map(p => p * 100);
        updateData.winner_count = config.payout_distribution.length;
      }

      const { error } = await supabase
        .from('game_cycles')
        .update(updateData)
        .eq('id', gameId);

      if (error) throw error;

      toast({ title: 'Game Updated', description: 'Game cycle updated successfully' });
      refreshData();
    } catch (error: any) {
      console.error('Update game error:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  }, [refreshData, toast]);

  const cloneGame = useCallback(async (gameId: string) => {
    try {
      // Get the cycle and its template details
      const { data: cycle } = await supabase
        .from('game_cycles')
        .select(`
          template_id,
          entry_fee,
          comment_timer,
          min_participants,
          platform_cut_percentage,
          prize_distribution,
          winner_count,
          sponsored_prize_amount
        `)
        .eq('id', gameId)
        .single();

      if (!cycle) throw new Error('Cycle not found');

      // Get template details
      const { data: originalTemplate } = await supabase
        .from('game_templates')
        .select('*')
        .eq('id', cycle.template_id)
        .single();

      if (!originalTemplate) throw new Error('Template not found');

      // Create a new INACTIVE (draft/unpublished) template
      const { data: newTemplate, error: templateError } = await supabase
        .from('game_templates')
        .insert({
          name: `${originalTemplate.name} (Copy)`,
          game_type: originalTemplate.game_type,
          entry_fee: originalTemplate.entry_fee,
          entry_mode: originalTemplate.entry_mode,
          max_live_duration: originalTemplate.max_live_duration,
          comment_timer: originalTemplate.comment_timer,
          min_participants: originalTemplate.min_participants,
          platform_cut_percentage: originalTemplate.platform_cut_percentage,
          prize_distribution: originalTemplate.prize_distribution,
          winner_count: originalTemplate.winner_count,
          sponsored_prize_amount: originalTemplate.sponsored_prize_amount,
          allow_spectators: originalTemplate.allow_spectators,
          waiting_duration: originalTemplate.waiting_duration,
          open_entry_duration: originalTemplate.open_entry_duration,
          recurrence_type: originalTemplate.recurrence_type,
          is_active: false, // Draft/unpublished
        })
        .select()
        .single();

      if (templateError) throw templateError;

      toast({ title: 'Game Cloned', description: 'Template duplicated as draft (unpublished)' });
      refreshData();
    } catch (error: any) {
      console.error('Clone game error:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  }, [refreshData, toast]);

  const toggleVisibility = useCallback(async (gameId: string) => {
    try {
      // Get the cycle's template
      const { data: cycle } = await supabase
        .from('game_cycles')
        .select('template_id')
        .eq('id', gameId)
        .single();

      if (!cycle) throw new Error('Cycle not found');

      // Toggle template's is_active status
      const { data: template } = await supabase
        .from('game_templates')
        .select('is_active')
        .eq('id', cycle.template_id)
        .single();

      const newStatus = !template?.is_active;
      
      const { error } = await supabase
        .from('game_templates')
        .update({ is_active: newStatus })
        .eq('id', cycle.template_id);

      if (error) throw error;

      toast({ title: 'Visibility Updated', description: `Template is now ${newStatus ? 'active' : 'inactive'}` });
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
      // Update cycle status to live
      const { error } = await supabase
        .from('game_cycles')
        .update({ 
          status: 'live',
          countdown: targetGame.commentTimer || 60,
        })
        .eq('id', targetGame.id);

      if (error) throw error;

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
      // Trigger cycle-manager to settle the cycle
      const { data, error } = await supabase.functions.invoke('cycle-manager', {
        body: { action: 'settle', cycleId: targetGame.id },
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
      // Update cycle status to cancelled
      const { error } = await supabase
        .from('game_cycles')
        .update({ 
          status: 'cancelled',
          actual_end_at: new Date().toISOString(),
          settlement_data: { cancelled_reason: reason }
        })
        .eq('id', gameId);

      if (error) throw error;

      // TODO: Trigger refunds for participants via cycle-manager if needed

      if (gameId === currentGame?.id) {
        setCurrentGame(null);
        setIsSimulating(false);
        setLiveComments([]);
      }
      toast({ title: 'Game Cancelled', description: 'Game has been cancelled' });
      refreshData();
    } catch (error: any) {
      console.error('Cancel game error:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  }, [currentGame, refreshData, toast]);

  const deleteGame = useCallback(async (gameId: string) => {
    try {
      // Only allow deleting cycles that are cancelled or settled
      const { data: cycle } = await supabase
        .from('game_cycles')
        .select('status')
        .eq('id', gameId)
        .single();

      if (cycle && !['cancelled', 'settled'].includes(cycle.status)) {
        toast({ title: 'Cannot Delete', description: 'Only cancelled or settled cycles can be deleted', variant: 'destructive' });
        return;
      }

      // Delete cycle participants first
      await supabase
        .from('cycle_participants')
        .delete()
        .eq('cycle_id', gameId);

      // Delete cycle comments
      await supabase
        .from('cycle_comments')
        .delete()
        .eq('cycle_id', gameId);

      // Delete cycle winners
      await supabase
        .from('cycle_winners')
        .delete()
        .eq('cycle_id', gameId);

      // Delete the cycle
      const { error } = await supabase
        .from('game_cycles')
        .delete()
        .eq('id', gameId);

      if (error) throw error;

      if (gameId === currentGame?.id) {
        setCurrentGame(null);
        setIsSimulating(false);
        setLiveComments([]);
      }
      toast({ title: 'Cycle Deleted', description: 'Game cycle has been permanently deleted' });
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
      // Reset weekly rank points directly
      const { error } = await supabase
        .from('profiles')
        .update({ weekly_rank: null })
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Update all

      if (error) throw error;

      toast({ title: 'Weekly Reset', description: 'Weekly ranks have been reset' });
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