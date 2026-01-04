import { useState, useEffect } from 'react';
import { WalletCard } from '@/components/WalletCard';
import { BottomNav } from '@/components/BottomNav';
import { TestModeToggle } from '@/components/TestControls';
import { Zap, Trophy, Users, Clock, ChevronRight, Flame } from 'lucide-react';
import { useGame } from '@/contexts/GameContext';
import { useNavigate } from 'react-router-dom';
import { useSounds } from '@/hooks/useSounds';
import { useHaptics } from '@/hooks/useHaptics';

export const Home = () => {
  const { fingerPoolValue, userProfile, recentActivity, addFingerPlayer } = useGame();
  const navigate = useNavigate();
  const { play } = useSounds();
  const { buttonClick } = useHaptics();
  const [countdown, setCountdown] = useState(300); // 5 minutes
  const [playerCount, setPlayerCount] = useState(23);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => prev > 0 ? prev - 1 : 300);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Simulate players joining
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

  const formatMoney = (amount: number) => {
    return `₦${amount.toLocaleString()}`;
  };

  const handleJoinGame = () => {
    play('click');
    buttonClick();
    navigate('/finger');
  };

  const handleRankClick = () => {
    play('click');
    buttonClick();
    navigate('/rank');
  };

  // Filter for Fastest Finger activity only
  const fingerActivity = recentActivity.filter(a => a.type === 'finger_win' || a.type === 'rank_up');

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="p-4 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pt-2">
          <div>
            <h1 className="text-2xl font-black text-foreground tracking-tight">
              <span className="text-primary">Fortunes</span>HQ
            </h1>
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <span className="live-dot" />
              Live now
            </p>
          </div>
          <TestModeToggle />
        </div>

        {/* Wallet */}
        <WalletCard compact />

        {/* Hero - Fastest Finger */}
        <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-card via-card to-primary/10">
          {/* Background glow */}
          <div className="absolute top-0 right-0 w-40 h-40 bg-primary/20 rounded-full blur-3xl -z-0" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl -z-0" />
          
          <div className="relative z-10 p-5">
            {/* Live badge */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/20 rounded-full border border-red-500/30">
                <span className="live-dot" />
                <span className="text-xs font-bold text-red-400 uppercase tracking-wider">Live Game</span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Users className="w-4 h-4" />
                <span className="text-sm font-medium">{playerCount} players</span>
              </div>
            </div>

            {/* Title */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center glow-primary">
                <Zap className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-black text-foreground">Fastest Finger</h2>
                <p className="text-sm text-muted-foreground">Last comment standing wins</p>
              </div>
            </div>

            {/* Pool & Countdown */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="bg-background/50 backdrop-blur-sm rounded-xl p-4 border border-border/30">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Prize Pool</p>
                <p className="text-2xl font-black text-primary">{formatMoney(fingerPoolValue)}</p>
              </div>
              <div className="bg-background/50 backdrop-blur-sm rounded-xl p-4 border border-border/30">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Next Game</p>
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  <p className="text-2xl font-black text-foreground">{formatTime(countdown)}</p>
                </div>
              </div>
            </div>

            {/* CTA */}
            <button
              onClick={handleJoinGame}
              className="w-full btn-primary flex items-center justify-center gap-2 text-lg"
            >
              <Zap className="w-5 h-5" />
              Join Live Game
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Your Rank */}
        <button
          onClick={handleRankClick}
          className="w-full card-panel flex items-center justify-between hover:border-primary/40 transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center">
              <Trophy className="w-6 h-6 text-primary" />
            </div>
            <div className="text-left">
              <p className="text-xs text-muted-foreground">Your Weekly Rank</p>
              <p className="text-2xl font-black text-foreground">#{userProfile.rank}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-primary">
            <span className="text-sm font-medium">Leaderboard</span>
            <ChevronRight className="w-5 h-5" />
          </div>
        </button>

        {/* Recent Wins */}
        <div className="card-panel">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Flame className="w-4 h-4 text-primary" />
              Recent Wins
            </h3>
          </div>
          
          {fingerActivity.length > 0 ? (
            <div className="space-y-3">
              {fingerActivity.slice(0, 4).map((activity) => (
                <div key={activity.id} className="flex items-center gap-3 py-2 border-b border-border/20 last:border-0">
                  <div className="w-9 h-9 rounded-full bg-card-elevated flex items-center justify-center text-lg">
                    {activity.playerAvatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{activity.playerName}</p>
                    <p className="text-xs text-muted-foreground">
                      {activity.type === 'finger_win' ? 'Won Fastest Finger' : `Rank #${activity.position}`}
                    </p>
                  </div>
                  {activity.amount && (
                    <p className="text-sm font-bold text-gold">+{formatMoney(activity.amount)}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-muted-foreground text-sm">No recent activity</p>
              <p className="text-xs text-muted-foreground mt-1">Be the first to win!</p>
            </div>
          )}
        </div>

        {/* How it works teaser */}
        <div className="card-panel bg-gradient-to-r from-primary/5 to-transparent border-primary/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-foreground">Entry: ₦700</p>
              <p className="text-xs text-muted-foreground">Top 3 commenters win the pool</p>
            </div>
          </div>
        </div>
      </div>
      
      <BottomNav />
    </div>
  );
};
