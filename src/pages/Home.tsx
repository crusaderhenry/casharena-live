import { useNavigate } from 'react-router-dom';
import { BottomNav } from '@/components/BottomNav';
import { WalletCard } from '@/components/WalletCard';
import { GameCard } from '@/components/GameCard';
import { ActivityFeed } from '@/components/ActivityFeed';
import { TestModeToggle } from '@/components/TestModeToggle';
import { NotificationCenter } from '@/components/NotificationCenter';
import { Zap, Sparkles, Trophy, Shield, ChevronRight } from 'lucide-react';
import { useSounds } from '@/hooks/useSounds';
import { useHaptics } from '@/hooks/useHaptics';

export const Home = () => {
  const navigate = useNavigate();
  const { play } = useSounds();
  const { buttonClick } = useHaptics();

  return (
    <div className="min-h-screen bg-background safe-bottom">
      <div className="px-5 pt-6 pb-8 space-y-7">
        {/* Header */}
        <header className="flex items-center justify-between animate-slide-down">
          <div>
            <h1 className="text-2xl font-extrabold text-foreground tracking-tight">
              Cash<span className="text-gradient-primary">Arena</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">Fair play. Real wins.</p>
          </div>
          <div className="flex items-center gap-2">
            <TestModeToggle />
            <NotificationCenter />
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-lg shadow-glow">
              💎
            </div>
          </div>
        </header>

        {/* Wallet Card */}
        <div className="animate-slide-up" style={{ animationDelay: '50ms' }}>
          <WalletCard />
        </div>

        {/* Fairness Notice */}
        <div className="fairness-notice animate-slide-up" style={{ animationDelay: '100ms' }}>
          <Shield className="w-4 h-4" />
          <span>Provably fair games • Equal odds for everyone</span>
        </div>

        {/* Games Section */}
        <section className="space-y-4 animate-slide-up" style={{ animationDelay: '150ms' }}>
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
            Live Games
          </h2>
          
          <GameCard
            title="Fastest Finger"
            description="Last comment standing wins the pool"
            icon={<Zap className="w-7 h-7 text-primary" />}
            entry={700}
            info="23 playing"
            path="/finger"
            accentColor="primary"
            ctaText="Play"
            badge="Live"
            badgeType="live"
          />
          
          <GameCard
            title="Lucky Pool"
            description="One random winner takes the entire pool"
            icon={<Sparkles className="w-7 h-7 text-secondary" />}
            entry={1000}
            info="Draw in 2h"
            path="/pool"
            accentColor="secondary"
            ctaText="Join"
            badge="Fair"
            badgeType="gold"
          />
        </section>

        {/* Rank Teaser */}
        <button
          onClick={() => {
            play('click');
            buttonClick();
            navigate('/rank');
          }}
          className="w-full card-interactive flex items-center justify-between animate-slide-up"
          style={{ animationDelay: '200ms' }}
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gold/15 flex items-center justify-center shadow-glow-gold">
              <Trophy className="w-7 h-7 text-gold" />
            </div>
            <div className="text-left">
              <h3 className="font-bold text-foreground">Weekly Rankings</h3>
              <p className="text-sm text-muted-foreground">Compete for platform rewards</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right">
              <p className="text-2xl font-extrabold text-gold">#47</p>
              <p className="text-2xs text-muted-foreground">Your rank</p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </div>
        </button>

        {/* Activity Feed */}
        <div className="animate-slide-up" style={{ animationDelay: '250ms' }}>
          <ActivityFeed />
        </div>
      </div>
      
      <BottomNav />
    </div>
  );
};
