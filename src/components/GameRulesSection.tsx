import { Trophy, Coins, Sparkles, Timer, Users } from 'lucide-react';

interface GameRulesProps {
  entryFee: number;
  sponsoredPrizeAmount: number;
  winnerCount: number;
  prizeDistribution: number[];
  commentTimer: number;
  allowSpectators: boolean;
  poolValue: number;
  minParticipants?: number;
}

export const GameRulesSection = ({
  entryFee,
  sponsoredPrizeAmount,
  winnerCount,
  prizeDistribution,
  commentTimer,
  minParticipants = 2,
}: GameRulesProps) => {
  const isSponsored = entryFee === 0 && sponsoredPrizeAmount > 0;
  
  const getPrizeLabel = () => {
    if (winnerCount === 1) return 'Winner Takes All';
    return `Top ${winnerCount} split (${prizeDistribution.slice(0, winnerCount).join('/')}%)`;
  };

  return (
    <div className="rounded-xl border border-border bg-card/50 p-3">
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <div className="flex items-center gap-1.5">
          {isSponsored ? <Sparkles className="w-3.5 h-3.5 text-green-400" /> : <Coins className="w-3.5 h-3.5 text-primary" />}
          <span className={isSponsored ? 'text-green-400 font-medium' : 'text-foreground'}>
            {isSponsored ? 'FREE Entry' : `₦${entryFee.toLocaleString()}`}
          </span>
        </div>
        
        <span className="text-muted-foreground">•</span>
        
        <div className="flex items-center gap-1.5">
          <Trophy className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-foreground">{getPrizeLabel()}</span>
        </div>
        
        <span className="text-muted-foreground">•</span>
        
        <div className="flex items-center gap-1.5">
          <Timer className="w-3.5 h-3.5 text-primary" />
          <span className="text-foreground">{commentTimer}s timer</span>
        </div>
        
        <span className="text-muted-foreground">•</span>
        
        <div className="flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">Min {minParticipants}</span>
        </div>
      </div>
      
      <p className="text-[10px] text-muted-foreground mt-2">
        Last to comment when timer hits 0 wins. Keep commenting to reset the timer!
      </p>
    </div>
  );
};
