import { useState, useEffect, useRef } from 'react';
import { Crown, Trophy, Clock, Sparkles } from 'lucide-react';
import { Confetti } from '@/components/Confetti';
import { useSounds } from '@/hooks/useSounds';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';

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
  const [phase, setPhase] = useState<'drumroll' | 'reveal' | 'celebration'>('drumroll');
  const { play } = useSounds();
  const { enableDramaticSounds } = usePlatformSettings();
  
  // Use ref to avoid dependency issues with onComplete
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (!isActive) {
      setCountdown(freezeDuration);
      setPhase('drumroll');
      return;
    }

    // Phase 1: Drumroll and tension (1 second) - only if dramatic sounds enabled
    if (enableDramaticSounds) {
      play('drumroll');
      play('tenseCrescendo');
    }
    
    const revealTimeout = setTimeout(() => {
      // Phase 2: Reveal with crowd cheer
      setPhase('reveal');
      if (enableDramaticSounds) {
        play('crowdCheer');
      }
      setShowConfetti(true);
      
      // Phase 3: Victory fanfare after reveal
      setTimeout(() => {
        setPhase('celebration');
        if (enableDramaticSounds) {
          play('victoryFanfare');
          play('prizeWin');
        }
      }, 800);
    }, 1200);

    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          // Use ref to call the callback
          onCompleteRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(interval);
      clearTimeout(revealTimeout);
    };
  }, [isActive, freezeDuration, play, enableDramaticSounds]);

  const formatMoney = (amount: number) => {
    return `₦${amount.toLocaleString()}`;
  };

  if (!isActive) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md flex items-center justify-center animate-fade-in overflow-hidden">
      {showConfetti && <Confetti />}
      
      {/* Animated background rays */}
      <div className="absolute inset-0 overflow-hidden">
        <div className={`absolute inset-0 transition-opacity duration-1000 ${phase !== 'drumroll' ? 'opacity-30' : 'opacity-0'}`}>
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="absolute top-1/2 left-1/2 w-[200%] h-2 bg-gradient-to-r from-transparent via-gold/30 to-transparent origin-left"
              style={{
                transform: `rotate(${i * 30}deg)`,
                animation: phase !== 'drumroll' ? `spin 20s linear infinite` : 'none',
              }}
            />
          ))}
        </div>
      </div>
      
      <div className={`text-center p-8 max-w-md mx-4 relative z-10 transition-all duration-500 ${
        phase === 'drumroll' ? 'scale-90 opacity-70' : 'scale-100 opacity-100'
      }`}>
        {/* Game Over Header */}
        <div className={`mb-6 transition-all duration-500 ${phase === 'drumroll' ? 'translate-y-4' : 'translate-y-0'}`}>
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold mb-4 transition-all duration-500 ${
            phase === 'drumroll' 
              ? 'bg-orange-500/20 border border-orange-500/30 text-orange-400 animate-pulse'
              : 'bg-red-500/20 border border-red-500/30 text-red-400'
          }`}>
            <Clock className="w-4 h-4" />
            {phase === 'drumroll' ? 'AND THE WINNER IS...' : 'GAME OVER'}
          </div>
        </div>

        {/* Winner Display */}
        <div className={`mb-8 transition-all duration-700 ${
          phase === 'drumroll' ? 'scale-0 opacity-0' : 'scale-100 opacity-100'
        }`}>
          <div className="relative inline-block mb-4">
            {/* Pulsing glow effect */}
            <div className="absolute inset-0 rounded-full bg-gold/40 blur-2xl animate-pulse" />
            <div className="absolute inset-0 rounded-full bg-gold/20 blur-3xl animate-ping" style={{ animationDuration: '2s' }} />
            
            {/* Avatar */}
            <div className={`relative w-28 h-28 rounded-full bg-gradient-to-br from-gold via-gold/80 to-amber-600 flex items-center justify-center text-6xl border-4 border-gold/50 shadow-2xl shadow-gold/40 transition-all duration-500 ${
              phase === 'celebration' ? 'animate-bounce' : ''
            }`} style={{ animationDuration: '1s' }}>
              {winnerAvatar}
            </div>
            
            {/* Crown with animation */}
            <Crown className={`absolute -top-5 left-1/2 -translate-x-1/2 w-12 h-12 text-gold drop-shadow-lg transition-all duration-500 ${
              phase === 'celebration' ? 'animate-pulse' : ''
            }`} />
          </div>
          
          <h2 className="text-4xl font-black text-gold mb-2 flex items-center justify-center gap-2">
            <Sparkles className={`w-7 h-7 ${phase === 'celebration' ? 'animate-spin' : ''}`} style={{ animationDuration: '3s' }} />
            {winnerName}
            <Sparkles className={`w-7 h-7 ${phase === 'celebration' ? 'animate-spin' : ''}`} style={{ animationDuration: '3s', animationDirection: 'reverse' }} />
          </h2>
          
          <p className="text-lg text-muted-foreground mb-4">is the Last One Standing!</p>
          
          <div className={`inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-gold/30 to-amber-500/30 border-2 border-gold/50 transition-all duration-500 ${
            phase === 'celebration' ? 'scale-110' : ''
          }`}>
            <Trophy className="w-8 h-8 text-gold animate-pulse" />
            <span className="text-4xl font-black text-gold">{formatMoney(prizeAmount)}</span>
          </div>
        </div>

        {/* Transition Countdown */}
        <div className={`space-y-2 transition-all duration-500 ${
          phase === 'drumroll' ? 'opacity-50' : 'opacity-100'
        }`}>
          <p className="text-sm text-muted-foreground">Heading to results in</p>
          <div className="text-5xl font-black text-primary animate-pulse">
            {countdown}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
