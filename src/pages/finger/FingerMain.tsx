import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BottomNav } from '@/components/BottomNav';
import { WalletCard } from '@/components/WalletCard';
import { TestControls, useTestMode } from '@/components/TestModeToggle';
import { useWallet } from '@/contexts/WalletContext';
import { useGame } from '@/contexts/GameContext';
import { ChevronLeft, Zap, Users, Clock, Trophy, MessageSquare, Crown, Medal } from 'lucide-react';
import { useSounds } from '@/hooks/useSounds';
import { useHaptics } from '@/hooks/useHaptics';

type GameMode = 'winner_takes_all' | 'top_3';

export const FingerMain = () => {
  const navigate = useNavigate();
  const { balance, deductFunds } = useWallet();
  const { hasJoinedFinger, joinFinger, resetFinger, addActivity } = useGame();
  const { play } = useSounds();
  const { buttonClick, success } = useHaptics();
  const { isTestMode } = useTestMode();
  
  const [countdown, setCountdown] = useState(900);
  const [isTestStarted, setIsTestStarted] = useState(false);
  const [gameMode, setGameMode] = useState<GameMode>('top_3');

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

  const handleTestStart = () => {
    setIsTestStarted(true);
    if (!hasJoinedFinger) {
      if (deductFunds(700, 'finger_entry', 'Fastest Finger Entry')) {
        joinFinger();
        addActivity('Joined Fastest Finger lobby', 'finger');
      }
    }
    navigate('/finger/arena');
  };

  const handleTestEnd = () => {
    navigate('/finger/results');
  };

  const handleTestReset = () => {
    setIsTestStarted(false);
    resetFinger();
    setCountdown(900);
  };

  return (
    <div className="min-h-screen bg-background pb-28">
      <div className="p-4 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-4 pt-2">
          <button 
            onClick={() => {
              play('click');
              buttonClick();
              navigate('/home');
            }}
            className="w-10 h-10 rounded-xl bg-card flex items-center justify-center border border-border/50"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-foreground">Fastest Finger</h1>
            <p className="text-sm text-muted-foreground">Last comment wins</p>
          </div>
        </div>

        <WalletCard compact />

        {/* Test Controls */}
        <TestControls
          onStart={handleTestStart}
          onEnd={handleTestEnd}
          onReset={handleTestReset}
          isStarted={isTestStarted}
          startLabel="Start Live Game"
          endLabel="View Results"
        />

        {/* Game Info */}
        <div className="card-premium">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-xl bg-primary/15 flex items-center justify-center glow-primary">
              <Zap className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-foreground">Live Comment Battle</h2>
              <p className="text-sm text-muted-foreground">Be the last standing!</p>
            </div>
          </div>

          <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-2xl p-5 mb-4 text-center border border-primary/20">
            <p className="text-sm text-muted-foreground mb-1">Next Game In</p>
            <p className="timer-display">{formatTime(countdown)}</p>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="bg-muted/30 rounded-xl p-3 text-center border border-border/50">
              <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider">Entry</p>
              <p className="font-bold text-primary">₦700</p>
            </div>
            <div className="bg-muted/30 rounded-xl p-3 text-center border border-border/50">
              <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider">Waiting</p>
              <p className="font-bold text-foreground flex items-center justify-center gap-1">
                <Users className="w-4 h-4 text-primary" /> 23
              </p>
            </div>
            <div className="bg-muted/30 rounded-xl p-3 text-center border border-border/50">
              <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider">Pool</p>
              <p className="font-bold text-secondary">₦16,100</p>
            </div>
          </div>

          {/* Game Mode Selector */}
          <div className="mb-5">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Select Mode</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setGameMode('winner_takes_all')}
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  gameMode === 'winner_takes_all'
                    ? 'border-primary bg-primary/10'
                    : 'border-border/50 hover:border-primary/50'
                }`}
              >
                <Crown className={`w-6 h-6 mb-2 ${gameMode === 'winner_takes_all' ? 'text-primary' : 'text-muted-foreground'}`} />
                <p className="font-bold text-sm text-foreground">Winner Takes All</p>
                <p className="text-xs text-muted-foreground">100% to last commenter</p>
              </button>
              
              <button
                onClick={() => setGameMode('top_3')}
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  gameMode === 'top_3'
                    ? 'border-primary bg-primary/10'
                    : 'border-border/50 hover:border-primary/50'
                }`}
              >
                <Medal className={`w-6 h-6 mb-2 ${gameMode === 'top_3' ? 'text-primary' : 'text-muted-foreground'}`} />
                <p className="font-bold text-sm text-foreground">Top 3 Winners</p>
                <p className="text-xs text-muted-foreground">50% / 30% / 20%</p>
              </button>
            </div>
          </div>

          {hasJoinedFinger ? (
            <button
              onClick={() => {
                play('click');
                buttonClick();
                navigate('/finger/lobby');
              }}
              className="w-full btn-primary"
            >
              Go to Lobby
            </button>
          ) : (
            <button
              onClick={handleJoin}
              disabled={balance < 700}
              className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {balance < 700 ? 'Insufficient Balance' : 'Join Game - ₦700'}
            </button>
          )}
        </div>

        {/* How to Play */}
        <div className="card-premium">
          <h3 className="font-bold text-foreground mb-3 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            How to Win
          </h3>
          <ul className="text-sm text-muted-foreground space-y-3">
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0">1</span>
              <span>Join the lobby and wait for the live game</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0">2</span>
              <span>Each comment resets the 60 second timer</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0">3</span>
              <span>Last commenter when timer hits 0 wins!</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0">4</span>
              <span>Max game: 20 minutes then auto-ends</span>
            </li>
          </ul>
        </div>

        {/* Prize Split */}
        <div className="card-premium">
          <h3 className="font-bold text-foreground mb-3">Prize Distribution (Top 3 Mode)</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 bg-gold/10 rounded-xl border border-gold/30">
              <span className="flex items-center gap-2 font-medium">🥇 1st Place</span>
              <span className="font-bold text-gold">50% of pool</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-silver/10 rounded-xl border border-silver/30">
              <span className="flex items-center gap-2 font-medium">🥈 2nd Place</span>
              <span className="font-bold text-silver">30% of pool</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-bronze/10 rounded-xl border border-bronze/30">
              <span className="flex items-center gap-2 font-medium">🥉 3rd Place</span>
              <span className="font-bold text-bronze">20% of pool</span>
            </div>
            <p className="text-xs text-muted-foreground text-center mt-3">
              * 10% platform fee deducted from winnings
            </p>
          </div>
        </div>
      </div>
      
      <BottomNav />
    </div>
  );
};
