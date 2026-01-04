import { BottomNav } from '@/components/BottomNav';
import { useGame } from '@/contexts/GameContext';
import { Trophy, Crown, Medal, Award, ArrowLeft, Zap, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const mockLeaderboard = [
  { rank: 1, name: 'CryptoKing', avatar: '👑', wins: 12, earnings: 156000 },
  { rank: 2, name: 'LuckyAce', avatar: '🎰', wins: 10, earnings: 123500 },
  { rank: 3, name: 'FastHands', avatar: '⚡', wins: 9, earnings: 112000 },
  { rank: 4, name: 'GoldRush', avatar: '💰', wins: 7, earnings: 98700 },
  { rank: 5, name: 'NightOwl', avatar: '🦉', wins: 6, earnings: 85400 },
  { rank: 6, name: 'StarPlayer', avatar: '⭐', wins: 5, earnings: 72300 },
  { rank: 7, name: 'DiamondPro', avatar: '💎', wins: 4, earnings: 61200 },
  { rank: 8, name: 'ThunderBolt', avatar: '🌩️', wins: 4, earnings: 58900 },
  { rank: 9, name: 'SilverFox', avatar: '🦊', wins: 3, earnings: 45600 },
  { rank: 10, name: 'MoonRider', avatar: '🌙', wins: 2, earnings: 32100 },
];

export const RankScreen = () => {
  const navigate = useNavigate();
  const { userProfile } = useGame();

  const getRankStyle = (rank: number) => {
    if (rank === 1) return 'podium-1';
    if (rank === 2) return 'podium-2';
    if (rank === 3) return 'podium-3';
    return 'bg-card/50';
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-5 h-5 text-gold" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-silver" />;
    if (rank === 3) return <Award className="w-5 h-5 text-bronze" />;
    return <span className="text-sm font-bold text-muted-foreground w-5 text-center">#{rank}</span>;
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="p-4 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3 pt-2">
          <button 
            onClick={() => navigate('/home')} 
            className="w-10 h-10 rounded-xl bg-card flex items-center justify-center border border-border/50"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div>
            <h1 className="text-xl font-black text-foreground">Leaderboard</h1>
            <p className="text-sm text-muted-foreground">Weekly Fastest Finger rankings</p>
          </div>
        </div>

        {/* Your Position */}
        <div className="card-panel border-primary/30 bg-gradient-to-r from-primary/10 to-transparent">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center text-2xl border-2 border-primary/30">
              {userProfile.avatar}
            </div>
            <div className="flex-1">
              <p className="font-bold text-foreground text-lg">{userProfile.username}</p>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-primary font-semibold">Rank #{userProfile.rank}</span>
                <span className="text-muted-foreground">•</span>
                <span className="text-muted-foreground">{userProfile.wins} wins</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Earnings</p>
              <p className="text-lg font-bold text-gold">₦{userProfile.totalEarnings.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Top 3 Podium */}
        <div className="flex items-end justify-center gap-2 py-4">
          {/* 2nd Place */}
          <div className="flex flex-col items-center flex-1">
            <div className="w-14 h-14 rounded-full bg-card-elevated flex items-center justify-center text-2xl border-2 border-silver mb-2">
              {mockLeaderboard[1].avatar}
            </div>
            <div className="podium-2 rounded-t-xl w-full py-4 text-center" style={{ height: '80px' }}>
              <p className="font-bold text-sm text-foreground truncate px-2">{mockLeaderboard[1].name}</p>
              <p className="text-xs text-silver">{mockLeaderboard[1].wins} wins</p>
            </div>
          </div>

          {/* 1st Place */}
          <div className="flex flex-col items-center flex-1">
            <Crown className="w-6 h-6 text-gold mb-1" />
            <div className="w-16 h-16 rounded-full bg-card-elevated flex items-center justify-center text-2xl border-2 border-gold animate-winner-glow mb-2">
              {mockLeaderboard[0].avatar}
            </div>
            <div className="podium-1 rounded-t-xl w-full py-5 text-center" style={{ height: '100px' }}>
              <p className="font-bold text-foreground truncate px-2">{mockLeaderboard[0].name}</p>
              <p className="text-sm font-bold text-gold">{mockLeaderboard[0].wins} wins</p>
            </div>
          </div>

          {/* 3rd Place */}
          <div className="flex flex-col items-center flex-1">
            <div className="w-14 h-14 rounded-full bg-card-elevated flex items-center justify-center text-2xl border-2 border-bronze mb-2">
              {mockLeaderboard[2].avatar}
            </div>
            <div className="podium-3 rounded-t-xl w-full py-3 text-center" style={{ height: '65px' }}>
              <p className="font-bold text-sm text-foreground truncate px-2">{mockLeaderboard[2].name}</p>
              <p className="text-xs text-bronze">{mockLeaderboard[2].wins} wins</p>
            </div>
          </div>
        </div>

        {/* Full Leaderboard */}
        <div className="card-panel">
          <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            Top 10 This Week
          </h3>
          <div className="space-y-2">
            {mockLeaderboard.slice(3).map((player) => (
              <div 
                key={player.rank} 
                className="flex items-center gap-3 p-3 rounded-xl bg-card/50 border border-border/30"
              >
                <div className="w-8 flex justify-center">
                  {getRankIcon(player.rank)}
                </div>
                <div className="w-10 h-10 rounded-full bg-card-elevated flex items-center justify-center text-xl">
                  {player.avatar}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">{player.name}</p>
                  <p className="text-xs text-muted-foreground">{player.wins} wins</p>
                </div>
                <p className="text-sm font-bold text-primary">₦{player.earnings.toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>

        {/* How rankings work */}
        <div className="card-panel bg-muted/30">
          <div className="flex items-start gap-3">
            <TrendingUp className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <p className="font-semibold text-foreground text-sm">How Rankings Work</p>
              <p className="text-xs text-muted-foreground mt-1">
                Rankings are based on total Fastest Finger wins this week. 
                Top players earn bonus rewards at week's end!
              </p>
            </div>
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  );
};
