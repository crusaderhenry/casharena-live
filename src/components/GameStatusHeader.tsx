import { Zap, Users, Trophy, Clock, Radio, Timer, AlertTriangle, Play, Eye, Gift } from 'lucide-react';
import { useServerTime, formatCountdown, formatGameTime } from '@/hooks/useServerTime';
import { useState, useEffect } from 'react';

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
  start_time?: string | null;
  scheduled_at?: string | null;
  is_sponsored?: boolean;
  sponsored_amount?: number;
}

interface GameStatusHeaderProps {
  game: Game;
  participantCount?: number;
  isSpectator?: boolean;
  compact?: boolean;
}

export const GameStatusHeader = ({ 
  game, 
  participantCount,
  isSpectator = false,
  compact = false 
}: GameStatusHeaderProps) => {
  const { gameTimeRemaining, secondsUntil, synced } = useServerTime();
  const [timeDisplay, setTimeDisplay] = useState({ label: '', value: '', isUrgent: false });

  const isLive = game.status === 'live';
  const isOpen = game.status === 'open';
  const isScheduled = game.status === 'scheduled';
  const prizePool = game.effective_prize_pool || game.pool_value;
  const players = participantCount ?? game.participant_count;

  useEffect(() => {
    const calculateTime = () => {
      if (isLive && game.start_time) {
        const remaining = gameTimeRemaining(game.start_time, game.max_duration || 20);
        const isEndingSoon = remaining <= 300;
        setTimeDisplay({ 
          label: isEndingSoon ? 'ENDING' : 'Ends In', 
          value: formatGameTime(remaining),
          isUrgent: isEndingSoon,
        });
      } else if (isOpen && game.start_time) {
        const remaining = secondsUntil(game.start_time);
        setTimeDisplay({ 
          label: 'Goes Live', 
          value: formatCountdown(remaining),
          isUrgent: remaining <= 60,
        });
      } else if (isScheduled && game.scheduled_at) {
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
    // Only re-run when game identity/timing changes, not function refs
  }, [game.id, game.status, game.start_time, game.scheduled_at, game.max_duration, isLive, isOpen, isScheduled]);

  const formatMoney = (amount: number) => {
    if (amount >= 1_000_000_000) return `₦${(amount / 1_000_000_000).toFixed(1).replace(/\.0$/, '')}B`;
    if (amount >= 1_000_000) return `₦${(amount / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
    if (amount >= 1_000) return `₦${(amount / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
    return `₦${amount.toLocaleString()}`;
  };

  const isEndingSoon = timeDisplay.isUrgent && isLive;

  const getStatusStyles = () => {
    if (isEndingSoon) {
      return {
        bg: 'bg-gradient-to-br from-destructive/10 via-card to-orange-500/5',
        border: 'border-destructive/40',
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
        border: 'border-green-500/30',
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
        border: 'border-blue-500/30',
        glow: 'bg-blue-500/20',
        badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        icon: <Play className="w-4 h-4" fill="currentColor" />,
        label: 'OPEN',
        dot: 'bg-blue-500',
      };
    }
    return {
      bg: 'bg-gradient-to-br from-yellow-500/10 via-card to-amber-500/5',
      border: 'border-yellow-500/30',
      glow: 'bg-yellow-500/20',
      badge: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      icon: <Timer className="w-4 h-4" />,
      label: 'SOON',
      dot: 'bg-yellow-500',
    };
  };

  const styles = getStatusStyles();

  if (compact) {
    return (
      <div className={`relative overflow-hidden rounded-xl border p-3 ${styles.bg} ${styles.border}`}>
        <div className={`absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl opacity-50 ${styles.glow}`} />
        
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${styles.glow}`}>
              {isEndingSoon ? <AlertTriangle className="w-4 h-4 text-destructive" /> :
               isLive ? <Zap className="w-4 h-4 text-green-400" /> :
               isOpen ? <Play className="w-4 h-4 text-blue-400" fill="currentColor" /> :
               <Timer className="w-4 h-4 text-yellow-400" />}
            </div>
            <div>
              <h3 className="font-bold text-sm text-foreground">{game.name || 'Fastest Finger'}</h3>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Users className="w-3 h-3" /> {players}
                {isSpectator && (
                  <span className="flex items-center gap-1 text-orange-400">
                    <Eye className="w-3 h-3" /> Spectator
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="text-right">
            <p className="text-lg font-black text-primary">{formatMoney(prizePool)}</p>
            <div className={`flex items-center gap-1 text-xs ${
              timeDisplay.isUrgent ? 'text-destructive' : 'text-muted-foreground'
            }`}>
              <Clock className="w-3 h-3" /> {timeDisplay.value}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-2xl border p-4 ${styles.bg} ${styles.border} ${isEndingSoon ? 'animate-pulse-slow' : ''}`}>
      {/* Ambient glow */}
      <div className={`absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl opacity-50 ${styles.glow}`} />
      <div className={`absolute -bottom-10 -left-10 w-32 h-32 rounded-full blur-3xl opacity-30 ${styles.glow}`} />
      
      <div className="relative z-10">
        {/* Top row: Title + Status */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${styles.glow}`}>
              {isEndingSoon ? <AlertTriangle className="w-6 h-6 text-destructive" /> :
               isLive ? <Zap className="w-6 h-6 text-green-400" /> :
               isOpen ? <Play className="w-6 h-6 text-blue-400" fill="currentColor" /> :
               <Timer className="w-6 h-6 text-yellow-400" />}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-foreground truncate">{game.name || 'Fastest Finger'}</h3>
                {game.is_sponsored && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-gradient-to-r from-primary/20 to-gold/20 text-primary border border-primary/30 rounded-full">
                    <Gift className="w-3 h-3" /> FREE
                  </span>
                )}
                {isSpectator && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-full">
                    <Eye className="w-3 h-3" /> SPECTATOR
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                <Trophy className="w-3.5 h-3.5 text-gold" />
                <span>{game.payout_type === 'winner_takes_all' ? 'Winner Takes All' : 
                       game.payout_type === 'top5' ? 'Top 5 Split' : 
                       game.payout_type === 'top10' ? 'Top 10 Split' : 'Top 3 Split'}</span>
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
        <div className="grid grid-cols-3 gap-3">
          {/* Prize Pool */}
          <div className="p-3 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Prize Pool</p>
            <p className="text-lg font-black text-primary">{formatMoney(prizePool)}</p>
          </div>
          
          {/* Players */}
          <div className="p-3 rounded-xl bg-muted/30 border border-border/50">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Players</p>
            <p className="font-bold text-foreground flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-muted-foreground" /> 
              {players}
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
      </div>
    </div>
  );
};
