import { WalletCard } from '@/components/WalletCard';
import { GameCard } from '@/components/GameCard';
import { SocialFeed } from '@/components/SocialFeed';
import { BottomNav } from '@/components/BottomNav';
import { NotificationCenter } from '@/components/NotificationCenter';
import { TestModeToggle } from '@/components/TestModeToggle';
import { Swords, Sparkles, Zap, Shield } from 'lucide-react';

export const Home = () => {
  return (
    <div className="min-h-screen bg-background pb-24">
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
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-lg">
              💎
            </div>
          </div>
        </div>

        {/* Wallet */}
        <WalletCard />

        {/* Fairness Notice */}
        <div className="fairness-badge">
          <Shield className="w-4 h-4" />
          <span>All games are fair, transparent, and skill/luck based</span>
        </div>

        {/* Game Cards */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Games
          </h2>
          
          <GameCard
            title="Daily Cash Arena"
            description="Fair skill-based challenge"
            icon={<Swords className="w-6 h-6 text-primary" />}
            entry={500}
            info="Ends in 14h"
            path="/arena"
            accentColor="primary"
            ctaText="Play"
            badge="Fair"
          />
          
          <GameCard
            title="Smart Lucky Pool"
            description="One random winner takes all"
            icon={<Sparkles className="w-6 h-6 text-secondary" />}
            entry={1000}
            info="Draw in 2h"
            path="/pool"
            accentColor="secondary"
            ctaText="Join"
            badge="Transparent"
          />
          
          <GameCard
            title="Fastest Finger"
            description="Last comment wins the pool"
            icon={<Zap className="w-6 h-6 text-primary" />}
            entry={700}
            info="Live"
            path="/finger"
            accentColor="primary"
            ctaText="Enter"
            badge="Live"
          />
        </div>

        {/* Social Feed */}
        <SocialFeed />
      </div>
      
      <BottomNav />
    </div>
  );
};
