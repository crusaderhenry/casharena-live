import { useNavigate } from 'react-router-dom';
import { useSounds } from '@/hooks/useSounds';
import { useHaptics } from '@/hooks/useHaptics';
import { getPayoutLabel } from '@/components/PrizeDistribution';
import { PoolParticipantsSheet } from '@/components/PoolParticipantsSheet';
import { useServerTime, formatCountdown } from '@/hooks/useServerTime';
import { ActiveGame } from '@/hooks/useActiveGames';
import { Zap, Users, Clock, Trophy, Eye, Timer, Coins, Play, Calendar, Gift, ChevronRight } from 'lucide-react';
import { useState, useEffect } from 'react';

interface LiveGameCardProps {
  game: ActiveGame;
  isTestMode?: boolean;
  compact?: boolean;
}

export const LiveGameCard = ({ game, isTestMode = false, compact = false }: LiveGameCardProps) => {
  const navigate = useNavigate();
  const { play } = useSounds();
  const { buttonClick } = useHaptics();
  const { gameTimeRemaining, secondsUntil } = useServerTime();
  
  const [displayTime, setDisplayTime] = useState({
    gameTime: game.seconds_remaining,
    countdown: game.countdown,
    secondsUntilOpen: game.seconds_until_open,
    secondsUntilLive: game.seconds_until_live,
  });

  // Update timers every second using server-synced time
  useEffect(() => {
    const updateTimers = () => {
      if (game.status === 'live') {
        setDisplayTime(prev => ({
          ...prev,
          gameTime: gameTimeRemaining(game.start_time, game.max_duration),
          countdown: game.countdown, // This comes from server via realtime
        }));
      } else if (game.status === 'scheduled') {
        setDisplayTime(prev => ({
          ...prev,
          secondsUntilOpen: secondsUntil(game.scheduled_at),
        }));
      } else if (game.status === 'open') {
        setDisplayTime(prev => ({
          ...prev,
          secondsUntilLive: secondsUntil(game.start_time),
        }));
      }
    };

    updateTimers();
    const interval = setInterval(updateTimers, 1000);
    return () => clearInterval(interval);
  }, [game, gameTimeRemaining, secondsUntil]);

  // Sync countdown from server updates
  useEffect(() => {
    setDisplayTime(prev => ({ ...prev, countdown: game.countdown }));
  }, [game.countdown]);

  const isLive = game.status === 'live';
  const isOpen = game.status === 'open';
  const isScheduled = game.status === 'scheduled';
  const isEndingSoon = displayTime.gameTime <= 300 && isLive;
  const isUrgent = game.countdown <= 15 && isLive;

  const formatMoney = (amount: number) => {
    if (amount >= 1_000_000_000) return `₦${(amount / 1_000_000_000).toFixed(1).replace(/\.0$/, '')}B`;
    if (amount >= 1_000_000) return `₦${(amount / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
    if (amount >= 1_000) return `₦${(amount / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
    return `₦${amount.toLocaleString()}`;
  };

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

  const getStatusBadge = () => {
    if (isLive) {
      if (isEndingSoon) {
        return (
          <span className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-destructive/20 text-xs font-bold text-destructive animate-pulse border border-destructive/30">
            <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
            ENDING SOON
          </span>
        );
      }
      return (
        <span className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-500/20 text-xs font-bold text-green-400 border border-green-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          LIVE
        </span>
      );
    }
    if (isOpen) {
      return (
        <span className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-blue-500/20 text-xs font-bold text-blue-400 border border-blue-500/30">
          <Play className="w-3 h-3" />
          OPEN
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-yellow-500/20 text-xs font-bold text-yellow-400 border border-yellow-500/30">
        <Calendar className="w-3 h-3" />
        SCHEDULED
      </span>
    );
  };

  const getTimerDisplay = () => {
    if (isLive) {
      return (
        <div className="text-right">
          <p className="text-[10px] text-muted-foreground uppercase">Game Ends In</p>
          <p className={`font-bold text-lg ${isEndingSoon ? 'text-destructive animate-pulse' : 'text-foreground'}`}>
            {formatGameTime(displayTime.gameTime)}
          </p>
        </div>
      );
    }
    if (isOpen) {
      return (
        <div className="text-right">
          <p className="text-[10px] text-muted-foreground uppercase">Goes Live In</p>
          <p className="font-bold text-lg text-blue-400">
            {formatCountdown(displayTime.secondsUntilLive)}
          </p>
        </div>
      );
    }
    return (
      <div className="text-right">
        <p className="text-[10px] text-muted-foreground uppercase">Opens In</p>
        <p className="font-bold text-lg text-yellow-400">
          {formatCountdown(displayTime.secondsUntilOpen)}
        </p>
      </div>
    );
  };

  if (compact) {
    return (
      <button
        onClick={handleClick}
        className="w-full card-panel hover:border-primary/40 transition-all"
      >
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            isLive ? 'bg-green-500/20' : isOpen ? 'bg-blue-500/20' : 'bg-yellow-500/20'
          }`}>
            <Zap className={`w-6 h-6 ${
              isLive ? 'text-green-400' : isOpen ? 'text-blue-400' : 'text-yellow-400'
            }`} />
          </div>
          
          <div className="flex-1 text-left">
            <div className="flex items-center gap-2">
              {game.is_sponsored && <Gift className="w-3 h-3 text-primary" />}
              <span className="font-bold text-foreground">{game.name}</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" /> {game.participant_count}
              </span>
              {game.entry_fee > 0 ? (
                <span>₦{game.entry_fee}</span>
              ) : (
                <span className="text-primary font-medium">FREE</span>
              )}
            </div>
          </div>
          
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Pool</p>
            <p className="font-bold text-primary">{formatMoney(game.effective_prize_pool)}</p>
          </div>
          
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      className={`w-full relative overflow-hidden rounded-2xl p-4 text-left transition-all active:scale-[0.98] ${
        isEndingSoon 
          ? 'bg-gradient-to-br from-destructive/20 via-card to-card border-2 border-destructive/50 animate-pulse-slow' 
          : isLive
          ? 'bg-gradient-to-br from-green-500/20 via-card to-card border-2 border-green-500/50'
          : isOpen
          ? 'bg-gradient-to-br from-blue-500/20 via-card to-card border-2 border-blue-500/50'
          : 'bg-gradient-to-br from-yellow-500/20 via-card to-card border-2 border-yellow-500/50'
      }`}
    >
      {/* Background glow */}
      <div className={`absolute top-0 right-0 w-40 h-40 rounded-full blur-3xl ${
        isEndingSoon ? 'bg-destructive/10' : isLive ? 'bg-green-500/10' : isOpen ? 'bg-blue-500/10' : 'bg-yellow-500/10'
      }`} />
      
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${
              isEndingSoon ? 'bg-destructive/30' : isLive ? 'bg-green-500/30' : isOpen ? 'bg-blue-500/30' : 'bg-yellow-500/30'
            }`}>
              <Zap className={`w-5 h-5 ${
                isEndingSoon ? 'text-destructive' : isLive ? 'text-green-400' : isOpen ? 'text-blue-400' : 'text-yellow-400'
              }`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-foreground">{game.name}</h3>
                {game.is_sponsored && (
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-primary/20 text-primary rounded-full flex items-center gap-1">
                    <Gift className="w-3 h-3" /> Sponsored
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                <Trophy className="w-3 h-3 text-gold" />
                <span>{getPayoutLabel(game.payout_type)}</span>
              </div>
            </div>
          </div>
          {getStatusBadge()}
        </div>
        
        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-2 mb-3">
          <div className="bg-background/50 rounded-lg p-2 text-center">
            <Coins className="w-4 h-4 text-primary mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">Pool</p>
            <p className="font-bold text-primary text-sm">{formatMoney(game.effective_prize_pool)}</p>
          </div>
          <div className="bg-background/50 rounded-lg p-2 text-center">
            <Users className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">Players</p>
            <p className="font-bold text-foreground text-sm">{game.participant_count}</p>
          </div>
          <div className="bg-background/50 rounded-lg p-2 text-center">
            <Timer className={`w-4 h-4 mx-auto mb-1 ${isUrgent ? 'text-destructive' : 'text-muted-foreground'}`} />
            <p className="text-xs text-muted-foreground">Timer</p>
            <p className={`font-bold text-sm ${isUrgent ? 'text-destructive animate-pulse' : 'text-foreground'}`}>
              {displayTime.countdown}s
            </p>
          </div>
          <div className="bg-background/50 rounded-lg p-2 text-center">
            <Trophy className="w-4 h-4 text-gold mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">Entry</p>
            <p className="font-bold text-foreground text-sm">
              {game.entry_fee > 0 ? `₦${game.entry_fee}` : 'FREE'}
            </p>
          </div>
        </div>

        {/* Footer with timer and pool view */}
        <div className="flex items-center justify-between pt-2 border-t border-border/30">
          <PoolParticipantsSheet
            gameId={game.id}
            gameName={game.name}
            participantCount={game.participant_count}
            poolValue={game.effective_prize_pool}
            entryFee={game.entry_fee}
            isTestMode={isTestMode}
          >
            <span className="flex items-center gap-1 text-xs text-primary font-medium" onClick={(e) => e.stopPropagation()}>
              <Eye className="w-3 h-3" /> View pool
            </span>
          </PoolParticipantsSheet>
          
          {getTimerDisplay()}
        </div>
      </div>
    </button>
  );
};