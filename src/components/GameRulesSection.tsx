import { Trophy, Coins, Sparkles, Timer, Users, MessageSquare, Clock, Target, AlertCircle } from 'lucide-react';

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
  minParticipants = 2,
}: GameRulesProps) => {
  const isSponsored = entryFee === 0 && sponsoredPrizeAmount > 0;

  const rules = [
    {
      icon: Target,
      title: 'Objective',
      description: 'Be the last person to comment when the timer hits zero to win!',
      color: 'text-primary',
    },
    {
      icon: MessageSquare,
      title: 'How to Play',
      description: 'Send comments to reset the countdown timer. Keep the game alive!',
      color: 'text-blue-400',
    },
    {
      icon: Timer,
      title: `${commentTimer}s Timer`,
      description: `Each comment resets the timer to ${commentTimer} seconds. When it hits 0, game ends.`,
      color: 'text-orange-400',
    },
    {
      icon: Trophy,
      title: winnerCount === 1 ? 'Winner Takes All' : `Top ${winnerCount} Win`,
      description: winnerCount === 1 
        ? 'The last commenter wins the entire prize pool!'
        : `Top ${winnerCount} last commenters split the prize (${prizeDistribution.slice(0, winnerCount).join('/')}%)`,
      color: 'text-gold',
    },
    {
      icon: isSponsored ? Sparkles : Coins,
      title: isSponsored ? 'FREE Entry' : `₦${entryFee.toLocaleString()} Entry`,
      description: isSponsored 
        ? 'This game is sponsored! Join for free and win real prizes.'
        : 'Entry fee is deducted from your wallet when you join.',
      color: isSponsored ? 'text-green-400' : 'text-primary',
    },
    {
      icon: Users,
      title: `Min ${minParticipants} Players`,
      description: `Game requires at least ${minParticipants} players to start. Refund if cancelled.`,
      color: 'text-muted-foreground',
    },
  ];

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="p-4 border-b border-border bg-muted/30">
        <h3 className="font-bold text-foreground flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-primary" />
          How This Game Works
        </h3>
      </div>
      
      <div className="p-4 space-y-3">
        {rules.map((rule, index) => (
          <div key={index} className="flex items-start gap-3">
            <div className={`p-2 rounded-lg bg-muted/50 ${rule.color}`}>
              <rule.icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold ${rule.color}`}>{rule.title}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{rule.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Tips */}
      <div className="p-3 bg-primary/5 border-t border-border">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="w-3.5 h-3.5 text-primary" />
          <span><strong className="text-foreground">Pro Tip:</strong> Wait for others to comment, then strike at the last second!</span>
        </div>
      </div>
    </div>
  );
};
