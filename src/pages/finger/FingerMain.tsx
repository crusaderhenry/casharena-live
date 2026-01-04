import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BottomNav } from '@/components/BottomNav';
import { WalletCard } from '@/components/WalletCard';
import { TestControls, useTestMode } from '@/components/TestModeToggle';
import { useWallet } from '@/contexts/WalletContext';
import { useGame } from '@/contexts/GameContext';
import { ChevronLeft, Zap, Users, Clock, Crown, Medal, MessageCircle, Timer, Trophy } from 'lucide-react';
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
    <div className="min-h-screen bg-background safe-bottom">
      <div className="px-5 pt-6 pb-8 space-y-6">
        {/* Header */}
        <header className="flex items-center gap-4 animate-slide-down">
          <button 
            onClick={() => {
              play('click');
              buttonClick();
              navigate('/home');
            }}
            className="btn-icon"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">Fastest Finger</h1>
            <p className="text-sm text-muted-foreground">Last comment wins</p>
          </div>
          <span className="badge-live">Live</span>
        </header>

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

        {/* Main Card */}
        <div className="card-glow animate-slide-up">
          <div className="flex items-center gap-4 mb-5">
            <div className="w-16 h-16 rounded-2xl bg-primary/15 flex items-center justify-center shadow-glow">
              <Zap className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-xl text-foreground">Live Comment Battle</h2>
              <p className="text-sm text-muted-foreground">Be the last standing to win!</p>
            </div>
          </div>

          {/* Countdown */}
          <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-secondary/10 rounded-3xl p-6 mb-5 text-center border border-primary/20">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Timer className="w-5 h-5 text-muted-foreground" />
              <p className="text-sm text-muted-foreground font-medium">Next Game Starts In</p>
            </div>
            <p className="timer-display">{formatTime(countdown)}</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="stat-box">
              <p className="stat-label">Entry</p>
              <p className="stat-value text-primary">₦700</p>
            </div>
            <div className="stat-box">
              <p className="stat-label">Waiting</p>
              <p className="stat-value flex items-center justify-center gap-1.5">
                <Users className="w-4 h-4 text-primary" /> 23
              </p>
            </div>
            <div className="stat-box">
              <p className="stat-label">Pool</p>
              <p className="stat-value text-money">₦16,100</p>
            </div>
          </div>

          {/* Game Mode Selector */}
          <div className="mb-6">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">
              Select Mode
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setGameMode('winner_takes_all')}
                className={`p-4 rounded-2xl border-2 transition-all duration-300 text-left ${
                  gameMode === 'winner_takes_all'
                    ? 'border-primary bg-primary/10 shadow-glow'
                    : 'border-border/60 hover:border-primary/40'
                }`}
              >
                <Crown className={`w-6 h-6 mb-2 transition-colors ${
                  gameMode === 'winner_takes_all' ? 'text-primary' : 'text-muted-foreground'
                }`} />
                <p className="font-bold text-sm text-foreground">Winner Takes All</p>
                <p className="text-xs text-muted-foreground mt-1">100% to last commenter</p>
              </button>
              
              <button
                onClick={() => setGameMode('top_3')}
                className={`p-4 rounded-2xl border-2 transition-all duration-300 text-left ${
                  gameMode === 'top_3'
                    ? 'border-primary bg-primary/10 shadow-glow'
                    : 'border-border/60 hover:border-primary/40'
                }`}
              >
                <Medal className={`w-6 h-6 mb-2 transition-colors ${
                  gameMode === 'top_3' ? 'text-primary' : 'text-muted-foreground'
                }`} />
                <p className="font-bold text-sm text-foreground">Top 3 Winners</p>
                <p className="text-xs text-muted-foreground mt-1">50% / 30% / 20%</p>
              </button>
            </div>
          </div>

          {/* CTA */}
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
              {balance < 700 ? 'Insufficient Balance' : 'Join Game — ₦700'}
            </button>
          )}
        </div>

        {/* How to Play */}
        <div className="card-premium animate-slide-up" style={{ animationDelay: '50ms' }}>
          <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-primary" />
            How to Win
          </h3>
          <ul className="space-y-3">
            {[
              'Join the lobby and wait for the live game',
              'Each comment resets the 60 second timer',
              'Last commenter when timer hits 0 wins!',
              'Max game duration: 20 minutes'
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                  {i + 1}
                </span>
                <span className="text-sm text-muted-foreground">{step}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Prize Split */}
        <div className="card-premium animate-slide-up" style={{ animationDelay: '100ms' }}>
          <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-gold" />
            Prize Distribution (Top 3 Mode)
          </h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 rounded-xl podium-1st">
              <span className="flex items-center gap-2 font-medium">🥇 1st Place</span>
              <span className="font-bold text-gold">50% of pool</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl podium-2nd">
              <span className="flex items-center gap-2 font-medium">🥈 2nd Place</span>
              <span className="font-bold text-silver">30% of pool</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl podium-3rd">
              <span className="flex items-center gap-2 font-medium">🥉 3rd Place</span>
              <span className="font-bold text-bronze">20% of pool</span>
            </div>
            <p className="text-xs text-muted-foreground text-center pt-2">
              * 10% platform fee deducted from winnings
            </p>
          </div>
        </div>
      </div>
      
      <BottomNav />
    </div>
  );
};
