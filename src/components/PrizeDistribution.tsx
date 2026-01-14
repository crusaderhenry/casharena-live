import { Trophy } from 'lucide-react';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';

interface PrizeDistributionProps {
  payoutType: 'winner_takes_all' | 'top3' | 'top5' | 'top10' | string;
  payoutDistribution: number[];
  poolValue?: number;
  showHeader?: boolean;
  compact?: boolean;
}

const POSITION_ICONS = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
const POSITION_LABELS = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th'];
const PODIUM_CLASSES = ['podium-1', 'podium-2', 'podium-3', 'bg-muted/30', 'bg-muted/20'];
const TEXT_COLORS = ['text-gold', 'text-silver', 'text-bronze', 'text-foreground', 'text-muted-foreground'];

export const getPayoutLabel = (payoutType: string): string => {
  switch (payoutType) {
    case 'winner_takes_all':
      return 'Winner Takes All';
    case 'top3':
      return 'Top 3 Win';
    case 'top5':
      return 'Top 5 Win';
    case 'top10':
      return 'Top 10 Win';
    default:
      return 'Top 3 Win';
  }
};

export const getWinnerCount = (payoutType: string): number => {
  switch (payoutType) {
    case 'winner_takes_all':
      return 1;
    case 'top3':
      return 3;
    case 'top5':
      return 5;
    case 'top10':
      return 10;
    default:
      return 3;
  }
};

export const PrizeDistribution = ({ 
  payoutType, 
  payoutDistribution, 
  poolValue,
  showHeader = true,
  compact = false 
}: PrizeDistributionProps) => {
  const { platformCut, defaultPrizeDistributions } = usePlatformSettings();
  const netMultiplier = (100 - platformCut) / 100;
  
  // Use provided distribution or default based on payout type
  const distribution = payoutDistribution?.length > 0 
    ? payoutDistribution 
    : getDefaultDistribution(payoutType, defaultPrizeDistributions);

  const winnerCount = distribution.length;

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        <Trophy className="w-4 h-4 text-gold" />
        <span className="font-medium">{getPayoutLabel(payoutType)}</span>
      </div>
    );
  }

  // Winner takes all - simplified display
  if (payoutType === 'winner_takes_all' || winnerCount === 1) {
    return (
      <div className="card-panel">
        {showHeader && (
          <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-gold" />
            Prize Distribution
          </h3>
        )}
        <div className="text-center py-4">
          <div className="w-16 h-16 rounded-full bg-gold/20 flex items-center justify-center mx-auto mb-3">
            <span className="text-3xl">🏆</span>
          </div>
          <h4 className="text-xl font-black text-foreground mb-1">Winner Takes All</h4>
          {poolValue && (
            <p className="text-2xl font-black text-gold">₦{Math.floor(poolValue * netMultiplier).toLocaleString()}</p>
          )}
          <p className="text-xs text-muted-foreground mt-2">* {platformCut}% platform fee deducted</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card-panel">
      {showHeader && (
        <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-gold" />
          Prize Distribution ({getPayoutLabel(payoutType)})
        </h3>
      )}
      <div className="space-y-2">
        {distribution.map((percentage, index) => {
          const percentDisplay = Math.round(percentage * 100);
          const prizeAmount = poolValue ? Math.floor(poolValue * netMultiplier * percentage) : null;
          
          return (
            <div 
              key={index}
              className={`flex items-center justify-between p-3 rounded-xl ${PODIUM_CLASSES[index] || 'bg-muted/10'}`}
            >
              <span className="flex items-center gap-2 font-medium">
                <span className="text-lg">{POSITION_ICONS[index]}</span> 
                {POSITION_LABELS[index]} Place
              </span>
              <div className="text-right">
                <span className={`font-bold ${TEXT_COLORS[index] || 'text-foreground'}`}>
                  {percentDisplay}%
                </span>
                {prizeAmount && (
                  <span className="text-xs text-muted-foreground ml-2">
                    (₦{prizeAmount.toLocaleString()})
                  </span>
                )}
              </div>
            </div>
          );
        })}
        <p className="text-xs text-muted-foreground text-center mt-3">
          * {platformCut}% platform fee deducted from winnings
        </p>
      </div>
    </div>
  );
};

function getDefaultDistribution(payoutType: string, distributions?: { top3: number[]; top5: number[]; top10: number[] }): number[] {
  const defaults = distributions || {
    top3: [0.5, 0.3, 0.2],
    top5: [0.4, 0.25, 0.15, 0.12, 0.08],
    top10: [0.3, 0.2, 0.15, 0.1, 0.08, 0.06, 0.04, 0.03, 0.02, 0.02],
  };
  
  switch (payoutType) {
    case 'winner_takes_all':
      return [1.0];
    case 'top3':
      return defaults.top3;
    case 'top5':
      return defaults.top5;
    case 'top10':
      return defaults.top10;
    default:
      return defaults.top3;
  }
}