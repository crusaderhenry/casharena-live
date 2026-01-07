import { useState, useEffect } from 'react';
import { Trophy, Clock, Users, ChevronRight, History, Medal, Filter, Share2, X } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { supabase } from '@/integrations/supabase/client';

interface GameResult {
  id: string;
  pool_value: number;
  participant_count: number;
  status: string;
  end_time: string;
  entry_fee: number;
  winners: {
    id: string;
    position: number;
    amount_won: number;
    user_id?: string;
    profile?: {
      username: string;
      avatar: string;
    };
  }[];
}

interface GameHistoryProps {
  isTestMode?: boolean;
}

type FilterType = 'all' | 'today' | 'week' | 'high_prize' | 'single_winner' | 'multi_winner';

// Mock history for test mode
const mockHistory: GameResult[] = [
  {
    id: 'h1',
    pool_value: 42000,
    participant_count: 60,
    status: 'ended',
    end_time: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    entry_fee: 700,
    winners: [
      { id: 'w1', position: 1, amount_won: 21000, user_id: 'u1', profile: { username: 'CryptoKing', avatar: '👑' } },
      { id: 'w2', position: 2, amount_won: 12600, user_id: 'u2', profile: { username: 'LuckyAce', avatar: '🎰' } },
      { id: 'w3', position: 3, amount_won: 8400, user_id: 'u3', profile: { username: 'FastHands', avatar: '⚡' } },
    ]
  },
  {
    id: 'h2',
    pool_value: 28000,
    participant_count: 40,
    status: 'ended',
    end_time: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    entry_fee: 700,
    winners: [
      { id: 'w4', position: 1, amount_won: 25200, user_id: 'u4', profile: { username: 'SpeedDemon', avatar: '💨' } },
    ]
  },
  {
    id: 'h3',
    pool_value: 55000,
    participant_count: 110,
    status: 'ended',
    end_time: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    entry_fee: 500,
    winners: [
      { id: 'w5', position: 1, amount_won: 22000, user_id: 'u5', profile: { username: 'NightOwl', avatar: '🦉' } },
      { id: 'w6', position: 2, amount_won: 13750, user_id: 'u6', profile: { username: 'QuickDraw', avatar: '🎯' } },
      { id: 'w7', position: 3, amount_won: 8250, user_id: 'u7', profile: { username: 'GamerPro', avatar: '🎮' } },
      { id: 'w8', position: 4, amount_won: 5500, user_id: 'u8', profile: { username: 'WinStreak', avatar: '🔥' } },
    ]
  },
  {
    id: 'h4',
    pool_value: 75000,
    participant_count: 150,
    status: 'ended',
    end_time: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    entry_fee: 500,
    winners: [
      { id: 'w9', position: 1, amount_won: 67500, user_id: 'u9', profile: { username: 'ChampionX', avatar: '🏆' } },
    ]
  },
];

const filterOptions: { value: FilterType; label: string }[] = [
  { value: 'all', label: 'All Games' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'high_prize', label: '₦50k+ Pools' },
  { value: 'single_winner', label: 'Winner Takes All' },
  { value: 'multi_winner', label: 'Multiple Winners' },
];

export const GameHistory = ({ isTestMode = false }: GameHistoryProps) => {
  const [history, setHistory] = useState<GameResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  useEffect(() => {
    if (!open) return;

    if (isTestMode) {
      setHistory(mockHistory);
      return;
    }

    const fetchHistory = async () => {
      setLoading(true);
      
      const { data: games } = await supabase
        .from('fastest_finger_games')
        .select('*')
        .eq('status', 'ended')
        .order('end_time', { ascending: false })
        .limit(20);

      if (games) {
        const gamesWithWinners = await Promise.all(
          games.map(async (game) => {
            const { data: winners } = await supabase
              .from('winners')
              .select('*')
              .eq('game_id', game.id)
              .order('position', { ascending: true });

            const winnersWithProfiles = await Promise.all(
              (winners || []).map(async (w) => {
                const { data: profileData } = await supabase.rpc('get_public_profile', { profile_id: w.user_id });
                return { ...w, profile: profileData?.[0] };
              })
            );

            return { ...game, winners: winnersWithProfiles };
          })
        );
        setHistory(gamesWithWinners);
      }
      setLoading(false);
    };

    fetchHistory();
  }, [open, isTestMode]);

  const formatMoney = (amount: number) => `₦${amount.toLocaleString()}`;
  
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffHours < 48) return 'Yesterday';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getPositionIcon = (position: number) => {
    switch (position) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return `#${position}`;
    }
  };

  // Filter logic
  const filteredHistory = history.filter(game => {
    const gameDate = new Date(game.end_time);
    const now = new Date();
    const diffHours = (now.getTime() - gameDate.getTime()) / (1000 * 60 * 60);

    switch (activeFilter) {
      case 'today':
        return diffHours < 24;
      case 'week':
        return diffHours < 168; // 7 days
      case 'high_prize':
        return game.pool_value >= 50000;
      case 'single_winner':
        return game.winners.length === 1;
      case 'multi_winner':
        return game.winners.length > 1;
      default:
        return true;
    }
  });

  // Share functionality
  const handleShare = async (game: GameResult, winner: GameResult['winners'][0]) => {
    const shareText = `🏆 ${winner.profile?.username || 'Player'} won ${formatMoney(winner.amount_won)} on FortunesHQ! 🎮\n\nPool: ${formatMoney(game.pool_value)} • ${game.participant_count} players\n\nJoin the next game and win big! 💰`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'FortunesHQ Winner!',
          text: shareText,
        });
      } catch (err) {
        // User cancelled or error
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(shareText);
      // Could add toast notification here
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button className="w-full card-panel hover:border-primary/40 transition-all">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
              <History className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-bold text-foreground">Game History</p>
              <p className="text-xs text-muted-foreground">View past results & winners</p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </div>
        </button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
        <SheetHeader className="pb-4 border-b border-border">
          <SheetTitle className="flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            Game History
          </SheetTitle>
        </SheetHeader>

        <div className="py-4 space-y-4 overflow-y-auto max-h-[calc(85vh-100px)]">
          {/* Filters */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Filter className="w-3.5 h-3.5" />
              <span>Filter by</span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
              {filterOptions.map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setActiveFilter(filter.value)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    activeFilter === filter.value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="text-center py-12">
              <Trophy className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground font-medium">
                {activeFilter === 'all' ? 'No completed games yet' : 'No games match this filter'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {activeFilter === 'all' ? 'Game results will appear here' : 'Try a different filter'}
              </p>
              {activeFilter !== 'all' && (
                <button
                  onClick={() => setActiveFilter('all')}
                  className="mt-4 text-xs text-primary font-medium"
                >
                  Clear filter
                </button>
              )}
            </div>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">
                {filteredHistory.length} game{filteredHistory.length !== 1 ? 's' : ''} found
              </p>
              
              {filteredHistory.map((game) => (
                <div key={game.id} className="card-panel">
                  {/* Game header */}
                  <div className="flex items-center justify-between mb-3 pb-3 border-b border-border/50">
                    <div>
                      <p className="font-bold text-foreground">Royal Rumble</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(game.end_time)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black text-primary">{formatMoney(game.pool_value)}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                        <Users className="w-3 h-3" />
                        {game.participant_count} players
                      </p>
                    </div>
                  </div>

                  {/* Winners */}
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                      <Medal className="w-3.5 h-3.5 text-gold" />
                      Winners
                    </p>
                    {game.winners.map((winner) => (
                      <div 
                        key={winner.id}
                        className="flex items-center gap-3 p-2 rounded-lg bg-background/50"
                      >
                        <span className="text-lg">{getPositionIcon(winner.position)}</span>
                        <div className="w-8 h-8 rounded-full bg-card-elevated flex items-center justify-center text-sm border border-border/50">
                          {winner.profile?.avatar || '🎮'}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-foreground text-sm">
                            {winner.profile?.username || 'Player'}
                          </p>
                        </div>
                        <p className="font-bold text-primary text-sm">{formatMoney(winner.amount_won)}</p>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleShare(game, winner);
                          }}
                          className="p-1.5 rounded-lg hover:bg-primary/10 transition-colors"
                          title="Share this win"
                        >
                          <Share2 className="w-4 h-4 text-primary" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
