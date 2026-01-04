import { BottomNav } from '@/components/BottomNav';
import { useGame } from '@/contexts/GameContext';
import { Trophy, Crown, Medal, Award, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const mockLeaderboard = [
  { rank: 1, name: 'CryptoKing', avatar: '👑', points: 15420 },
  { rank: 2, name: 'LuckyAce', avatar: '🎰', points: 12350 },
  { rank: 3, name: 'FastHands', avatar: '⚡', points: 11200 },
  { rank: 4, name: 'GoldRush', avatar: '💰', points: 9870 },
  { rank: 5, name: 'NightOwl', avatar: '🦉', points: 8540 },
  { rank: 6, name: 'StarPlayer', avatar: '⭐', points: 7230 },
  { rank: 7, name: 'DiamondPro', avatar: '💎', points: 6120 },
  { rank: 8, name: 'ThunderBolt', avatar: '🌩️', points: 5890 },
  { rank: 9, name: 'SilverFox', avatar: '🦊', points: 4560 },
  { rank: 10, name: 'MoonRider', avatar: '🌙', points: 3210 },
];

export const RankScreen = () => {
  const navigate = useNavigate();
  const { userProfile } = useGame();

  const getIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-5 h-5 text-gold" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-silver" />;
    if (rank === 3) return <Award className="w-5 h-5 text-bronze" />;
    return <span className="text-sm font-bold text-muted-foreground">#{rank}</span>;
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="p-4 space-y-6">
        <div className="flex items-center gap-3 pt-2">
          <button onClick={() => navigate('/home')} className="p-2 -ml-2">
            <ArrowLeft className="w-6 h-6 text-foreground" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-foreground">Leaderboard</h1>
            <p className="text-sm text-muted-foreground">Weekly rankings</p>
          </div>
        </div>

        <div className="card-panel">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-2xl">
              {userProfile.avatar}
            </div>
            <div>
              <p className="font-bold text-foreground">{userProfile.username}</p>
              <p className="text-sm text-primary">Rank #{userProfile.rank}</p>
            </div>
          </div>
        </div>

        <div className="card-panel">
          <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            Top 10 This Week
          </h3>
          <div className="space-y-3">
            {mockLeaderboard.map((player) => (
              <div key={player.rank} className={`flex items-center gap-3 p-3 rounded-xl ${player.rank <= 3 ? 'bg-card-elevated border border-border/50' : ''}`}>
                <div className="w-8 flex justify-center">{getIcon(player.rank)}</div>
                <div className="w-10 h-10 rounded-full bg-card flex items-center justify-center text-xl">
                  {player.avatar}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">{player.name}</p>
                </div>
                <p className="text-sm font-bold text-primary">{player.points.toLocaleString()} pts</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  );
};
