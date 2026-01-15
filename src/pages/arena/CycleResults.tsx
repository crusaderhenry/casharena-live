import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useSounds } from '@/hooks/useSounds';
import { useHaptics } from '@/hooks/useHaptics';
import { BottomNav } from '@/components/BottomNav';
import { WinnerCelebrationModal } from '@/components/WinnerCelebrationModal';
import { ShareCard } from '@/components/ShareCard';
import { Crown, Trophy, ArrowLeft, Share2, Home, Sparkles, Users, Clock, Coins } from 'lucide-react';
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

interface SettlementData {
  noWinner?: boolean;
  reason?: string;
  refundedCount?: number;
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
  comment_timer: number;
  entry_fee: number;
  min_participants: number;
  settlement_data?: SettlementData | null;
}

export const CycleResults = () => {
  const { cycleId } = useParams<{ cycleId: string }>();
  const navigate = useNavigate();
  const { play } = useSounds();
  const { buttonClick } = useHaptics();
  const { user, profile } = useAuth();
  
  const [cycle, setCycle] = useState<CycleResult | null>(null);
  const [winners, setWinners] = useState<Winner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);
  const [userWin, setUserWin] = useState<Winner | null>(null);
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const [showShareSection, setShowShareSection] = useState(false);
  const [hasShownModal, setHasShownModal] = useState(false);
  const [didParticipate, setDidParticipate] = useState(false);

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
        // Parse settlement_data from JSON if present
        settlement_data: cycleData.settlement_data as SettlementData | null,
      });

      // Check if current user participated (for accurate refund messaging)
      if (user) {
        const { data: participationData } = await supabase
          .from('cycle_participants')
          .select('id, is_spectator')
          .eq('cycle_id', cycleId)
          .eq('user_id', user.id)
          .maybeSingle();
        
        // Only count as participant if they joined as non-spectator
        setDidParticipate(!!participationData && !participationData.is_spectator);
      }

      // Fetch winners
      const { data: winnersData } = await supabase
        .from('cycle_winners')
        .select('*')
        .eq('cycle_id', cycleId)
        .order('position');

      if (winnersData && winnersData.length > 0) {
        // Get profiles for winners using secure RPC function
        const userIds = winnersData.map(w => w.user_id);
        const { data: profiles } = await supabase
          .rpc('get_public_profiles', { user_ids: userIds });

        const profileMap = new Map(
          (profiles as { id: string; username: string; avatar: string }[] | null)?.map(p => [p.id, p]) || []
        );

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
          
          // Check if user has seen the celebration page (via sessionStorage)
          const celebrationKey = `celebration_seen_${cycleId}`;
          if (!sessionStorage.getItem(celebrationKey)) {
            sessionStorage.setItem(celebrationKey, 'true');
            // Redirect to celebration page first
            navigate(`/arena/${cycleId}/winner`, { replace: true });
            return;
          }
        }
      }

      setLoading(false);
    };

    fetchResults();
  }, [cycleId, user?.id, navigate, play]);

  // Show winner celebration modal after a delay (give user time to see results first)
  useEffect(() => {
    if (userWin && !loading && !hasShownModal) {
      const timer = setTimeout(() => {
        setShowWinnerModal(true);
        setHasShownModal(true);
      }, 2500); // Show modal after 2.5 seconds
      return () => clearTimeout(timer);
    }
  }, [userWin, loading, hasShownModal]);

  const formatMoney = (amount: number) => {
    return `₦${amount.toLocaleString()}`;
  };

  const formatMoneyShort = (amount: number) => {
    if (amount >= 1_000_000) return `₦${(amount / 1_000_000).toFixed(1)}M`;
    if (amount >= 1_000) return `₦${(amount / 1_000).toFixed(0)}K`;
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

  const isCancelled = cycle.status === 'cancelled';
  const isNoWinner = cycle.settlement_data?.noWinner || (cycle.status === 'ended' && winners.length === 0);
  const effectivePrizePool = cycle.pool_value + (cycle.sponsored_prize_amount || 0);

  return (
    <div className="min-h-screen bg-background pb-24">
      {showConfetti && <Confetti />}
      
      {/* Winner Celebration Modal */}
      {userWin && (
        <WinnerCelebrationModal
          isOpen={showWinnerModal}
          onClose={() => setShowWinnerModal(false)}
          username={profile?.username || 'Champion'}
          avatar={profile?.avatar || '🏆'}
          position={userWin.position}
          prizeAmount={userWin.prize_amount}
        />
      )}

      {/* Header */}
      <div className="sticky top-0 z-10 pt-safe bg-background/95 backdrop-blur-sm border-b border-border">
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
        {/* Cancelled Game Banner */}
        {isCancelled && (
          <div className="rounded-2xl border-2 border-orange-400/40 bg-gradient-to-r from-orange-500/20 via-orange-400/10 to-transparent p-6 text-center relative overflow-hidden">
            <div className="relative z-10">
              <div className="text-5xl mb-3">❌</div>
              <h2 className="text-2xl font-black text-orange-400 mb-2">Game Cancelled</h2>
              <p className="text-muted-foreground mb-3">
                {cycle.participant_count === 0 
                  ? 'No players joined before the game started'
                  : `Only ${cycle.participant_count} player${cycle.participant_count > 1 ? 's' : ''} joined — at least ${cycle.min_participants} were needed`
                }
              </p>
              {/* Only show personal refund message if user actually participated */}
              {didParticipate && cycle.entry_fee > 0 ? (
                <div className="flex items-center justify-center gap-2 text-sm text-foreground bg-green-500/20 rounded-full px-4 py-2 w-fit mx-auto">
                  <Coins className="w-4 h-4 text-green-400" />
                  <span>Your entry fee of <strong className="text-green-400">{formatMoney(cycle.entry_fee)}</strong> has been refunded</span>
                </div>
              ) : cycle.participant_count > 0 && cycle.entry_fee > 0 ? (
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-full px-4 py-2 w-fit mx-auto">
                  <Coins className="w-4 h-4" />
                  <span>Players who joined were refunded</span>
                </div>
              ) : null}
            </div>
          </div>
        )}

        {/* No Winner Banner (game ended with no comments) */}
        {isNoWinner && !isCancelled && (
          <div className="rounded-2xl border-2 border-muted-foreground/40 bg-gradient-to-r from-muted/40 via-muted/20 to-transparent p-6 text-center relative overflow-hidden">
            <div className="relative z-10">
              <div className="text-5xl mb-3">🤷</div>
              <h2 className="text-2xl font-black text-foreground mb-2">No Winner</h2>
              <p className="text-muted-foreground mb-3">
                {cycle.settlement_data?.reason || 'The game ended with no comments'}
              </p>
              {/* Only show personal refund message if user actually participated */}
              {didParticipate && cycle.entry_fee > 0 ? (
                <div className="flex items-center justify-center gap-2 text-sm text-foreground bg-green-500/20 rounded-full px-4 py-2 w-fit mx-auto">
                  <Coins className="w-4 h-4 text-green-400" />
                  <span>Your entry fee of <strong className="text-green-400">{formatMoney(cycle.entry_fee)}</strong> has been refunded</span>
                </div>
              ) : cycle.participant_count > 0 && cycle.entry_fee > 0 ? (
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-full px-4 py-2 w-fit mx-auto">
                  <Coins className="w-4 h-4" />
                  <span>Players who joined were refunded</span>
                </div>
              ) : null}
            </div>
          </div>
        )}

        {/* User Win Banner (if won) */}
        {userWin && (
          <div className="rounded-2xl border-2 border-gold/40 bg-gradient-to-r from-gold/20 via-gold/10 to-transparent p-6 text-center relative overflow-hidden">
            {/* Background sparkles */}
            <div className="absolute inset-0 pointer-events-none">
              <Sparkles className="absolute top-2 left-4 w-5 h-5 text-gold/40 animate-pulse" />
              <Sparkles className="absolute top-4 right-6 w-4 h-4 text-gold/30 animate-pulse delay-100" />
              <Sparkles className="absolute bottom-4 left-1/4 w-3 h-3 text-gold/40 animate-pulse delay-200" />
            </div>
            
            <div className="relative z-10">
              <div className="text-5xl mb-3">{getPositionEmoji(userWin.position)}</div>
              <h2 className="text-3xl font-black text-gold mb-2">🎉 You Won! 🎉</h2>
              <p className="text-4xl font-black text-foreground mb-2">{formatMoney(userWin.prize_amount)}</p>
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Crown className="w-4 h-4 text-gold" />
                Position {userWin.position} of {cycle.winner_count}
              </div>
              
              {/* Share button */}
              <button
                onClick={() => setShowShareSection(!showShareSection)}
                className="mt-4 btn-primary px-6 py-2 flex items-center justify-center gap-2 mx-auto"
              >
                <Share2 className="w-4 h-4" />
                Share Your Victory
              </button>
            </div>
          </div>
        )}

        {/* Share Section (expanded) */}
        {showShareSection && userWin && (
          <div className="rounded-2xl border border-border bg-card p-4">
            <ShareCard
              username={profile?.username || 'Champion'}
              avatar={profile?.avatar || '🏆'}
              position={userWin.position}
              amount={userWin.prize_amount}
              gameType="finger"
            />
          </div>
        )}

        {/* Game Stats */}
        <div className="rounded-2xl border border-border bg-card p-4">
          <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
            <Crown className="w-4 h-4 text-primary" />
            Game Summary
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-xl bg-muted/50">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <Coins className="w-3 h-3" /> Total Prize Pool
              </div>
              <p className="text-xl font-bold text-gold">{formatMoney(effectivePrizePool)}</p>
            </div>
            <div className="p-3 rounded-xl bg-muted/50">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <Users className="w-3 h-3" /> Total Players
              </div>
              <p className="text-xl font-bold text-foreground">{cycle.participant_count}</p>
            </div>
            <div className="p-3 rounded-xl bg-muted/50">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <Trophy className="w-3 h-3" /> Winners
              </div>
              <p className="text-xl font-bold text-foreground">{winners.length}</p>
            </div>
            <div className="p-3 rounded-xl bg-muted/50">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <Clock className="w-3 h-3" /> Comment Timer
              </div>
              <p className="text-xl font-bold text-foreground">{cycle.comment_timer}s</p>
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
            <div className="text-center py-8 text-muted-foreground rounded-2xl border border-border bg-card">
              <Trophy className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>No winners for this game</p>
            </div>
          ) : (
            winners.map((winner) => (
              <div 
                key={winner.id}
                className={`flex items-center gap-4 p-4 rounded-2xl border ${getPositionColor(winner.position)} ${
                  winner.user_id === user?.id ? 'ring-2 ring-primary shadow-lg' : ''
                }`}
              >
                <div className="text-4xl">{getPositionEmoji(winner.position)}</div>
                <div className="text-3xl">{winner.avatar}</div>
                <div className="flex-1">
                  <p className="font-bold text-foreground flex items-center gap-2">
                    {winner.username}
                    {winner.user_id === user?.id && (
                      <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full font-bold uppercase">
                        You
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {winner.position === 1 ? '1st Place' : 
                     winner.position === 2 ? '2nd Place' : 
                     winner.position === 3 ? '3rd Place' : 
                     `Position #${winner.position}`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-gold">{formatMoneyShort(winner.prize_amount)}</p>
                  <p className="text-xs text-muted-foreground">
                    {cycle.prize_distribution[winner.position - 1]}%
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
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
