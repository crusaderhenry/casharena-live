import { Crown, Trophy } from 'lucide-react';

interface Commenter {
  id: string;
  user_id: string;
  username: string;
  avatar: string;
}

interface CompactLeaderboardProps {
  orderedCommenters: Commenter[];
  winnerCount: number;
  prizeDistribution: number[];
  effectivePrizePool: number;
  currentUserId?: string;
  platformCut?: number;
}

export const CompactLeaderboard = ({
  orderedCommenters,
  winnerCount,
  prizeDistribution,
  effectivePrizePool,
  currentUserId,
  platformCut = 0.1
}: CompactLeaderboardProps) => {
  if (orderedCommenters.length === 0) return null;

  const formatMoney = (amount: number) => {
    if (amount >= 1_000_000) return `₦${(amount / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
    if (amount >= 1_000) return `₦${(amount / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
    return `₦${amount.toLocaleString()}`;
  };

  const topCommenters = orderedCommenters.slice(0, Math.min(3, winnerCount));
  const distributablePool = effectivePrizePool * (1 - platformCut);

  const getPositionEmoji = (idx: number) => {
    switch (idx) {
      case 0: return '🥇';
      case 1: return '🥈';
      case 2: return '🥉';
      default: return '🏅';
    }
  };

  return (
    <div className="bg-muted/30 rounded-xl p-2">
      {/* Header */}
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-1.5">
          <Trophy className="w-3 h-3 text-gold" />
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Leaders</span>
        </div>
        <span className="text-[10px] text-muted-foreground">
          Top {winnerCount} win
        </span>
      </div>
      
      {/* Horizontal leaders row */}
      <div className="flex gap-1.5">
        {topCommenters.map((c, idx) => {
          const prizePercent = prizeDistribution[idx] || 0;
          const prizeAmount = Math.floor(distributablePool * (prizePercent / 100));
          const isCurrentUser = c.id === currentUserId;
          const isLeader = idx === 0;
          
          return (
            <div 
              key={c.user_id} 
              className={`flex-1 flex items-center gap-2 p-2 rounded-lg transition-all ${
                isLeader 
                  ? 'bg-gold/15 border border-gold/30' 
                  : 'bg-muted/40 border border-border/30'
              } ${isCurrentUser ? 'ring-1 ring-primary/50' : ''}`}
            >
              {/* Position + Avatar */}
              <div className="relative shrink-0">
                <span className="text-lg">{c.avatar}</span>
                <span className="absolute -top-1 -right-1 text-xs">
                  {getPositionEmoji(idx)}
                </span>
              </div>
              
              {/* Name + Prize */}
              <div className="flex-1 min-w-0">
                <p className={`text-[11px] font-semibold truncate ${
                  isLeader ? 'text-gold' : 'text-foreground'
                }`}>
                  {c.username}
                </p>
                <p className={`text-[10px] font-bold ${
                  isLeader ? 'text-gold/80' : 'text-muted-foreground'
                }`}>
                  {formatMoney(prizeAmount)}
                </p>
              </div>
              
              {/* You indicator */}
              {isCurrentUser && (
                <Crown className="w-3 h-3 text-primary shrink-0" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
