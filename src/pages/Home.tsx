import { WalletCard } from '@/components/WalletCard';
import { GameCard } from '@/components/GameCard';
import { ActivityFeed } from '@/components/ActivityFeed';
import { BottomNav } from '@/components/BottomNav';
import { TestModeToggle } from '@/components/TestControls';
import { Zap, Sparkles, Trophy } from 'lucide-react';
import { useGame } from '@/contexts/GameContext';
import { useNavigate } from 'react-router-dom';
import { useSounds } from '@/hooks/useSounds';
import { useHaptics } from '@/hooks/useHaptics';

export const Home = () => {
  const { fingerPoolValue, poolValue, userProfile } = useGame();
  const navigate = useNavigate();
  const { play } = useSounds();
  const { buttonClick } = useHaptics();

  const handleProfileClick = () => {
    play('click');
    buttonClick();
    navigate('/profile');
  };

  const handleRankClick = () => {
    play('click');
    buttonClick();
    navigate('/rank');
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
        <div className="flex items-center justify-between pt-2">
          <div>
            <h1 className="text-2xl font-black text-foreground tracking-tight">
              <span className="text-primary">Fortunes</span>HQ
            </h1>
            <p className="text-sm text-muted-foreground">Live money games. Real wins. 🎯</p>
          </div>
          <div className="flex items-center gap-2">
            <TestModeToggle />
            <button 
              onClick={handleProfileClick}
              className="w-10 h-10 rounded-full bg-card-elevated flex items-center justify-center text-xl border border-border/50 hover:border-primary/50 transition-colors"
            >
              {userProfile.avatar}
            </button>
          </div>
        </div>

        {/* Wallet */}
        <WalletCard />

        {/* Rank Teaser */}
        <div 
          onClick={handleRankClick}
          className="card-panel cursor-pointer hover:border-primary/40 transition-all flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Your Rank</p>
              <p className="text-xl font-bold text-foreground">#{userProfile.rank}</p>
            </div>
          </div>
          <span className="text-primary text-sm font-medium">View Leaderboard →</span>
        </div>

        {/* Game Cards */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Live Games
          </h2>
          
          <GameCard
            title="Fastest Finger"
            description="Last comment wins • Live competition"
            icon={<Zap className="w-6 h-6 text-primary" />}
            entry={700}
            poolValue={fingerPoolValue}
            countdown="Starts in 5m"
            path="/finger"
            isLive
          />
          
          <GameCard
            title="Lucky Pool"
            description="One random winner takes all • Weekly draw"
            icon={<Sparkles className="w-6 h-6 text-primary" />}
            entry={1000}
            poolValue={poolValue}
            countdown="Draw in 3d 14h"
            path="/pool"
            badge="Weekly"
          />
        </div>

        {/* Activity Feed */}
        <ActivityFeed />
      </div>
      
      <BottomNav />
    </div>
  );
};
