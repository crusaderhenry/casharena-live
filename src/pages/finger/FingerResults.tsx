import { useNavigate, useLocation } from 'react-router-dom';
import { BottomNav } from '@/components/BottomNav';
import { Avatar } from '@/components/Avatar';
import { Confetti } from '@/components/Confetti';
import { SocialShare } from '@/components/SocialShare';
import { useWallet } from '@/contexts/WalletContext';
import { useGame } from '@/contexts/GameContext';
import { useEffect } from 'react';
import { useSounds } from '@/hooks/useSounds';
import { useHaptics } from '@/hooks/useHaptics';
import { ChevronRight, Zap, Home, Users, Wallet } from 'lucide-react';

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
    <div className="min-h-screen bg-background safe-bottom flex flex-col">
      {isWinner && <Confetti duration={5000} />}
      
      <div className="flex-1 px-5 pt-8 pb-8">
        {/* Header */}
        <div className="text-center mb-10 animate-slide-down">
          <div className="inline-flex items-center gap-2 badge-live mb-5">
            <Zap className="w-4 h-4" />
            Fastest Finger
          </div>
          <h1 className="text-4xl font-extrabold text-foreground mb-3">
            {isWinner ? '🎉 You Won!' : 'Game Over!'}
          </h1>
          <p className="text-muted-foreground text-lg">
            {isWinner 
              ? `Amazing! You got ${position === 1 ? '1st' : position === 2 ? '2nd' : '3rd'} place!`
              : 'Better luck next time!'}
          </p>
        </div>

        {/* Winners Podium */}
        <div className="flex items-end justify-center gap-3 mb-10 animate-slide-up" style={{ animationDelay: '100ms' }}>
          {/* 2nd Place */}
          <div className="flex flex-col items-center w-24">
            <Avatar name={winners[1] || 'Player'} size="lg" position={2} />
            <div className="w-full podium-2nd rounded-t-2xl px-3 py-4 mt-3 text-center" style={{ height: '85px' }}>
              <p className="font-bold text-sm text-foreground truncate">{winners[1]?.split(' ')[0] || '2nd'}</p>
              <p className="text-xs text-silver font-medium mt-1">₦{prizes[1].toLocaleString()}</p>
            </div>
          </div>

          {/* 1st Place */}
          <div className="flex flex-col items-center w-28 -mt-6">
            <div className="text-4xl mb-3 animate-float">👑</div>
            <Avatar name={winners[0] || 'Player'} size="xl" position={1} isWinner />
            <div className="w-full podium-1st rounded-t-2xl px-3 py-5 mt-3 text-center shadow-glow-gold" style={{ height: '110px' }}>
              <p className="font-bold text-foreground">{winners[0]?.split(' ')[0] || '1st'}</p>
              <p className="text-lg font-extrabold text-gold mt-1">₦{prizes[0].toLocaleString()}</p>
            </div>
          </div>

          {/* 3rd Place */}
          <div className="flex flex-col items-center w-24">
            <Avatar name={winners[2] || 'Player'} size="lg" position={3} />
            <div className="w-full podium-3rd rounded-t-2xl px-3 py-3 mt-3 text-center" style={{ height: '65px' }}>
              <p className="font-bold text-sm text-foreground truncate">{winners[2]?.split(' ')[0] || '3rd'}</p>
              <p className="text-xs text-bronze font-medium mt-1">₦{prizes[2].toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Your Result */}
        {isWinner && (
          <div className="card-glow text-center mb-8 animate-scale-in" style={{ animationDelay: '200ms' }}>
            <p className="text-sm text-muted-foreground mb-2">Your Prize</p>
            <p className="text-5xl font-extrabold text-money">₦{prizes[position - 1].toLocaleString()}</p>
            <div className="flex items-center justify-center gap-2 mt-3 text-primary">
              <Wallet className="w-4 h-4" />
              <p className="text-sm font-medium">Added to your wallet!</p>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="card-premium mb-8 animate-slide-up" style={{ animationDelay: '250ms' }}>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="stat-label">Total Pool</p>
              <p className="stat-value">₦{totalPool.toLocaleString()}</p>
            </div>
            <div className="text-center">
              <p className="stat-label">Players</p>
              <p className="stat-value flex items-center justify-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                {Math.floor(totalPool / 700)}
              </p>
            </div>
          </div>
        </div>

        {/* Social Sharing */}
        {isWinner && (
          <div className="mb-8 animate-slide-up" style={{ animationDelay: '300ms' }}>
            <SocialShare 
              username="You" 
              position={position} 
              amount={prizes[position - 1]} 
              gameType="finger" 
            />
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3 animate-slide-up" style={{ animationDelay: '350ms' }}>
          <button
            onClick={() => {
              play('click');
              buttonClick();
              navigate('/finger');
            }}
            className="w-full btn-primary flex items-center justify-center gap-2"
          >
            Join Next Game
            <ChevronRight className="w-5 h-5" />
          </button>
          <button
            onClick={() => {
              play('click');
              buttonClick();
              navigate('/home');
            }}
            className="w-full btn-outline flex items-center justify-center gap-2"
          >
            <Home className="w-5 h-5" />
            Return to Home
          </button>
        </div>
      </div>
      
      <BottomNav />
    </div>
  );
};
