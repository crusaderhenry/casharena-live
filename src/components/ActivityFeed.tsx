import { useGame, ActivityItem } from '@/contexts/GameContext';
import { Trophy, TrendingUp, Flame } from 'lucide-react';

export const ActivityFeed = () => {
  const { recentActivity } = useGame();

  const formatMoney = (amount: number) => {
    return `₦${amount.toLocaleString()}`;
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'finger_win':
        return <Trophy className="w-4 h-4 text-gold" />;
      case 'rank_up':
        return <TrendingUp className="w-4 h-4 text-primary" />;
      default:
        return <Flame className="w-4 h-4 text-primary" />;
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

  // Filter for Fastest Finger activity only
  const fingerActivity = recentActivity.filter(a => a.type === 'finger_win' || a.type === 'rank_up');

  if (fingerActivity.length === 0) return null;

  return (
    <div className="card-panel">
      <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
        <Flame className="w-4 h-4 text-primary" />
        Recent Activity
      </h3>
      <div className="space-y-0">
        {fingerActivity.slice(0, 5).map((activity) => (
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
