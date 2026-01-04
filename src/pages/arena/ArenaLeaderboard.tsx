import { useNavigate } from 'react-router-dom';
import { BottomNav } from '@/components/BottomNav';
import { Avatar } from '@/components/Avatar';
import { ChevronLeft } from 'lucide-react';
import { useGame } from '@/contexts/GameContext';

const MOCK_LEADERBOARD = [
  { name: 'Victor A.', score: 300, prize: 84700 },
  { name: 'Chioma E.', score: 295, prize: 63525 },
  { name: 'Tunde O.', score: 290, prize: 42350 },
  { name: 'Blessing I.', score: 285, prize: 21175 },
  { name: 'Emeka N.', score: 280, prize: 16940 },
  { name: 'Fatima B.', score: 275, prize: 12705 },
  { name: 'Kola M.', score: 270, prize: 8470 },
  { name: 'Ada U.', score: 265, prize: 6352 },
  { name: 'Yusuf D.', score: 260, prize: 4235 },
  { name: 'Grace P.', score: 255, prize: 2117 },
];

export const ArenaLeaderboard = () => {
  const navigate = useNavigate();
  const { arenaScore, arenaRank } = useGame();

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 pt-2">
          <button 
            onClick={() => navigate('/arena')}
            className="w-10 h-10 rounded-xl bg-card flex items-center justify-center"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-foreground">Arena Leaderboard</h1>
            <p className="text-sm text-muted-foreground">Today's top players</p>
          </div>
        </div>

        {/* Top 3 */}
        <div className="flex items-end justify-center gap-4 pt-4">
          {/* 2nd Place */}
          <div className="flex flex-col items-center">
            <Avatar name={MOCK_LEADERBOARD[1].name} size="lg" position={2} />
            <p className="font-bold text-sm mt-2 text-foreground">{MOCK_LEADERBOARD[1].name}</p>
            <p className="text-xs text-muted-foreground">{MOCK_LEADERBOARD[1].score} pts</p>
            <p className="text-sm font-bold text-primary">₦{MOCK_LEADERBOARD[1].prize.toLocaleString()}</p>
          </div>
          
          {/* 1st Place */}
          <div className="flex flex-col items-center -mt-4">
            <div className="text-3xl mb-2">👑</div>
            <Avatar name={MOCK_LEADERBOARD[0].name} size="xl" position={1} isWinner />
            <p className="font-bold mt-2 text-foreground">{MOCK_LEADERBOARD[0].name}</p>
            <p className="text-sm text-muted-foreground">{MOCK_LEADERBOARD[0].score} pts</p>
            <p className="font-bold text-lg text-money">₦{MOCK_LEADERBOARD[0].prize.toLocaleString()}</p>
          </div>
          
          {/* 3rd Place */}
          <div className="flex flex-col items-center">
            <Avatar name={MOCK_LEADERBOARD[2].name} size="lg" position={3} />
            <p className="font-bold text-sm mt-2 text-foreground">{MOCK_LEADERBOARD[2].name}</p>
            <p className="text-xs text-muted-foreground">{MOCK_LEADERBOARD[2].score} pts</p>
            <p className="text-sm font-bold text-primary">₦{MOCK_LEADERBOARD[2].prize.toLocaleString()}</p>
          </div>
        </div>

        {/* Your Position */}
        {arenaScore > 0 && (
          <div className="bg-primary/10 rounded-2xl p-4 border border-primary/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                  #{arenaRank}
                </div>
                <div>
                  <p className="font-bold text-foreground">You</p>
                  <p className="text-sm text-muted-foreground">{arenaScore} pts</p>
                </div>
              </div>
              <p className="font-bold text-primary">
                ₦{(arenaScore > 150 ? arenaScore * 10 : 0).toLocaleString()}
              </p>
            </div>
          </div>
        )}

        {/* Full Leaderboard */}
        <div className="space-y-2">
          {MOCK_LEADERBOARD.slice(3).map((player, index) => (
            <div key={index} className="card-game flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground">
                  {index + 4}
                </div>
                <Avatar name={player.name} size="sm" />
                <div>
                  <p className="font-medium text-foreground">{player.name}</p>
                  <p className="text-xs text-muted-foreground">{player.score} pts</p>
                </div>
              </div>
              <p className="font-bold text-sm text-primary">₦{player.prize.toLocaleString()}</p>
            </div>
          ))}
        </div>
      </div>
      
      <BottomNav />
    </div>
  );
};
