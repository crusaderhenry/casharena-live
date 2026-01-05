import { Zap, Users, Clock, ChevronRight, Trophy, Swords } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSounds } from '@/hooks/useSounds';
import { useHaptics } from '@/hooks/useHaptics';
import { getPayoutLabel } from '@/components/PrizeDistribution';

interface GameListCardProps {
  game: {
    id: string;
    name?: string;
    status: string;
    pool_value: number;
    participant_count: number;
    countdown: number;
    entry_fee: number;
    max_duration?: number;
    payout_type?: string;
    payout_distribution?: number[];
  };
  variant?: 'default' | 'compact';
}

export const GameListCard = ({ game, variant = 'default' }: GameListCardProps) => {
  const navigate = useNavigate();
  const { play } = useSounds();
  const { buttonClick } = useHaptics();

  const isLive = game.status === 'live';
  const isScheduled = game.status === 'scheduled';

  const handleClick = () => {
    play('click');
    buttonClick();
    navigate('/finger');
  };

  const formatMoney = (amount: number) => `₦${amount.toLocaleString()}`;

  if (variant === 'compact') {
    return (
      <button
        onClick={handleClick}
        className="w-full card-panel hover:border-primary/40 transition-all"
      >
        <div className="flex items-center gap-3">
          {/* Status indicator */}
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            isLive ? 'bg-green-500/20' : 'bg-yellow-500/20'
          }`}>
            <Zap className={`w-6 h-6 ${isLive ? 'text-green-400' : 'text-yellow-400'}`} />
          </div>
          
          {/* Game info */}
          <div className="flex-1 text-left">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
              <span className={`text-xs font-bold uppercase ${isLive ? 'text-green-400' : 'text-yellow-400'}`}>
                {isLive ? 'Live' : 'Soon'}
              </span>
            </div>
            <p className="font-bold text-foreground">{game.name || 'Fastest Finger'}</p>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" /> {game.participant_count}
              </span>
              <span>₦{game.entry_fee}</span>
            </div>
          </div>
          
          {/* Pool value */}
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Pool</p>
            <p className="font-bold text-primary">{formatMoney(game.pool_value)}</p>
          </div>
          
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      className="w-full relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-card via-card to-primary/10 text-left hover:border-primary/50 transition-all"
    >
      {/* Background glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl -z-0" />
      
      <div className="relative z-10 p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className={`flex items-center gap-2 px-2.5 py-1 rounded-full border ${
            isLive 
              ? 'bg-green-500/20 border-green-500/30' 
              : 'bg-yellow-500/20 border-yellow-500/30'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
            <span className={`text-xs font-bold uppercase tracking-wider ${
              isLive ? 'text-green-400' : 'text-yellow-400'
            }`}>
              {isLive ? 'Live Now' : 'Starting Soon'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Users className="w-4 h-4" />
            <span className="text-sm font-medium">{game.participant_count}</span>
          </div>
        </div>

        {/* Title */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
            <Zap className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-foreground">{game.name || 'Fastest Finger'}</h3>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>₦{game.entry_fee}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Trophy className="w-3 h-3 text-gold" />
                {getPayoutLabel(game.payout_type || 'top3')}
              </span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Prize Pool</p>
            <p className="text-lg font-black text-primary">{formatMoney(game.pool_value)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">{isLive ? 'Timer' : 'Starts In'}</p>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4 text-primary" />
              <p className="font-bold text-foreground">{game.countdown}s</p>
            </div>
          </div>
          <ChevronRight className="w-6 h-6 text-primary" />
        </div>
      </div>
    </button>
  );
};

// Empty state component
export const NoGamesCard = () => {
  return (
    <div className="card-panel text-center py-8">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4 relative">
        <Swords className="w-8 h-8 text-primary animate-pulse" />
        <div className="absolute inset-0 bg-primary/20 rounded-2xl animate-ping opacity-30" />
      </div>
      <h3 className="font-bold text-foreground mb-2">Arena is Quiet</h3>
      <p className="text-sm text-muted-foreground mb-3">No battles right now. New matches coming soon!</p>
      <div className="flex items-center justify-center gap-2 text-xs text-primary">
        <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
        <span className="animate-pulse">Waiting for challengers...</span>
      </div>
    </div>
  );
};