import { useState, useEffect } from 'react';
import { Crown, Trophy, Clock, Sparkles } from 'lucide-react';
import { Confetti } from '@/components/Confetti';

interface GameEndFreezeProps {
  isActive: boolean;
  winnerName: string;
  winnerAvatar: string;
  prizeAmount: number;
  onComplete: () => void;
  freezeDuration?: number; // in seconds
}

export const GameEndFreeze = ({
  isActive,
  winnerName,
  winnerAvatar,
  prizeAmount,
  onComplete,
  freezeDuration = 5,
}: GameEndFreezeProps) => {
  const [countdown, setCountdown] = useState(freezeDuration);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (!isActive) {
      setCountdown(freezeDuration);
      return;
    }

    setShowConfetti(true);

    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          onComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, freezeDuration, onComplete]);

  const formatMoney = (amount: number) => {
    return `₦${amount.toLocaleString()}`;
  };

  if (!isActive) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md flex items-center justify-center animate-fade-in">
      {showConfetti && <Confetti />}
      
      <div className="text-center p-8 max-w-md mx-4">
        {/* Game Over Header */}
        <div className="mb-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/20 border border-red-500/30 text-red-400 text-sm font-bold mb-4">
            <Clock className="w-4 h-4" />
            GAME OVER
          </div>
        </div>

        {/* Winner Display */}
        <div className="mb-8">
          <div className="relative inline-block mb-4">
            {/* Glow effect */}
            <div className="absolute inset-0 rounded-full bg-gold/30 blur-xl animate-pulse" />
            
            {/* Avatar */}
            <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-gold via-gold/80 to-amber-600 flex items-center justify-center text-5xl border-4 border-gold/50 shadow-lg shadow-gold/30">
              {winnerAvatar}
            </div>
            
            {/* Crown */}
            <Crown className="absolute -top-4 left-1/2 -translate-x-1/2 w-10 h-10 text-gold drop-shadow-lg" />
          </div>
          
          <h2 className="text-3xl font-black text-gold mb-2 flex items-center justify-center gap-2">
            <Sparkles className="w-6 h-6" />
            {winnerName}
            <Sparkles className="w-6 h-6" />
          </h2>
          
          <p className="text-lg text-muted-foreground mb-4">is the Last One Standing!</p>
          
          <div className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-gold/20 to-amber-500/20 border border-gold/30">
            <Trophy className="w-6 h-6 text-gold" />
            <span className="text-3xl font-black text-gold">{formatMoney(prizeAmount)}</span>
          </div>
        </div>

        {/* Transition Countdown */}
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Heading to results in</p>
          <div className="text-4xl font-black text-primary animate-pulse">
            {countdown}
          </div>
        </div>
      </div>
    </div>
  );
};
