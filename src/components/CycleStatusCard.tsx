import { useNavigate } from 'react-router-dom';
import { GameCycle } from '@/hooks/useActiveCycles';
import { useSounds } from '@/hooks/useSounds';
import { useHaptics } from '@/hooks/useHaptics';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { useAuth } from '@/contexts/AuthContext';
import { Crown, Users, Timer, Zap, Eye, Play, Radio, Clock, Sparkles, Flame, Share2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { AuthPromptModal } from '@/components/AuthPromptModal';
import { GameShareModal } from '@/components/GameShareModal';

interface CycleStatusCardProps {
  cycle: GameCycle;
  isParticipant?: boolean;
}

export const CycleStatusCard = ({ cycle, isParticipant = false }: CycleStatusCardProps) => {
  const navigate = useNavigate();
  const { play } = useSounds();
  const { buttonClick } = useHaptics();
  const { hotGameThresholds } = usePlatformSettings();
  const { user } = useAuth();
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  
  // Helper to determine if game is "hot" using platform settings
  const isHotGame = (participantCount: number, status: string): boolean => {
    if (status === 'live' || status === 'ending') {
      return participantCount >= hotGameThresholds.live;
    }
    if (status === 'opening') {
      return participantCount >= hotGameThresholds.opening;
    }
    return participantCount >= hotGameThresholds.live;
  };
  
  // Local countdown state
  const [localCountdown, setLocalCountdown] = useState({
    secondsUntilOpening: cycle.seconds_until_opening,
    secondsUntilLive: cycle.seconds_until_live,
    secondsRemaining: cycle.seconds_remaining,
  });

  // Update countdown every second
  useEffect(() => {
    const interval = setInterval(() => {
      setLocalCountdown(prev => ({
        secondsUntilOpening: Math.max(0, prev.secondsUntilOpening - 1),
        secondsUntilLive: Math.max(0, prev.secondsUntilLive - 1),
        secondsRemaining: Math.max(0, prev.secondsRemaining - 1),
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Sync with props when they change
  useEffect(() => {
    setLocalCountdown({
      secondsUntilOpening: cycle.seconds_until_opening,
      secondsUntilLive: cycle.seconds_until_live,
      secondsRemaining: cycle.seconds_remaining,
    });
  }, [cycle.seconds_until_opening, cycle.seconds_until_live, cycle.seconds_remaining]);

  const handleClick = () => {
    play('click');
    buttonClick();
    
    // Check if user is authenticated
    if (!user) {
      setShowAuthPrompt(true);
      return;
    }
    
    // Live games go directly to arena, others go to lobby
    if (cycle.status === 'live' || cycle.status === 'ending') {
      navigate(`/arena/${cycle.id}/live`);
    } else {
      navigate(`/arena/${cycle.id}`);
    }
  };

  const formatMoney = (amount: number) => {
    if (amount >= 1_000_000) return `₦${(amount / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
    if (amount >= 1_000) return `₦${(amount / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
    return `₦${amount.toLocaleString()}`;
  };

  const formatTime = (seconds: number) => {
    if (seconds <= 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTimeDetailed = (seconds: number) => {
    if (seconds <= 0) return 'Now';
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${mins}m`;
  };

  // Calculate effective prize pool
  const effectivePrizePool = cycle.pool_value + (cycle.sponsored_prize_amount || 0);

  // Compute display status for instant UI transitions
  // When local countdown hits 0, show next phase immediately
  const displayStatus = (() => {
    if (cycle.status === 'waiting' && localCountdown.secondsUntilOpening <= 0) {
      return 'opening';
    }
    return cycle.status;
  })();

  // Status-based styling using displayStatus for instant transitions
  const getStatusConfig = () => {
    switch (displayStatus) {
      case 'live':
        return {
          badge: 'LIVE',
          badgeClass: 'bg-red-500 text-white',
          borderClass: 'border-red-500/30',
          icon: <Radio className="w-3.5 h-3.5" />,
          countdown: cycle.countdown,
          countdownLabel: 'Comment Timer',
          glow: 'shadow-red-500/20',
        };
      case 'ending':
        return {
          badge: 'ENDING',
          badgeClass: 'bg-orange-500 text-white animate-pulse',
          borderClass: 'border-orange-500/30',
          icon: <Timer className="w-3.5 h-3.5" />,
          countdown: cycle.countdown,
          countdownLabel: 'Final Countdown',
          glow: 'shadow-orange-500/20',
        };
      case 'opening':
        return {
          badge: 'OPEN',
          badgeClass: 'bg-green-500 text-white',
          borderClass: 'border-green-500/30',
          icon: <Play className="w-3.5 h-3.5" />,
          countdown: localCountdown.secondsUntilLive,
          countdownLabel: 'Starts In',
          glow: 'shadow-green-500/20',
        };
      case 'waiting':
      default:
        return {
          badge: 'WAITING',
          badgeClass: 'bg-blue-500 text-white',
          borderClass: 'border-blue-500/30',
          icon: <Clock className="w-3.5 h-3.5" />,
          countdown: localCountdown.secondsUntilOpening,
          countdownLabel: 'Opens In',
          glow: 'shadow-blue-500/20',
        };
    }
  };

  const config = getStatusConfig();
  const hot = isHotGame(cycle.participant_count, cycle.status);

  return (
    <>
      <button
        onClick={handleClick}
        className={`w-full text-left rounded-2xl border ${config.borderClass} bg-card p-4 hover:bg-card/80 transition-all group shadow-lg ${config.glow} ${hot ? 'ring-2 ring-orange-500/50' : ''}`}
      >
        {/* Hot Game Badge */}
        {hot && (
          <div className="flex items-center gap-1.5 mb-2">
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-orange-500 to-red-500 text-white text-[10px] font-bold animate-pulse">
              <Flame className="w-3 h-3" />
              HOT GAME
              <Flame className="w-3 h-3" />
            </div>
            <span className="text-[10px] text-orange-400">High activity!</span>
          </div>
        )}

        {/* Header Row */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <Crown className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-foreground flex items-center gap-2">
                {cycle.template_name}
                {cycle.entry_fee === 0 && (
                  <span className="text-[10px] bg-gold/20 text-gold px-1.5 py-0.5 rounded font-medium">
                    FREE
                  </span>
                )}
              </h3>
              <p className="text-xs text-muted-foreground">
                Top {cycle.winner_count} win • {cycle.prize_distribution.join('/')} split
              </p>
            </div>
          </div>
          
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${config.badgeClass}`}>
            {config.icon}
            {config.badge}
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Prize Pool</p>
            <p className="text-lg font-black text-gold">{formatMoney(effectivePrizePool)}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Players</p>
            <p className="text-lg font-black text-foreground flex items-center justify-center gap-1">
              <Users className="w-4 h-4 text-primary" />
              {cycle.participant_count}
            </p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{config.countdownLabel}</p>
            <p className={`text-lg font-black ${cycle.status === 'live' || cycle.status === 'ending' ? 'text-red-400' : 'text-foreground'}`}>
              {formatTime(config.countdown)}
            </p>
          </div>
        </div>

        {/* Action Row */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          {displayStatus === 'opening' ? (
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-green-400">
                {cycle.entry_fee > 0 ? formatMoney(cycle.entry_fee) : 'FREE'} Entry
              </span>
              {isParticipant && (
                <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full">JOINED</span>
              )}
            </div>
          ) : displayStatus === 'live' || displayStatus === 'ending' ? (
            <div className="flex items-center gap-2">
              {isParticipant ? (
                <span className="text-sm font-bold text-green-400 flex items-center gap-1">
                  <Sparkles className="w-4 h-4" /> You're In!
                </span>
              ) : (
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Eye className="w-4 h-4" /> {cycle.allow_spectators ? 'Spectate Available' : 'Entries Closed'}
                </span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Opens in {formatTimeDetailed(localCountdown.secondsUntilOpening)}
              </span>
            </div>
          )}
          
          <div className="flex items-center gap-2">
            {/* Share Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                play('click');
                buttonClick();
                setShowShareModal(true);
              }}
              className="p-2 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Share2 className="w-4 h-4" />
            </button>
            
            {/* CTA - Always leads to Lobby */}
            <div className="flex items-center gap-1 text-primary text-sm font-medium group-hover:translate-x-1 transition-transform">
              {displayStatus === 'live' || displayStatus === 'ending' 
                ? 'Watch Live' 
                : displayStatus === 'opening' 
                  ? 'Enter Game' 
                  : 'View Lobby'}
              <Zap className="w-4 h-4" />
            </div>
          </div>
        </div>
      </button>
      
      <AuthPromptModal 
        open={showAuthPrompt} 
        onOpenChange={setShowAuthPrompt}
        action="game"
      />
      
      <GameShareModal
        open={showShareModal}
        onOpenChange={setShowShareModal}
        cycle={cycle}
        variant="card"
      />
    </>
  );
};