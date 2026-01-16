import { useBadges, Badge } from '@/hooks/useBadges';
import { Skeleton } from '@/components/ui/skeleton';

// Re-export type for compatibility
export type { Badge } from '@/hooks/useBadges';

interface ProfileBadgesProps {
  totalWins: number;
  gamesPlayed: number;
  totalEarnings?: number;
  compact?: boolean;
}

export const ProfileBadges = ({ totalWins, gamesPlayed, totalEarnings = 0, compact = false }: ProfileBadgesProps) => {
  const { badges, loading, getUnlockedBadges, getNextBadge } = useBadges();
  
  const stats = { total_wins: totalWins, games_played: gamesPlayed, total_earnings: totalEarnings };
  const unlocked = getUnlockedBadges(stats);
  const nextBadge = getNextBadge(stats);
  
  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-4 w-24" />
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-8 w-24 rounded-full" />
          <Skeleton className="h-8 w-20 rounded-full" />
          <Skeleton className="h-8 w-28 rounded-full" />
        </div>
      </div>
    );
  }
  
  if (compact) {
    return (
      <div className="flex items-center gap-1">
        {unlocked.slice(0, 5).map(badge => {
          const Icon = badge.icon;
          return (
            <div 
              key={badge.id} 
              className={`w-6 h-6 rounded-full ${badge.bgColor} ${badge.color} flex items-center justify-center`}
              title={badge.name}
            >
              <span className="scale-75">
                <Icon className="w-3 h-3" />
              </span>
            </div>
          );
        })}
        {unlocked.length > 5 && (
          <span className="text-xs text-muted-foreground">+{unlocked.length - 5}</span>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Unlocked Badges */}
      {unlocked.length > 0 && (
        <div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
            Badges ({unlocked.length}/{badges.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {unlocked.map(badge => {
              const Icon = badge.icon;
              return (
                <div 
                  key={badge.id}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${badge.bgColor} border border-current/20`}
                >
                  <span className={badge.color}><Icon className="w-5 h-5" /></span>
                  <span className={`text-xs font-medium ${badge.color}`}>{badge.name}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Next Badge Progress */}
      {nextBadge && (() => {
        const NextIcon = nextBadge.icon;
        return (
          <div className="bg-muted/30 rounded-xl p-3 border border-border/50">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full ${nextBadge.bgColor} ${nextBadge.color} flex items-center justify-center opacity-50`}>
                <NextIcon className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{nextBadge.name}</p>
                <p className="text-xs text-muted-foreground">{nextBadge.description}</p>
                <div className="mt-1.5 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${nextBadge.bgColor.replace('/20', '')} rounded-full transition-all`}
                    style={{ 
                      width: `${Math.min(100, (nextBadge.requirement.type === 'wins' 
                        ? (totalWins / nextBadge.requirement.value) 
                        : nextBadge.requirement.type === 'games'
                          ? (gamesPlayed / nextBadge.requirement.value)
                          : (totalEarnings / nextBadge.requirement.value)) * 100)}%` 
                    }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {nextBadge.requirement.type === 'wins' 
                    ? `${totalWins}/${nextBadge.requirement.value} wins`
                    : nextBadge.requirement.type === 'games'
                      ? `${gamesPlayed}/${nextBadge.requirement.value} games`
                      : `₦${totalEarnings.toLocaleString()}/${nextBadge.requirement.value.toLocaleString()} earnings`}
                </p>
              </div>
            </div>
          </div>
        );
      })()}
      
      {unlocked.length === 0 && !nextBadge && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Play games to unlock badges!
        </p>
      )}
    </div>
  );
};
