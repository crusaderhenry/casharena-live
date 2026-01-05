import { Trophy, Gamepad2, Flame, Crown, Star, Zap, Target, Medal } from 'lucide-react';

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  requirement: { type: 'wins' | 'games' | 'earnings'; value: number };
  color: string;
  bgColor: string;
}

export const BADGES: Badge[] = [
  // Win milestones
  { id: 'first_win', name: 'First Blood', description: 'Win your first game', icon: <Trophy className="w-5 h-5" />, requirement: { type: 'wins', value: 1 }, color: 'text-green-400', bgColor: 'bg-green-500/20' },
  { id: 'winner_5', name: 'Rising Star', description: 'Win 5 games', icon: <Star className="w-5 h-5" />, requirement: { type: 'wins', value: 5 }, color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
  { id: 'winner_10', name: 'Competitor', description: 'Win 10 games', icon: <Medal className="w-5 h-5" />, requirement: { type: 'wins', value: 10 }, color: 'text-purple-400', bgColor: 'bg-purple-500/20' },
  { id: 'winner_25', name: 'Champion', description: 'Win 25 games', icon: <Crown className="w-5 h-5" />, requirement: { type: 'wins', value: 25 }, color: 'text-yellow-400', bgColor: 'bg-yellow-500/20' },
  { id: 'winner_50', name: 'Legend', description: 'Win 50 games', icon: <Flame className="w-5 h-5" />, requirement: { type: 'wins', value: 50 }, color: 'text-orange-400', bgColor: 'bg-orange-500/20' },
  { id: 'winner_100', name: 'Unstoppable', description: 'Win 100 games', icon: <Zap className="w-5 h-5" />, requirement: { type: 'wins', value: 100 }, color: 'text-red-400', bgColor: 'bg-red-500/20' },
  
  // Games played milestones
  { id: 'player_10', name: 'Rookie', description: 'Play 10 games', icon: <Gamepad2 className="w-5 h-5" />, requirement: { type: 'games', value: 10 }, color: 'text-slate-400', bgColor: 'bg-slate-500/20' },
  { id: 'player_50', name: 'Regular', description: 'Play 50 games', icon: <Gamepad2 className="w-5 h-5" />, requirement: { type: 'games', value: 50 }, color: 'text-cyan-400', bgColor: 'bg-cyan-500/20' },
  { id: 'player_100', name: 'Veteran', description: 'Play 100 games', icon: <Gamepad2 className="w-5 h-5" />, requirement: { type: 'games', value: 100 }, color: 'text-indigo-400', bgColor: 'bg-indigo-500/20' },
  { id: 'player_500', name: 'Dedicated', description: 'Play 500 games', icon: <Target className="w-5 h-5" />, requirement: { type: 'games', value: 500 }, color: 'text-pink-400', bgColor: 'bg-pink-500/20' },
];

export const getUnlockedBadges = (stats: { total_wins: number; games_played: number; total_earnings?: number }): Badge[] => {
  return BADGES.filter(badge => {
    switch (badge.requirement.type) {
      case 'wins':
        return stats.total_wins >= badge.requirement.value;
      case 'games':
        return stats.games_played >= badge.requirement.value;
      case 'earnings':
        return (stats.total_earnings || 0) >= badge.requirement.value;
      default:
        return false;
    }
  });
};

export const getNextBadge = (stats: { total_wins: number; games_played: number }): Badge | null => {
  const locked = BADGES.filter(badge => {
    switch (badge.requirement.type) {
      case 'wins':
        return stats.total_wins < badge.requirement.value;
      case 'games':
        return stats.games_played < badge.requirement.value;
      default:
        return true;
    }
  });
  
  // Return the closest one to unlock
  return locked.sort((a, b) => {
    const aProgress = a.requirement.type === 'wins' 
      ? stats.total_wins / a.requirement.value 
      : stats.games_played / a.requirement.value;
    const bProgress = b.requirement.type === 'wins' 
      ? stats.total_wins / b.requirement.value 
      : stats.games_played / b.requirement.value;
    return bProgress - aProgress;
  })[0] || null;
};

interface ProfileBadgesProps {
  totalWins: number;
  gamesPlayed: number;
  compact?: boolean;
}

export const ProfileBadges = ({ totalWins, gamesPlayed, compact = false }: ProfileBadgesProps) => {
  const unlocked = getUnlockedBadges({ total_wins: totalWins, games_played: gamesPlayed });
  const nextBadge = getNextBadge({ total_wins: totalWins, games_played: gamesPlayed });
  
  if (compact) {
    // Show just icons in a row
    return (
      <div className="flex items-center gap-1">
        {unlocked.slice(0, 5).map(badge => (
          <div 
            key={badge.id} 
            className={`w-6 h-6 rounded-full ${badge.bgColor} ${badge.color} flex items-center justify-center`}
            title={badge.name}
          >
            <span className="scale-75">{badge.icon}</span>
          </div>
        ))}
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
            Badges ({unlocked.length}/{BADGES.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {unlocked.map(badge => (
              <div 
                key={badge.id}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${badge.bgColor} border border-current/20`}
              >
                <span className={badge.color}>{badge.icon}</span>
                <span className={`text-xs font-medium ${badge.color}`}>{badge.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Next Badge Progress */}
      {nextBadge && (
        <div className="bg-muted/30 rounded-xl p-3 border border-border/50">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full ${nextBadge.bgColor} ${nextBadge.color} flex items-center justify-center opacity-50`}>
              {nextBadge.icon}
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
                      : (gamesPlayed / nextBadge.requirement.value)) * 100)}%` 
                  }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                {nextBadge.requirement.type === 'wins' 
                  ? `${totalWins}/${nextBadge.requirement.value} wins`
                  : `${gamesPlayed}/${nextBadge.requirement.value} games`}
              </p>
            </div>
          </div>
        </div>
      )}
      
      {unlocked.length === 0 && !nextBadge && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Play games to unlock badges!
        </p>
      )}
    </div>
  );
};
