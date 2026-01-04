import { useGame } from '@/contexts/GameContext';
import { Trophy, Flame, Sparkles, Zap, CheckCircle } from 'lucide-react';

const ICONS = {
  arena: Trophy,
  streak: Flame,
  pool: Sparkles,
  finger: Zap,
  info: CheckCircle,
};

export const ActivityFeed = () => {
  const { recentActivity } = useGame();

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return date.toLocaleDateString();
  };

  if (recentActivity.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        Recent Activity
      </h3>
      <div className="space-y-2">
        {recentActivity.slice(0, 5).map((activity) => {
          const Icon = ICONS[activity.type as keyof typeof ICONS] || CheckCircle;
          return (
            <div
              key={activity.id}
              className="flex items-center gap-3 bg-card/50 rounded-xl px-3 py-2 animate-fade-in"
            >
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Icon className="w-4 h-4 text-primary" />
              </div>
              <span className="flex-1 text-sm text-foreground">{activity.text}</span>
              <span className="text-xs text-muted-foreground">{formatTime(activity.timestamp)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
