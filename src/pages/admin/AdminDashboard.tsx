import { useAdmin } from '@/contexts/AdminContext';
import { useAdminStats } from '@/hooks/useAdminStats';
import { StatCard } from '@/components/admin/StatCard';
import { MiniChart } from '@/components/admin/MiniChart';
import { Zap, Users, Wallet, TrendingUp, Trophy, Activity } from 'lucide-react';
import { useRealtimeActivity } from '@/hooks/useRealtimeActivity';

export const AdminDashboard = () => {
  const { currentGame, games } = useAdmin();
  const { stats, weeklyStats, loading } = useAdminStats();
  const { activities } = useRealtimeActivity(6);

  // Transform weekly stats for charts
  const dailyGamesData = weeklyStats.map(d => ({ name: d.date, value: d.games }));
  const dailyRevenueData = weeklyStats.map(d => ({ name: d.date, value: d.revenue }));
  const dailyEntriesData = weeklyStats.map(d => ({ name: d.date, value: d.entries }));

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'game_start': return <Zap className="w-4 h-4 text-primary" />;
      case 'game_end': return <Trophy className="w-4 h-4 text-secondary" />;
      case 'finger_win': return <Trophy className="w-4 h-4 text-gold" />;
      default: return <Activity className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getActivityMessage = (activity: typeof activities[0]) => {
    switch (activity.type) {
      case 'finger_win':
        return `${activity.playerName} won ₦${(activity.amount || 0).toLocaleString()}`;
      case 'game_start':
        return `${activity.gameName || 'Game'} is now LIVE`;
      case 'game_end':
        return `${activity.gameName || 'Game'} ended`;
      default:
        return activity.gameName || 'Activity';
    }
  };

  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-foreground">Dashboard Overview</h1>
          <p className="text-sm text-muted-foreground">Real-time platform metrics and activity</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-card rounded-full border border-border">
          <span className={`w-2 h-2 rounded-full ${currentGame?.status === 'live' ? 'bg-green-500 animate-pulse' : 'bg-muted'}`} />
          <span className="text-xs font-medium">
            {currentGame?.status === 'live' ? 'Game Live' : 'No Active Game'}
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          label="Active Games"
          value={stats.activeGames}
          icon={Zap}
          variant={stats.activeGames > 0 ? 'primary' : 'default'}
        />
        <StatCard
          label="Entries Today"
          value={stats.totalEntriesToday}
          icon={Users}
          trend={{ value: 12, positive: true }}
        />
        <StatCard
          label="Payouts Today"
          value={`₦${stats.totalPayoutsToday.toLocaleString()}`}
          icon={Wallet}
        />
        <StatCard
          label="Revenue Today"
          value={`₦${stats.platformRevenueToday.toLocaleString()}`}
          icon={TrendingUp}
          variant="gold"
          trend={{ value: 8, positive: true }}
        />
        <StatCard
          label="Current Pool"
          value={currentGame ? `₦${currentGame.poolValue.toLocaleString()}` : '₦0'}
          icon={Trophy}
          variant="primary"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Games */}
        <div className="bg-card rounded-xl border border-border p-4">
          <h3 className="text-sm font-bold text-foreground mb-4">Daily Games Played</h3>
          <MiniChart data={dailyGamesData} type="bar" color="#0FB9B1" height={160} showAxis />
        </div>

        {/* Daily Revenue */}
        <div className="bg-card rounded-xl border border-border p-4">
          <h3 className="text-sm font-bold text-foreground mb-4">Daily Revenue</h3>
          <MiniChart data={dailyRevenueData} color="#E6C87A" height={160} showAxis />
        </div>

        {/* Daily Entries */}
        <div className="bg-card rounded-xl border border-border p-4">
          <h3 className="text-sm font-bold text-foreground mb-4">Daily Entries</h3>
          <MiniChart data={dailyEntriesData} color="#0FB9B1" height={160} showAxis />
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              Live Activity
            </h3>
          </div>
          <div className="space-y-3">
            {activities.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No recent activity</p>
            ) : (
              activities.map((activity) => (
                <div key={activity.id} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">{getActivityMessage(activity)}</p>
                    <p className="text-[10px] text-muted-foreground">{formatTimeAgo(activity.timestamp)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bg-card rounded-xl border border-border p-4">
          <h3 className="text-sm font-bold text-foreground mb-4">Platform Health</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-muted/30 rounded-lg">
              <p className="text-[10px] text-muted-foreground uppercase mb-1">Games Today</p>
              <p className="text-xl font-black text-foreground">{stats.gamesPlayedToday}</p>
            </div>
            <div className="p-3 bg-muted/30 rounded-lg">
              <p className="text-[10px] text-muted-foreground uppercase mb-1">Avg Duration</p>
              <p className="text-xl font-black text-foreground">{stats.avgGameDuration || '--'} min</p>
            </div>
            <div className="p-3 bg-muted/30 rounded-lg">
              <p className="text-[10px] text-muted-foreground uppercase mb-1">DAU</p>
              <p className="text-xl font-black text-foreground">{stats.dau}</p>
            </div>
            <div className="p-3 bg-muted/30 rounded-lg">
              <p className="text-[10px] text-muted-foreground uppercase mb-1">Total Users</p>
              <p className="text-xl font-black text-foreground">{stats.totalUsers.toLocaleString()}</p>
            </div>
          </div>

          {/* Platform Balance */}
          <div className="mt-4 p-4 bg-primary/10 rounded-xl border border-primary/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase mb-1">User Balances Total</p>
                <p className="text-2xl font-black text-primary">₦{stats.totalUserBalances.toLocaleString()}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-primary/50" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
