import { useNavigate } from 'react-router-dom';
import { useSounds } from '@/hooks/useSounds';
import { useHaptics } from '@/hooks/useHaptics';
import { useServerTime, formatCountdown } from '@/hooks/useServerTime';
import { ActiveGame } from '@/hooks/useActiveGames';
import { getPayoutLabel } from '@/components/PrizeDistribution';
import { Zap, Users, Trophy, Clock, Gift, ChevronRight } from 'lucide-react';
import { useState, useEffect } from 'react';

interface ScheduledGameCardProps {
  game: ActiveGame;
  isTestMode?: boolean;
}

export const ScheduledGameCard = ({ game, isTestMode = false }: ScheduledGameCardProps) => {
  const navigate = useNavigate();
  const { play } = useSounds();
  const { buttonClick } = useHaptics();
  const { secondsUntil } = useServerTime();
  
  const [countdown, setCountdown] = useState(game.seconds_until_open);

  // Update countdown using server-synced time
  useEffect(() => {
    const updateCountdown = () => {
      setCountdown(secondsUntil(game.scheduled_at));
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [game.scheduled_at, secondsUntil]);

  const handleClick = () => {
    play('click');
    buttonClick();
    navigate('/finger');
  };

  const formatMoney = (amount: number) => {
    if (amount >= 1_000_000) return `₦${(amount / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
    if (amount >= 1_000) return `₦${(amount / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
    return `₦${amount.toLocaleString()}`;
  };

  const isStartingSoon = countdown <= 300; // 5 minutes

  return (
    <button
      onClick={handleClick}
      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all active:scale-[0.98] ${
        isStartingSoon
          ? 'bg-yellow-500/10 border-2 border-yellow-500/40 animate-pulse-slow'
          : 'bg-card border border-border/50 hover:border-yellow-500/30'
      }`}
    >
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${
        isStartingSoon ? 'bg-yellow-500/30' : 'bg-yellow-500/15'
      }`}>
        <Zap className="w-5 h-5 text-yellow-400" />
      </div>
      
      <div className="flex-1 text-left">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-foreground">{game.name}</h3>
          {game.is_sponsored && (
            <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-primary/20 text-primary rounded-full flex items-center gap-0.5">
              <Gift className="w-2.5 h-2.5" /> FREE
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3" /> {game.participant_count}
          </span>
          <span className="flex items-center gap-1">
            <Trophy className="w-3 h-3 text-gold" />
            {getPayoutLabel(game.payout_type)}
          </span>
        </div>
      </div>
      
      <div className="text-right">
        <p className="text-xs text-muted-foreground">Opens in</p>
        <p className={`font-bold ${isStartingSoon ? 'text-yellow-400' : 'text-foreground'}`}>
          {formatCountdown(countdown)}
        </p>
        <p className="text-xs text-primary font-medium">
          {game.entry_fee > 0 ? formatMoney(game.entry_fee) : 'FREE'}
        </p>
      </div>
      
      <ChevronRight className="w-5 h-5 text-muted-foreground" />
    </button>
  );
};