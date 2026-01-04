import { useNavigate } from 'react-router-dom';
import { BottomNav } from '@/components/BottomNav';
import { WalletCard } from '@/components/WalletCard';
import { GameCard } from '@/components/GameCard';
import { ActivityFeed } from '@/components/ActivityFeed';
import { TestModeToggle } from '@/components/TestModeToggle';
import { NotificationCenter } from '@/components/NotificationCenter';
import { Zap, Sparkles, Trophy, Shield } from 'lucide-react';
import { useSounds } from '@/hooks/useSounds';
import { useHaptics } from '@/hooks/useHaptics';

export const Home = () => {
  const navigate = useNavigate();
  const { play } = useSounds();
  const { buttonClick } = useHaptics();

  return (
    <div className="min-h-screen bg-background pb-28">
      <div className="p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pt-2">
          <div>
            <h1 className="text-2xl font-black text-foreground tracking-tight">CashArena</h1>
            <p className="text-sm text-muted-foreground">Fair play. Real wins. 💰</p>
          </div>
          <div className="flex items-center gap-2">
            <TestModeToggle />
            <NotificationCenter />
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-lg glow-primary">
              💎
            </div>
          </div>
        </div>

        {/* Wallet */}
        <WalletCard />

        {/* Fairness Notice */}
        <div className="fairness-badge">
          <Shield className="w-4 h-4" />
          <span>Fair, transparent, skill & luck based games</span>
        </div>

        {/* Game Cards */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Games
          </h2>
          
          <GameCard
            title="Fastest Finger"
            description="Last comment wins the pool"
            icon={<Zap className="w-6 h-6 text-primary" />}
            entry={700}
            info="Live Now"
            path="/finger"
            accentColor="primary"
            ctaText="Play"
            badge="Live"
          />
          
          <GameCard
            title="Lucky Pool"
            description="One random winner takes all"
            icon={<Sparkles className="w-6 h-6 text-secondary" />}
            entry={1000}
            info="Draw in 2h"
            path="/pool"
            accentColor="secondary"
            ctaText="Join"
            badge="Fair"
          />
        </div>

        {/* Rank Teaser */}
        <button
          onClick={() => {
            play('click');
            buttonClick();
            navigate('/rank');
          }}
          className="w-full card-game flex items-center justify-between p-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gold/20 flex items-center justify-center glow-gold">
              <Trophy className="w-6 h-6 text-gold" />
            </div>
            <div className="text-left">
              <h3 className="font-bold text-foreground">Your Rank</h3>
              <p className="text-sm text-muted-foreground">Weekly competition</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-black text-gold">#47</p>
            <p className="text-xs text-muted-foreground">Top 10 wins rewards</p>
          </div>
        </button>

        {/* Activity Feed */}
        <ActivityFeed />
      </div>
      
      <BottomNav />
    </div>
  );
};
