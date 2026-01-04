import { useNavigate, useLocation } from 'react-router-dom';
import { BottomNav } from '@/components/BottomNav';
import { Avatar } from '@/components/Avatar';
import { Confetti } from '@/components/Confetti';
import { useWallet } from '@/contexts/WalletContext';
import { useGame } from '@/contexts/GameContext';
import { useEffect } from 'react';
import { useSounds } from '@/hooks/useSounds';
import { useHaptics } from '@/hooks/useHaptics';

export const FingerResults = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { addWinnings } = useWallet();
  const { setFingerPosition, resetFinger, addActivity } = useGame();
  const { play } = useSounds();
  const { success, buttonClick } = useHaptics();

  const state = location.state as {
    winners: string[];
    totalPool: number;
    isWinner: boolean;
    position: number;
  } | undefined;

  const winners = state?.winners ?? ['Adebayo K.', 'Chidinma U.', 'Emeka A.'];
  const totalPool = state?.totalPool ?? 16100;
  const isWinner = state?.isWinner ?? false;
  const position = state?.position ?? 0;

  // Calculate prizes (after 10% platform cut)
  const netPool = totalPool * 0.9;
  const prizes = [
    Math.floor(netPool * 0.5),
    Math.floor(netPool * 0.3),
    Math.floor(netPool * 0.2),
  ];

  useEffect(() => {
    if (isWinner && position > 0) {
      const prize = prizes[position - 1];
      setFingerPosition(position);
      addWinnings(prize, 'finger_win', `Fastest Finger ${position === 1 ? '1st' : position === 2 ? '2nd' : '3rd'} Place`);
      addActivity(`Won ₦${prize.toLocaleString()} in Fastest Finger! 🏆`, 'finger');
      play('win');
      success();
    }
    
    return () => {
      resetFinger();
    };
  }, [isWinner, position]);

  return (
    <div className="min-h-screen bg-background pb-24 flex flex-col">
      {isWinner && <Confetti duration={5000} />}
      
      <div className="p-4 flex-1">
        {/* Header */}
        <div className="text-center mb-8 pt-8">
          <h1 className="text-3xl font-black text-foreground mb-2">
            {isWinner ? '🎉 You Won!' : 'Game Over!'}
          </h1>
          <p className="text-muted-foreground">
            {isWinner 
              ? `Amazing! You got ${position === 1 ? '1st' : position === 2 ? '2nd' : '3rd'} place!`
              : 'Better luck next time!'}
          </p>
        </div>

        {/* Winners Podium */}
        <div className="flex items-end justify-center gap-4 mb-8">
          {/* 2nd Place */}
          <div className="flex flex-col items-center">
            <Avatar name={winners[1] || 'Player'} size="lg" position={2} />
            <div className="bg-silver/15 rounded-t-xl px-4 py-6 mt-2 text-center border-t border-l border-r border-silver/30" style={{ height: '80px' }}>
              <p className="font-bold text-sm text-foreground">{winners[1]?.split(' ')[0] || '2nd'}</p>
              <p className="text-xs text-silver">₦{prizes[1].toLocaleString()}</p>
            </div>
          </div>

          {/* 1st Place */}
          <div className="flex flex-col items-center -mt-4">
            <div className="text-3xl mb-2">👑</div>
            <Avatar name={winners[0] || 'Player'} size="xl" position={1} isWinner />
            <div className="bg-gold/15 rounded-t-xl px-6 py-8 mt-2 text-center border-t border-l border-r border-gold/30" style={{ height: '100px' }}>
              <p className="font-bold text-foreground">{winners[0]?.split(' ')[0] || '1st'}</p>
              <p className="text-sm font-bold text-gold">₦{prizes[0].toLocaleString()}</p>
            </div>
          </div>

          {/* 3rd Place */}
          <div className="flex flex-col items-center">
            <Avatar name={winners[2] || 'Player'} size="lg" position={3} />
            <div className="bg-bronze/15 rounded-t-xl px-4 py-4 mt-2 text-center border-t border-l border-r border-bronze/30" style={{ height: '60px' }}>
              <p className="font-bold text-sm text-foreground">{winners[2]?.split(' ')[0] || '3rd'}</p>
              <p className="text-xs text-bronze">₦{prizes[2].toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Your Result */}
        {isWinner && (
          <div className="card-premium border-primary/50 glow-primary text-center mb-6">
            <p className="text-sm text-muted-foreground mb-2">Your Prize</p>
            <p className="text-4xl font-black text-money">₦{prizes[position - 1].toLocaleString()}</p>
            <p className="text-sm text-muted-foreground mt-2">Added to your wallet! ✨</p>
          </div>
        )}

        {/* Stats */}
        <div className="card-premium mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider">Total Pool</p>
              <p className="font-bold text-foreground">₦{totalPool.toLocaleString()}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider">Players</p>
              <p className="font-bold text-foreground">{Math.floor(totalPool / 700)}</p>
            </div>
          </div>
        </div>

        {/* Notice */}
        <div className="text-center mb-8">
          <p className="text-sm text-muted-foreground">
            Next Fastest Finger game starts soon!
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={() => {
              play('click');
              buttonClick();
              navigate('/finger');
            }}
            className="w-full btn-outline"
          >
            Join Next Game
          </button>
          <button
            onClick={() => {
              play('click');
              buttonClick();
              navigate('/home');
            }}
            className="w-full btn-primary"
          >
            Return to Home
          </button>
        </div>
      </div>
      
      <BottomNav />
    </div>
  );
};
