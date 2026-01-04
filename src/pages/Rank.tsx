import { useState } from 'react';
import { BottomNav } from '@/components/BottomNav';
import { Avatar } from '@/components/Avatar';
import { ChevronLeft, Trophy, Clock, Medal, Star, TrendingUp } from 'lucide-react';
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

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <span className="text-2xl">👑</span>;
    if (rank === 2) return <Medal className="w-6 h-6 text-silver" />;
    if (rank === 3) return <Medal className="w-6 h-6 text-bronze" />;
    return null;
  };

  const getRankBg = (rank: number) => {
    if (rank === 1) return 'bg-gold/10 border-gold/50';
    if (rank === 2) return 'bg-silver/10 border-silver/50';
    if (rank === 3) return 'bg-bronze/10 border-bronze/50';
    return 'border-border/50';
  };

  return (
    <div className="min-h-screen bg-background pb-28">
      <div className="p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 pt-2">
          <button 
            onClick={() => {
              play('click');
              buttonClick();
              navigate('/home');
            }}
            className="w-10 h-10 rounded-xl bg-card flex items-center justify-center border border-border/50"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-foreground">Leaderboard</h1>
            <p className="text-sm text-muted-foreground">Compete for weekly rewards</p>
          </div>
        </div>

        {/* Timeframe Toggle */}
        <div className="flex gap-2 p-1 bg-muted/30 rounded-xl">
          <button
            onClick={() => setTimeframe('weekly')}
            className={`flex-1 py-2.5 rounded-lg font-bold text-sm transition-all ${
              timeframe === 'weekly'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground'
            }`}
          >
            Weekly
          </button>
          <button
            onClick={() => setTimeframe('monthly')}
            className={`flex-1 py-2.5 rounded-lg font-bold text-sm transition-all ${
              timeframe === 'monthly'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground'
            }`}
          >
            Monthly
          </button>
        </div>

        {/* Reset Timer */}
        <div className="card-premium flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-secondary" />
            <span className="text-sm text-muted-foreground">Weekly reset in</span>
          </div>
          <span className="font-bold text-secondary">4d 12h 30m</span>
        </div>

        {/* Your Rank Card */}
        <div className="card-highlight">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Avatar name="You" size="lg" isWinner />
              <div>
                <p className="font-bold text-foreground">Your Rank</p>
                <p className="text-sm text-muted-foreground">{USER_RANK.points.toLocaleString()} points</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-black text-primary">#{USER_RANK.rank}</p>
              <div className="flex items-center gap-1 text-xs text-primary">
                <TrendingUp className="w-3 h-3" />
                <span>+5 this week</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted/30 rounded-xl p-3 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Total Wins</p>
              <p className="font-bold text-foreground">{USER_RANK.wins}</p>
            </div>
            <div className="bg-muted/30 rounded-xl p-3 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Points Needed</p>
              <p className="font-bold text-gold">{(MOCK_LEADERBOARD[9].points - USER_RANK.points).toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Reward Notice */}
        <div className="fairness-badge">
          <Star className="w-4 h-4" />
          <span>Top 10 players receive platform rewards weekly!</span>
        </div>

        {/* Top 10 Leaderboard */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Trophy className="w-4 h-4 text-gold" />
            Top 10 This Week
          </h2>
          
          {MOCK_LEADERBOARD.map((player, index) => (
            <div
              key={player.rank}
              className={`card-game flex items-center justify-between py-3 border ${getRankBg(player.rank)} animate-slide-up`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 flex justify-center">
                  {getRankIcon(player.rank) || (
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
                <p className={`font-bold ${player.rank === 1 ? 'text-gold' : player.rank === 2 ? 'text-silver' : player.rank === 3 ? 'text-bronze' : 'text-foreground'}`}>
                  {player.points.toLocaleString()}
                </p>
                <p className="text-[10px] text-muted-foreground">points</p>
              </div>
            </div>
          ))}
        </div>

        {/* How Points Work */}
        <div className="card-premium">
          <h3 className="font-bold text-foreground mb-3 flex items-center gap-2">
            <Star className="w-5 h-5 text-secondary" />
            How to Earn Points
          </h3>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li className="flex items-center justify-between">
              <span>Fastest Finger win</span>
              <span className="font-bold text-primary">+500 pts</span>
            </li>
            <li className="flex items-center justify-between">
              <span>Fastest Finger 2nd/3rd</span>
              <span className="font-bold text-primary">+200 pts</span>
            </li>
            <li className="flex items-center justify-between">
              <span>Lucky Pool win</span>
              <span className="font-bold text-secondary">+1000 pts</span>
            </li>
            <li className="flex items-center justify-between">
              <span>Fastest Finger participation</span>
              <span className="font-bold text-muted-foreground">+50 pts</span>
            </li>
            <li className="flex items-center justify-between">
              <span>Lucky Pool participation</span>
              <span className="font-bold text-muted-foreground">+25 pts</span>
            </li>
          </ul>
        </div>
      </div>
      
      <BottomNav />
    </div>
  );
};
