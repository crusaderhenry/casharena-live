import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BottomNav } from '@/components/BottomNav';
import { WalletCard } from '@/components/WalletCard';
import { TestControls, useTestMode } from '@/components/TestModeToggle';
import { useWallet } from '@/contexts/WalletContext';
import { useGame } from '@/contexts/GameContext';
import { ChevronLeft, Sparkles, Users, Clock, Shield } from 'lucide-react';
import { useSounds } from '@/hooks/useSounds';
import { useHaptics } from '@/hooks/useHaptics';

export const PoolMain = () => {
  const navigate = useNavigate();
  const { balance, deductFunds } = useWallet();
  const { hasJoinedPool, joinPool, resetPool, addActivity } = useGame();
  const { isTestMode } = useTestMode();
  const { play } = useSounds();
  const { success, buttonClick } = useHaptics();
  
  const [countdown, setCountdown] = useState(7200); // 2h
  const [isTestStarted, setIsTestStarted] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => prev > 0 ? prev - 1 : 0);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  };

  const handleJoin = () => {
    if (deductFunds(1000, 'pool_entry', 'Lucky Pool Entry')) {
      joinPool();
      addActivity('Joined Smart Lucky Pool', 'pool');
      play('coin');
      success();
    }
  };

  const handleTestStart = () => {
    setIsTestStarted(true);
    if (!hasJoinedPool) {
      if (deductFunds(1000, 'pool_entry', 'Lucky Pool Entry')) {
        joinPool();
        addActivity('Joined Smart Lucky Pool', 'pool');
      }
    }
    navigate('/pool/details');
  };

  const handleTestEnd = () => {
    navigate('/pool/details');
  };

  const handleTestReset = () => {
    setIsTestStarted(false);
    resetPool();
    setCountdown(7200);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="p-4 space-y-6">
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
            <h1 className="text-xl font-bold text-foreground">Smart Lucky Pool</h1>
            <p className="text-sm text-muted-foreground">One winner takes all</p>
          </div>
        </div>

        <WalletCard compact />

        {/* Fairness Badge */}
        <div className="fairness-badge">
          <Shield className="w-4 h-4" />
          <span>Transparent random selection. No boosts. No tricks.</span>
        </div>

        {/* Test Controls */}
        <TestControls
          onStart={handleTestStart}
          onEnd={handleTestEnd}
          onReset={handleTestReset}
          isStarted={isTestStarted}
          startLabel="Join & Start Draw"
          endLabel="Go to Draw"
        />

        {/* Pool Info */}
        <div className="card-premium">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-xl bg-secondary/20 flex items-center justify-center glow-secondary">
              <Sparkles className="w-7 h-7 text-secondary" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-foreground">Today's Pool</h2>
              <p className="text-sm text-muted-foreground">Equal chance for everyone</p>
            </div>
          </div>

          <div className="bg-gradient-to-r from-secondary/10 to-primary/10 rounded-xl p-5 mb-4 text-center border border-secondary/20">
            <p className="text-sm text-muted-foreground mb-2">Prize Pool</p>
            <p className="text-4xl font-black text-gold">₦156,000</p>
            <p className="text-xs text-muted-foreground mt-2">Winner takes 90% (10% platform fee)</p>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-muted/30 rounded-xl p-3 text-center border border-border/50">
              <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider">Entry</p>
              <p className="font-bold text-secondary">₦1,000</p>
            </div>
            <div className="bg-muted/30 rounded-xl p-3 text-center border border-border/50">
              <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider">Players</p>
              <p className="font-bold text-foreground flex items-center justify-center gap-1">
                <Users className="w-4 h-4 text-primary" /> 156
              </p>
            </div>
            <div className="bg-muted/30 rounded-xl p-3 text-center border border-border/50">
              <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider">Draw in</p>
              <p className="font-bold text-secondary flex items-center justify-center gap-1">
                <Clock className="w-4 h-4" /> {formatTime(countdown).split(' ')[0]}
              </p>
            </div>
          </div>

          {hasJoinedPool ? (
            <button
              onClick={() => {
                play('click');
                buttonClick();
                navigate('/pool/details');
              }}
              className="w-full btn-secondary"
            >
              View Pool Details
            </button>
          ) : (
            <button
              onClick={handleJoin}
              disabled={balance < 1000}
              className="w-full btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {balance < 1000 ? 'Insufficient Balance' : 'Join Pool - ₦1,000'}
            </button>
          )}
        </div>

        {/* How it Works */}
        <div className="card-premium">
          <h3 className="font-bold text-foreground mb-3 flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Fair Play Guarantee
          </h3>
          <ul className="text-sm text-muted-foreground space-y-3">
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-secondary/20 text-secondary flex items-center justify-center text-xs font-bold shrink-0">1</span>
              <span>Everyone pays the same entry fee - no premium tiers</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-secondary/20 text-secondary flex items-center justify-center text-xs font-bold shrink-0">2</span>
              <span>Everyone has exactly equal odds of winning</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-secondary/20 text-secondary flex items-center justify-center text-xs font-bold shrink-0">3</span>
              <span>Winner selected by transparent random algorithm</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-secondary/20 text-secondary flex items-center justify-center text-xs font-bold shrink-0">4</span>
              <span>One winner takes 90% of the entire pool</span>
            </li>
          </ul>
        </div>
      </div>
      
      <BottomNav />
    </div>
  );
};
