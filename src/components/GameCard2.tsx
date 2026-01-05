import { useNavigate } from 'react-router-dom';
import { useSounds } from '@/hooks/useSounds';
import { useHaptics } from '@/hooks/useHaptics';
import { GameState } from '@/hooks/useGameState';
import { Users, Clock, Zap, Trophy, Gift, Calendar, Play, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GameCard2Props {
  game: GameState;
  compact?: boolean;
}

/**
 * Enhanced game card that displays real-time game state
 * with server-driven countdown timers and status
 */
export function GameCard2({ game, compact = false }: GameCard2Props) {
  const navigate = useNavigate();
  const { play } = useSounds();
  const { buttonClick } = useHaptics();

  const handleClick = () => {
    play('click');
    buttonClick();
    navigate(`/finger/lobby?id=${game.id}`);
  };

  const formatMoney = (amount: number) => {
    if (amount >= 1_000_000) return `₦${(amount / 1_000_000).toFixed(1)}M`;
    if (amount >= 1_000) return `₦${(amount / 1_000).toFixed(1)}K`;
    return `₦${amount.toLocaleString()}`;
  };

  const formatTime = (seconds: number) => {
    if (seconds <= 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins >= 60) {
      const hrs = Math.floor(mins / 60);
      const remainingMins = mins % 60;
      return `${hrs}h ${remainingMins}m`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusConfig = () => {
    switch (game.status) {
      case 'live':
        return {
          label: 'LIVE',
          color: 'bg-green-500/20 text-green-400 border-green-500/30',
          icon: <Play className="w-3 h-3" fill="currentColor" />,
          pulse: true,
        };
      case 'ending_soon':
        return {
          label: 'ENDING SOON',
          color: 'bg-red-500/20 text-red-400 border-red-500/30',
          icon: <AlertTriangle className="w-3 h-3" />,
          pulse: true,
        };
      case 'open':
        return {
          label: 'OPEN',
          color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
          icon: <Zap className="w-3 h-3" />,
          pulse: false,
        };
      case 'scheduled':
        return {
          label: 'COMING SOON',
          color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
          icon: <Calendar className="w-3 h-3" />,
          pulse: false,
        };
      default:
        return {
          label: game.status.toUpperCase(),
          color: 'bg-muted text-muted-foreground border-muted',
          icon: null,
          pulse: false,
        };
    }
  };

  const statusConfig = getStatusConfig();

  // Determine which countdown to show based on status
  const getCountdownDisplay = () => {
    switch (game.status) {
      case 'scheduled':
        return {
          label: 'Opens in',
          value: formatTime(game.seconds_until_open),
        };
      case 'open':
        return {
          label: 'Starts in',
          value: formatTime(game.seconds_until_live),
        };
      case 'live':
      case 'ending_soon':
        return {
          label: 'Time left',
          value: formatTime(game.seconds_remaining),
        };
      default:
        return null;
    }
  };

  const countdownDisplay = getCountdownDisplay();

  if (compact) {
    return (
      <button
        onClick={handleClick}
        className={cn(
          'w-full p-3 rounded-xl border transition-all text-left',
          'bg-card hover:bg-card-elevated border-border hover:border-primary/40',
          game.is_ending_soon && 'border-red-500/50 bg-red-500/5'
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
              game.is_sponsored ? 'bg-gold/20' : 'bg-primary/20'
            )}>
              {game.is_sponsored ? (
                <Gift className="w-5 h-5 text-gold" />
              ) : (
                <Zap className="w-5 h-5 text-primary" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-foreground truncate">{game.name}</h3>
                {game.is_sponsored && (
                  <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase bg-gold/20 text-gold rounded">
                    Sponsored
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {game.participant_count}
                </span>
                {countdownDisplay && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {countdownDisplay.value}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="text-right flex-shrink-0">
            <div className={cn(
              'inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold uppercase border',
              statusConfig.color,
              statusConfig.pulse && 'animate-pulse'
            )}>
              {statusConfig.icon}
              {statusConfig.label}
            </div>
            <p className="text-sm font-bold text-primary mt-1">
              {formatMoney(game.effective_prize_pool)}
            </p>
          </div>
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      className={cn(
        'w-full p-4 rounded-2xl border transition-all text-left',
        'bg-card hover:bg-card-elevated border-border hover:border-primary/40',
        game.is_ending_soon && 'border-red-500/50 bg-gradient-to-br from-red-500/10 to-transparent animate-pulse'
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-12 h-12 rounded-xl flex items-center justify-center',
            game.is_sponsored ? 'bg-gold/20' : 'bg-primary/20'
          )}>
            {game.is_sponsored ? (
              <Gift className="w-6 h-6 text-gold" />
            ) : (
              <Zap className="w-6 h-6 text-primary" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-foreground">{game.name}</h3>
              {game.is_sponsored && (
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-gold/20 text-gold rounded-full">
                  Sponsored
                </span>
              )}
            </div>
            {game.description && (
              <p className="text-xs text-muted-foreground line-clamp-1">{game.description}</p>
            )}
          </div>
        </div>
        
        <div className={cn(
          'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase border',
          statusConfig.color,
          statusConfig.pulse && 'animate-pulse'
        )}>
          {statusConfig.icon}
          {statusConfig.label}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        <div className="p-2 bg-muted/30 rounded-lg text-center">
          <p className="text-[10px] text-muted-foreground uppercase">Prize</p>
          <p className="font-bold text-primary text-sm">{formatMoney(game.effective_prize_pool)}</p>
        </div>
        <div className="p-2 bg-muted/30 rounded-lg text-center">
          <p className="text-[10px] text-muted-foreground uppercase">Entry</p>
          <p className="font-bold text-foreground text-sm">
            {game.entry_fee === 0 ? 'FREE' : formatMoney(game.entry_fee)}
          </p>
        </div>
        <div className="p-2 bg-muted/30 rounded-lg text-center">
          <p className="text-[10px] text-muted-foreground uppercase">Players</p>
          <p className="font-bold text-foreground text-sm">{game.participant_count}</p>
        </div>
        <div className="p-2 bg-muted/30 rounded-lg text-center">
          <p className="text-[10px] text-muted-foreground uppercase">Duration</p>
          <p className="font-bold text-foreground text-sm">{game.max_duration}m</p>
        </div>
      </div>

      {/* Countdown */}
      {countdownDisplay && (
        <div className={cn(
          'p-3 rounded-xl text-center border',
          game.is_ending_soon
            ? 'bg-red-500/10 border-red-500/30'
            : 'bg-primary/5 border-primary/20'
        )}>
          <p className="text-[10px] text-muted-foreground uppercase mb-1">{countdownDisplay.label}</p>
          <p className={cn(
            'font-bold text-xl',
            game.is_ending_soon ? 'text-red-400' : 'text-primary'
          )}>
            {countdownDisplay.value}
          </p>
        </div>
      )}

      {/* Recurrence indicator */}
      {game.recurrence_type && (
        <div className="mt-2 flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
          <span>🔁</span>
          <span>
            Repeats {game.recurrence_type === 'minutes' ? `every ${game.recurrence_interval} min` :
                     game.recurrence_type === 'hours' ? `every ${game.recurrence_interval} hr` :
                     game.recurrence_type}
          </span>
        </div>
      )}
    </button>
  );
}
