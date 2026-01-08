import { BottomNav } from '@/components/BottomNav';
import { AllTimeLeaderboard } from '@/components/AllTimeLeaderboard';
import { useAuth } from '@/contexts/AuthContext';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { Trophy, Crown, Medal, Award, ArrowLeft, TrendingUp, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const RankScreen = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { leaderboard, loading, refresh } = useLeaderboard();

  const displayProfile = {
    username: profile?.username ?? 'Player',
    avatar: profile?.avatar ?? '🎮',
    rank: profile?.weekly_rank ?? null,
    wins: profile?.total_wins ?? 0,
    rankPoints: profile?.rank_points ?? 0,
  };

  const userRank = profile?.id 
    ? leaderboard.findIndex(u => u.id === profile.id) + 1 || displayProfile.rank
    : displayProfile.rank;

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-5 h-5 text-gold" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-silver" />;
    if (rank === 3) return <Award className="w-5 h-5 text-bronze" />;
    return <span className="text-sm font-bold text-muted-foreground w-5 text-center">#{rank}</span>;
  };

  const top3 = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3, 10);

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="p-4 space-y-5">
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/home')} 
              className="w-10 h-10 rounded-xl bg-card flex items-center justify-center border border-border/50"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <div>
              <h1 className="text-xl font-black text-foreground">Leaderboard</h1>
              <p className="text-sm text-muted-foreground">Weekly Royal Rumble rankings</p>
            </div>
          </div>
          <button onClick={refresh} disabled={loading} className="p-2 hover:bg-muted rounded-lg transition-colors">
            <RefreshCw className={`w-5 h-5 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="card-panel border-primary/30 bg-gradient-to-r from-primary/10 to-transparent">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center text-2xl border-2 border-primary/30">
              {displayProfile.avatar}
            </div>
            <div className="flex-1">
              <p className="font-bold text-foreground text-lg">{displayProfile.username}</p>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-primary font-semibold">Rank #{userRank || '-'}</span>
                <span className="text-muted-foreground">•</span>
                <span className="text-muted-foreground">{displayProfile.wins} wins</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Points</p>
              <p className="text-lg font-bold text-primary">{displayProfile.rankPoints}</p>
            </div>
          </div>
        </div>

        {top3.length >= 3 && (
          <div className="flex items-end justify-center gap-2 py-4">
            <div className="flex flex-col items-center flex-1">
              <div className="w-14 h-14 rounded-full bg-card-elevated flex items-center justify-center text-2xl border-2 border-silver mb-2">
                {top3[1]?.avatar || '🥈'}
              </div>
              <div className="podium-2 rounded-t-xl w-full py-4 text-center" style={{ height: '80px' }}>
                <p className="font-bold text-sm text-foreground truncate px-2">{top3[1]?.username}</p>
                <p className="text-xs text-silver">{top3[1]?.total_wins} wins</p>
              </div>
            </div>
            <div className="flex flex-col items-center flex-1">
              <Crown className="w-6 h-6 text-gold mb-1" />
              <div className="w-16 h-16 rounded-full bg-card-elevated flex items-center justify-center text-2xl border-2 border-gold animate-winner-glow mb-2">
                {top3[0]?.avatar || '👑'}
              </div>
              <div className="podium-1 rounded-t-xl w-full py-5 text-center" style={{ height: '100px' }}>
                <p className="font-bold text-foreground truncate px-2">{top3[0]?.username}</p>
                <p className="text-sm font-bold text-gold">{top3[0]?.total_wins} wins</p>
              </div>
            </div>
            <div className="flex flex-col items-center flex-1">
              <div className="w-14 h-14 rounded-full bg-card-elevated flex items-center justify-center text-2xl border-2 border-bronze mb-2">
                {top3[2]?.avatar || '🥉'}
              </div>
              <div className="podium-3 rounded-t-xl w-full py-3 text-center" style={{ height: '65px' }}>
                <p className="font-bold text-sm text-foreground truncate px-2">{top3[2]?.username}</p>
                <p className="text-xs text-bronze">{top3[2]?.total_wins} wins</p>
              </div>
            </div>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        )}

        {!loading && rest.length > 0 && (
          <div className="card-panel">
            <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-primary" />
              Top 10 This Week
            </h3>
            <div className="space-y-2">
              {rest.map((player, index) => (
                <div 
                  key={player.id} 
                  className={`flex items-center gap-3 p-3 rounded-xl bg-card/50 border border-border/30 ${
                    player.id === profile?.id ? 'border-primary/50 bg-primary/5' : ''
                  }`}
                >
                  <div className="w-8 flex justify-center">{getRankIcon(index + 4)}</div>
                  <div className="w-10 h-10 rounded-full bg-card-elevated flex items-center justify-center text-xl">
                    {player.avatar}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">{player.username}</p>
                    <p className="text-xs text-muted-foreground">{player.total_wins} wins</p>
                  </div>
                  <p className="text-sm font-bold text-primary">{player.rank_points} pts</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <AllTimeLeaderboard />

        <div className="card-panel bg-muted/30">
          <div className="flex items-start gap-3">
            <TrendingUp className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <p className="font-semibold text-foreground text-sm">How Rankings Work</p>
              <p className="text-xs text-muted-foreground mt-1">
                Rankings are based on rank points earned from Royal Rumble wins. 
                1st: 100 pts, 2nd: 60 pts, 3rd: 30 pts. Top players earn bonus rewards!
              </p>
            </div>
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  );
};
