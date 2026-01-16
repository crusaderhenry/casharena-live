import { useAdmin } from '@/contexts/AdminContext';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { Trophy, RotateCcw, Clock, Award, RefreshCw } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { UserBadgeIndicator } from '@/components/UserBadgeIndicator';
import { useNavigate } from 'react-router-dom';

interface LeaderboardUser {
  id: string;
  username: string;
  avatar: string;
  rank_points: number;
  weekly_rank: number | null;
  games_played: number;
  total_wins: number;
}

export const AdminRank = () => {
  const { triggerWeeklyReset } = useAdmin();
  const { weeklyRewards } = usePlatformSettings();
  const navigate = useNavigate();
  const [weeklyCountdown, setWeeklyCountdown] = useState('');
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch leaderboard from database function (includes mock users)
  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_leaderboard', { limit_count: 100 });
      if (error) throw error;
      setLeaderboard(data || []);
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch and real-time subscription
  useEffect(() => {
    fetchLeaderboard();

    // Subscribe to profile changes for real-time updates
    const channel = supabase
      .channel('admin-rank-leaderboard')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => fetchLeaderboard()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'mock_users' },
        () => fetchLeaderboard()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchLeaderboard]);

  // Calculate weekly reset countdown
  useEffect(() => {
    const calculateCountdown = () => {
      const now = new Date();
      const nextSunday = new Date(now);
      nextSunday.setDate(now.getDate() + (7 - now.getDay()));
      nextSunday.setHours(0, 0, 0, 0);
      
      const diff = nextSunday.getTime() - now.getTime();
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      
      setWeeklyCountdown(`${days}d ${hours}h`);
    };

    calculateCountdown();
    const interval = setInterval(calculateCountdown, 60000);
    return () => clearInterval(interval);
  }, []);

  const top10 = leaderboard.slice(0, 10);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-foreground">Rank & Rewards</h1>
          <p className="text-sm text-muted-foreground">Weekly leaderboard management</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchLeaderboard}
            disabled={loading}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <RefreshCw className={`w-5 h-5 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => navigate('/admin/badges')}
            className="flex items-center gap-2 px-4 py-2 bg-primary/20 text-primary rounded-xl font-medium hover:bg-primary/30"
          >
            <Award className="w-4 h-4" />
            Manage Badges
          </button>
          <button
            onClick={triggerWeeklyReset}
            className="flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-400 rounded-xl font-medium hover:bg-red-500/30"
          >
            <RotateCcw className="w-4 h-4" />
            Trigger Weekly Reset
          </button>
        </div>
      </div>

      {/* Weekly Reset Timer */}
      <div className="bg-card rounded-xl border border-primary/30 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center">
              <Clock className="w-7 h-7 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Weekly Reset In</p>
              <p className="text-3xl font-black text-foreground">{weeklyCountdown}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Reset Day</p>
            <p className="text-lg font-bold text-foreground">Sunday 12:00 AM</p>
          </div>
        </div>
      </div>

      {/* Top 10 Leaderboard */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="font-bold text-foreground flex items-center gap-2">
            <Trophy className="w-5 h-5 text-gold" />
            Top 10 Weekly Leaderboard
          </h3>
        </div>
        
        <div className="divide-y divide-border/50">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Loading leaderboard...</div>
          ) : top10.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No users yet</div>
          ) : (
            top10.map((user, index) => (
              <div 
                key={user.id} 
                className={`flex items-center gap-4 p-4 ${
                  index === 0 ? 'bg-gold/5' : 
                  index === 1 ? 'bg-silver/5' : 
                  index === 2 ? 'bg-bronze/5' : ''
                }`}
              >
                {/* Position */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-black ${
                  index === 0 ? 'bg-gold/20 text-gold' :
                  index === 1 ? 'bg-silver/20 text-silver' :
                  index === 2 ? 'bg-bronze/20 text-bronze' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                </div>

                {/* User Info */}
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-xl">
                  {user.avatar}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="font-medium text-foreground">{user.username}</p>
                    <UserBadgeIndicator totalWins={user.total_wins} gamesPlayed={user.games_played} size="sm" />
                  </div>
                  <p className="text-[10px] text-muted-foreground">{user.games_played} games played</p>
                </div>

                {/* Stats */}
                <div className="text-right">
                  <p className="text-lg font-black text-primary">{user.rank_points.toLocaleString()}</p>
                  <p className="text-[10px] text-muted-foreground uppercase">Points</p>
                </div>

                {/* Wins */}
                <div className="text-right">
                  <p className="text-lg font-bold text-gold">{user.total_wins}</p>
                  <p className="text-[10px] text-muted-foreground uppercase">Wins</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Reward Distribution */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
          <Award className="w-5 h-5 text-gold" />
          Weekly Reward Distribution
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-gold/10 rounded-xl border border-gold/30 text-center">
            <span className="text-3xl mb-2 block">🥇</span>
            <p className="text-sm font-medium text-foreground">1st Place</p>
            <p className="text-xl font-black text-gold">₦{weeklyRewards.first.toLocaleString()}</p>
          </div>
          <div className="p-4 bg-silver/10 rounded-xl border border-silver/30 text-center">
            <span className="text-3xl mb-2 block">🥈</span>
            <p className="text-sm font-medium text-foreground">2nd Place</p>
            <p className="text-xl font-black text-silver">₦{weeklyRewards.second.toLocaleString()}</p>
          </div>
          <div className="p-4 bg-bronze/10 rounded-xl border border-bronze/30 text-center">
            <span className="text-3xl mb-2 block">🥉</span>
            <p className="text-sm font-medium text-foreground">3rd Place</p>
            <p className="text-xl font-black text-bronze">₦{weeklyRewards.third.toLocaleString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
