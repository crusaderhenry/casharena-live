import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BottomNav } from '@/components/BottomNav';
import { WalletCard } from '@/components/WalletCard';
import { TestControls } from '@/components/TestControls';
import { useWallet } from '@/contexts/WalletContext';
import { useGame, mockPlayers } from '@/contexts/GameContext';
import { ChevronLeft, Sparkles, Users, Clock, Shield } from 'lucide-react';

export const PoolMain = () => {
  const navigate = useNavigate();
  const { balance, deductFunds } = useWallet();
  const { hasJoinedPool, joinPool, resetPoolGame, isTestMode, addPoolParticipant, poolValue } = useGame();
  
  const [countdown, setCountdown] = useState({ days: 3, hours: 14, minutes: 22 });

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev.minutes === 0) {
          if (prev.hours === 0) {
            if (prev.days === 0) return prev;
            return { days: prev.days - 1, hours: 23, minutes: 59 };
          }
          return { ...prev, hours: prev.hours - 1, minutes: 59 };
        }
        return { ...prev, minutes: prev.minutes - 1 };
      });
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const handleJoin = () => {
    if (deductFunds(1000, 'pool_entry', 'Lucky Pool Entry')) {
      joinPool();
    }
  };

  const handleTestStart = () => {
    if (!hasJoinedPool) {
      deductFunds(1000, 'pool_entry', 'Lucky Pool Entry');
      joinPool();
    }
    // Add mock participants
    mockPlayers.forEach(p => addPoolParticipant(p));
    navigate('/pool/draw');
  };

  const handleTestReset = () => {
    resetPoolGame();
  };

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 pt-2">
          <button 
            onClick={() => navigate('/home')}
            className="w-10 h-10 rounded-xl bg-card flex items-center justify-center border border-border/50"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-foreground">Lucky Pool</h1>
            <p className="text-sm text-muted-foreground">One winner takes all</p>
          </div>
        </div>

        <WalletCard compact />

        {/* Fairness Badge */}
        <div className="flex items-center gap-2 bg-primary/10 border border-primary/30 rounded-lg px-3 py-2 text-sm text-primary">
          <Shield className="w-4 h-4" />
          <span>Transparent random selection. No boosts. No tricks.</span>
        </div>

        {/* Test Controls */}
        <TestControls
          onStart={handleTestStart}
          onReset={handleTestReset}
          startLabel="Join & Run Draw"
        />

        {/* Pool Info */}
        <div className="card-game">
          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center glow-primary">
                <Sparkles className="w-7 h-7 text-primary" />
              </div>
              <div>
                <h2 className="font-bold text-lg text-foreground">Weekly Pool</h2>
                <p className="text-sm text-muted-foreground">Equal chance for everyone</p>
              </div>
            </div>

            <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl p-5 mb-4 text-center border border-primary/20">
              <p className="text-sm text-muted-foreground mb-2">Prize Pool</p>
              <p className="money-gold text-4xl">{formatMoney(poolValue)}</p>
              <p className="text-xs text-muted-foreground mt-2">Winner takes 90% (10% platform fee)</p>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-muted/30 rounded-xl p-3 text-center border border-border/50">
                <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider">Entry</p>
                <p className="font-bold text-primary">₦1,000</p>
              </div>
              <div className="bg-muted/30 rounded-xl p-3 text-center border border-border/50">
                <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider">Players</p>
                <p className="font-bold text-foreground flex items-center justify-center gap-1">
                  <Users className="w-4 h-4 text-primary" /> {Math.floor(poolValue / 1000)}
                </p>
              </div>
              <div className="bg-muted/30 rounded-xl p-3 text-center border border-border/50">
                <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider">Draw in</p>
                <p className="font-bold text-primary flex items-center justify-center gap-1">
                  <Clock className="w-4 h-4" /> {countdown.days}d
                </p>
              </div>
            </div>

            {hasJoinedPool ? (
              <button
                onClick={() => navigate('/pool/draw')}
                className="w-full btn-primary"
              >
                ✓ Joined - View Pool
              </button>
            ) : (
              <button
                onClick={handleJoin}
                disabled={balance < 1000}
                className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {balance < 1000 ? 'Insufficient Balance' : 'Join Pool - ₦1,000'}
              </button>
            )}
          </div>
        </div>

        {/* How it Works */}
        <div className="card-panel">
          <h3 className="font-bold text-foreground mb-3 flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Fair Play Guarantee
          </h3>
          <ul className="text-sm text-muted-foreground space-y-3">
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0">1</span>
              <span>Everyone pays the same entry fee - no premium tiers</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0">2</span>
              <span>Everyone has exactly equal odds of winning</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0">3</span>
              <span>Winner selected by transparent random algorithm</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0">4</span>
              <span>One winner takes 90% of the entire pool</span>
            </li>
          </ul>
        </div>
      </div>
      
      <BottomNav />
    </div>
  );
};
