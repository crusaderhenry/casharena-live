import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BottomNav } from '@/components/BottomNav';
import { WalletCard } from '@/components/WalletCard';
import { SkipTimerButton, useTestMode } from '@/components/TestModeToggle';
import { useWallet } from '@/contexts/WalletContext';
import { useGame } from '@/contexts/GameContext';
import { ChevronLeft, Zap, Users, Clock, Trophy } from 'lucide-react';
import { useSounds } from '@/hooks/useSounds';
import { useHaptics } from '@/hooks/useHaptics';

export const FingerMain = () => {
  const navigate = useNavigate();
  const { balance, deductFunds } = useWallet();
  const { hasJoinedFinger, joinFinger, addActivity } = useGame();
  const [countdown, setCountdown] = useState(900); // 15 minutes
  const { play } = useSounds();
  const { buttonClick, success } = useHaptics();
  const { isTestMode } = useTestMode();

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => prev > 0 ? prev - 1 : 0);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleJoin = () => {
    if (deductFunds(700, 'finger_entry', 'Fastest Finger Entry')) {
      joinFinger();
      addActivity('Joined Fastest Finger lobby', 'finger');
      play('coin');
      success();
      navigate('/finger/lobby');
    }
  };

  const handleSkip = () => {
    if (!hasJoinedFinger) {
      if (deductFunds(700, 'finger_entry', 'Fastest Finger Entry')) {
        joinFinger();
        addActivity('Joined Fastest Finger lobby', 'finger');
      }
    }
    navigate('/finger/lobby');
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 pt-2">
          <button 
            onClick={() => navigate('/home')}
            className="w-10 h-10 rounded-xl bg-card flex items-center justify-center"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-foreground">Fastest Finger</h1>
            <p className="text-sm text-muted-foreground">Last comment wins</p>
          </div>
        </div>

        <WalletCard compact />

        {/* Game Info */}
        <div className="card-game">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-xl bg-secondary/20 flex items-center justify-center">
              <Zap className="w-7 h-7 text-secondary" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-foreground">Live Comment Battle</h2>
              <p className="text-sm text-muted-foreground">Be the last standing!</p>
            </div>
          </div>

          <div className="bg-gradient-to-r from-secondary/10 to-primary/10 rounded-xl p-4 mb-4 text-center">
            <p className="text-sm text-muted-foreground mb-1">Next Game In</p>
            <p className="timer-display">{formatTime(countdown)}</p>
            {isTestMode && (
              <div className="mt-3">
                <SkipTimerButton onSkip={handleSkip} label="Join & Start Now" />
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-muted/50 rounded-xl p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">Entry</p>
              <p className="font-bold text-secondary">₦700</p>
            </div>
            <div className="bg-muted/50 rounded-xl p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">Waiting</p>
              <p className="font-bold text-foreground flex items-center justify-center gap-1">
                <Users className="w-4 h-4" /> 23
              </p>
            </div>
            <div className="bg-muted/50 rounded-xl p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">Winners</p>
              <p className="font-bold text-primary flex items-center justify-center gap-1">
                <Trophy className="w-4 h-4" /> Top 3
              </p>
            </div>
          </div>

          {hasJoinedFinger ? (
            <button
              onClick={() => {
                play('click');
                buttonClick();
                navigate('/finger/lobby');
              }}
              className="w-full btn-secondary"
            >
              Go to Lobby
            </button>
          ) : (
            <button
              onClick={handleJoin}
              disabled={balance < 700}
              className="w-full btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {balance < 700 ? 'Insufficient Balance' : 'Join Lobby - ₦700'}
            </button>
          )}
        </div>

        {/* How to Play */}
        <div className="card-game">
          <h3 className="font-bold text-foreground mb-3">How to Win</h3>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-secondary font-bold">1.</span>
              Pay entry and join the lobby
            </li>
            <li className="flex items-start gap-2">
              <span className="text-secondary font-bold">2.</span>
              When game starts, send comments as fast as you can
            </li>
            <li className="flex items-start gap-2">
              <span className="text-secondary font-bold">3.</span>
              Each comment resets the 60-second timer
            </li>
            <li className="flex items-start gap-2">
              <span className="text-secondary font-bold">4.</span>
              If no one comments for 60 seconds, the last 3 commenters win!
            </li>
          </ul>
        </div>

        {/* Prize Split */}
        <div className="card-game">
          <h3 className="font-bold text-foreground mb-3">Prize Distribution</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="text-lg">🥇</span> 1st Place
              </span>
              <span className="font-bold text-primary">50% of pool</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="text-lg">🥈</span> 2nd Place
              </span>
              <span className="font-bold text-foreground">30% of pool</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="text-lg">🥉</span> 3rd Place
              </span>
              <span className="font-bold text-foreground">20% of pool</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              * 10% platform fee deducted from winnings
            </p>
          </div>
        </div>
      </div>
      
      <BottomNav />
    </div>
  );
};
