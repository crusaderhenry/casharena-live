import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BottomNav } from '@/components/BottomNav';
import { WalletCard } from '@/components/WalletCard';
import { TestControls } from '@/components/TestControls';
import { useWallet } from '@/contexts/WalletContext';
import { useGame } from '@/contexts/GameContext';
import { useSounds } from '@/hooks/useSounds';
import { useHaptics } from '@/hooks/useHaptics';
import { ChevronLeft, Zap, Users, Clock, Trophy, MessageSquare } from 'lucide-react';

export const FingerMain = () => {
  const navigate = useNavigate();
  const { balance, deductFunds } = useWallet();
  const { hasJoinedFinger, joinFinger, resetFingerGame, isTestMode, fingerPoolValue, addFingerPlayer } = useGame();
  const { play } = useSounds();
  const { buttonClick, success } = useHaptics();
  
  const [countdown, setCountdown] = useState(900);
  const [playerCount, setPlayerCount] = useState(23);

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => prev > 0 ? prev - 1 : 0);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Simulate players joining in real-time
  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.6) {
        const mockPlayer = {
          id: `sim_${Date.now()}`,
          name: `Player${Math.floor(Math.random() * 1000)}`,
          avatar: ['🎮', '🎯', '⚡', '🔥', '💎', '🚀'][Math.floor(Math.random() * 6)],
        };
        addFingerPlayer(mockPlayer);
        setPlayerCount(prev => prev + 1);
      }
    }, 3000 + Math.random() * 4000);

    return () => clearInterval(interval);
  }, [addFingerPlayer]);


  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleJoin = () => {
    if (deductFunds(700, 'finger_entry', 'Fastest Finger Entry')) {
      play('success');
      success();
      joinFinger();
      navigate('/finger/lobby');
    }
  };

  const handleBack = () => {
    play('click');
    buttonClick();
    navigate('/home');
  };

  const handleTestStart = () => {
    if (!hasJoinedFinger) {
      deductFunds(700, 'finger_entry', 'Fastest Finger Entry');
      joinFinger();
    }
    navigate('/finger/arena');
  };

  const handleTestReset = () => {
    resetFingerGame();
    setCountdown(900);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 pt-2">
          <button 
            onClick={handleBack}
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
          onReset={handleTestReset}
          startLabel="Start Live Game"
        />

        {/* Game Info */}
        <div className="card-game">
          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-xl bg-primary/15 flex items-center justify-center glow-primary">
                <Zap className="w-7 h-7 text-primary" />
              </div>
              <div>
                <h2 className="font-bold text-lg text-foreground">Live Comment Battle</h2>
                <p className="text-sm text-muted-foreground">Be the last standing!</p>
              </div>
            </div>

            <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl p-5 mb-4 border border-primary/20">
              <div className="flex items-center justify-between mb-3">
                <div className="text-center flex-1">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Current Pool</p>
                  <p className="font-black text-2xl text-primary">₦{fingerPoolValue.toLocaleString()}</p>
                </div>
                <div className="w-px h-10 bg-border/50" />
                <div className="text-center flex-1">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Next Game In</p>
                  <p className="font-bold text-xl text-foreground">{formatTime(countdown)}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-muted/30 rounded-xl p-3 text-center border border-border/50">
                <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider">Entry</p>
                <p className="font-bold text-primary">₦700</p>
              </div>
              <div className="bg-muted/30 rounded-xl p-3 text-center border border-border/50">
                <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider">Waiting</p>
                <p className="font-bold text-foreground flex items-center justify-center gap-1">
                  <Users className="w-4 h-4 text-primary" /> {playerCount}
                </p>
              </div>
              <div className="bg-muted/30 rounded-xl p-3 text-center border border-border/50">
                <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider">Winners</p>
                <p className="font-bold text-primary flex items-center justify-center gap-1">
                  <Trophy className="w-4 h-4" /> Top 3
                </p>
              </div>
            </div>

            {hasJoinedFinger ? (
              <button
                onClick={() => navigate('/finger/lobby')}
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
                {balance < 700 ? 'Insufficient Balance' : 'Join Lobby - ₦700'}
              </button>
            )}
          </div>
        </div>

        {/* How to Play */}
        <div className="card-panel">
          <h3 className="font-bold text-foreground mb-3 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            How to Win
          </h3>
          <ul className="text-sm text-muted-foreground space-y-3">
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0">1</span>
              <span>Join the lobby and wait for the live game to start</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0">2</span>
              <span>Send comments - each comment resets the 60s timer</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0">3</span>
              <span>If no one comments for 60 seconds, last 3 commenters win!</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0">4</span>
              <span>Max game time: 20 minutes - then it auto-ends</span>
            </li>
          </ul>
        </div>

        {/* Prize Split */}
        <div className="card-panel">
          <h3 className="font-bold text-foreground mb-3">Prize Distribution</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 rounded-xl podium-1">
              <span className="flex items-center gap-2 font-medium">
                <span className="text-lg">🥇</span> 1st Place
              </span>
              <span className="font-bold text-gold">50% of pool</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl podium-2">
              <span className="flex items-center gap-2 font-medium">
                <span className="text-lg">🥈</span> 2nd Place
              </span>
              <span className="font-bold text-silver">30% of pool</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl podium-3">
              <span className="flex items-center gap-2 font-medium">
                <span className="text-lg">🥉</span> 3rd Place
              </span>
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
