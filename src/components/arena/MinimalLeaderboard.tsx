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
          Top {winnerCount} win
        </span>
      </div>

      {/* Empty state */}
      {leaders.length === 0 ? (
        <div className="p-3 rounded-xl bg-muted/30 text-center">
          <p className="text-xs text-muted-foreground">
            No leaders yet - be the first to comment!
          </p>
        </div>
      ) : (
        /* Horizontal list */
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {topLeaders.map((leader, idx) => {
            const prizePercent = prizeDistribution[idx] || 0;
            const prizeAmount = Math.floor(effectivePrizePool * 0.9 * (prizePercent / 100));
            const isCurrentUser = leader.id === currentUserId;
            const isFirst = idx === 0;

            return (
              <div
                key={leader.user_id}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all ${
                  isFirst 
                    ? `bg-gold/10 border border-gold/30 ${isLeaderChanging ? 'animate-scale-in ring-2 ring-gold/50' : ''}`
                    : 'bg-muted/30'
                } ${isCurrentUser ? 'ring-1 ring-primary/40' : ''}`}
              >
                {/* Position */}
                <span className="text-lg">{positionEmojis[idx]}</span>
                
                {/* Avatar */}
                <span className={`text-lg ${isFirst && isLeaderChanging ? 'animate-bounce' : ''}`}>
                  {leader.avatar}
                </span>
                
                {/* Name & Prize */}
                <div className="flex flex-col">
                  <div className="flex items-center gap-1">
                    <span className={`text-xs font-semibold truncate max-w-16 ${isFirst ? 'text-gold' : 'text-foreground'}`}>
                      {leader.username}
                    </span>
                    {isCurrentUser && (
                      <span className="text-[8px] px-1 py-0.5 rounded-full bg-primary/20 text-primary font-medium">
                        YOU
                      </span>
                    )}
                    {isFirst && (
                      <Crown className="w-3 h-3 text-gold flex-shrink-0" />
                    )}
                  </div>
                  <span className={`text-[10px] font-bold ${isFirst ? 'text-gold' : 'text-muted-foreground'}`}>
                    {formatMoney(prizeAmount)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
