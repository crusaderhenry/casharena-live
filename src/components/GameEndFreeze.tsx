import { useState, useEffect, useRef } from 'react';
import { Crown, Trophy, Clock, Sparkles } from 'lucide-react';
import { Confetti } from '@/components/Confetti';
import { useSounds } from '@/hooks/useSounds';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';

interface Winner {
  username: string;
  avatar: string;
  position: number;
  prizeAmount: number;
}

interface GameEndFreezeProps {
  isActive: boolean;
  winners: Winner[];
  totalPrize: number;
  onComplete: () => void;
  freezeDuration?: number;
}

export const GameEndFreeze = ({
  isActive,
  winners,
  totalPrize,
  onComplete,
  freezeDuration = 5,
}: GameEndFreezeProps) => {
  const [countdown, setCountdown] = useState(freezeDuration);
  const [showConfetti, setShowConfetti] = useState(false);
  const [phase, setPhase] = useState<'loading' | 'drumroll' | 'reveal' | 'celebration'>('loading');
  const { play } = useSounds();
  const { enableDramaticSounds } = usePlatformSettings();
  
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (!isActive) {
      setCountdown(freezeDuration);
      setPhase('loading');
      return;
    }

    // Brief loading phase (300ms) to allow winner data to populate
    const loadingTimeout = setTimeout(() => {
      setPhase('drumroll');
      
      // Phase 1: Drumroll (1.2s)
      if (enableDramaticSounds) {
        play('drumroll');
        play('tenseCrescendo');
      }
      
      const revealTimeout = setTimeout(() => {
        setPhase('reveal');
        if (enableDramaticSounds) {
          play('crowdCheer');
        }
        setShowConfetti(true);
        
        setTimeout(() => {
          setPhase('celebration');
          if (enableDramaticSounds) {
            play('victoryFanfare');
            play('prizeWin');
          }
        }, 800);
      }, 1200);

      return () => clearTimeout(revealTimeout);
    }, 300);

    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          onCompleteRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(interval);
      clearTimeout(loadingTimeout);
    };
  }, [isActive, freezeDuration, play, enableDramaticSounds]);

  const formatMoney = (amount: number) => `₦${amount.toLocaleString()}`;

  if (!isActive) return null;

  // Show loading spinner while waiting for winner data
  if (phase === 'loading') {
    return (
      <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md flex items-center justify-center animate-fade-in">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-gold/30 border-t-gold rounded-full animate-spin mx-auto mb-4" />
          <p className="text-lg font-bold text-foreground">Calculating Winner...</p>
        </div>
      </div>
    );
  }

  const hasWinner = winners.length > 0;
  const topWinner = winners[0];

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
          {hasWinner ? (
            <>
              {/* Single winner or multiple winners */}
              {winners.length === 1 ? (
                <SingleWinnerDisplay winner={topWinner} phase={phase} formatMoney={formatMoney} />
              ) : (
                <MultipleWinnersDisplay winners={winners} phase={phase} formatMoney={formatMoney} />
              )}
            </>
          ) : (
            <NoWinnerDisplay />
          )}
        </div>

        {/* Transition Countdown */}
        <div className={`space-y-2 transition-all duration-500 ${phase === 'drumroll' ? 'opacity-50' : 'opacity-100'}`}>
          <p className="text-sm text-muted-foreground">Heading to results in</p>
          <div className="text-5xl font-black text-primary animate-pulse">{countdown}</div>
          <button
            onClick={onComplete}
            className="mt-3 text-xs text-muted-foreground underline hover:text-foreground transition-colors"
          >
            Skip to results
          </button>
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

// Single winner display
const SingleWinnerDisplay = ({ winner, phase, formatMoney }: { winner: Winner; phase: string; formatMoney: (n: number) => string }) => (
  <>
    <div className="relative inline-block mb-4">
      <div className="absolute inset-0 rounded-full bg-gold/40 blur-2xl animate-pulse" />
      <div className="absolute inset-0 rounded-full bg-gold/20 blur-3xl animate-ping" style={{ animationDuration: '2s' }} />
      <div className={`relative w-28 h-28 rounded-full bg-gradient-to-br from-gold via-gold/80 to-amber-600 flex items-center justify-center text-6xl border-4 border-gold/50 shadow-2xl shadow-gold/40 transition-all duration-500 ${
        phase === 'celebration' ? 'animate-bounce' : ''
      }`} style={{ animationDuration: '1s' }}>
        {winner.avatar}
      </div>
      <Crown className={`absolute -top-5 left-1/2 -translate-x-1/2 w-12 h-12 text-gold drop-shadow-lg transition-all duration-500 ${
        phase === 'celebration' ? 'animate-pulse' : ''
      }`} />
    </div>
    
    <h2 className="text-4xl font-black text-gold mb-2 flex items-center justify-center gap-2">
      <Sparkles className={`w-7 h-7 ${phase === 'celebration' ? 'animate-spin' : ''}`} style={{ animationDuration: '3s' }} />
      {winner.username}
      <Sparkles className={`w-7 h-7 ${phase === 'celebration' ? 'animate-spin' : ''}`} style={{ animationDuration: '3s', animationDirection: 'reverse' }} />
    </h2>
    
    <p className="text-lg text-muted-foreground mb-4">is the Last One Standing!</p>
    
    <div className={`inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-gold/30 to-amber-500/30 border-2 border-gold/50 transition-all duration-500 ${
      phase === 'celebration' ? 'scale-110' : ''
    }`}>
      <Trophy className="w-8 h-8 text-gold animate-pulse" />
      <span className="text-4xl font-black text-gold">{formatMoney(winner.prizeAmount)}</span>
    </div>
  </>
);

// Multiple winners display (podium style)
const MultipleWinnersDisplay = ({ winners, phase, formatMoney }: { winners: Winner[]; phase: string; formatMoney: (n: number) => string }) => {
  const getPositionEmoji = (pos: number) => {
    switch (pos) { case 1: return '🥇'; case 2: return '🥈'; case 3: return '🥉'; default: return `#${pos}`; }
  };
  
  return (
    <>
      <div className="flex items-end justify-center gap-2 mb-6">
        {/* 2nd place */}
        {winners[1] && (
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gray-300 to-gray-500 flex items-center justify-center text-3xl border-2 border-gray-400/50 shadow-lg mb-2">
              {winners[1].avatar}
            </div>
            <p className="text-xs font-bold text-gray-400">{winners[1].username}</p>
            <p className="text-lg font-bold text-gray-400">{getPositionEmoji(2)}</p>
          </div>
        )}
        
        {/* 1st place */}
        <div className="text-center -mt-4">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-gold/40 blur-xl animate-pulse" />
            <div className={`relative w-24 h-24 rounded-full bg-gradient-to-br from-gold via-gold/80 to-amber-600 flex items-center justify-center text-5xl border-4 border-gold/50 shadow-2xl shadow-gold/40 ${
              phase === 'celebration' ? 'animate-bounce' : ''
            }`} style={{ animationDuration: '1s' }}>
              {winners[0].avatar}
            </div>
            <Crown className="absolute -top-4 left-1/2 -translate-x-1/2 w-10 h-10 text-gold drop-shadow-lg" />
          </div>
          <p className="text-sm font-bold text-gold mt-2">{winners[0].username}</p>
          <p className="text-xl font-bold text-gold">{getPositionEmoji(1)}</p>
        </div>
        
        {/* 3rd place */}
        {winners[2] && (
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center text-2xl border-2 border-amber-600/50 shadow-lg mb-2">
              {winners[2].avatar}
            </div>
            <p className="text-xs font-bold text-amber-600">{winners[2].username}</p>
            <p className="text-lg font-bold text-amber-600">{getPositionEmoji(3)}</p>
          </div>
        )}
      </div>
      
      <h2 className="text-2xl font-black text-gold mb-4 flex items-center justify-center gap-2">
        <Trophy className="w-6 h-6" />
        {winners.length} Winners!
        <Trophy className="w-6 h-6" />
      </h2>
    </>
  );
};

// No winner display - more prominent styling
const NoWinnerDisplay = () => (
  <>
    <div className="relative inline-block mb-4">
      <div className="absolute inset-0 rounded-full bg-muted/40 blur-xl animate-pulse" />
      <div className="relative w-28 h-28 rounded-full bg-gradient-to-br from-muted to-muted/60 flex items-center justify-center text-6xl border-4 border-muted/50 shadow-xl">
        ⏱️
      </div>
    </div>
    <h2 className="text-3xl font-black text-foreground mb-2">Game Over!</h2>
    <p className="text-lg text-muted-foreground mb-4">No comments were recorded</p>
    <p className="text-sm text-muted-foreground/70">Entry fees will be refunded</p>
  </>
);