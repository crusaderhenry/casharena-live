import { useState, useEffect } from 'react';
import { WalletCard } from '@/components/WalletCard';
import { BottomNav } from '@/components/BottomNav';
import { TestModeToggle } from '@/components/TestControls';
import { OnboardingTutorial, useOnboarding } from '@/components/OnboardingTutorial';
import { GameHistory } from '@/components/GameHistory';
import { GameCard2 } from '@/components/GameCard2';
import { BadgeCelebration } from '@/components/BadgeCelebration';
import { useBadgeUnlock } from '@/hooks/useBadgeUnlock';
import { useActiveGames, GameState } from '@/hooks/useGameState';
import { Trophy, Flame, Bell, TrendingUp, Play, Calendar, Zap, AlertTriangle } from 'lucide-react';
import { useGame } from '@/contexts/GameContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useSounds } from '@/hooks/useSounds';
import { useHaptics } from '@/hooks/useHaptics';
import { supabase } from '@/integrations/supabase/client';

// Mock games for test mode only
const mockActiveGames: GameState[] = [
  { 
    id: 'mock-1', 
    name: 'Fastest Finger', 
    description: 'Classic speed game',
    status: 'live', 
    pool_value: 35000, 
    effective_prize_pool: 35000,
    participant_count: 23, 
    countdown: 45, 
    entry_fee: 700, 
    max_duration: 20,
    comment_timer: 60,
    payout_type: 'top3', 
    payout_distribution: [0.5, 0.3, 0.2], 
    is_sponsored: false,
    sponsored_amount: 0,
    scheduled_at: null,
    start_time: new Date().toISOString(),
    end_time: null,
    lobby_opens_at: null,
    entry_cutoff_minutes: 10,
    visibility: 'public',
    recurrence_type: null,
    recurrence_interval: null,
    seconds_until_open: 0,
    seconds_until_live: 0,
    seconds_remaining: 600,
    is_ending_soon: false,
  },
  { 
    id: 'mock-2', 
    name: 'Speed Rush', 
    description: 'High stakes action',
    status: 'ending_soon', 
    pool_value: 18500, 
    effective_prize_pool: 18500,
    participant_count: 15, 
    countdown: 32, 
    entry_fee: 500, 
    max_duration: 15,
    comment_timer: 60,
    payout_type: 'winner_takes_all', 
    payout_distribution: [1.0], 
    is_sponsored: false,
    sponsored_amount: 0,
    scheduled_at: null,
    start_time: new Date().toISOString(),
    end_time: null,
    lobby_opens_at: null,
    entry_cutoff_minutes: 10,
    visibility: 'public',
    recurrence_type: null,
    recurrence_interval: null,
    seconds_until_open: 0,
    seconds_until_live: 0,
    seconds_remaining: 180,
    is_ending_soon: true,
  },
  { 
    id: 'mock-3', 
    name: 'Free Friday', 
    description: 'Sponsored game - Free entry!',
    status: 'open', 
    pool_value: 0, 
    effective_prize_pool: 50000,
    participant_count: 8, 
    countdown: 180, 
    entry_fee: 0, 
    max_duration: 10,
    comment_timer: 60,
    payout_type: 'top5', 
    payout_distribution: [0.4, 0.25, 0.15, 0.12, 0.08], 
    is_sponsored: true,
    sponsored_amount: 50000,
    scheduled_at: null,
    start_time: new Date().toISOString(),
    end_time: null,
    lobby_opens_at: null,
    entry_cutoff_minutes: 10,
    visibility: 'public',
    recurrence_type: 'weekly',
    recurrence_interval: 1,
    seconds_until_open: 0,
    seconds_until_live: 120,
    seconds_remaining: 0,
    is_ending_soon: false,
  },
  { 
    id: 'mock-4', 
    name: 'Lightning Round', 
    description: 'Quick 5 minute game',
    status: 'scheduled', 
    pool_value: 0, 
    effective_prize_pool: 0,
    participant_count: 0, 
    countdown: 60, 
    entry_fee: 200, 
    max_duration: 5,
    comment_timer: 60,
    payout_type: 'top3', 
    payout_distribution: [0.5, 0.3, 0.2], 
    is_sponsored: false,
    sponsored_amount: 0,
    scheduled_at: new Date(Date.now() + 30 * 60000).toISOString(),
    start_time: null,
    end_time: null,
    lobby_opens_at: null,
    entry_cutoff_minutes: 10,
    visibility: 'public',
    recurrence_type: 'minutes',
    recurrence_interval: 15,
    seconds_until_open: 1800,
    seconds_until_live: 0,
    seconds_remaining: 0,
    is_ending_soon: false,
  },
];

const mockTestWinners = [
  { id: 'tw1', type: 'finger_win' as const, playerName: 'CryptoKing', playerAvatar: '👑', amount: 15750, position: 1 },
  { id: 'tw2', type: 'finger_win' as const, playerName: 'LuckyAce', playerAvatar: '🎰', amount: 9450, position: 2 },
  { id: 'tw3', type: 'finger_win' as const, playerName: 'FastHands', playerAvatar: '⚡', amount: 6300, position: 3 },
];

export const Home = () => {
  const { isTestMode } = useGame();
  const { profile } = useAuth();
  const { games: liveGamesData, liveGames: realLiveGames, openGames: realOpenGames, scheduledGames: realScheduledGames, loading } = useActiveGames();
  const navigate = useNavigate();
  const { play } = useSounds();
  const { buttonClick } = useHaptics();
  const { showOnboarding, completeOnboarding } = useOnboarding();
  const [recentWinners, setRecentWinners] = useState<any[]>([]);
  const [activeNotification, setActiveNotification] = useState(0);

  // Badge unlock celebration
  const { newBadge, showCelebration, dismissCelebration } = useBadgeUnlock({
    total_wins: profile?.total_wins || 0,
    games_played: profile?.games_played || 0,
  });

  // Use mock data in test mode, real data otherwise
  const displayGames = isTestMode ? mockActiveGames : liveGamesData;
  const liveGames = isTestMode 
    ? mockActiveGames.filter(g => g.status === 'live' || g.status === 'ending_soon')
    : realLiveGames;
  const openGames = isTestMode 
    ? mockActiveGames.filter(g => g.status === 'open')
    : realOpenGames;
  const scheduledGames = isTestMode 
    ? mockActiveGames.filter(g => g.status === 'scheduled')
    : realScheduledGames;

  // Fetch recent winners
  useEffect(() => {
    if (isTestMode) return;
    const fetchRecentWinners = async () => {
      const { data } = await supabase.from('winners').select('*').order('created_at', { ascending: false }).limit(5);
      if (data) {
        const winnersWithProfiles = await Promise.all(
          data.map(async (w) => {
            const { data: profileData } = await supabase.rpc('get_public_profile', { profile_id: w.user_id });
            return { ...w, profile: profileData?.[0] };
          })
        );
        setRecentWinners(winnersWithProfiles);
      }
    };
    fetchRecentWinners();

    // Subscribe to new winners
    const channel = supabase
      .channel('home-winners')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'winners' },
        async (payload) => {
          const winner = payload.new as any;
          const { data: profileData } = await supabase.rpc('get_public_profile', { profile_id: winner.user_id });
          if (profileData?.[0]) {
            setRecentWinners(prev => [{ ...winner, profile: profileData[0] }, ...prev].slice(0, 5));
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [isTestMode]);

  const userRank = profile?.weekly_rank || Math.ceil((profile?.rank_points || 0) / 100) || 1;

  // Notification messages
  const endingSoonGames = liveGames.filter(g => g.is_ending_soon);
  const notifications = [
    liveGames.length > 0 && `🎮 ${liveGames.length} game${liveGames.length > 1 ? 's' : ''} LIVE now!`,
    endingSoonGames.length > 0 && `🔥 ${endingSoonGames.length} game${endingSoonGames.length > 1 ? 's' : ''} ending soon!`,
    scheduledGames.length > 0 && `⏰ ${scheduledGames.length} game${scheduledGames.length > 1 ? 's' : ''} coming soon`,
    recentWinners[0]?.profile?.username && `🏆 ${recentWinners[0].profile.username} won ₦${recentWinners[0].amount_won?.toLocaleString()}!`,
  ].filter(Boolean) as string[];

  useEffect(() => {
    if (notifications.length <= 1) return;
    const timer = setInterval(() => {
      setActiveNotification(prev => (prev + 1) % notifications.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [notifications.length]);

  const formatMoney = (amount: number) => {
    if (amount >= 1_000_000_000) return `₦${(amount / 1_000_000_000).toFixed(1).replace(/\.0$/, '')}B`;
    if (amount >= 1_000_000) return `₦${(amount / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
    if (amount >= 1_000) return `₦${(amount / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
    return `₦${amount.toLocaleString()}`;
  };

  const handleGameClick = () => {
    play('click');
    buttonClick();
    navigate('/finger');
  };

  const displayActivity = isTestMode
    ? mockTestWinners
    : recentWinners.map((w) => ({
        id: w.id,
        type: 'finger_win' as const,
        playerName: w.profile?.username || 'Unknown',
        playerAvatar: w.profile?.avatar || '🎮',
        amount: w.amount_won,
        position: w.position,
      }));

  const totalPoolValue = displayGames.reduce((sum, g) => sum + (g.effective_prize_pool || 0), 0);

  return (
    <div className="min-h-screen bg-background pb-24">
      {showOnboarding && <OnboardingTutorial onComplete={completeOnboarding} />}
      
      {showCelebration && newBadge && (
        <BadgeCelebration badge={newBadge} onDismiss={dismissCelebration} />
      )}
      
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pt-2">
          <div>
            <h1 className="text-2xl font-black text-foreground tracking-tight">
              <span className="text-primary">Fortunes</span>HQ
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              {liveGames.length > 0 && (
                <span className="flex items-center gap-1.5 text-xs font-medium text-green-400">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  {liveGames.length} Live
                </span>
              )}
              {endingSoonGames.length > 0 && (
                <span className="flex items-center gap-1.5 text-xs font-medium text-red-400">
                  <AlertTriangle className="w-3 h-3" />
                  {endingSoonGames.length} Ending
                </span>
              )}
              {scheduledGames.length > 0 && (
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  {scheduledGames.length} Soon
                </span>
              )}
            </div>
          </div>
          <TestModeToggle />
        </div>

        {/* Notification Ticker */}
        {notifications.length > 0 && (
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-primary/15 via-primary/10 to-transparent border border-primary/20 px-4 py-2.5">
            <div className="flex items-center gap-3">
              <Bell className="w-4 h-4 text-primary flex-shrink-0" />
              <p className="text-sm font-medium text-foreground truncate flex-1">
                {notifications[activeNotification]}
              </p>
              {notifications.length > 1 && (
                <div className="flex gap-1">
                  {notifications.map((_, i) => (
                    <span key={i} className={`w-1.5 h-1.5 rounded-full transition-all ${i === activeNotification ? 'bg-primary' : 'bg-muted'}`} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Wallet */}
        <WalletCard compact />

        {/* Recent Winners */}
        {displayActivity.length > 0 && (
          <div className="card-panel">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-3">
              <Flame className="w-4 h-4 text-orange-400" />
              Recent Winners
            </h3>
            
            <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
              {displayActivity.slice(0, 5).map((activity) => (
                <div key={activity.id} className="flex-shrink-0 flex flex-col items-center gap-1.5 w-16">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-card-elevated flex items-center justify-center text-xl border-2 border-gold/30">
                      {activity.playerAvatar}
                    </div>
                    <span className="absolute -bottom-1 -right-1 text-sm">
                      {activity.position === 1 ? '🥇' : activity.position === 2 ? '🥈' : '🥉'}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-foreground truncate w-full text-center">{activity.playerName}</p>
                  <p className="text-xs font-bold text-gold">+{formatMoney(activity.amount || 0)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Live Games - Including Ending Soon */}
        {liveGames.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Play className="w-4 h-4 text-green-400" fill="currentColor" />
                Live Now
                {endingSoonGames.length > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase bg-red-500/20 text-red-400 rounded animate-pulse">
                    {endingSoonGames.length} Ending Soon
                  </span>
                )}
              </h2>
              {liveGames.length > 2 && (
                <button onClick={handleGameClick} className="text-xs text-primary font-medium">
                  View All →
                </button>
              )}
            </div>
            
            <div className="space-y-3">
              {liveGames.slice(0, 3).map((game) => (
                <GameCard2 key={game.id} game={game} />
              ))}
            </div>
          </div>
        )}

        {/* Open Games */}
        {openGames.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Zap className="w-4 h-4 text-blue-400" />
                Open for Entry
              </h2>
            </div>
            
            <div className="space-y-2">
              {openGames.slice(0, 3).map((game) => (
                <GameCard2 key={game.id} game={game} compact />
              ))}
            </div>
          </div>
        )}

        {/* Scheduled Games */}
        {scheduledGames.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Calendar className="w-4 h-4 text-yellow-400" />
                Coming Soon
              </h2>
            </div>
            
            <div className="space-y-2">
              {scheduledGames.slice(0, 3).map((game) => (
                <GameCard2 key={game.id} game={game} compact />
              ))}
            </div>
          </div>
        )}

        {/* No Games State */}
        {displayGames.length === 0 && !loading && (
          <div className="card-panel text-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
              <Zap className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-bold text-foreground mb-2">No Games Available</h3>
            <p className="text-sm text-muted-foreground">Check back soon for exciting new games!</p>
          </div>
        )}

        {/* Loading State */}
        {loading && !isTestMode && (
          <div className="card-panel text-center py-8">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Loading games...</p>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => { play('click'); buttonClick(); navigate('/rank'); }}
            className="card-panel flex items-center gap-3 hover:border-primary/40 transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-primary" />
            </div>
            <div className="text-left">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Your Rank</p>
              <p className="text-xl font-black text-foreground">#{userRank}</p>
            </div>
          </button>
          
          <div className="card-panel flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold/15 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-gold" />
            </div>
            <div className="text-left">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Prizes</p>
              <p className="text-xl font-black text-gold">{formatMoney(totalPoolValue)}</p>
            </div>
          </div>
        </div>

        {/* Game History */}
        <GameHistory isTestMode={isTestMode} />
      </div>
      
      <BottomNav />
    </div>
  );
};
