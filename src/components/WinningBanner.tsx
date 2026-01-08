import { Crown, Sparkles, Trophy } from 'lucide-react';
import { useEffect, useState } from 'react';

interface WinningBannerProps {
  isVisible: boolean;
  prizeAmount?: number;
}

export const WinningBanner = ({ isVisible, prizeAmount }: WinningBannerProps) => {
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    if (isVisible) {
      // Create pulsing effect
      const interval = setInterval(() => {
        setPulse(prev => !prev);
      }, 500);
      return () => clearInterval(interval);
    }
  }, [isVisible]);

  if (!isVisible) return null;

  const formatMoney = (amount: number) => {
    if (amount >= 1_000_000) return `₦${(amount / 1_000_000).toFixed(1)}M`;
    if (amount >= 1_000) return `₦${(amount / 1_000).toFixed(0)}K`;
    return `₦${amount.toLocaleString()}`;
  };

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40 animate-fade-in">
      <div className={`relative px-6 py-3 rounded-2xl transition-all duration-300 ${
        pulse ? 'scale-105' : 'scale-100'
      }`}>
        {/* Glowing background */}
        <div className="absolute inset-0 bg-gradient-to-r from-gold/80 via-amber-500/80 to-gold/80 rounded-2xl blur-sm" />
        <div className="absolute inset-0 bg-gradient-to-r from-gold via-amber-500 to-gold rounded-2xl" />
        
        {/* Sparkle decorations */}
        <Sparkles className="absolute -top-2 -left-2 w-5 h-5 text-white animate-ping" />
        <Sparkles className="absolute -bottom-2 -right-2 w-5 h-5 text-white animate-ping" style={{ animationDelay: '0.5s' }} />
        
        {/* Content */}
        <div className="relative flex items-center gap-3 text-black">
          <Crown className={`w-6 h-6 ${pulse ? 'animate-bounce' : ''}`} style={{ animationDuration: '0.5s' }} />
          <div className="flex flex-col items-center">
            <span className="text-lg font-black tracking-wide">YOU ARE WINNING!</span>
            {prizeAmount && prizeAmount > 0 && (
              <span className="text-sm font-bold flex items-center gap-1">
                <Trophy className="w-4 h-4" />
                {formatMoney(prizeAmount)} Prize
              </span>
            )}
          </div>
          <Crown className={`w-6 h-6 ${pulse ? 'animate-bounce' : ''}`} style={{ animationDuration: '0.5s' }} />
        </div>
      </div>
    </div>
  );
};
