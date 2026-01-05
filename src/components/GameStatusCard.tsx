import { useState, useEffect } from 'react';
import { Users, Clock, ChevronRight, Trophy, Eye, Play, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSounds } from '@/hooks/useSounds';
import { useHaptics } from '@/hooks/useHaptics';
import { getPayoutLabel } from '@/components/PrizeDistribution';
import { PoolParticipantsSheet } from '@/components/PoolParticipantsSheet';
import { formatDuration } from '@/hooks/useGameCountdown';
import { useServerTime } from '@/hooks/useServerTime';

interface Game {
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
  start_time?: string | null;
  scheduled_at?: string | null;
}

interface GameStatusCardProps {
  game: Game;
  isTestMode?: boolean;
}

export const GameStatusCard = ({ game, isTestMode = false }: GameStatusCardProps) => {
  const navigate = useNavigate();
  const { play } = useSounds();
  const { buttonClick } = useHaptics();
  const { getSecondsUntil, getSecondsElapsed } = useServerTime();
  const [timeDisplay, setTimeDisplay] = useState({ label: '', value: '' });

  const isLive = game.status === 'live';
  const isScheduled = game.status === 'scheduled';
  const isOpen = game.status === 'open';

  // Calculate dynamic countdown using server-synced time
  useEffect(() => {
    const calculateTime = () => {
      if (isLive) {
        // For live games: show time until game ends
        if (game.start_time && game.max_duration) {
          const elapsed = getSecondsElapsed(game.start_time);
          const remaining = Math.max(0, (game.max_duration * 60) - elapsed);
          setTimeDisplay({ label: 'Ending In', value: formatDuration(remaining) });
        } else {
          setTimeDisplay({ label: 'Timer', value: `${game.countdown}s` });
        }
      } else if (isOpen) {
        // For open games: show lobby countdown based on when game started
        if (game.start_time) {
          const startTime = new Date(game.start_time).getTime();
          const lobbyDuration = (game.countdown || 60) * 1000;
          const now = Date.now();
          const elapsed = now - startTime;
          const remaining = Math.max(0, Math.floor((lobbyDuration - elapsed) / 1000));
          setTimeDisplay({ label: 'Starts In', value: formatDuration(remaining) });
        } else {
          setTimeDisplay({ label: 'Accepting', value: 'Entries' });
        }
      } else if (isScheduled) {
        // For scheduled games: show time until opens
        const scheduledTime = game.scheduled_at;
        if (scheduledTime) {
          const remaining = getSecondsUntil(scheduledTime);
          if (remaining > 0) {
            setTimeDisplay({ label: 'Opens In', value: formatDuration(remaining) });
          } else {
            setTimeDisplay({ label: 'Opening...', value: '--:--' });
          }
        } else {
          // No scheduled time - waiting for admin
          setTimeDisplay({ label: 'Waiting for', value: 'Admin' });
        }
      }
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [game, isLive, isScheduled, isOpen, getSecondsUntil, getSecondsElapsed]);

  const handleClick = () => {
    play('click');
    buttonClick();
    // Always go to lobby first - let lobby handle navigation to arena
    navigate('/finger/lobby');
  };

  const formatMoney = (amount: number) => {
    if (amount >= 1_000_000_000) return `₦${(amount / 1_000_000_000).toFixed(1).replace(/\.0$/, '')}B`;
    if (amount >= 1_000_000) return `₦${(amount / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
    if (amount >= 1_000) return `₦${(amount / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
    return `₦${amount.toLocaleString()}`;
  };

  const statusColor = isLive ? 'green' : isOpen ? 'blue' : 'yellow';
  const statusLabel = isLive ? 'LIVE' : isOpen ? 'JOIN NOW' : 'SOON';

  // Only show pool for open/live games (when participants have joined)
  const showPool = isOpen || isLive;

  return (
    <button
      onClick={handleClick}
      className={`w-full relative overflow-hidden rounded-2xl border p-4 text-left transition-all hover:scale-[0.99] active:scale-[0.98] ${
        isLive 
          ? 'bg-gradient-to-br from-card via-card to-green-500/5 border-green-500/30 hover:border-green-500/50' 
          : isOpen
          ? 'bg-gradient-to-br from-card via-card to-blue-500/5 border-blue-500/30 hover:border-blue-500/50'
          : 'bg-gradient-to-br from-card via-card to-yellow-500/5 border-yellow-500/30 hover:border-yellow-500/50'
      }`}
    >
      {/* Glow effect */}
      <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl ${
        isLive ? 'bg-green-500/10' : isOpen ? 'bg-blue-500/10' : 'bg-yellow-500/10'
      }`} />
      
      <div className="relative z-10">
        {/* Header row */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${
              isLive ? 'bg-green-500/20' : isOpen ? 'bg-blue-500/20' : 'bg-yellow-500/20'
            }`}>
              {isLive ? (
                <Play className="w-5 h-5 text-green-400" fill="currentColor" />
              ) : isOpen ? (
                <Users className="w-5 h-5 text-blue-400" />
              ) : (
                <Calendar className="w-5 h-5 text-yellow-400" />
              )}
            </div>
            <div>
              <h3 className="font-bold text-foreground">{game.name || 'Fastest Finger'}</h3>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                <Trophy className="w-3 h-3 text-gold" />
                <span>{getPayoutLabel(game.payout_type || 'top3')}</span>
                <span>•</span>
                <span>₦{game.entry_fee}</span>
              </div>
            </div>
          </div>
          
          {/* Status badge */}
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${
            isLive ? 'bg-green-500/20' : isOpen ? 'bg-blue-500/20' : 'bg-yellow-500/20'
          }`}>
            <span className={`w-2 h-2 rounded-full ${
              isLive ? 'bg-green-500 animate-pulse' : isOpen ? 'bg-blue-500 animate-pulse' : 'bg-yellow-500'
            }`} />
            <span className={`text-xs font-bold ${
              isLive ? 'text-green-400' : isOpen ? 'text-blue-400' : 'text-yellow-400'
            }`}>
              {statusLabel}
            </span>
          </div>
        </div>
        
        {/* Stats row */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs text-muted-foreground">{showPool ? 'Prize Pool' : 'Entry Fee'}</p>
            <p className="text-xl font-black text-primary">
              {showPool ? formatMoney(game.pool_value) : `₦${game.entry_fee.toLocaleString()}`}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {showPool && (
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Players</p>
                <p className="font-bold text-foreground flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" /> {game.participant_count}
                </p>
              </div>
            )}
            <div className="text-center">
              <p className="text-xs text-muted-foreground">{timeDisplay.label}</p>
              <p className={`font-bold flex items-center gap-1 ${
                isLive ? 'text-green-400' : isOpen ? 'text-blue-400' : 'text-yellow-400'
              }`}>
                <Clock className="w-3.5 h-3.5" /> {timeDisplay.value}
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </div>

        {/* View pool CTA - only for open/live */}
        {showPool && (
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
        )}

        {/* For scheduled games, show a hint */}
        {isScheduled && (
          <div className="pt-2 border-t border-border/30">
            <p className="text-xs text-muted-foreground text-center">
              Tap to view lobby • Join when entries open
            </p>
          </div>
        )}
      </div>
    </button>
  );
};