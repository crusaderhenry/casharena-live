import { WalletCard } from '@/components/WalletCard';
import { GameCard } from '@/components/GameCard';
import { SocialFeed } from '@/components/SocialFeed';
import { BottomNav } from '@/components/BottomNav';
import { NotificationCenter } from '@/components/NotificationCenter';
import { TestModeToggle } from '@/components/TestModeToggle';
import { Swords, Flame, Sparkles, Zap } from 'lucide-react';
import { useGame } from '@/contexts/GameContext';

export const Home = () => {
  const { currentStreak } = useGame();

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pt-2">
          <div>
            <h1 className="text-2xl font-bold text-foreground">CashArena</h1>
            <p className="text-sm text-muted-foreground">Let's win today! 🔥</p>
          </div>
          <div className="flex items-center gap-2">
            <TestModeToggle />
            <NotificationCenter />
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-lg">
              💎
            </div>
          </div>
        </div>

        {/* Wallet */}
        <WalletCard />

        {/* Game Cards */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Games
          </h2>
          
          <GameCard
            title="Daily Cash Arena"
            description="Skill-based daily challenge"
            icon={<Swords className="w-6 h-6 text-primary" />}
            entry={500}
            info="Ends in 14h"
            path="/arena"
            accentColor="primary"
            ctaText="Join"
          />
          
          <GameCard
            title="Streak to Win"
            description="Daily consistency wins"
            icon={<Flame className="w-6 h-6 text-secondary" />}
            entry={300}
            info={currentStreak > 0 ? `Day ${currentStreak}` : 'Start now'}
            path="/streak"
            accentColor="secondary"
            ctaText="Continue"
          />
          
          <GameCard
            title="Smart Lucky Pool"
            description="Luck with smart odds"
            icon={<Sparkles className="w-6 h-6 text-primary" />}
            entry={1000}
            info="Draw in 2h 30m"
            path="/pool"
            accentColor="primary"
            ctaText="Join"
          />
          
          <GameCard
            title="Fastest Finger"
            description="Last comment wins the pool"
            icon={<Zap className="w-6 h-6 text-secondary" />}
            entry={700}
            info="Next in 15m"
            path="/finger"
            accentColor="secondary"
            ctaText="Join Lobby"
          />
        </div>

        {/* Social Feed */}
        <SocialFeed />
      </div>
      
      <BottomNav />
    </div>
  );
};
