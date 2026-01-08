import { useState, useEffect } from 'react';
import { WalletCard } from '@/components/WalletCard';
import { BottomNav } from '@/components/BottomNav';

import { CycleStatusCard } from '@/components/CycleStatusCard';
import { WinnerStories } from '@/components/WinnerStories';
import { BadgeCelebration } from '@/components/BadgeCelebration';
import { UsernamePromptModal } from '@/components/UsernamePromptModal';
import { AuthPromptModal } from '@/components/AuthPromptModal';
import { useBadgeUnlock } from '@/hooks/useBadgeUnlock';

import { useOAuthUsername } from '@/hooks/useOAuthUsername';
import { Zap, Trophy, ChevronRight, Bell, TrendingUp, Calendar, Sparkles, Crown, Radio, Play, Swords, Clock } from 'lucide-react';
import { NotificationCenter } from '@/components/NotificationCenter';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveCycles } from '@/hooks/useActiveCycles';
import { useNavigate } from 'react-router-dom';
import { useSounds } from '@/hooks/useSounds';
import { useHaptics } from '@/hooks/useHaptics';
import { supabase } from '@/integrations/supabase/client';

export const Home = () => {
  const { profile, user } = useAuth();
  const { cycles, waitingCycles, openingCycles, liveCycles, loading, refetch } = useActiveCycles();
  const navigate = useNavigate();
  const { play } = useSounds();
  const { buttonClick } = useHaptics();
  const [recentWinners, setRecentWinners] = useState<any[]>([]);
  const [activeNotification, setActiveNotification] = useState(0);
  const [userParticipations, setUserParticipations] = useState<Set<string>>(new Set());
  const [showRankAuthPrompt, setShowRankAuthPrompt] = useState(false);

  const { newBadge, showCelebration, dismissCelebration } = useBadgeUnlock({
    total_wins: profile?.total_wins || 0,
    games_played: profile?.games_played || 0,
  });

  // Check if OAuth user needs to set username
  const { needsUsername, markComplete } = useOAuthUsername(user?.id);


  // Fetch user's current participations
  useEffect(() => {
    const fetchParticipations = async () => {
      if (!user) return;
      
      const cycleIds = cycles.map(c => c.id);
      if (cycleIds.length === 0) return;

      const { data } = await supabase
        .from('cycle_participants')
        .select('cycle_id')
        .eq('user_id', user.id)
        .in('cycle_id', cycleIds);

      setUserParticipations(new Set(data?.map(p => p.cycle_id) || []));
    };

    fetchParticipations();
  }, [user, cycles]);

  // Fetch recent winners from cycle_winners
  useEffect(() => {
    const fetchRecentWinners = async () => {
      const { data } = await supabase
        .from('cycle_winners')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (data && data.length > 0) {
        const winnersWithProfiles = await Promise.all(
          data.map(async (w) => {
            const { data: profileData } = await supabase.rpc('get_public_profile', { profile_id: w.user_id });
            return { ...w, profile: profileData?.[0] };
          })
        );
        setRecentWinners(winnersWithProfiles);
      } else {
        // Fallback to old winners table for historical data
        const { data: oldWinners } = await supabase
          .from('winners')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(5);
        
        if (oldWinners) {
          const winnersWithProfiles = await Promise.all(
            oldWinners.map(async (w) => {
              const { data: profileData } = await supabase.rpc('get_public_profile', { profile_id: w.user_id });
              return { ...w, prize_amount: w.amount_won, profile: profileData?.[0] };
            })
          );
          setRecentWinners(winnersWithProfiles);
        }
      }
    };
    fetchRecentWinners();
  }, []);

  // Real-time updates for cycles
  useEffect(() => {
    const channel = supabase
      .channel('home-cycles-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_cycles' }, () => {
        refetch();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'cycle_winners' }, async (payload) => {
        const winner = payload.new as any;
        const { data: profileData } = await supabase.rpc('get_public_profile', { profile_id: winner.user_id });
        if (profileData?.[0]) {
          setRecentWinners(prev => [{ ...winner, profile: profileData[0] }, ...prev].slice(0, 5));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  const userRank = profile?.weekly_rank || Math.ceil((profile?.rank_points || 0) / 100) || 1;

  // Notifications
  const notifications = [
    liveCycles.length > 0 && `🎮 ${liveCycles.length} game${liveCycles.length > 1 ? 's' : ''} LIVE now!`,
    openingCycles.length > 0 && `⏰ ${openingCycles.length} game${openingCycles.length > 1 ? 's' : ''} open for entry`,
    waitingCycles.length > 0 && `📅 ${waitingCycles.length} game${waitingCycles.length > 1 ? 's' : ''} coming soon`,
    recentWinners[0]?.profile?.username && `🏆 ${recentWinners[0].profile.username} won ₦${(recentWinners[0].prize_amount || recentWinners[0].amount_won)?.toLocaleString()}!`,
  ].filter(Boolean) as string[];

  useEffect(() => {
    if (notifications.length <= 1) return;
    const timer = setInterval(() => {
      setActiveNotification(prev => (prev + 1) % notifications.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [notifications.length]);

  const formatMoney = (amount: number) => {
    if (amount >= 1_000_000) return `₦${(amount / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
    if (amount >= 1_000) return `₦${(amount / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
    return `₦${amount.toLocaleString()}`;
  };

  const handleViewAllGames = () => {
    play('click');
    buttonClick();
    navigate('/arena');
  };

  const displayActivity = recentWinners.map((w) => ({
    id: w.id,
    playerName: w.profile?.username || 'Unknown',
    playerAvatar: w.profile?.avatar || '🎮',
    amount: w.prize_amount || w.amount_won,
    position: w.position,
  }));

  const totalPool = cycles.reduce((sum, c) => sum + c.pool_value + (c.sponsored_prize_amount || 0), 0);

  return (
    <div className="min-h-screen bg-background pb-24">

      {/* Username prompt for OAuth users */}
      {user?.id && needsUsername && (
        <UsernamePromptModal
          open={needsUsername}
          userId={user.id}
          onComplete={markComplete}
        />
      )}
      
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
              {liveCycles.length > 0 && (
                <span className="flex items-center gap-1.5 text-xs font-medium text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  {liveCycles.length} Live
                </span>
              )}
              {(openingCycles.length + waitingCycles.length) > 0 && (
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  {openingCycles.length + waitingCycles.length} Upcoming
                </span>
              )}
            </div>
          </div>
          
          {/* Notification Center */}
          <NotificationCenter />
        </div>

        {/* Notification Ticker */}
        {notifications.length > 0 && (
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 px-4 py-3">
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

        {/* Wallet */}
        <WalletCard compact />

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => { 
              play('click'); 
              buttonClick(); 
              if (!user) {
                setShowRankAuthPrompt(true);
              } else {
                navigate('/rank'); 
              }
            }}
            className="relative overflow-hidden rounded-2xl border border-border bg-card p-4 text-left hover:border-primary/40 transition-all group"
          >
            <div className="absolute top-0 right-0 w-20 h-20 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/20 transition-colors" />
            <div className="relative flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                <Crown className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Your Rank</p>
                <p className="text-2xl font-black text-foreground">{user ? `#${userRank}` : '—'}</p>
              </div>
            </div>
          </button>
          
          <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-4">
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

        {/* Winner Stories */}
        <WinnerStories winners={displayActivity} />

        {/* Live Games */}
        {liveCycles.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-red-500/20 flex items-center justify-center">
                  <Radio className="w-3.5 h-3.5 text-red-400" />
                </div>
                Live Now
              </h2>
            </div>
            
            {liveCycles.map((cycle) => (
              <CycleStatusCard 
                key={cycle.id} 
                cycle={cycle} 
                isParticipant={userParticipations.has(cycle.id)}
              />
            ))}
          </div>
        )}

        {/* Open for Entry */}
        {openingCycles.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <Play className="w-3.5 h-3.5 text-green-400" />
                </div>
                Open for Entry
              </h2>
            </div>
            
            {openingCycles.map((cycle) => (
              <CycleStatusCard 
                key={cycle.id} 
                cycle={cycle}
                isParticipant={userParticipations.has(cycle.id)}
              />
            ))}
          </div>
        )}

        {/* Waiting / Coming Soon */}
        {waitingCycles.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <Clock className="w-3.5 h-3.5 text-blue-400" />
                </div>
                Coming Soon
              </h2>
            </div>
            
            {waitingCycles.map((cycle) => (
              <CycleStatusCard 
                key={cycle.id} 
                cycle={cycle}
                isParticipant={userParticipations.has(cycle.id)}
              />
            ))}
          </div>
        )}

        {/* Loading State */}
        {loading && cycles.length === 0 && (
          <div className="rounded-2xl border border-border bg-card/50 p-8 text-center">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4 animate-pulse">
              <Zap className="w-6 h-6 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">Loading games...</p>
          </div>
        )}

        {/* No Games State */}
        {!loading && cycles.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
              <Zap className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-bold text-foreground mb-2">No Games Available</h3>
            <p className="text-sm text-muted-foreground">New Royal Rumble starting soon!</p>
          </div>
        )}

        {/* View All Games CTA */}
        {cycles.length > 0 && (
          <button
            onClick={handleViewAllGames}
            className="w-full py-4 rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/10 to-transparent text-primary font-bold flex items-center justify-center gap-2 hover:bg-primary/20 transition-colors"
          >
            <Swords className="w-5 h-5" />
            Browse All Games
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>
      
      <AuthPromptModal 
        open={showRankAuthPrompt} 
        onOpenChange={setShowRankAuthPrompt}
        action="rank"
      />
      
      <BottomNav />
    </div>
  );
};