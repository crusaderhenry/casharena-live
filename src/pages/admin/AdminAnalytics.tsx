import { useAdmin } from '@/contexts/AdminContext';
import { MiniChart } from '@/components/admin/MiniChart';
import { StatCard } from '@/components/admin/StatCard';
import { Users, Clock, TrendingUp, Zap, DollarSign, Activity } from 'lucide-react';

export const AdminAnalytics = () => {
  const { stats } = useAdmin();

  // Mock analytics data
  const dauData = [
    { name: 'Mon', value: 120 },
    { name: 'Tue', value: 145 },
    { name: 'Wed', value: 138 },
    { name: 'Thu', value: 156 },
    { name: 'Fri', value: 189 },
    { name: 'Sat', value: 234 },
    { name: 'Sun', value: 198 },
  ];

  const mauData = [
    { name: 'Jan', value: 1200 },
    { name: 'Feb', value: 1450 },
    { name: 'Mar', value: 1680 },
    { name: 'Apr', value: 1890 },
    { name: 'May', value: 2100 },
    { name: 'Jun', value: 2340 },
  ];

  const retentionData = [
    { name: 'Day 1', value: 100 },
    { name: 'Day 3', value: 72 },
    { name: 'Day 7', value: 58 },
    { name: 'Day 14', value: 45 },
    { name: 'Day 30', value: 38 },
  ];

  const gameDurationData = [
    { name: '5-10m', value: 15 },
    { name: '10-15m', value: 28 },
    { name: '15-20m', value: 35 },
    { name: '20-25m', value: 18 },
    { name: '25-30m', value: 4 },
  ];

  const revenuePerGameData = [
    { name: 'Mon', value: 1250 },
    { name: 'Tue', value: 1450 },
    { name: 'Wed', value: 1320 },
    { name: 'Thu', value: 1680 },
    { name: 'Fri', value: 1890 },
    { name: 'Sat', value: 2100 },
    { name: 'Sun', value: 1950 },
  ];

  const mostActiveUsers = [
    { username: 'CryptoKing', games: 89, avatar: '🎮' },
    { username: 'LuckyAce', games: 76, avatar: '🎯' },
    { username: 'FastHands', games: 72, avatar: '⚡' },
    { username: 'NightOwl', games: 68, avatar: '🦉' },
    { username: 'TurboMax', games: 65, avatar: '🚀' },
  ];

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
          trend={{ value: 12, positive: true }}
          variant="primary"
        />
        <StatCard
          label="Monthly Active Users"
          value={stats.mau.toLocaleString()}
          icon={Activity}
          trend={{ value: 8, positive: true }}
        />
        <StatCard
          label="Avg Game Duration"
          value="18 min"
          icon={Clock}
        />
        <StatCard
          label="Retention Rate"
          value="38%"
          icon={TrendingUp}
          trend={{ value: 5, positive: true }}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* DAU Chart */}
        <div className="bg-card rounded-xl border border-border p-4">
          <h3 className="text-sm font-bold text-foreground mb-4">Daily Active Users (This Week)</h3>
          <MiniChart data={dauData} color="#0FB9B1" height={200} showAxis />
        </div>

        {/* MAU Chart */}
        <div className="bg-card rounded-xl border border-border p-4">
          <h3 className="text-sm font-bold text-foreground mb-4">Monthly Active Users (6 Months)</h3>
          <MiniChart data={mauData} type="bar" color="#0FB9B1" height={200} showAxis />
        </div>

        {/* Retention Chart */}
        <div className="bg-card rounded-xl border border-border p-4">
          <h3 className="text-sm font-bold text-foreground mb-4">User Retention (%)</h3>
          <MiniChart data={retentionData} color="#E6C87A" height={200} showAxis />
        </div>

        {/* Game Duration Distribution */}
        <div className="bg-card rounded-xl border border-border p-4">
          <h3 className="text-sm font-bold text-foreground mb-4">Game Duration Distribution</h3>
          <MiniChart data={gameDurationData} type="bar" color="#0FB9B1" height={200} showAxis />
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
          <MiniChart data={revenuePerGameData} color="#E6C87A" height={180} showAxis />
          <div className="mt-4 p-3 bg-gold/10 rounded-xl border border-gold/30">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Avg Revenue/Game</span>
              <span className="text-lg font-black text-gold">₦1,663</span>
            </div>
          </div>
        </div>

        {/* Most Active Users */}
        <div className="bg-card rounded-xl border border-border p-4">
          <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            Most Active Users (This Month)
          </h3>
          <div className="space-y-3">
            {mostActiveUsers.map((user, index) => (
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
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
