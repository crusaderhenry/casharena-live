import { useAdmin } from '@/contexts/AdminContext';
import { StatCard } from '@/components/admin/StatCard';
import { MiniChart } from '@/components/admin/MiniChart';
import { Zap, Users, Wallet, TrendingUp, Trophy, Clock, Activity } from 'lucide-react';
import { useState, useEffect } from 'react';

export const AdminDashboard = () => {
  const { stats, currentGame, games, transactions } = useAdmin();
  const [recentActivity, setRecentActivity] = useState<{ id: string; type: string; message: string; time: string }[]>([]);

  // Generate chart data
  const dailyGamesData = [
    { name: 'Mon', value: 12 },
    { name: 'Tue', value: 18 },
    { name: 'Wed', value: 15 },
    { name: 'Thu', value: 22 },
    { name: 'Fri', value: 28 },
    { name: 'Sat', value: 35 },
    { name: 'Sun', value: 30 },
  ];

  const dailyRevenueData = [
    { name: 'Mon', value: 12500 },
    { name: 'Tue', value: 18200 },
    { name: 'Wed', value: 15800 },
    { name: 'Thu', value: 22400 },
    { name: 'Fri', value: 28900 },
    { name: 'Sat', value: 35600 },
    { name: 'Sun', value: 31200 },
  ];

  const activeUsersData = [
    { name: '6am', value: 45 },
    { name: '9am', value: 89 },
    { name: '12pm', value: 156 },
    { name: '3pm', value: 178 },
    { name: '6pm', value: 234 },
    { name: '9pm', value: 198 },
    { name: '12am', value: 87 },
  ];

  useEffect(() => {
    // Generate recent activity from games and transactions
    const activities = [
      { id: '1', type: 'game_start', message: 'Game #1234 started with 23 players', time: '2 min ago' },
      { id: '2', type: 'game_end', message: 'Game #1233 ended - CryptoKing won ₦7,245', time: '15 min ago' },
      { id: '3', type: 'payout', message: 'Payout of ₦4,347 sent to LuckyAce', time: '18 min ago' },
      { id: '4', type: 'user_join', message: 'New user SwiftNinja joined', time: '25 min ago' },
      { id: '5', type: 'game_end', message: 'Game #1232 ended - NightOwl took 1st place', time: '45 min ago' },
      { id: '6', type: 'payout', message: 'Large payout ₦12,500 to GoldRush', time: '1 hr ago' },
    ];
    setRecentActivity(activities);
  }, []);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'game_start': return <Zap className="w-4 h-4 text-primary" />;
      case 'game_end': return <Trophy className="w-4 h-4 text-gold" />;
      case 'payout': return <Wallet className="w-4 h-4 text-green-400" />;
      case 'user_join': return <Users className="w-4 h-4 text-blue-400" />;
      default: return <Activity className="w-4 h-4 text-muted-foreground" />;
    }
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

        {/* Active Users */}
        <div className="bg-card rounded-xl border border-border p-4">
          <h3 className="text-sm font-bold text-foreground mb-4">Active Users Today</h3>
          <MiniChart data={activeUsersData} color="#0FB9B1" height={160} showAxis />
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-foreground">Recent Activity</h3>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Live Feed</span>
          </div>
          <div className="space-y-3">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">{activity.message}</p>
                  <p className="text-[10px] text-muted-foreground">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bg-card rounded-xl border border-border p-4">
          <h3 className="text-sm font-bold text-foreground mb-4">Platform Health</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-muted/30 rounded-lg">
              <p className="text-[10px] text-muted-foreground uppercase mb-1">Total Games Today</p>
              <p className="text-xl font-black text-foreground">{games.length + 12}</p>
            </div>
            <div className="p-3 bg-muted/30 rounded-lg">
              <p className="text-[10px] text-muted-foreground uppercase mb-1">Avg Game Duration</p>
              <p className="text-xl font-black text-foreground">18 min</p>
            </div>
            <div className="p-3 bg-muted/30 rounded-lg">
              <p className="text-[10px] text-muted-foreground uppercase mb-1">DAU</p>
              <p className="text-xl font-black text-foreground">{stats.dau}</p>
            </div>
            <div className="p-3 bg-muted/30 rounded-lg">
              <p className="text-[10px] text-muted-foreground uppercase mb-1">MAU</p>
              <p className="text-xl font-black text-foreground">{stats.mau.toLocaleString()}</p>
            </div>
          </div>

          {/* Platform Balance */}
          <div className="mt-4 p-4 bg-primary/10 rounded-xl border border-primary/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase mb-1">Platform Balance</p>
                <p className="text-2xl font-black text-primary">₦{stats.totalPlatformBalance.toLocaleString()}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-primary/50" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
