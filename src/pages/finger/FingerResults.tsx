import { useNavigate, useLocation } from 'react-router-dom';
import { BottomNav } from '@/components/BottomNav';
import { Confetti } from '@/components/Confetti';
import { ShareCard } from '@/components/ShareCard';
import { useAuth } from '@/contexts/AuthContext';
import { useGame } from '@/contexts/GameContext';
import { useEffect, useState } from 'react';
import { useSounds } from '@/hooks/useSounds';
import { useHaptics } from '@/hooks/useHaptics';
import { useNotifications } from '@/components/PushNotification';

export const FingerResults = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, refreshProfile } = useAuth();
  const { resetFingerGame, addActivity, userProfile } = useGame();
  const { play } = useSounds();
  const { success: hapticSuccess, buttonClick } = useHaptics();
  const { announceWin } = useNotifications();
  const [showShare, setShowShare] = useState(false);
  const [hasProcessed, setHasProcessed] = useState(false);

  const state = location.state as {
    winners: string[];
    totalPool: number;
    isWinner: boolean;
    position: number;
  } | undefined;

  const winners = state?.winners ?? ['CryptoKing', 'LuckyAce', 'FastHands'];
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
    if (hasProcessed) return;
    
    if (isWinner && position > 0) {
      const prize = prizes[position - 1];
      
      // Add to activity feed
      addActivity({
        type: 'finger_win',
        playerName: profile?.username || userProfile.username,
        playerAvatar: profile?.avatar || userProfile.avatar,
        amount: prize,
        position: position,
      });
      
      // Play win sound and haptics
      play('win');
      hapticSuccess();
      announceWin(prize, position);
      
      // Refresh profile to get updated wallet balance
      refreshProfile();
    }
    
    setHasProcessed(true);
    
    return () => {
      resetFingerGame();
    };
  }, []);

  const currentUsername = profile?.username || userProfile.username;
  const currentAvatar = profile?.avatar || userProfile.avatar;

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
            <div className="w-14 h-14 rounded-full bg-card-elevated flex items-center justify-center text-2xl border-2 border-silver">
              🥈
            </div>
            <div className="podium-2 rounded-t-xl px-4 py-6 mt-2 text-center" style={{ height: '80px' }}>
              <p className="font-bold text-sm text-foreground">{winners[1]?.split(' ')[0] || '2nd'}</p>
              <p className="text-xs text-silver">₦{prizes[1].toLocaleString()}</p>
            </div>
          </div>

          {/* 1st Place */}
          <div className="flex flex-col items-center -mt-4">
            <div className="text-3xl mb-2">👑</div>
            <div className="w-18 h-18 rounded-full bg-card-elevated flex items-center justify-center text-3xl border-2 border-gold avatar-gold animate-winner-glow">
              🥇
            </div>
            <div className="podium-1 rounded-t-xl px-6 py-8 mt-2 text-center" style={{ height: '100px' }}>
              <p className="font-bold text-foreground">{winners[0]?.split(' ')[0] || '1st'}</p>
              <p className="text-sm font-bold text-gold">₦{prizes[0].toLocaleString()}</p>
            </div>
          </div>

          {/* 3rd Place */}
          <div className="flex flex-col items-center">
            <div className="w-14 h-14 rounded-full bg-card-elevated flex items-center justify-center text-2xl border-2 border-bronze">
              🥉
            </div>
            <div className="podium-3 rounded-t-xl px-4 py-4 mt-2 text-center" style={{ height: '60px' }}>
              <p className="font-bold text-sm text-foreground">{winners[2]?.split(' ')[0] || '3rd'}</p>
              <p className="text-xs text-bronze">₦{prizes[2].toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Your Result */}
        {isWinner && (
          <div className="card-panel border-primary/50 glow-primary text-center mb-6">
            <p className="text-sm text-muted-foreground mb-2">Your Prize</p>
            <p className="money-gold text-4xl">₦{prizes[position - 1].toLocaleString()}</p>
            <p className="text-sm text-muted-foreground mt-2">Added to your wallet! ✨</p>
            <button onClick={() => setShowShare(true)} className="mt-4 btn-outline w-full">
              Share Your Win
            </button>
          </div>
        )}

        {/* Share Modal */}
        {showShare && isWinner && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-sm">
              <ShareCard
                username={currentUsername}
                avatar={currentAvatar}
                position={position}
                amount={prizes[position - 1]}
                gameType="finger"
              />
              <button onClick={() => setShowShare(false)} className="w-full mt-4 py-3 text-muted-foreground">
                Close
              </button>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="card-panel mb-6">
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

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={() => navigate('/finger')}
            className="w-full btn-outline"
          >
            Join Next Game
          </button>
          <button
            onClick={() => navigate('/home')}
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