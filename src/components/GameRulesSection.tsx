import { 
  Trophy, Users, Clock, Coins, Eye, Target, 
  Sparkles, Shield, Timer, Award, Zap
} from 'lucide-react';

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
  allowSpectators,
  poolValue,
  minParticipants = 2,
}: GameRulesProps) => {
  const isSponsored = entryFee === 0 && sponsoredPrizeAmount > 0;
  const effectivePrizePool = poolValue + sponsoredPrizeAmount;
  
  const formatMoney = (amount: number) => {
    if (amount >= 1_000_000) return `₦${(amount / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
    if (amount >= 1_000) return `₦${(amount / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
    return `₦${amount.toLocaleString()}`;
  };

  const getPrizeStructureLabel = () => {
    if (winnerCount === 1) return 'Winner Takes All';
    if (winnerCount === 3) return 'Top 3 Winners';
    if (winnerCount === 5) return 'Top 5 Winners';
    return `Top ${winnerCount} Winners`;
  };

  const rules = [
    {
      icon: isSponsored ? Sparkles : Coins,
      label: 'Entry Type',
      value: isSponsored ? 'FREE (Sponsored)' : `Paid Entry`,
      subValue: isSponsored ? 'No entry fee required' : formatMoney(entryFee),
      highlight: isSponsored,
    },
    {
      icon: Trophy,
      label: 'Prize Structure',
      value: getPrizeStructureLabel(),
      subValue: prizeDistribution.slice(0, winnerCount).map((p, i) => 
        `${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i+1}`} ${p}%`
      ).join(' • '),
    },
    {
      icon: Timer,
      label: 'Comment Timer',
      value: `${commentTimer} seconds`,
      subValue: 'Reset timer by commenting to stay alive',
    },
    {
      icon: Target,
      label: 'How to Win',
      value: 'Last to Comment Wins',
      subValue: 'When timer hits 0, last commenter wins',
    },
    {
      icon: Users,
      label: 'Minimum Players',
      value: `${minParticipants} players`,
      subValue: 'Game proceeds when minimum is met',
    },
    {
      icon: allowSpectators ? Eye : Shield,
      label: 'Spectators',
      value: allowSpectators ? 'Allowed' : 'Not Allowed',
      subValue: allowSpectators ? 'Watch games for free' : 'Players only',
    },
  ];

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="p-4 border-b border-border bg-muted/30">
        <h3 className="font-bold text-foreground flex items-center gap-2">
          <Award className="w-4 h-4 text-primary" />
          Game Rules
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          Rules are set by Admin and cannot be changed during gameplay
        </p>
      </div>
      
      <div className="p-3 space-y-2">
        {rules.map((rule, idx) => (
          <div 
            key={idx}
            className={`flex items-start gap-3 p-3 rounded-xl transition-colors ${
              rule.highlight 
                ? 'bg-gradient-to-r from-green-500/10 to-emerald-500/5 border border-green-500/20' 
                : 'bg-muted/30 hover:bg-muted/50'
            }`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
              rule.highlight ? 'bg-green-500/20 text-green-400' : 'bg-primary/10 text-primary'
            }`}>
              <rule.icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">{rule.label}</p>
              <p className={`font-semibold text-sm ${rule.highlight ? 'text-green-400' : 'text-foreground'}`}>
                {rule.value}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{rule.subValue}</p>
            </div>
          </div>
        ))}
      </div>
      
      {/* Quick Tips */}
      <div className="p-3 border-t border-border bg-primary/5">
        <p className="text-[10px] text-primary font-medium flex items-center gap-1.5">
          <Zap className="w-3 h-3" />
          Pro Tip: Comment strategically to keep the timer resetting and outlast everyone!
        </p>
      </div>
    </div>
  );
};
