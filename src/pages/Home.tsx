import { useState, useEffect } from 'react';
import { WalletCard } from '@/components/WalletCard';
import { BottomNav } from '@/components/BottomNav';
import { TestModeToggle } from '@/components/TestControls';
import { OnboardingTutorial, useOnboarding } from '@/components/OnboardingTutorial';
import { Zap, Trophy, Users, Clock, ChevronRight, Flame, Bell } from 'lucide-react';
import { useGame } from '@/contexts/GameContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLiveGame } from '@/hooks/useLiveGame';
import { useNavigate } from 'react-router-dom';
import { useSounds } from '@/hooks/useSounds';
import { useHaptics } from '@/hooks/useHaptics';
import { supabase } from '@/integrations/supabase/client';

// Mock games for test mode
const mockActiveGames = [
  { id: 'mock-1', name: 'Fastest Finger', status: 'live', pool_value: 35000, participant_count: 23, countdown: 45, entry_fee: 700 },
  { id: 'mock-2', name: 'Speed Rush', status: 'live', pool_value: 18500, participant_count: 15, countdown: 32, entry_fee: 500 },
  { id: 'mock-3', name: 'Quick Draw', status: 'scheduled', pool_value: 12000, participant_count: 8, countdown: 60, entry_fee: 300 },
];

const mockTestWinners = [
  { id: 'tw1', type: 'finger_win' as const, playerName: 'CryptoKing', playerAvatar: '👑', amount: 15750, position: 1 },
  { id: 'tw2', type: 'finger_win' as const, playerName: 'LuckyAce', playerAvatar: '🎰', amount: 9450, position: 2 },
  { id: 'tw3', type: 'finger_win' as const, playerName: 'FastHands', playerAvatar: '⚡', amount: 6300, position: 3 },
  { id: 'tw4', type: 'finger_win' as const, playerName: 'GoldRush', playerAvatar: '💰', amount: 4200, position: 1 },
];

export const Home = () => {
  const { isTestMode } = useGame();
  const { profile } = useAuth();
  const { game, participants, fetchAllActiveGames } = useLiveGame();
  const navigate = useNavigate();
  const { play } = useSounds();
  const { buttonClick } = useHaptics();
  const { showOnboarding, completeOnboarding } = useOnboarding();
  const [nextGameCountdown, setNextGameCountdown] = useState(300);
  const [recentWinners, setRecentWinners] = useState<any[]>([]);
  const [allGames, setAllGames] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<string[]>([]);

  // Fetch all active games and subscribe to real-time updates
  useEffect(() => {
    if (isTestMode) return;

    const loadGames = async () => {
      const games = await fetchAllActiveGames();
      setAllGames(games);
    };
    loadGames();

    // Subscribe to real-time game updates
    const gamesChannel = supabase
      .channel('home-games-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'fastest_finger_games',
        },
        (payload) => {
          console.log('[Home] Game update:', payload.eventType, payload);
          
          if (payload.eventType === 'INSERT') {
            const newGame = payload.new as any;
            setAllGames(prev => [newGame, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as any;
            setAllGames(prev => 
              prev.map(g => g.id === updated.id ? { ...g, ...updated } : g)
                .filter(g => g.status === 'live' || g.status === 'scheduled')
            );
          } else if (payload.eventType === 'DELETE') {
            const deleted = payload.old as any;
            setAllGames(prev => prev.filter(g => g.id !== deleted.id));
          }
        }
      )
      .subscribe();

    // Subscribe to new winners for notifications
    const winnersChannel = supabase
      .channel('home-winners-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'winners',
        },
        async (payload) => {
          console.log('[Home] New winner:', payload);
          const winner = payload.new as any;
          
          // Fetch winner's profile
          const { data: profileData } = await supabase
            .rpc('get_public_profile', { profile_id: winner.user_id });
          const profile = profileData?.[0];
          
          if (profile) {
            setRecentWinners(prev => [{
              ...winner,
              profile
            }, ...prev].slice(0, 5));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(gamesChannel);
      supabase.removeChannel(winnersChannel);
    };
  }, [isTestMode, fetchAllActiveGames]);

  // Real data values
  const displayGames = isTestMode ? mockActiveGames : allGames;
  const liveGames = displayGames.filter(g => g.status === 'live');
  const scheduledGames = displayGames.filter(g => g.status === 'scheduled');
  
  // Primary game to show in hero (first live game or first scheduled)
  const primaryGame = isTestMode 
    ? mockActiveGames[0] 
    : (game || (liveGames[0] || scheduledGames[0]));

  const poolValue = primaryGame?.pool_value || 0;
  const playerCount = primaryGame?.participant_count || participants.length || 0;
  const userRank = profile?.weekly_rank || Math.ceil((profile?.rank_points || 0) / 100) || 1;

  // Countdown for next game when no live game
  useEffect(() => {
    if (!primaryGame || primaryGame.status !== 'live') {
      const timer = setInterval(() => {
        setNextGameCountdown(prev => prev > 0 ? prev - 1 : 300);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [primaryGame]);

  // Generate notifications based on real data
  useEffect(() => {
    const newNotifications: string[] = [];
    if (liveGames.length > 0) {
      newNotifications.push(`🎮 ${liveGames.length} game${liveGames.length > 1 ? 's' : ''} live now!`);
    }
    if (scheduledGames.length > 0) {
      newNotifications.push(`⏰ ${scheduledGames.length} game${scheduledGames.length > 1 ? 's' : ''} starting soon`);
    }
    if (recentWinners.length > 0 && recentWinners[0]?.profile?.username) {
      newNotifications.push(`🏆 ${recentWinners[0].profile.username} just won ₦${recentWinners[0].amount_won?.toLocaleString()}!`);
    }
    setNotifications(newNotifications);
  }, [liveGames.length, scheduledGames.length, recentWinners]);

  // Fetch recent winners
  useEffect(() => {
    if (isTestMode) {
      setRecentWinners([]);
      return;
    }

    const fetchRecentWinners = async () => {
      const { data } = await supabase
        .from('winners')
        .select('*, game:fastest_finger_games(id)')
        .order('created_at', { ascending: false })
        .limit(5);

      if (data) {
        // Fetch profiles for winners using RPC
        const winnersWithProfiles = await Promise.all(
          data.map(async (w) => {
            const { data: profileData } = await supabase
              .rpc('get_public_profile', { profile_id: w.user_id });
            const profile = profileData?.[0];
            return { ...w, profile };
          })
        );
        setRecentWinners(winnersWithProfiles);
      }
    };

    fetchRecentWinners();
  }, [isTestMode]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const formatMoney = (amount: number) => {
    return `₦${amount.toLocaleString()}`;
  };

  const handleJoinGame = () => {
    play('click');
    buttonClick();
    navigate('/finger');
  };

  const handleRankClick = () => {
    play('click');
    buttonClick();
    navigate('/rank');
  };

  // Display activity: real winners when not in test mode, mock when in test mode
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
      {/* Onboarding Tutorial for first-time users */}
      {showOnboarding && <OnboardingTutorial onComplete={completeOnboarding} />}
      <div className="p-4 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pt-2">
          <div>
            <h1 className="text-2xl font-black text-foreground tracking-tight">
              <span className="text-primary">Fortunes</span>HQ
            </h1>
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <span className="live-dot" />
              {liveGames.length > 0 ? `${liveGames.length} Game${liveGames.length > 1 ? 's' : ''} Live!` : 'Live now'}
            </p>
          </div>
          <TestModeToggle />
        </div>

        {/* Notifications Banner */}
        {notifications.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/10 border border-primary/20 overflow-hidden">
            <Bell className="w-4 h-4 text-primary flex-shrink-0" />
            <div className="flex-1 overflow-hidden">
              <p className="text-sm text-foreground truncate animate-pulse">
                {notifications[0]}
              </p>
            </div>
            {notifications.length > 1 && (
              <span className="text-xs text-muted-foreground flex-shrink-0">+{notifications.length - 1}</span>
            )}
          </div>
        )}

        {/* Wallet */}
        <WalletCard compact />

        {/* Hero - Fastest Finger */}
        <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-card via-card to-primary/10">
          {/* Background glow */}
          <div className="absolute top-0 right-0 w-40 h-40 bg-primary/20 rounded-full blur-3xl -z-0" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl -z-0" />
          
          <div className="relative z-10 p-5">
            {/* Live badge */}
            <div className="flex items-center justify-between mb-4">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${
                primaryGame?.status === 'live' 
                  ? 'bg-green-500/20 border-green-500/30' 
                  : 'bg-yellow-500/20 border-yellow-500/30'
              }`}>
                <span className="live-dot" />
                <span className={`text-xs font-bold uppercase tracking-wider ${
                  primaryGame?.status === 'live' ? 'text-green-400' : 'text-yellow-400'
                }`}>
                  {primaryGame?.status === 'live' ? 'Live Now' : primaryGame?.status === 'scheduled' ? 'Starting Soon' : 'No Games'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Users className="w-4 h-4" />
                <span className="text-sm font-medium">{playerCount} players</span>
              </div>
            </div>

            {/* Title */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center glow-primary">
                <Zap className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-black text-foreground">
                  {isTestMode ? 'Fastest Finger' : (primaryGame as any)?.name || 'Fastest Finger'}
                </h2>
                <p className="text-sm text-muted-foreground">Last comment standing wins</p>
              </div>
            </div>

            {/* Pool & Countdown */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="bg-background/50 backdrop-blur-sm rounded-xl p-4 border border-border/30">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Prize Pool</p>
                <p className="text-2xl font-black text-primary">{formatMoney(poolValue)}</p>
              </div>
              <div className="bg-background/50 backdrop-blur-sm rounded-xl p-4 border border-border/30">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                  {primaryGame?.status === 'live' ? 'Countdown' : 'Next Game'}
                </p>
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  <p className="text-2xl font-black text-foreground">
                    {primaryGame?.status === 'live' ? `${primaryGame.countdown}s` : formatTime(nextGameCountdown)}
                  </p>
                </div>
              </div>
            </div>

            {/* CTA */}
            <button
              onClick={handleJoinGame}
              className="w-full btn-primary flex items-center justify-center gap-2 text-lg"
            >
              <Zap className="w-5 h-5" />
              {primaryGame?.status === 'live' ? 'Join Live Game' : 'Enter Lobby'}
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Active Games Count (when multiple games) */}
        {displayGames.length > 1 && (
          <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-card border border-border/30">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-foreground">
                {liveGames.length} live, {scheduledGames.length} upcoming
              </span>
            </div>
            <button 
              onClick={handleJoinGame}
              className="text-xs text-primary font-medium"
            >
              View All →
            </button>
          </div>
        )}

        {/* Your Rank */}
        <button
          onClick={handleRankClick}
          className="w-full card-panel flex items-center justify-between hover:border-primary/40 transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center">
              <Trophy className="w-6 h-6 text-primary" />
            </div>
            <div className="text-left">
              <p className="text-xs text-muted-foreground">Your Weekly Rank</p>
              <p className="text-2xl font-black text-foreground">#{userRank}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-primary">
            <span className="text-sm font-medium">Leaderboard</span>
            <ChevronRight className="w-5 h-5" />
          </div>
        </button>

        {/* Recent Wins */}
        <div className="card-panel">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Flame className="w-4 h-4 text-primary" />
              Recent Wins
            </h3>
          </div>
          
          {displayActivity.length > 0 ? (
            <div className="space-y-3">
              {displayActivity.slice(0, 4).map((activity) => (
                <div key={activity.id} className="flex items-center gap-3 py-2 border-b border-border/20 last:border-0">
                  <div className="w-9 h-9 rounded-full bg-card-elevated flex items-center justify-center text-lg">
                    {activity.playerAvatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{activity.playerName}</p>
                    <p className="text-xs text-muted-foreground">
                      {activity.type === 'finger_win' 
                        ? `${activity.position === 1 ? '🥇' : activity.position === 2 ? '🥈' : '🥉'} ${activity.position === 1 ? '1st' : activity.position === 2 ? '2nd' : '3rd'} Place`
                        : `Rank #${activity.position}`
                      }
                    </p>
                  </div>
                  {activity.amount && (
                    <p className="text-sm font-bold text-gold">+{formatMoney(activity.amount)}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-muted-foreground text-sm">No recent activity</p>
              <p className="text-xs text-muted-foreground mt-1">Be the first to win!</p>
            </div>
          )}
        </div>

        {/* How it works teaser */}
        <div className="card-panel bg-gradient-to-r from-primary/5 to-transparent border-primary/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-foreground">Entry: ₦700</p>
              <p className="text-xs text-muted-foreground">Top 3 commenters win the pool</p>
            </div>
          </div>
        </div>
      </div>
      
      <BottomNav />
    </div>
  );
};
