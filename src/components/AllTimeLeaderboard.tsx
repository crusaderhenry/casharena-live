import { useState, useEffect } from 'react';
import { Trophy, Crown, TrendingUp, ChevronRight, Medal } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { supabase } from '@/integrations/supabase/client';

interface LeaderboardEntry {
  id: string;
  username: string;
  avatar: string;
  total_wins: number;
  total_earnings: number;
  games_played: number;
  rank_points: number;
}

interface AllTimeLeaderboardProps {
  isTestMode?: boolean;
}

// Mock data for test mode
const mockLeaderboard: LeaderboardEntry[] = [
  { id: '1', username: 'CryptoKing', avatar: '👑', total_wins: 47, total_earnings: 892500, games_played: 156, rank_points: 4700 },
  { id: '2', username: 'LuckyAce', avatar: '🎰', total_wins: 38, total_earnings: 654200, games_played: 142, rank_points: 3800 },
  { id: '3', username: 'FastHands', avatar: '⚡', total_wins: 35, total_earnings: 587000, games_played: 128, rank_points: 3500 },
  { id: '4', username: 'SpeedDemon', avatar: '💨', total_wins: 31, total_earnings: 498300, games_played: 115, rank_points: 3100 },
  { id: '5', username: 'NightOwl', avatar: '🦉', total_wins: 28, total_earnings: 445000, games_played: 98, rank_points: 2800 },
  { id: '6', username: 'QuickDraw', avatar: '🎯', total_wins: 24, total_earnings: 378500, games_played: 87, rank_points: 2400 },
  { id: '7', username: 'GamerPro', avatar: '🎮', total_wins: 21, total_earnings: 312000, games_played: 76, rank_points: 2100 },
  { id: '8', username: 'WinStreak', avatar: '🔥', total_wins: 18, total_earnings: 267800, games_played: 65, rank_points: 1800 },
  { id: '9', username: 'ChampionX', avatar: '🏆', total_wins: 15, total_earnings: 223400, games_played: 54, rank_points: 1500 },
  { id: '10', username: 'ProPlayer', avatar: '⭐', total_wins: 12, total_earnings: 178900, games_played: 43, rank_points: 1200 },
];

export const AllTimeLeaderboard = ({ isTestMode = false }: AllTimeLeaderboardProps) => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    if (isTestMode) {
      setLeaderboard(mockLeaderboard);
      return;
    }

    const fetchLeaderboard = async () => {
      setLoading(true);
      
      // Get all winners grouped by user with total earnings
      const { data: winnerStats, error: winnersError } = await supabase
        .from('winners')
        .select('user_id, amount_won');

      if (winnersError) {
        console.error('Error fetching winners:', winnersError);
        setLoading(false);
        return;
      }

      // Aggregate earnings by user
      const earningsMap = new Map<string, number>();
      (winnerStats || []).forEach(w => {
        earningsMap.set(w.user_id, (earningsMap.get(w.user_id) || 0) + w.amount_won);
      });

      // Get top profiles by total_wins
      const { data: profiles, error: profilesError } = await supabase
        .rpc('get_leaderboard', { limit_count: 20 });

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        setLoading(false);
        return;
      }

      // Combine data
      const combined: LeaderboardEntry[] = (profiles || [])
        .map(p => ({
          id: p.id,
          username: p.username || 'Player',
          avatar: p.avatar || '🎮',
          total_wins: p.total_wins || 0,
          total_earnings: earningsMap.get(p.id) || 0,
          games_played: p.games_played || 0,
          rank_points: p.rank_points || 0,
        }))
        .filter(p => p.total_wins > 0 || p.total_earnings > 0)
        .sort((a, b) => b.total_earnings - a.total_earnings)
        .slice(0, 20);

      setLeaderboard(combined);
      setLoading(false);
    };

    fetchLeaderboard();
  }, [open, isTestMode]);

  const formatMoney = (amount: number) => `₦${amount.toLocaleString()}`;

  const getRankBadge = (position: number) => {
    switch (position) {
      case 1: return { icon: '👑', bg: 'bg-gradient-to-r from-yellow-500/30 to-amber-500/20', border: 'border-yellow-500/50' };
      case 2: return { icon: '🥈', bg: 'bg-gradient-to-r from-gray-400/30 to-slate-400/20', border: 'border-gray-400/50' };
      case 3: return { icon: '🥉', bg: 'bg-gradient-to-r from-orange-600/30 to-amber-600/20', border: 'border-orange-500/50' };
      default: return { icon: null, bg: 'bg-background/50', border: 'border-border/50' };
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button className="w-full card-panel hover:border-gold/40 transition-all">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold/15 flex items-center justify-center">
              <Crown className="w-5 h-5 text-gold" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-bold text-foreground">All-Time Leaderboard</p>
              <p className="text-xs text-muted-foreground">Top winners & total earnings</p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </div>
        </button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
        <SheetHeader className="pb-4 border-b border-border">
          <SheetTitle className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-gold" />
            All-Time Leaderboard
          </SheetTitle>
        </SheetHeader>

        <div className="py-4 space-y-4 overflow-y-auto max-h-[calc(85vh-100px)]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="text-center py-12">
              <Trophy className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground font-medium">No winners yet</p>
              <p className="text-xs text-muted-foreground mt-1">Play games to appear on the leaderboard!</p>
            </div>
          ) : (
            <>
              {/* Top 3 Podium */}
              {leaderboard.length >= 3 && (
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {/* 2nd Place */}
                  <div className="flex flex-col items-center pt-6">
                    <div className="w-14 h-14 rounded-full bg-gray-400/20 border-2 border-gray-400/50 flex items-center justify-center text-2xl mb-2">
                      {leaderboard[1].avatar}
                    </div>
                    <span className="text-lg mb-1">🥈</span>
                    <p className="text-xs font-bold text-foreground text-center truncate w-full">{leaderboard[1].username}</p>
                    <p className="text-xs text-primary font-bold">{formatMoney(leaderboard[1].total_earnings)}</p>
                    <p className="text-[10px] text-muted-foreground">{leaderboard[1].total_wins} wins</p>
                  </div>
                  
                  {/* 1st Place */}
                  <div className="flex flex-col items-center">
                    <div className="w-18 h-18 rounded-full bg-yellow-500/20 border-2 border-yellow-500/50 flex items-center justify-center text-3xl mb-2 relative">
                      {leaderboard[0].avatar}
                      <span className="absolute -top-2 text-xl">👑</span>
                    </div>
                    <p className="text-sm font-bold text-foreground text-center truncate w-full">{leaderboard[0].username}</p>
                    <p className="text-sm text-primary font-black">{formatMoney(leaderboard[0].total_earnings)}</p>
                    <p className="text-[10px] text-muted-foreground">{leaderboard[0].total_wins} wins</p>
                  </div>
                  
                  {/* 3rd Place */}
                  <div className="flex flex-col items-center pt-8">
                    <div className="w-12 h-12 rounded-full bg-orange-500/20 border-2 border-orange-500/50 flex items-center justify-center text-xl mb-2">
                      {leaderboard[2].avatar}
                    </div>
                    <span className="text-base mb-1">🥉</span>
                    <p className="text-xs font-bold text-foreground text-center truncate w-full">{leaderboard[2].username}</p>
                    <p className="text-xs text-primary font-bold">{formatMoney(leaderboard[2].total_earnings)}</p>
                    <p className="text-[10px] text-muted-foreground">{leaderboard[2].total_wins} wins</p>
                  </div>
                </div>
              )}

              {/* Stats header */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground px-2 pb-2 border-b border-border/50">
                <span className="w-8 text-center">#</span>
                <span className="flex-1">Player</span>
                <span className="w-20 text-right">Earnings</span>
                <span className="w-12 text-right">Wins</span>
              </div>

              {/* Full List */}
              <div className="space-y-2">
                {leaderboard.slice(3).map((entry, index) => {
                  const position = index + 4;
                  const badge = getRankBadge(position);
                  
                  return (
                    <div 
                      key={entry.id}
                      className={`flex items-center gap-3 p-3 rounded-xl ${badge.bg} border ${badge.border}`}
                    >
                      <span className="w-8 text-center font-bold text-muted-foreground">
                        {badge.icon || `#${position}`}
                      </span>
                      <div className="w-10 h-10 rounded-full bg-card-elevated flex items-center justify-center text-lg border border-border/50">
                        {entry.avatar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">{entry.username}</p>
                        <p className="text-xs text-muted-foreground">{entry.games_played} games</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-primary text-sm">{formatMoney(entry.total_earnings)}</p>
                      </div>
                      <div className="w-12 text-right">
                        <p className="font-bold text-foreground text-sm">{entry.total_wins}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Top 3 in list form if less than 3 entries */}
              {leaderboard.length < 3 && leaderboard.map((entry, index) => {
                const position = index + 1;
                const badge = getRankBadge(position);
                
                return (
                  <div 
                    key={entry.id}
                    className={`flex items-center gap-3 p-3 rounded-xl ${badge.bg} border ${badge.border}`}
                  >
                    <span className="w-8 text-center text-lg">
                      {badge.icon || `#${position}`}
                    </span>
                    <div className="w-10 h-10 rounded-full bg-card-elevated flex items-center justify-center text-lg border border-border/50">
                      {entry.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{entry.username}</p>
                      <p className="text-xs text-muted-foreground">{entry.games_played} games</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary text-sm">{formatMoney(entry.total_earnings)}</p>
                    </div>
                    <div className="w-12 text-right">
                      <p className="font-bold text-foreground text-sm">{entry.total_wins}</p>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
