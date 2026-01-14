import { ArrowLeft, Radio, Share2, Maximize, Minimize, Crown, Users, Flame } from 'lucide-react';
import { MusicToggle } from '@/components/MusicToggle';

interface ArenaHeaderProps {
  isLive: boolean;
  status: string;
  gameName: string;
  prizePool: number;
  participantCount: number;
  isMobile: boolean;
  isFullscreen: boolean;
  isHotGame?: boolean;
  onBack: () => void;
  onShare: () => void;
  onToggleFullscreen: () => void;
}

export const ArenaHeader = ({
  isLive,
  status,
  gameName,
  prizePool,
  participantCount,
  isMobile,
  isFullscreen,
  isHotGame,
  onBack,
  onShare,
  onToggleFullscreen,
}: ArenaHeaderProps) => {
  const formatMoney = (amount: number) => {
    if (amount >= 1_000_000) return `₦${(amount / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
    if (amount >= 1_000) return `₦${(amount / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
    return `₦${amount.toLocaleString()}`;
  };

  return (
    <div className="sticky top-0 z-20 pt-safe bg-gradient-to-b from-background via-background to-transparent">
      {/* Top Row - Minimal controls */}
      <div className="p-3 flex items-center justify-between">
        {/* Back button */}
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-xl bg-muted/80 flex items-center justify-center"
        >
          <ArrowLeft className="w-4 h-4 text-foreground" />
        </button>
        
        {/* LIVE indicator */}
        <div className={`flex items-center gap-1.5 text-sm font-bold px-3 py-1.5 rounded-full ${
          isLive ? 'bg-red-500/20 text-red-400' : 
          status === 'opening' ? 'bg-green-500/20 text-green-400' :
          'bg-blue-500/20 text-blue-400'
        }`}>
          <Radio className={`w-3.5 h-3.5 ${isLive ? 'animate-pulse' : ''}`} />
          {isLive ? 'LIVE' : status.toUpperCase()}
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-1.5">
          <MusicToggle className="w-9 h-9" />
          
          <button
            onClick={onShare}
            className="w-9 h-9 rounded-xl bg-muted/80 flex items-center justify-center"
          >
            <Share2 className="w-4 h-4 text-foreground" />
          </button>
          
          {isMobile && (
            <button
              onClick={onToggleFullscreen}
              className="w-9 h-9 rounded-xl bg-muted/80 flex items-center justify-center"
            >
              {isFullscreen ? (
                <Minimize className="w-4 h-4 text-foreground" />
              ) : (
                <Maximize className="w-4 h-4 text-foreground" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Game Info Row - Compact */}
      <div className="px-4 pb-2 flex items-center justify-center gap-3 text-sm">
        <span className="flex items-center gap-1.5 font-bold text-foreground">
          <Crown className="w-4 h-4 text-gold" />
          {gameName}
        </span>
        <span className="text-gold font-black text-xl">{formatMoney(prizePool)}</span>
        <span className="flex items-center gap-1 text-muted-foreground">
          <Users className="w-3.5 h-3.5" />
          {participantCount}
          {isHotGame && <Flame className="w-3.5 h-3.5 text-orange-400 animate-pulse" />}
        </span>
      </div>
    </div>
  );
};
