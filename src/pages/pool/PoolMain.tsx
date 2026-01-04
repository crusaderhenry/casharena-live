import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BottomNav } from '@/components/BottomNav';
import { WalletCard } from '@/components/WalletCard';
import { useWallet } from '@/contexts/WalletContext';
import { useGame } from '@/contexts/GameContext';
import { ChevronLeft, Sparkles, Users, Clock, TrendingUp } from 'lucide-react';

export const PoolMain = () => {
  const navigate = useNavigate();
  const { balance, deductFunds } = useWallet();
  const { hasJoinedPool, poolOdds, joinPool, addActivity } = useGame();
  const [countdown, setCountdown] = useState(9000); // 2h 30m

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => prev > 0 ? prev - 1 : 0);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}h ${m}m ${s}s`;
  };

  const handleJoin = () => {
    if (deductFunds(1000, 'pool_entry', 'Lucky Pool Entry')) {
      joinPool();
      addActivity('Joined Smart Lucky Pool', 'pool');
    }
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
            <h1 className="text-xl font-bold text-foreground">Smart Lucky Pool</h1>
            <p className="text-sm text-muted-foreground">Luck with smart odds</p>
          </div>
        </div>

        <WalletCard compact />

        {/* Pool Info */}
        <div className="card-game">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center">
              <Sparkles className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-foreground">Today's Pool</h2>
              <p className="text-sm text-muted-foreground">Draw happens when timer ends</p>
            </div>
          </div>

          <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-xl p-4 mb-4 text-center">
            <p className="text-sm text-muted-foreground mb-2">Prize Pool</p>
            <p className="text-4xl font-bold text-money">₦156,000</p>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-muted/50 rounded-xl p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">Entry</p>
              <p className="font-bold text-primary">₦1,000</p>
            </div>
            <div className="bg-muted/50 rounded-xl p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">Players</p>
              <p className="font-bold text-foreground flex items-center justify-center gap-1">
                <Users className="w-4 h-4" /> 156
              </p>
            </div>
            <div className="bg-muted/50 rounded-xl p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">Draw in</p>
              <p className="font-bold text-secondary flex items-center justify-center gap-1">
                <Clock className="w-4 h-4" /> {formatTime(countdown).split(' ')[0]}
              </p>
            </div>
          </div>

          {hasJoinedPool && (
            <div className="bg-primary/10 rounded-xl p-4 mb-4 border border-primary/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  <span className="font-medium text-foreground">Your Odds Multiplier</span>
                </div>
                <span className="text-xl font-bold text-primary">{poolOdds.toFixed(1)}x</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Activity in other games increases your odds!
              </p>
            </div>
          )}

          {hasJoinedPool ? (
            <button
              onClick={() => navigate('/pool/details')}
              className="w-full btn-primary"
            >
              View Pool Details
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

        {/* How it Works */}
        <div className="card-game">
          <h3 className="font-bold text-foreground mb-3">How Smart Lucky Pool Works</h3>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-primary">1.</span>
              Pay entry fee to join the pool
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">2.</span>
              Your base odds are equal to everyone
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">3.</span>
              Playing other games increases your odds multiplier
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">4.</span>
              Winner is randomly selected at draw time
            </li>
          </ul>
        </div>
      </div>
      
      <BottomNav />
    </div>
  );
};
