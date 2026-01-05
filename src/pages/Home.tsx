import { useState, useEffect } from 'react';
import { WalletCard } from '@/components/WalletCard';
import { BottomNav } from '@/components/BottomNav';
import { TestModeToggle } from '@/components/TestControls';
import { OnboardingTutorial, useOnboarding } from '@/components/OnboardingTutorial';
import { GameStatusCard } from '@/components/GameStatusCard';
import { BadgeCelebration } from '@/components/BadgeCelebration';
import { GameHistory } from '@/components/GameHistory';
import { useBadgeUnlock } from '@/hooks/useBadgeUnlock';
import { Zap, Trophy, Users, ChevronRight, Flame, Bell, TrendingUp, Play, Calendar, Sparkles, Crown, Radio } from 'lucide-react';
import { useGame } from '@/contexts/GameContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLiveGame } from '@/hooks/useLiveGame';
import { useNavigate } from 'react-router-dom';
import { useSounds } from '@/hooks/useSounds';
import { useHaptics } from '@/hooks/useHaptics';
import { supabase } from '@/integrations/supabase/client';

// Mock games for test mode
const mockActiveGames = [
  { id: 'mock-1', name: 'Fastest Finger', status: 'live', pool_value: 35000, participant_count: 23, countdown: 45, entry_fee: 700, payout_type: 'top3', payout_distribution: [0.5, 0.3, 0.2], max_duration: 20, start_time: new Date(Date.now() - 5 * 60 * 1000).toISOString() },
  { id: 'mock-2', name: 'Speed Rush', status: 'live', pool_value: 18500, participant_count: 15, countdown: 32, entry_fee: 500, payout_type: 'winner_takes_all', payout_distribution: [1.0], max_duration: 15, start_time: new Date(Date.now() - 3 * 60 * 1000).toISOString() },
  { id: 'mock-3', name: 'Quick Draw', status: 'scheduled', pool_value: 12000, participant_count: 8, countdown: 180, entry_fee: 0, payout_type: 'top5', payout_distribution: [0.4, 0.25, 0.15, 0.12, 0.08], max_duration: 10, is_sponsored: true, sponsored_amount: 50000 },
  { id: 'mock-4', name: 'Lightning Round', status: 'scheduled', pool_value: 8000, participant_count: 5, countdown: 300, entry_fee: 200, payout_type: 'top3', payout_distribution: [0.5, 0.3, 0.2], max_duration: 5 },
];

const mockTestWinners = [
  { id: 'tw1', type: 'finger_win' as const, playerName: 'CryptoKing', playerAvatar: '👑', amount: 15750, position: 1 },
  { id: 'tw2', type: 'finger_win' as const, playerName: 'LuckyAce', playerAvatar: '🎰', amount: 9450, position: 2 },
  { id: 'tw3', type: 'finger_win' as const, playerName: 'FastHands', playerAvatar: '⚡', amount: 6300, position: 3 },
  { id: 'tw4', type: 'finger_win' as const, playerName: 'QuickDraw', playerAvatar: '🎯', amount: 4200, position: 1 },
  { id: 'tw5', type: 'finger_win' as const, playerName: 'ProPlayer', playerAvatar: '🎮', amount: 3150, position: 2 },
];

export const Home = () => {
  const { isTestMode } = useGame();
  const { profile } = useAuth();
  const { game, participants, fetchAllActiveGames } = useLiveGame();
  const navigate = useNavigate();
  const { play } = useSounds();
  const { buttonClick } = useHaptics();
  const { showOnboarding, completeOnboarding } = useOnboarding();
  const [recentWinners, setRecentWinners] = useState<any[]>([]);
  const [allGames, setAllGames] = useState<any[]>([]);
  const [activeNotification, setActiveNotification] = useState(0);

  // Badge unlock celebration
  const { newBadge, showCelebration, dismissCelebration } = useBadgeUnlock({
    total_wins: profile?.total_wins || 0,
    games_played: profile?.games_played || 0,
  });

  // Fetch all active games and subscribe to real-time updates
  useEffect(() => {
    if (isTestMode) return;

    const loadGames = async () => {
      const games = await fetchAllActiveGames();
      setAllGames(games);
    };
    loadGames();

    const gamesChannel = supabase
      .channel('home-games-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fastest_finger_games' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setAllGames(prev => [payload.new as any, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as any;
            setAllGames(prev => prev.map(g => g.id === updated.id ? { ...g, ...updated } : g).filter(g => g.status === 'live' || g.status === 'scheduled' || g.status === 'open'));
          } else if (payload.eventType === 'DELETE') {
            setAllGames(prev => prev.filter(g => g.id !== (payload.old as any).id));
          }
        }
      )
      .subscribe();

    const participantsChannel = supabase
      .channel('home-participants-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fastest_finger_participants' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newP = payload.new as any;
            setAllGames(prev => prev.map(g => {
              if (g.id === newP.game_id) {
                return { 
                  ...g, 
                  participant_count: (g.participant_count || 0) + 1,
                  pool_value: (g.pool_value || 0) + (g.entry_fee || 700)
                };
              }
              return g;
            }));
          } else if (payload.eventType === 'DELETE') {
            const oldP = payload.old as any;
            setAllGames(prev => prev.map(g => {
              if (g.id === oldP.game_id) {
                return { 
                  ...g, 
                  participant_count: Math.max(0, (g.participant_count || 0) - 1),
                  pool_value: Math.max(0, (g.pool_value || 0) - (g.entry_fee || 700))
                };
              }
              return g;
            }));
          }
        }
      )
      .subscribe();

    const winnersChannel = supabase
      .channel('home-winners-realtime')
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

    return () => {
      supabase.removeChannel(gamesChannel);
      supabase.removeChannel(winnersChannel);
      supabase.removeChannel(participantsChannel);
    };
  }, [isTestMode, fetchAllActiveGames]);

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
  }, [isTestMode]);

  const displayGames = isTestMode ? mockActiveGames : allGames;
  const liveGames = displayGames.filter(g => g.status === 'live');
  const scheduledGames = displayGames.filter(g => g.status === 'scheduled' || g.status === 'open');
  const userRank = profile?.weekly_rank || Math.ceil((profile?.rank_points || 0) / 100) || 1;

  // Cycle through notifications
  const notifications = [
    liveGames.length > 0 && `🎮 ${liveGames.length} game${liveGames.length > 1 ? 's' : ''} LIVE now!`,
    scheduledGames.length > 0 && `⏰ ${scheduledGames.length} game${scheduledGames.length > 1 ? 's' : ''} starting soon`,
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

  const totalPool = displayGames.reduce((sum, g) => sum + (g.pool_value || 0), 0);

  return (
    <div className="min-h-screen bg-background pb-24">
      {showOnboarding && <OnboardingTutorial onComplete={completeOnboarding} />}
      
      {showCelebration && newBadge && (
        <BadgeCelebration badge={newBadge} onDismiss={dismissCelebration} />
      )}
      
      <div className="p-4 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pt-2">
          <div>
            <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
              <span className="text-primary">Fortunes</span>HQ
              <Sparkles className="w-5 h-5 text-gold" />
            </h1>
            <div className="flex items-center gap-3 mt-1">
              {liveGames.length > 0 && (
                <span className="flex items-center gap-1.5 text-xs font-medium text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  {liveGames.length} Live
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
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 px-4 py-3">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent" />
            <div className="relative flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                <Bell className="w-4 h-4 text-primary" />
              </div>
              <p className="text-sm font-medium text-foreground truncate flex-1">
                {notifications[activeNotification]}
              </p>
              {notifications.length > 1 && (
                <div className="flex gap-1">
                  {notifications.map((_, i) => (
                    <span key={i} className={`w-1.5 h-1.5 rounded-full transition-all ${i === activeNotification ? 'bg-primary w-3' : 'bg-muted'}`} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Wallet - Compact */}
        <WalletCard compact />

        {/* Quick Stats Row */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => { play('click'); buttonClick(); navigate('/rank'); }}
            className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card to-card p-4 text-left hover:border-primary/40 transition-all group"
          >
            <div className="absolute top-0 right-0 w-20 h-20 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/20 transition-colors" />
            <div className="relative flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                <Crown className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Your Rank</p>
                <p className="text-2xl font-black text-foreground">#{userRank}</p>
              </div>
            </div>
          </button>
          
          <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card to-card p-4">
            <div className="absolute top-0 right-0 w-20 h-20 bg-gold/10 rounded-full blur-2xl" />
            <div className="relative flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gold/20 to-gold/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-gold" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Pools</p>
                <p className="text-2xl font-black text-gold">{formatMoney(totalPool)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Winners */}
        {displayActivity.length > 0 && (
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-400" />
                Recent Winners
              </h3>
              <button 
                onClick={() => navigate('/rank')}
                className="text-xs text-primary font-medium flex items-center gap-1"
              >
                View All <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            
            <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
              {displayActivity.slice(0, 5).map((activity, index) => (
                <div key={activity.id} className="flex-shrink-0 flex flex-col items-center gap-2 w-[72px]">
                  <div className="relative">
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br flex items-center justify-center text-2xl border-2 ${
                      index === 0 ? 'from-gold/30 to-gold/10 border-gold/50' :
                      index === 1 ? 'from-silver/30 to-silver/10 border-silver/50' :
                      index === 2 ? 'from-bronze/30 to-bronze/10 border-bronze/50' :
                      'from-card to-muted border-border'
                    }`}>
                      {activity.playerAvatar}
                    </div>
                    <span className="absolute -bottom-1 -right-1 text-base">
                      {activity.position === 1 ? '🥇' : activity.position === 2 ? '🥈' : '🥉'}
                    </span>
                  </div>
                  <div className="text-center w-full">
                    <p className="text-xs font-medium text-foreground truncate">{activity.playerName}</p>
                    <p className="text-xs font-bold text-gold">+{formatMoney(activity.amount || 0)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Live Games Section */}
        {liveGames.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <Radio className="w-3.5 h-3.5 text-green-400" />
                </div>
                Live Now
                <span className="text-xs font-normal text-muted-foreground">({liveGames.length})</span>
              </h2>
              {liveGames.length > 2 && (
                <button onClick={handleGameClick} className="text-xs text-primary font-medium flex items-center gap-1">
                  View All <ChevronRight className="w-3 h-3" />
                </button>
              )}
            </div>
            
            <div className="space-y-3">
              {liveGames.slice(0, 2).map((g) => (
                <GameStatusCard key={g.id} game={g} isTestMode={isTestMode} />
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Games Section */}
        {scheduledGames.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                  <Calendar className="w-3.5 h-3.5 text-yellow-400" />
                </div>
                Coming Soon
                <span className="text-xs font-normal text-muted-foreground">({scheduledGames.length})</span>
              </h2>
            </div>
            
            <div className="space-y-3">
              {scheduledGames.slice(0, 3).map((g) => (
                <GameStatusCard key={g.id} game={g} isTestMode={isTestMode} />
              ))}
            </div>
          </div>
        )}

        {/* No Games State */}
        {displayGames.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
              <Zap className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-bold text-foreground mb-2">No Games Available</h3>
            <p className="text-sm text-muted-foreground">Check back soon for exciting new games!</p>
          </div>
        )}

        {/* Game History CTA */}
        <GameHistory isTestMode={isTestMode} />
      </div>
      
      <BottomNav />
    </div>
  );
};
