import { useRealtimeActivity, RealActivityItem } from '@/hooks/useRealtimeActivity';
import { Trophy, TrendingUp, Flame, Zap, Flag } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export const ActivityFeed = () => {
  const { activities, loading } = useRealtimeActivity(5);

  const formatMoney = (amount: number) => {
    return `₦${amount.toLocaleString()}`;
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'finger_win':
        return <Trophy className="w-4 h-4 text-gold" />;
      case 'game_start':
        return <Zap className="w-4 h-4 text-primary" />;
      case 'game_end':
        return <Flag className="w-4 h-4 text-secondary" />;
      case 'rank_up':
        return <TrendingUp className="w-4 h-4 text-primary" />;
      default:
        return <Flame className="w-4 h-4 text-primary" />;
    }
  };

  const getPositionText = (position: number) => {
    if (position === 1) return '1st';
    if (position === 2) return '2nd';
    if (position === 3) return '3rd';
    return `${position}th`;
  };

  const getActivityText = (activity: RealActivityItem) => {
    switch (activity.type) {
      case 'finger_win':
        return (
          <span>
            won <span className="text-gold font-semibold">{formatMoney(activity.amount || 0)}</span>
            {activity.position && <span className="text-muted-foreground"> ({getPositionText(activity.position)} place)</span>}
          </span>
        );
      case 'game_start':
        return (
          <span>
            <span className="text-primary font-semibold">{activity.gameName}</span> is now LIVE!
          </span>
        );
      case 'game_end':
        return (
          <span>
            <span className="text-secondary font-semibold">{activity.gameName}</span> has ended
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

  if (loading) {
    return (
      <div className="card-panel">
        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
          <Flame className="w-4 h-4 text-primary" />
          Recent Activity
        </h3>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="w-8 h-8 rounded-full" />
              <Skeleton className="h-4 flex-1" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="card-panel">
        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
          <Flame className="w-4 h-4 text-primary" />
          Recent Activity
        </h3>
        <p className="text-sm text-muted-foreground text-center py-4">No recent activity yet</p>
      </div>
    );
  }

  return (
    <div className="card-panel">
      <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
        </span>
        Live Activity
      </h3>
      <div className="space-y-0">
        {activities.map((activity) => (
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
