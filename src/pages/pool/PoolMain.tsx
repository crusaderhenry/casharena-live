import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BottomNav } from '@/components/BottomNav';
import { WalletCard } from '@/components/WalletCard';
import { TestControls, useTestMode } from '@/components/TestModeToggle';
import { useWallet } from '@/contexts/WalletContext';
import { useGame } from '@/contexts/GameContext';
import { ChevronLeft, Sparkles, Users, Clock, Shield, Ticket, Gift } from 'lucide-react';
import { useSounds } from '@/hooks/useSounds';
import { useHaptics } from '@/hooks/useHaptics';

export const PoolMain = () => {
  const navigate = useNavigate();
  const { balance, deductFunds } = useWallet();
  const { hasJoinedPool, joinPool, resetPool, addActivity } = useGame();
  const { isTestMode } = useTestMode();
  const { play } = useSounds();
  const { success, buttonClick } = useHaptics();
  
  const [countdown, setCountdown] = useState(7200);
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
            <h1 className="text-xl font-bold text-foreground">Smart Lucky Pool</h1>
            <p className="text-sm text-muted-foreground">One winner takes all</p>
          </div>
          <span className="badge-gold">Fair</span>
        </header>

        <WalletCard compact />

        {/* Fairness Badge */}
        <div className="fairness-notice animate-slide-up">
          <Shield className="w-4 h-4" />
          <span>Transparent random selection • No boosts</span>
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

        {/* Main Card */}
        <div className="card-glow-gold animate-slide-up">
          <div className="flex items-center gap-4 mb-5">
            <div className="w-16 h-16 rounded-2xl bg-secondary/15 flex items-center justify-center shadow-glow-gold">
              <Sparkles className="w-8 h-8 text-secondary" />
            </div>
            <div>
              <h2 className="font-bold text-xl text-foreground">Today's Pool</h2>
              <p className="text-sm text-muted-foreground">Equal chance for everyone</p>
            </div>
          </div>

          {/* Prize Pool */}
          <div className="bg-gradient-to-r from-secondary/10 via-secondary/5 to-primary/10 rounded-3xl p-6 mb-5 text-center border border-secondary/20">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Gift className="w-5 h-5 text-muted-foreground" />
              <p className="text-sm text-muted-foreground font-medium">Prize Pool</p>
            </div>
            <p className="text-5xl font-extrabold text-gold">₦156,000</p>
            <p className="text-xs text-muted-foreground mt-3">Winner takes 90% (10% platform fee)</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="stat-box">
              <p className="stat-label">Entry</p>
              <p className="stat-value text-secondary">₦1,000</p>
            </div>
            <div className="stat-box">
              <p className="stat-label">Players</p>
              <p className="stat-value flex items-center justify-center gap-1.5">
                <Users className="w-4 h-4 text-primary" /> 156
              </p>
            </div>
            <div className="stat-box">
              <p className="stat-label">Draw in</p>
              <p className="stat-value text-secondary flex items-center justify-center gap-1.5">
                <Clock className="w-4 h-4" /> {formatTime(countdown).split(' ')[0]}
              </p>
            </div>
          </div>

          {/* CTA */}
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
              {balance < 1000 ? 'Insufficient Balance' : 'Join Pool — ₦1,000'}
            </button>
          )}
        </div>

        {/* How it Works */}
        <div className="card-premium animate-slide-up" style={{ animationDelay: '50ms' }}>
          <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
            <Ticket className="w-5 h-5 text-secondary" />
            Fair Play Guarantee
          </h3>
          <ul className="space-y-3">
            {[
              'Everyone pays the same entry fee — no premium tiers',
              'Everyone has exactly equal odds of winning',
              'Winner selected by transparent random algorithm',
              'One winner takes 90% of the entire pool'
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-secondary/15 text-secondary flex items-center justify-center text-xs font-bold shrink-0">
                  {i + 1}
                </span>
                <span className="text-sm text-muted-foreground">{step}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      
      <BottomNav />
    </div>
  );
};
