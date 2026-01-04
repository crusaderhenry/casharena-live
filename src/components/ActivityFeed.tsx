import { useGame, ActivityItem } from '@/contexts/GameContext';
import { Trophy, Sparkles, TrendingUp, Users } from 'lucide-react';

export const ActivityFeed = () => {
  const { recentActivity } = useGame();

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'finger_win':
        return <Trophy className="w-4 h-4 text-gold" />;
      case 'pool_win':
        return <Sparkles className="w-4 h-4 text-gold" />;
      case 'pool_join':
        return <Users className="w-4 h-4 text-primary" />;
      case 'rank_up':
        return <TrendingUp className="w-4 h-4 text-primary" />;
      default:
        return null;
    }
  };

  const getActivityText = (activity: ActivityItem) => {
    switch (activity.type) {
      case 'finger_win':
        return (
          <span>
            won <span className="text-gold font-semibold">{formatMoney(activity.amount || 0)}</span> in Fastest Finger
          </span>
        );
      case 'pool_win':
        return (
          <span>
            won <span className="text-gold font-semibold">{formatMoney(activity.amount || 0)}</span> in Lucky Pool
          </span>
        );
      case 'pool_join':
        return <span>joined the weekly pool</span>;
      case 'rank_up':
        return (
          <span>
            moved to rank <span className="text-primary font-semibold">#{activity.position}</span>
          </span>
        );
      default:
        return null;
    }
  };

  const getTimeAgo = (date: Date) => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <div className="card-panel">
      <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">
        Recent Activity
      </h3>
      <div className="space-y-0">
        {recentActivity.slice(0, 5).map((activity) => (
          <div key={activity.id} className="activity-item">
            <div className="w-8 h-8 rounded-full bg-card-elevated flex items-center justify-center text-lg">
              {activity.playerAvatar}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm">
                <span className="font-semibold text-foreground">{activity.playerName}</span>{' '}
                <span className="text-muted-foreground">{getActivityText(activity)}</span>
              </p>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              {getActivityIcon(activity.type)}
              <span className="text-xs">{getTimeAgo(activity.timestamp)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
