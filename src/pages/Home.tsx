import { useState, useEffect } from 'react';
import { WalletCard } from '@/components/WalletCard';
import { BottomNav } from '@/components/BottomNav';
import { TestModeToggle } from '@/components/TestControls';
import { OnboardingTutorial, useOnboarding } from '@/components/OnboardingTutorial';
import { getPayoutLabel } from '@/components/PrizeDistribution';
import { Zap, Trophy, Users, Clock, ChevronRight, Flame, Bell, TrendingUp, Play, Calendar } from 'lucide-react';
import { useGame } from '@/contexts/GameContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLiveGame } from '@/hooks/useLiveGame';
import { useNavigate } from 'react-router-dom';
import { useSounds } from '@/hooks/useSounds';
import { useHaptics } from '@/hooks/useHaptics';
import { supabase } from '@/integrations/supabase/client';

// Mock games for test mode
const mockActiveGames = [
  { id: 'mock-1', name: 'Fastest Finger', status: 'live', pool_value: 35000, participant_count: 23, countdown: 45, entry_fee: 700, payout_type: 'top3', payout_distribution: [0.5, 0.3, 0.2], max_duration: 20 },
  { id: 'mock-2', name: 'Speed Rush', status: 'live', pool_value: 18500, participant_count: 15, countdown: 32, entry_fee: 500, payout_type: 'winner_takes_all', payout_distribution: [1.0], max_duration: 15 },
  { id: 'mock-3', name: 'Quick Draw', status: 'scheduled', pool_value: 12000, participant_count: 8, countdown: 180, entry_fee: 300, payout_type: 'top5', payout_distribution: [0.4, 0.25, 0.15, 0.12, 0.08], max_duration: 10 },
  { id: 'mock-4', name: 'Lightning Round', status: 'scheduled', pool_value: 8000, participant_count: 5, countdown: 300, entry_fee: 200, payout_type: 'top3', payout_distribution: [0.5, 0.3, 0.2], max_duration: 5 },
];

const mockTestWinners = [
  { id: 'tw1', type: 'finger_win' as const, playerName: 'CryptoKing', playerAvatar: '👑', amount: 15750, position: 1 },
  { id: 'tw2', type: 'finger_win' as const, playerName: 'LuckyAce', playerAvatar: '🎰', amount: 9450, position: 2 },
  { id: 'tw3', type: 'finger_win' as const, playerName: 'FastHands', playerAvatar: '⚡', amount: 6300, position: 3 },
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
            setAllGames(prev => prev.map(g => g.id === updated.id ? { ...g, ...updated } : g).filter(g => g.status === 'live' || g.status === 'scheduled'));
          } else if (payload.eventType === 'DELETE') {
            setAllGames(prev => prev.filter(g => g.id !== (payload.old as any).id));
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
  const scheduledGames = displayGames.filter(g => g.status === 'scheduled');
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

  const formatMoney = (amount: number) => `₦${amount.toLocaleString()}`;

  const handleGameClick = (gameId?: string) => {
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

  return (
    <div className="min-h-screen bg-background pb-24">
      {showOnboarding && <OnboardingTutorial onComplete={completeOnboarding} />}
      
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

        {/* Wallet - Compact */}
        <WalletCard compact />

        {/* Live Games Section */}
        {liveGames.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Play className="w-4 h-4 text-green-400" fill="currentColor" />
                Live Now
              </h2>
              {liveGames.length > 2 && (
                <button onClick={() => handleGameClick()} className="text-xs text-primary font-medium">
                  View All →
                </button>
              )}
            </div>
            
            <div className="space-y-3">
              {liveGames.slice(0, 2).map((g) => (
                <button
                  key={g.id}
                  onClick={() => handleGameClick(g.id)}
                  className="w-full relative overflow-hidden rounded-2xl bg-gradient-to-br from-card via-card to-green-500/5 border border-green-500/30 p-4 text-left transition-all hover:border-green-500/50 active:scale-[0.98]"
                >
                  {/* Live indicator glow */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-3xl" />
                  
                  <div className="relative z-10">
                    {/* Top row */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                          <Zap className="w-6 h-6 text-green-400" />
                        </div>
                        <div>
                          <h3 className="font-bold text-foreground">{g.name || 'Fastest Finger'}</h3>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                            <span className="flex items-center gap-1">
                              <Trophy className="w-3 h-3 text-gold" />
                              {getPayoutLabel(g.payout_type || 'top3')}
                            </span>
                            <span>•</span>
                            <span>₦{g.entry_fee}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/20">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-xs font-bold text-green-400">LIVE</span>
                      </div>
                    </div>
                    
                    {/* Stats row */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">Prize Pool</p>
                        <p className="text-xl font-black text-primary">{formatMoney(g.pool_value)}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">Players</p>
                          <p className="font-bold text-foreground flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" /> {g.participant_count}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">Timer</p>
                          <p className="font-bold text-foreground flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-primary" /> {g.countdown}s
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Games Section */}
        {scheduledGames.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Calendar className="w-4 h-4 text-yellow-400" />
                Coming Soon
              </h2>
            </div>
            
            <div className="space-y-2">
              {scheduledGames.slice(0, 3).map((g) => (
                <button
                  key={g.id}
                  onClick={() => handleGameClick(g.id)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-card border border-border/50 hover:border-yellow-500/30 transition-all active:scale-[0.98]"
                >
                  <div className="w-10 h-10 rounded-lg bg-yellow-500/15 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-yellow-400" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-foreground text-sm">{g.name || 'Fastest Finger'}</h4>
                      <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400 font-medium">
                        {getPayoutLabel(g.payout_type || 'top3')}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {g.participant_count} joined • ₦{g.entry_fee} entry
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary text-sm">{formatMoney(g.pool_value)}</p>
                    <p className="text-xs text-muted-foreground">pool</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* No Games State */}
        {displayGames.length === 0 && (
          <div className="card-panel text-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
              <Zap className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-bold text-foreground mb-2">No Games Available</h3>
            <p className="text-sm text-muted-foreground">Check back soon for exciting new games!</p>
          </div>
        )}

        {/* Quick Stats Row */}
        <div className="grid grid-cols-2 gap-3">
          {/* Your Rank */}
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
          
          {/* Total Pool */}
          <div className="card-panel flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold/15 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-gold" />
            </div>
            <div className="text-left">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Pools</p>
              <p className="text-xl font-black text-gold">
                {formatMoney(displayGames.reduce((sum, g) => sum + (g.pool_value || 0), 0))}
              </p>
            </div>
          </div>
        </div>

        {/* Recent Wins */}
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
      </div>
      
      <BottomNav />
    </div>
  );
};