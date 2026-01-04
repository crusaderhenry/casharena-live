import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BottomNav } from '@/components/BottomNav';
import { WalletCard } from '@/components/WalletCard';
import { TestControls } from '@/components/TestControls';
import { useWallet } from '@/contexts/WalletContext';
import { useGame } from '@/contexts/GameContext';
import { useSounds } from '@/hooks/useSounds';
import { useHaptics } from '@/hooks/useHaptics';
import { ArrowLeft, Zap, Users, Clock, Trophy, MessageSquare, ChevronRight } from 'lucide-react';

export const FingerMain = () => {
  const navigate = useNavigate();
  const { balance, deductFunds } = useWallet();
  const { hasJoinedFinger, joinFinger, resetFingerGame, isTestMode, fingerPoolValue, addFingerPlayer } = useGame();
  const { play } = useSounds();
  const { buttonClick, success } = useHaptics();
  
  const [countdown, setCountdown] = useState(300);
  const [playerCount, setPlayerCount] = useState(23);

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => prev > 0 ? prev - 1 : 300);
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
    }, 4000);

    return () => clearInterval(interval);
  }, [addFingerPlayer]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
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
    setCountdown(300);
    setPlayerCount(23);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="p-4 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3 pt-2">
          <button 
            onClick={handleBack}
            className="w-10 h-10 rounded-xl bg-card flex items-center justify-center border border-border/50"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div>
            <h1 className="text-xl font-black text-foreground">Fastest Finger</h1>
            <p className="text-sm text-muted-foreground">Last comment standing wins</p>
          </div>
        </div>

        <WalletCard compact />

        {/* Test Controls */}
        <TestControls
          onStart={handleTestStart}
          onReset={handleTestReset}
          startLabel="Start Live Game"
        />

        {/* Hero Card */}
        <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-card via-card to-primary/10">
          {/* Background effects */}
          <div className="absolute top-0 right-0 w-40 h-40 bg-primary/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl" />
          
          <div className="relative z-10 p-5">
            {/* Live badge */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/20 rounded-full border border-red-500/30">
                <span className="live-dot" />
                <span className="text-xs font-bold text-red-400 uppercase tracking-wider">Live</span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Users className="w-4 h-4" />
                <span className="text-sm font-medium">{playerCount} waiting</span>
              </div>
            </div>

            {/* Title */}
            <div className="flex items-center gap-4 mb-5">
              <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center glow-primary">
                <Zap className="w-9 h-9 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-black text-foreground">Live Comment Battle</h2>
                <p className="text-sm text-muted-foreground">Be the last commenter standing!</p>
              </div>
            </div>

            {/* Pool & Countdown */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="bg-background/60 backdrop-blur-sm rounded-xl p-4 border border-border/30">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Prize Pool</p>
                <p className="text-2xl font-black text-primary">₦{fingerPoolValue.toLocaleString()}</p>
              </div>
              <div className="bg-background/60 backdrop-blur-sm rounded-xl p-4 border border-border/30">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Starts In</p>
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  <p className="text-2xl font-black text-foreground">{formatTime(countdown)}</p>
                </div>
              </div>
            </div>

            {/* Entry & Winners */}
            <div className="flex items-center justify-between px-4 py-3 bg-muted/30 rounded-xl border border-border/30 mb-5">
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground uppercase">Entry</p>
                <p className="font-bold text-primary">₦700</p>
              </div>
              <div className="w-px h-8 bg-border/50" />
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground uppercase">Winners</p>
                <p className="font-bold text-foreground flex items-center gap-1">
                  <Trophy className="w-4 h-4 text-gold" /> Top 3
                </p>
              </div>
              <div className="w-px h-8 bg-border/50" />
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground uppercase">Game Time</p>
                <p className="font-bold text-foreground">30 min</p>
              </div>
            </div>

            {/* CTA */}
            {hasJoinedFinger ? (
              <button
                onClick={() => navigate('/finger/lobby')}
                className="w-full btn-primary flex items-center justify-center gap-2 text-lg"
              >
                Go to Lobby
                <ChevronRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={handleJoin}
                disabled={balance < 700}
                className="w-full btn-primary flex items-center justify-center gap-2 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Zap className="w-5 h-5" />
                {balance < 700 ? 'Insufficient Balance' : 'Join Lobby — ₦700'}
              </button>
            )}
          </div>
        </div>

        {/* How to Play */}
        <div className="card-panel">
          <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
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
              <span>Send comments — each comment resets the 60s timer</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0">3</span>
              <span>If no one comments for 60 seconds, last 3 commenters win!</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0">4</span>
              <span>Max game time: 30 minutes — then it auto-ends</span>
            </li>
          </ul>
        </div>

        {/* Prize Distribution */}
        <div className="card-panel">
          <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-gold" />
            Prize Distribution
          </h3>
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
