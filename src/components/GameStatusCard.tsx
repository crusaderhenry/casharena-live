import { useState, useEffect, forwardRef } from 'react';
import { Zap, Users, Clock, ChevronRight, Trophy, Eye, Play, Gift, AlertTriangle, Sparkles, Timer, Radio } from 'lucide-react';
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
  // Use a ticker state to force re-render every second
  const [tick, setTick] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setTick(t => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Calculate time display on every tick
  useEffect(() => {
    if (isLive) {
      const remaining = gameTimeRemaining(game.start_time, game.max_duration || 20);
      const isEndingSoon = remaining <= 300;
      setTimeDisplay({ 
        label: isEndingSoon ? 'ENDING' : 'Ends In', 
        value: formatGameTime(remaining),
        isUrgent: isEndingSoon,
      });
    } else if (isOpen) {
      // For open games, calculate time until start_time (goes live)
      const remaining = secondsUntil(game.start_time);
      setTimeDisplay({ 
        label: 'Goes Live', 
        value: formatCountdown(remaining),
        isUrgent: remaining <= 60,
      });
    } else if (isScheduled) {
      // For scheduled games, calculate time until scheduled_at (when it opens)
      const remaining = secondsUntil(game.scheduled_at);
      setTimeDisplay({ 
        label: 'Opens In', 
        value: formatCountdown(remaining),
        isUrgent: remaining <= 300,
      });
    }
  }, [tick, game.id, game.start_time, game.scheduled_at, game.max_duration, isLive, isOpen, isScheduled, gameTimeRemaining, secondsUntil]);

  const formatGameTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleClick = (e: React.MouseEvent) => {
    // Only navigate if not clicking on pool sheet
    if ((e.target as HTMLElement).closest('[data-pool-sheet]')) return;
    play('click');
    buttonClick();
    // Route to lobby with game ID - for all game statuses
    navigate('/finger/lobby', { state: { gameId: game.id } });
  };

  const formatMoney = (amount: number) => {
    if (amount >= 1_000_000_000) return `₦${(amount / 1_000_000_000).toFixed(1).replace(/\.0$/, '')}B`;
    if (amount >= 1_000_000) return `₦${(amount / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
    if (amount >= 1_000) return `₦${(amount / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
    return `₦${amount.toLocaleString()}`;
  };

  const isEndingSoon = timeDisplay.isUrgent && isLive;

  // Get gradient and accent colors based on status
  const getStatusStyles = () => {
    if (isEndingSoon) {
      return {
        bg: 'bg-gradient-to-br from-destructive/10 via-card to-orange-500/5',
        border: 'border-destructive/40 hover:border-destructive/60',
        glow: 'bg-destructive/20',
        badge: 'bg-destructive/20 text-destructive border-destructive/30',
        icon: <AlertTriangle className="w-4 h-4 animate-pulse" />,
        label: 'ENDING',
        dot: 'bg-destructive',
      };
    }
    if (isLive) {
      return {
        bg: 'bg-gradient-to-br from-green-500/10 via-card to-emerald-500/5',
        border: 'border-green-500/30 hover:border-green-500/50',
        glow: 'bg-green-500/20',
        badge: 'bg-green-500/20 text-green-400 border-green-500/30',
        icon: <Radio className="w-4 h-4" />,
        label: 'LIVE',
        dot: 'bg-green-500',
      };
    }
    if (isOpen) {
      return {
        bg: 'bg-gradient-to-br from-blue-500/10 via-card to-indigo-500/5',
        border: 'border-blue-500/30 hover:border-blue-500/50',
        glow: 'bg-blue-500/20',
        badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        icon: <Play className="w-4 h-4" fill="currentColor" />,
        label: 'OPEN',
        dot: 'bg-blue-500',
      };
    }
    return {
      bg: 'bg-gradient-to-br from-yellow-500/10 via-card to-amber-500/5',
      border: 'border-yellow-500/30 hover:border-yellow-500/50',
      glow: 'bg-yellow-500/20',
      badge: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      icon: <Timer className="w-4 h-4" />,
      label: 'SOON',
      dot: 'bg-yellow-500',
    };
  };

  const styles = getStatusStyles();

  return (
    <button
      onClick={handleClick}
      className={`w-full relative overflow-hidden rounded-2xl border p-4 text-left transition-all duration-300 hover:scale-[0.995] active:scale-[0.99] ${styles.bg} ${styles.border} ${isEndingSoon ? 'animate-pulse-slow' : ''}`}
    >
      {/* Ambient glow */}
      <div className={`absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl opacity-50 ${styles.glow}`} />
      <div className={`absolute -bottom-10 -left-10 w-32 h-32 rounded-full blur-3xl opacity-30 ${styles.glow}`} />
      
      <div className="relative z-10">
        {/* Top row: Title + Status */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Icon container */}
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${styles.glow}`}>
              {isEndingSoon ? (
                <AlertTriangle className="w-6 h-6 text-destructive" />
              ) : isLive ? (
                <Zap className="w-6 h-6 text-green-400" />
              ) : isOpen ? (
                <Play className="w-6 h-6 text-blue-400" fill="currentColor" />
              ) : (
                <Timer className="w-6 h-6 text-yellow-400" />
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-foreground truncate">{game.name || 'Royal Rumble'}</h3>
                {game.is_sponsored && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-gradient-to-r from-primary/20 to-gold/20 text-primary border border-primary/30 rounded-full">
                    <Gift className="w-3 h-3" /> FREE
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                <Trophy className="w-3.5 h-3.5 text-gold" />
                <span>{getPayoutLabel(game.payout_type || 'top3')}</span>
                <span className="text-border">•</span>
                <span className={game.entry_fee === 0 ? 'text-green-400 font-medium' : ''}>
                  {game.entry_fee > 0 ? `₦${game.entry_fee}` : 'FREE ENTRY'}
                </span>
              </div>
            </div>
          </div>
          
          {/* Status badge */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${styles.badge}`}>
            <span className={`w-2 h-2 rounded-full ${styles.dot} ${isLive ? 'animate-pulse' : ''}`} />
            <span className="text-xs font-bold tracking-wide">{styles.label}</span>
          </div>
        </div>
        
        {/* Main stats row */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {/* Prize Pool - Highlighted */}
          <div className="col-span-1 p-3 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Prize Pool</p>
            <p className="text-lg font-black text-primary">{formatMoney(prizePool)}</p>
          </div>
          
          {/* Players */}
          <div className="p-3 rounded-xl bg-muted/30 border border-border/50">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Players</p>
            <p className="font-bold text-foreground flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-muted-foreground" /> 
              {game.participant_count}
            </p>
          </div>
          
          {/* Timer */}
          <div className={`p-3 rounded-xl border ${timeDisplay.isUrgent ? 'bg-destructive/10 border-destructive/30' : 'bg-muted/30 border-border/50'}`}>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">{timeDisplay.label}</p>
            <p className={`font-bold font-mono flex items-center gap-1 ${
              timeDisplay.isUrgent ? 'text-destructive animate-pulse' : 
              isLive ? 'text-green-400' : 
              isOpen ? 'text-blue-400' : 'text-yellow-400'
            }`}>
              <Clock className="w-3.5 h-3.5" /> 
              {timeDisplay.value}
            </p>
          </div>
        </div>

        {/* Footer: Pool view + CTA */}
        <div className="flex items-center justify-between pt-3 border-t border-border/30">
          <div 
            className="flex items-center gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <PoolParticipantsSheet
              gameId={game.id}
              gameName={game.name || 'Royal Rumble'}
              participantCount={game.participant_count}
              poolValue={game.pool_value}
              entryFee={game.entry_fee}
              isTestMode={isTestMode}
            >
              <span className="flex items-center gap-1.5 text-xs text-primary font-medium hover:underline cursor-pointer">
                <Eye className="w-3.5 h-3.5" /> 
                View {game.participant_count} in pool
              </span>
            </PoolParticipantsSheet>
          </div>
          
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <span>{isLive ? 'Join Now' : isOpen ? 'Enter Game' : 'View Details'}</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>
      </div>
    </button>
  );
};
