import { Crown, Trophy } from 'lucide-react';

interface Leader {
  id: string;
  user_id: string;
  username: string;
  avatar: string;
}

interface MinimalLeaderboardProps {
  leaders: Leader[];
  currentUserId?: string;
  prizeDistribution: number[];
  effectivePrizePool: number;
  winnerCount: number;
  isLeaderChanging?: boolean;
}

export const MinimalLeaderboard = ({
  leaders,
  currentUserId,
  prizeDistribution,
  effectivePrizePool,
  winnerCount,
  isLeaderChanging,
}: MinimalLeaderboardProps) => {
  if (leaders.length === 0) return null;

  const formatMoney = (amount: number) => {
    if (amount >= 1_000_000) return `₦${(amount / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
    if (amount >= 1_000) return `₦${(amount / 1_000).toFixed(0)}K`;
    return `₦${amount.toLocaleString()}`;
  };

  const topLeaders = leaders.slice(0, Math.min(3, winnerCount));
  const positionEmojis = ['🥇', '🥈', '🥉'];

  return (
    <div className="mb-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Trophy className="w-3.5 h-3.5 text-gold" />
          <span className="text-xs font-semibold text-foreground">Leaders</span>
        </div>
        <span className="text-[10px] text-muted-foreground">
          Top {Math.min(leaders.length, winnerCount)} win
        </span>
      </div>

      {/* Vertical list */}
      <div className="space-y-1.5">
        {topLeaders.map((leader, idx) => {
          const prizePercent = prizeDistribution[idx] || 0;
          const prizeAmount = Math.floor(effectivePrizePool * 0.9 * (prizePercent / 100));
          const isCurrentUser = leader.id === currentUserId;
          const isFirst = idx === 0;

          return (
            <div
              key={leader.user_id}
              className={`flex items-center gap-2 p-2 rounded-xl transition-all ${
                isFirst 
                  ? `bg-gold/10 border border-gold/30 ${isLeaderChanging ? 'animate-scale-in ring-2 ring-gold/50' : ''}`
                  : 'bg-muted/30'
              } ${isCurrentUser ? 'ring-1 ring-primary/40' : ''}`}
            >
              {/* Position */}
              <span className="text-lg w-6 text-center">{positionEmojis[idx]}</span>
              
              {/* Avatar */}
              <span className={`text-xl ${isFirst && isLeaderChanging ? 'animate-bounce' : ''}`}>
                {leader.avatar}
              </span>
              
              {/* Name */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className={`text-sm font-semibold truncate ${isFirst ? 'text-gold' : 'text-foreground'}`}>
                    {leader.username}
                  </span>
                  {isCurrentUser && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-medium">
                      YOU
                    </span>
                  )}
                  {isFirst && (
                    <Crown className="w-3.5 h-3.5 text-gold flex-shrink-0" />
                  )}
                </div>
              </div>
              
              {/* Prize */}
              <span className={`text-sm font-bold ${isFirst ? 'text-gold' : 'text-foreground'}`}>
                {formatMoney(prizeAmount)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
