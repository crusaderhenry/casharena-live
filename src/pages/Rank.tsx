import { useState } from 'react';
import { BottomNav } from '@/components/BottomNav';
import { Avatar } from '@/components/Avatar';
import { ChevronLeft, Trophy, Clock, Medal, Star, TrendingUp, Flame } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSounds } from '@/hooks/useSounds';
import { useHaptics } from '@/hooks/useHaptics';

const MOCK_LEADERBOARD = [
  { rank: 1, name: 'Adebayo K.', points: 12450, wins: 28 },
  { rank: 2, name: 'Chidinma U.', points: 11200, wins: 24 },
  { rank: 3, name: 'Emeka A.', points: 10890, wins: 22 },
  { rank: 4, name: 'Fatima B.', points: 9750, wins: 20 },
  { rank: 5, name: 'Grace O.', points: 8920, wins: 18 },
  { rank: 6, name: 'Henry I.', points: 8450, wins: 17 },
  { rank: 7, name: 'Ifeoma C.', points: 7890, wins: 15 },
  { rank: 8, name: 'John D.', points: 7340, wins: 14 },
  { rank: 9, name: 'Kemi L.', points: 6920, wins: 13 },
  { rank: 10, name: 'Ladi M.', points: 6450, wins: 12 },
];

const USER_RANK = {
  rank: 47,
  name: 'You',
  points: 2340,
  wins: 4,
};

export const Rank = () => {
  const navigate = useNavigate();
  const { play } = useSounds();
  const { buttonClick } = useHaptics();
  const [timeframe, setTimeframe] = useState<'weekly' | 'monthly'>('weekly');

  const getRankBadge = (rank: number) => {
    if (rank === 1) return '👑';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return null;
  };

  const getRankBg = (rank: number) => {
    if (rank === 1) return 'podium-1st';
    if (rank === 2) return 'podium-2nd';
    if (rank === 3) return 'podium-3rd';
    return 'border-border/40';
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
            <h1 className="text-xl font-bold text-foreground">Leaderboard</h1>
            <p className="text-sm text-muted-foreground">Compete for weekly rewards</p>
          </div>
          <Trophy className="w-6 h-6 text-gold" />
        </header>

        {/* Timeframe Toggle */}
        <div className="flex gap-2 p-1.5 bg-muted/30 rounded-2xl border border-border/40 animate-slide-up">
          <button
            onClick={() => setTimeframe('weekly')}
            className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all duration-300 ${
              timeframe === 'weekly'
                ? 'bg-primary text-primary-foreground shadow-glow'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Weekly
          </button>
          <button
            onClick={() => setTimeframe('monthly')}
            className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all duration-300 ${
              timeframe === 'monthly'
                ? 'bg-primary text-primary-foreground shadow-glow'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Monthly
          </button>
        </div>

        {/* Reset Timer */}
        <div className="card-glass flex items-center justify-between animate-slide-up" style={{ animationDelay: '50ms' }}>
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-secondary" />
            <span className="text-sm text-muted-foreground font-medium">Weekly reset in</span>
          </div>
          <span className="font-bold text-secondary">4d 12h 30m</span>
        </div>

        {/* Your Rank Card */}
        <div className="card-glow animate-slide-up" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-4">
              <Avatar name="You" size="lg" isWinner />
              <div>
                <p className="font-bold text-lg text-foreground">Your Rank</p>
                <p className="text-sm text-muted-foreground">{USER_RANK.points.toLocaleString()} points</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-4xl font-extrabold text-primary">#{USER_RANK.rank}</p>
              <div className="flex items-center justify-end gap-1 text-xs text-primary mt-1">
                <TrendingUp className="w-3 h-3" />
                <span className="font-medium">+5 this week</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="stat-box">
              <p className="stat-label">Total Wins</p>
              <p className="stat-value flex items-center justify-center gap-1.5">
                <Flame className="w-4 h-4 text-primary" />
                {USER_RANK.wins}
              </p>
            </div>
            <div className="stat-box">
              <p className="stat-label">Points to Top 10</p>
              <p className="stat-value text-gold">{(MOCK_LEADERBOARD[9].points - USER_RANK.points).toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Reward Notice */}
        <div className="fairness-notice bg-gold/10 text-gold border-gold/25 animate-slide-up" style={{ animationDelay: '150ms' }}>
          <Star className="w-4 h-4" />
          <span>Top 10 players receive platform rewards weekly!</span>
        </div>

        {/* Top 10 Leaderboard */}
        <div className="space-y-3 animate-slide-up" style={{ animationDelay: '200ms' }}>
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
            <Trophy className="w-4 h-4 text-gold" />
            Top 10 This Week
          </h2>
          
          {MOCK_LEADERBOARD.map((player, index) => (
            <div
              key={player.rank}
              className={`card-interactive py-3.5 flex items-center justify-between ${getRankBg(player.rank)} animate-slide-up`}
              style={{ animationDelay: `${(index + 5) * 30}ms` }}
            >
              <div className="flex items-center gap-4">
                <div className="w-10 flex justify-center">
                  {getRankBadge(player.rank) ? (
                    <span className="text-2xl">{getRankBadge(player.rank)}</span>
                  ) : (
                    <span className="text-lg font-bold text-muted-foreground">#{player.rank}</span>
                  )}
                </div>
                <Avatar name={player.name} size="sm" position={player.rank <= 3 ? player.rank : undefined} />
                <div>
                  <p className="font-bold text-foreground">{player.name}</p>
                  <p className="text-xs text-muted-foreground">{player.wins} wins</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`font-bold text-lg ${
                  player.rank === 1 ? 'text-gold' : 
                  player.rank === 2 ? 'text-silver' : 
                  player.rank === 3 ? 'text-bronze' : 'text-foreground'
                }`}>
                  {player.points.toLocaleString()}
                </p>
                <p className="text-2xs text-muted-foreground">points</p>
              </div>
            </div>
          ))}
        </div>

        {/* How Points Work */}
        <div className="card-premium animate-slide-up" style={{ animationDelay: '250ms' }}>
          <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
            <Star className="w-5 h-5 text-secondary" />
            How to Earn Points
          </h3>
          <div className="space-y-2.5">
            {[
              { label: 'Fastest Finger win', points: '+500 pts', color: 'text-primary' },
              { label: 'Fastest Finger 2nd/3rd', points: '+200 pts', color: 'text-primary' },
              { label: 'Lucky Pool win', points: '+1000 pts', color: 'text-gold' },
              { label: 'Fastest Finger participation', points: '+50 pts', color: 'text-muted-foreground' },
              { label: 'Lucky Pool participation', points: '+25 pts', color: 'text-muted-foreground' },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between py-1">
                <span className="text-sm text-muted-foreground">{item.label}</span>
                <span className={`font-bold ${item.color}`}>{item.points}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <BottomNav />
    </div>
  );
};
