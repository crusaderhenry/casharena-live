import { useState, useEffect } from 'react';
import { Trophy, Clock, Users, ChevronRight, History, Medal } from 'lucide-react';
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
    profile?: {
      username: string;
      avatar: string;
    };
  }[];
}

interface GameHistoryProps {
  isTestMode?: boolean;
}

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
      { id: 'w1', position: 1, amount_won: 21000, profile: { username: 'CryptoKing', avatar: '👑' } },
      { id: 'w2', position: 2, amount_won: 12600, profile: { username: 'LuckyAce', avatar: '🎰' } },
      { id: 'w3', position: 3, amount_won: 8400, profile: { username: 'FastHands', avatar: '⚡' } },
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
      { id: 'w4', position: 1, amount_won: 25200, profile: { username: 'SpeedDemon', avatar: '💨' } },
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
      { id: 'w5', position: 1, amount_won: 22000, profile: { username: 'NightOwl', avatar: '🦉' } },
      { id: 'w6', position: 2, amount_won: 13750, profile: { username: 'QuickDraw', avatar: '🎯' } },
      { id: 'w7', position: 3, amount_won: 8250, profile: { username: 'GamerPro', avatar: '🎮' } },
      { id: 'w8', position: 4, amount_won: 5500, profile: { username: 'WinStreak', avatar: '🔥' } },
    ]
  },
];

export const GameHistory = ({ isTestMode = false }: GameHistoryProps) => {
  const [history, setHistory] = useState<GameResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    if (isTestMode) {
      setHistory(mockHistory);
      return;
    }

    const fetchHistory = async () => {
      setLoading(true);
      
      // Fetch ended games
      const { data: games } = await supabase
        .from('fastest_finger_games')
        .select('*')
        .eq('status', 'ended')
        .order('end_time', { ascending: false })
        .limit(10);

      if (games) {
        // Fetch winners for each game
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
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-12">
              <Trophy className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground font-medium">No completed games yet</p>
              <p className="text-xs text-muted-foreground mt-1">Game results will appear here</p>
            </div>
          ) : (
            history.map((game) => (
              <div key={game.id} className="card-panel">
                {/* Game header */}
                <div className="flex items-center justify-between mb-3 pb-3 border-b border-border/50">
                  <div>
                    <p className="font-bold text-foreground">Fastest Finger</p>
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
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
