import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useSounds } from '@/hooks/useSounds';
import { useHaptics } from '@/hooks/useHaptics';
import { BottomNav } from '@/components/BottomNav';
import { Crown, Trophy, ArrowLeft, Share2, Home, Sparkles } from 'lucide-react';
import { Confetti } from '@/components/Confetti';
import { useAuth } from '@/contexts/AuthContext';

interface Winner {
  id: string;
  user_id: string;
  position: number;
  prize_amount: number;
  username?: string;
  avatar?: string;
}

interface CycleResult {
  id: string;
  template_name: string;
  pool_value: number;
  sponsored_prize_amount: number;
  participant_count: number;
  winner_count: number;
  prize_distribution: number[];
  status: string;
  actual_end_at: string;
}

export const CycleResults = () => {
  const { cycleId } = useParams<{ cycleId: string }>();
  const navigate = useNavigate();
  const { play } = useSounds();
  const { buttonClick } = useHaptics();
  const { user } = useAuth();
  
  const [cycle, setCycle] = useState<CycleResult | null>(null);
  const [winners, setWinners] = useState<Winner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);
  const [userWin, setUserWin] = useState<Winner | null>(null);

  useEffect(() => {
    const fetchResults = async () => {
      if (!cycleId) return;

      // Fetch cycle data
      const { data: cycleData } = await supabase
        .from('game_cycles')
        .select('*')
        .eq('id', cycleId)
        .single();

      if (!cycleData) {
        navigate('/arena');
        return;
      }

      // Get template name
      const { data: template } = await supabase
        .from('game_templates')
        .select('name')
        .eq('id', cycleData.template_id)
        .single();

      setCycle({
        ...cycleData,
        template_name: template?.name || 'Royal Rumble',
      });

      // Fetch winners
      const { data: winnersData } = await supabase
        .from('cycle_winners')
        .select('*')
        .eq('cycle_id', cycleId)
        .order('position');

      if (winnersData) {
        // Get profiles for winners
        const userIds = winnersData.map(w => w.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, avatar')
          .in('id', userIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

        const enrichedWinners: Winner[] = winnersData.map(w => ({
          ...w,
          username: profileMap.get(w.user_id)?.username || 'Unknown',
          avatar: profileMap.get(w.user_id)?.avatar || '🎮',
        }));

        setWinners(enrichedWinners);

        // Check if current user won
        const userWinData = enrichedWinners.find(w => w.user_id === user?.id);
        if (userWinData) {
          setUserWin(userWinData);
          setShowConfetti(true);
          play('win');
        }
      }

      setLoading(false);
    };

    fetchResults();
  }, [cycleId, user?.id, navigate, play]);

  const formatMoney = (amount: number) => {
    return `₦${amount.toLocaleString()}`;
  };

  const getPositionEmoji = (position: number) => {
    switch (position) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return `#${position}`;
    }
  };

  const getPositionColor = (position: number) => {
    switch (position) {
      case 1: return 'bg-gradient-to-r from-gold/20 to-gold/5 border-gold/30';
      case 2: return 'bg-gradient-to-r from-gray-400/20 to-gray-400/5 border-gray-400/30';
      case 3: return 'bg-gradient-to-r from-amber-600/20 to-amber-600/5 border-amber-600/30';
      default: return 'bg-muted/50 border-border';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading results...</p>
        </div>
      </div>
    );
  }

  if (!cycle) {
    return null;
  }

  const effectivePrizePool = cycle.pool_value + (cycle.sponsored_prize_amount || 0);

  return (
    <div className="min-h-screen bg-background pb-24">
      {showConfetti && <Confetti />}
      
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="p-4 flex items-center gap-4">
          <button
            onClick={() => { play('click'); buttonClick(); navigate('/arena'); }}
            className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Trophy className="w-5 h-5 text-gold" />
              Game Results
            </h1>
            <p className="text-xs text-muted-foreground">{cycle.template_name}</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* User Win Banner */}
        {userWin && (
          <div className="rounded-2xl border border-gold/30 bg-gradient-to-r from-gold/20 via-gold/10 to-transparent p-6 text-center">
            <div className="text-4xl mb-2">{getPositionEmoji(userWin.position)}</div>
            <h2 className="text-2xl font-black text-gold mb-1">You Won!</h2>
            <p className="text-3xl font-black text-foreground">{formatMoney(userWin.prize_amount)}</p>
            <div className="flex items-center justify-center gap-2 mt-3 text-sm text-muted-foreground">
              <Sparkles className="w-4 h-4 text-gold" />
              Position {userWin.position} of {cycle.winner_count}
            </div>
          </div>
        )}

        {/* Game Stats */}
        <div className="rounded-2xl border border-border bg-card p-4">
          <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
            <Crown className="w-4 h-4 text-primary" />
            Game Summary
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Total Prize Pool</p>
              <p className="text-xl font-bold text-gold">{formatMoney(effectivePrizePool)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Players</p>
              <p className="text-xl font-bold text-foreground">{cycle.participant_count}</p>
            </div>
          </div>
        </div>

        {/* Winners List */}
        <div className="space-y-3">
          <h3 className="font-bold text-foreground flex items-center gap-2">
            <Trophy className="w-4 h-4 text-gold" />
            Winners
          </h3>
          
          {winners.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No winners for this game</p>
            </div>
          ) : (
            winners.map((winner) => (
              <div 
                key={winner.id}
                className={`flex items-center gap-4 p-4 rounded-2xl border ${getPositionColor(winner.position)} ${
                  winner.user_id === user?.id ? 'ring-2 ring-primary' : ''
                }`}
              >
                <div className="text-3xl">{getPositionEmoji(winner.position)}</div>
                <div className="text-3xl">{winner.avatar}</div>
                <div className="flex-1">
                  <p className="font-bold text-foreground">{winner.username}</p>
                  <p className="text-xs text-muted-foreground">Position {winner.position}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-gold">{formatMoney(winner.prize_amount)}</p>
                  <p className="text-xs text-muted-foreground">
                    {cycle.prize_distribution[winner.position - 1]}%
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={() => { play('click'); buttonClick(); navigate('/home'); }}
            className="flex-1 py-4 rounded-xl bg-muted text-foreground font-medium flex items-center justify-center gap-2"
          >
            <Home className="w-5 h-5" />
            Home
          </button>
          <button
            onClick={() => { play('click'); buttonClick(); navigate('/arena'); }}
            className="flex-1 btn-primary flex items-center justify-center gap-2"
          >
            <Crown className="w-5 h-5" />
            Play Again
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};