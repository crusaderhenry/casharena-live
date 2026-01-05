import { useState, useEffect } from 'react';
import { Zap, Users, Clock, ChevronRight, Trophy, Eye, Play, Gift, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSounds } from '@/hooks/useSounds';
import { useHaptics } from '@/hooks/useHaptics';
import { getPayoutLabel } from '@/components/PrizeDistribution';
import { PoolParticipantsSheet } from '@/components/PoolParticipantsSheet';
import { useServerTime, formatCountdown } from '@/hooks/useServerTime';

interface Game {
  id: string;
  name?: string;
  status: string;
  pool_value: number;
  effective_prize_pool?: number;
  participant_count: number;
  countdown: number;
  entry_fee: number;
  max_duration?: number;
  payout_type?: string;
  payout_distribution?: number[];
  start_time?: string | null;
  scheduled_at?: string | null;
  is_sponsored?: boolean;
  sponsored_amount?: number;
  seconds_remaining?: number;
  is_ending_soon?: boolean;
}

interface GameStatusCardProps {
  game: Game;
  isTestMode?: boolean;
}

export const GameStatusCard = ({ game, isTestMode = false }: GameStatusCardProps) => {
  const navigate = useNavigate();
  const { play } = useSounds();
  const { buttonClick } = useHaptics();
  const { gameTimeRemaining, secondsUntil } = useServerTime();
  const [timeDisplay, setTimeDisplay] = useState({ label: '', value: '', isUrgent: false });

  const isLive = game.status === 'live';
  const isOpen = game.status === 'open';
  const isScheduled = game.status === 'scheduled';
  const prizePool = game.effective_prize_pool || game.pool_value;

  // Calculate dynamic countdown using server-synced time
  useEffect(() => {
    const calculateTime = () => {
      if (isLive) {
        // For live games: show time until game ends
        const remaining = gameTimeRemaining(game.start_time, game.max_duration || 20);
        const isEndingSoon = remaining <= 300;
        setTimeDisplay({ 
          label: isEndingSoon ? 'ENDING' : 'Ends In', 
          value: formatGameTime(remaining),
          isUrgent: isEndingSoon,
        });
      } else if (isOpen) {
        // For open games: show time until live
        const remaining = secondsUntil(game.start_time);
        setTimeDisplay({ 
          label: 'Goes Live', 
          value: formatCountdown(remaining),
          isUrgent: remaining <= 60,
        });
      } else if (isScheduled) {
        // For scheduled games: show time until open
        const remaining = secondsUntil(game.scheduled_at);
        setTimeDisplay({ 
          label: 'Opens In', 
          value: formatCountdown(remaining),
          isUrgent: remaining <= 300,
        });
      }
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [game, isLive, isOpen, isScheduled, gameTimeRemaining, secondsUntil]);

  const formatGameTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleClick = () => {
    play('click');
    buttonClick();
    navigate('/finger');
  };

  const formatMoney = (amount: number) => {
    if (amount >= 1_000_000_000) return `₦${(amount / 1_000_000_000).toFixed(1).replace(/\.0$/, '')}B`;
    if (amount >= 1_000_000) return `₦${(amount / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
    if (amount >= 1_000) return `₦${(amount / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
    return `₦${amount.toLocaleString()}`;
  };

  const isEndingSoon = timeDisplay.isUrgent && isLive;
  const statusColor = isEndingSoon ? 'red' : isLive ? 'green' : isOpen ? 'blue' : 'yellow';
  const statusLabel = isEndingSoon ? 'ENDING' : isLive ? 'LIVE' : isOpen ? 'OPEN' : 'SOON';

  return (
    <button
      onClick={handleClick}
      className={`w-full relative overflow-hidden rounded-2xl border p-4 text-left transition-all hover:scale-[0.99] active:scale-[0.98] ${
        isEndingSoon
          ? 'bg-gradient-to-br from-card via-card to-destructive/10 border-destructive/50 hover:border-destructive/70 animate-pulse-slow'
          : isLive 
          ? 'bg-gradient-to-br from-card via-card to-green-500/5 border-green-500/30 hover:border-green-500/50' 
          : isOpen
          ? 'bg-gradient-to-br from-card via-card to-blue-500/5 border-blue-500/30 hover:border-blue-500/50'
          : 'bg-gradient-to-br from-card via-card to-yellow-500/5 border-yellow-500/30 hover:border-yellow-500/50'
      }`}
    >
      {/* Glow effect */}
      <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl ${
        isEndingSoon ? 'bg-destructive/10' : isLive ? 'bg-green-500/10' : isOpen ? 'bg-blue-500/10' : 'bg-yellow-500/10'
      }`} />
      
      <div className="relative z-10">
        {/* Header row */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${
              isEndingSoon ? 'bg-destructive/20' : isLive ? 'bg-green-500/20' : isOpen ? 'bg-blue-500/20' : 'bg-yellow-500/20'
            }`}>
              {isEndingSoon ? (
                <AlertTriangle className="w-5 h-5 text-destructive animate-pulse" />
              ) : isLive ? (
                <Play className="w-5 h-5 text-green-400" fill="currentColor" />
              ) : (
                <Clock className={`w-5 h-5 ${isOpen ? 'text-blue-400' : 'text-yellow-400'}`} />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-foreground">{game.name || 'Fastest Finger'}</h3>
                {game.is_sponsored && (
                  <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-primary/20 text-primary rounded-full flex items-center gap-0.5">
                    <Gift className="w-2.5 h-2.5" /> FREE
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                <Trophy className="w-3 h-3 text-gold" />
                <span>{getPayoutLabel(game.payout_type || 'top3')}</span>
                <span>•</span>
                <span>{game.entry_fee > 0 ? `₦${game.entry_fee}` : 'FREE'}</span>
              </div>
            </div>
          </div>
          
          {/* Status badge */}
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${
            isEndingSoon ? 'bg-destructive/20 border border-destructive/30' : isLive ? 'bg-green-500/20' : isOpen ? 'bg-blue-500/20' : 'bg-yellow-500/20'
          }`}>
            <span className={`w-2 h-2 rounded-full ${
              isEndingSoon ? 'bg-destructive animate-pulse' : isLive ? 'bg-green-500 animate-pulse' : isOpen ? 'bg-blue-500' : 'bg-yellow-500'
            }`} />
            <span className={`text-xs font-bold ${
              isEndingSoon ? 'text-destructive' : isLive ? 'text-green-400' : isOpen ? 'text-blue-400' : 'text-yellow-400'
            }`}>
              {statusLabel}
            </span>
          </div>
        </div>
        
        {/* Stats row */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs text-muted-foreground">Prize Pool</p>
            <p className="text-xl font-black text-primary">{formatMoney(prizePool)}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Players</p>
              <p className="font-bold text-foreground flex items-center gap-1">
                <Users className="w-3.5 h-3.5" /> {game.participant_count}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">{timeDisplay.label}</p>
              <p className={`font-bold flex items-center gap-1 ${
                timeDisplay.isUrgent ? 'text-destructive animate-pulse' : isLive ? 'text-green-400' : isOpen ? 'text-blue-400' : 'text-yellow-400'
              }`}>
                <Clock className="w-3.5 h-3.5" /> {timeDisplay.value}
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </div>

        {/* View pool CTA */}
        <div className="flex items-center justify-between pt-2 border-t border-border/30">
          <div className="flex items-center gap-2">
            <Users className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{game.participant_count} in pool</span>
          </div>
          <PoolParticipantsSheet
            gameId={game.id}
            gameName={game.name || 'Fastest Finger'}
            participantCount={game.participant_count}
            poolValue={game.pool_value}
            entryFee={game.entry_fee}
            isTestMode={isTestMode}
          >
            <span 
              className="flex items-center gap-1 text-xs text-primary font-medium" 
              onClick={(e) => e.stopPropagation()}
            >
              <Eye className="w-3 h-3" /> View pool
            </span>
          </PoolParticipantsSheet>
        </div>
      </div>
    </button>
  );
};
