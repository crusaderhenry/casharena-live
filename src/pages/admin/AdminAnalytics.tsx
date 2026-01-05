import { useState, useEffect } from 'react';
import { MiniChart } from '@/components/admin/MiniChart';
import { StatCard } from '@/components/admin/StatCard';
import { Users, Clock, TrendingUp, Zap, DollarSign, Activity } from 'lucide-react';
import { useAdminStats } from '@/hooks/useAdminStats';
import { supabase } from '@/integrations/supabase/client';

interface TopUser {
  username: string;
  avatar: string;
  games: number;
}

export const AdminAnalytics = () => {
  const { stats, weeklyStats, loading } = useAdminStats();
  const [topUsers, setTopUsers] = useState<TopUser[]>([]);

  // Transform weekly stats for charts
  const dauData = weeklyStats.map(d => ({ name: d.date, value: d.entries }));
  const revenueData = weeklyStats.map(d => ({ name: d.date, value: d.revenue }));
  const gamesData = weeklyStats.map(d => ({ name: d.date, value: d.games }));

  // Fetch most active users
  useEffect(() => {
    const fetchTopUsers = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('username, avatar, games_played')
        .order('games_played', { ascending: false })
        .limit(5);

      if (data) {
        setTopUsers(data.map(u => ({
          username: u.username,
          avatar: u.avatar || '🎮',
          games: u.games_played,
        })));
      }
    };
    fetchTopUsers();
  }, []);

  // Calculate retention (approximation)
  const retentionData = [
    { name: 'Day 1', value: 100 },
    { name: 'Day 3', value: stats.mau > 0 ? Math.round((stats.dau / stats.mau) * 100 * 0.72) : 72 },
    { name: 'Day 7', value: stats.mau > 0 ? Math.round((stats.dau / stats.mau) * 100 * 0.58) : 58 },
    { name: 'Day 14', value: stats.mau > 0 ? Math.round((stats.dau / stats.mau) * 100 * 0.45) : 45 },
    { name: 'Day 30', value: stats.mau > 0 ? Math.round((stats.dau / stats.mau) * 100 * 0.38) : 38 },
  ];

  const avgRevenuePerGame = weeklyStats.length > 0 && weeklyStats.some(d => d.games > 0)
    ? Math.round(weeklyStats.reduce((sum, d) => sum + d.revenue, 0) / Math.max(weeklyStats.reduce((sum, d) => sum + d.games, 0), 1))
    : 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-foreground">Analytics</h1>
        <p className="text-sm text-muted-foreground">Platform insights and performance metrics</p>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Daily Active Users"
          value={stats.dau}
          icon={Users}
          variant="primary"
        />
        <StatCard
          label="Total Users"
          value={stats.totalUsers.toLocaleString()}
          icon={Activity}
        />
        <StatCard
          label="Avg Game Duration"
          value={`${stats.avgGameDuration || '--'} min`}
          icon={Clock}
        />
        <StatCard
          label="New Users Today"
          value={stats.newUsersToday}
          icon={TrendingUp}
          variant="gold"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Entries Chart */}
        <div className="bg-card rounded-xl border border-border p-4">
          <h3 className="text-sm font-bold text-foreground mb-4">Daily Entries (This Week)</h3>
          <MiniChart data={dauData} color="#0FB9B1" height={200} showAxis />
        </div>

        {/* Games Chart */}
        <div className="bg-card rounded-xl border border-border p-4">
          <h3 className="text-sm font-bold text-foreground mb-4">Games Played (This Week)</h3>
          <MiniChart data={gamesData} type="bar" color="#0FB9B1" height={200} showAxis />
        </div>

        {/* Retention Chart */}
        <div className="bg-card rounded-xl border border-border p-4">
          <h3 className="text-sm font-bold text-foreground mb-4">Estimated User Retention (%)</h3>
          <MiniChart data={retentionData} color="#E6C87A" height={200} showAxis />
        </div>

        {/* Revenue Chart */}
        <div className="bg-card rounded-xl border border-border p-4">
          <h3 className="text-sm font-bold text-foreground mb-4">Daily Revenue (This Week)</h3>
          <MiniChart data={revenueData} type="bar" color="#E6C87A" height={200} showAxis />
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Per Game */}
        <div className="bg-card rounded-xl border border-border p-4">
          <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-gold" />
            Revenue Per Game (Avg)
          </h3>
          <MiniChart data={revenueData} color="#E6C87A" height={180} showAxis />
          <div className="mt-4 p-3 bg-gold/10 rounded-xl border border-gold/30">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Avg Revenue/Game</span>
              <span className="text-lg font-black text-gold">
                ₦{avgRevenuePerGame.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Most Active Users */}
        <div className="bg-card rounded-xl border border-border p-4">
          <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            Most Active Users
          </h3>
          <div className="space-y-3">
            {topUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No data available</p>
            ) : (
              topUsers.map((user, index) => (
                <div key={user.username} className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl">
                  <span className="text-lg w-6 text-center font-bold text-muted-foreground">
                    {index + 1}
                  </span>
                  <div className="w-10 h-10 rounded-full bg-card flex items-center justify-center text-xl">
                    {user.avatar}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{user.username}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-primary">{user.games}</p>
                    <p className="text-[10px] text-muted-foreground">games</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
