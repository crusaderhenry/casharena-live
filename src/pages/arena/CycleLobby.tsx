import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCycleJoin } from '@/hooks/useCycleJoin';
import { useAuth } from '@/contexts/AuthContext';
import { useSounds } from '@/hooks/useSounds';
import { useHaptics } from '@/hooks/useHaptics';
import { supabase } from '@/integrations/supabase/client';
import { PoolParticipantsSheet } from '@/components/PoolParticipantsSheet';
import { 
  ArrowLeft, Users, Timer, Crown, Eye, Trophy, 
  Clock, Play, Radio, Sparkles, Ticket, Wallet,
  ChevronRight, Star, Shield, Zap
} from 'lucide-react';
import { toast } from 'sonner';

interface CycleData {
  id: string;
  template_id: string;
  status: string;
  entry_fee: number;
  sponsored_prize_amount: number;
  winner_count: number;
  prize_distribution: number[];
  pool_value: number;
  participant_count: number;
  countdown: number;
  allow_spectators: boolean;
  comment_timer: number;
  entry_open_at: string;
  entry_close_at: string;
  live_start_at: string;
  live_end_at: string;
  template_name?: string;
}

export const CycleLobby = () => {
  const { cycleId } = useParams<{ cycleId: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { play } = useSounds();
  const { buttonClick, success: hapticSuccess } = useHaptics();
  const { joinCycle, joining, checkParticipation } = useCycleJoin();
  
  const [cycle, setCycle] = useState<CycleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [participation, setParticipation] = useState<{ isParticipant: boolean; isSpectator: boolean }>({ isParticipant: false, isSpectator: false });
  const [timeUntilOpening, setTimeUntilOpening] = useState(0);
  const [timeUntilLive, setTimeUntilLive] = useState(0);

  // Fetch cycle data
  const fetchCycle = useCallback(async () => {
    if (!cycleId) return;
    
    const { data, error } = await supabase
      .from('game_cycles')
      .select('*')
      .eq('id', cycleId)
      .single();

    if (error) {
      console.error('[CycleLobby] Error:', error);
      toast.error('Game not found');
      navigate('/arena');
      return;
    }

    // Get template name
    const { data: template } = await supabase
      .from('game_templates')
      .select('name')
      .eq('id', data.template_id)
      .single();

    setCycle({ ...data, template_name: template?.name || 'Royal Rumble' });
    
    const now = Date.now();
    const entryOpenAt = new Date(data.entry_open_at).getTime();
    const liveStartAt = new Date(data.live_start_at).getTime();
    
    setTimeUntilOpening(Math.max(0, Math.floor((entryOpenAt - now) / 1000)));
    setTimeUntilLive(Math.max(0, Math.floor((liveStartAt - now) / 1000)));
    
    setLoading(false);
  }, [cycleId, navigate]);

  // Initial fetch
  useEffect(() => {
    fetchCycle();
  }, [fetchCycle]);

  // Check user participation
  useEffect(() => {
    const check = async () => {
      if (!cycleId) return;
      const result = await checkParticipation(cycleId);
      setParticipation(result);
    };
    check();
  }, [cycleId, checkParticipation]);

  // Real-time subscription
  useEffect(() => {
    if (!cycleId) return;

    const channel = supabase
      .channel(`lobby-cycle-${cycleId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'game_cycles', filter: `id=eq.${cycleId}` },
        (payload) => {
          const updated = payload.new as CycleData;
          setCycle(prev => prev ? { ...prev, ...updated } : null);

          // Redirect to arena when game goes live
          if (updated.status === 'live') {
            play('gameStart');
            hapticSuccess();
            toast.success('Game is now LIVE!');
            navigate(`/arena/${cycleId}/live`);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [cycleId, navigate, play, hapticSuccess]);

  // Local timer ticker
  useEffect(() => {
    if (!cycle) return;

    const interval = setInterval(() => {
      if (cycle.status === 'waiting') {
        setTimeUntilOpening(prev => Math.max(0, prev - 1));
        setTimeUntilLive(prev => Math.max(0, prev - 1));
      } else if (cycle.status === 'opening') {
        setTimeUntilLive(prev => Math.max(0, prev - 1));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [cycle?.status]);

  const handleJoin = async (asSpectator: boolean = false) => {
    if (!cycleId) return;
    play('click');
    buttonClick();

    const result = await joinCycle(cycleId, asSpectator);
    if (result.success) {
      setParticipation({ isParticipant: true, isSpectator: asSpectator });
      hapticSuccess();
    }
  };

  const formatMoney = (amount: number) => {
    if (amount >= 1_000_000) return `₦${(amount / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
    if (amount >= 1_000) return `₦${(amount / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
    return `₦${amount.toLocaleString()}`;
  };

  const formatTime = (seconds: number) => {
    if (seconds <= 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTimeDetailed = (seconds: number) => {
    if (seconds <= 0) return 'Now';
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
    }
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  if (loading || !cycle) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading lobby...</p>
        </div>
      </div>
    );
  }

  // If game is live, redirect
  if (cycle.status === 'live' || cycle.status === 'ending') {
    navigate(`/arena/${cycleId}/live`);
    return null;
  }

  // If game has ended, redirect to results
  if (cycle.status === 'ended' || cycle.status === 'settled') {
    navigate(`/arena/${cycleId}/results`);
    return null;
  }

  const effectivePrizePool = cycle.pool_value + (cycle.sponsored_prize_amount || 0);
  const isWaiting = cycle.status === 'waiting';
  const isOpening = cycle.status === 'opening';
  const canJoin = isOpening && !participation.isParticipant;
  const hasBalance = (profile?.wallet_balance || 0) >= cycle.entry_fee;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="p-4 flex items-center gap-4">
        <button
          onClick={() => { play('click'); buttonClick(); navigate('/arena'); }}
          className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-foreground">Game Lobby</h1>
          <p className="text-xs text-muted-foreground">
            {isWaiting ? 'Entry opens soon' : 'Entry is open'}
          </p>
        </div>
        <span className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full ${
          isOpening ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'
        }`}>
          {isOpening ? <Play className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
          {isOpening ? 'OPEN' : 'WAITING'}
        </span>
      </div>

      {/* Hero Card */}
      <div className="mx-4 rounded-3xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border border-primary/30 overflow-hidden">
        <div className="p-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Crown className="w-8 h-8 text-gold" />
            <h2 className="text-2xl font-black text-foreground">{cycle.template_name}</h2>
          </div>
          
          <div className="mb-4">
            <p className="text-4xl font-black text-gold">{formatMoney(effectivePrizePool)}</p>
            <p className="text-sm text-muted-foreground">Prize Pool</p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-background/50 rounded-xl p-3">
              <Users className="w-5 h-5 text-primary mx-auto mb-1" />
              <p className="text-lg font-bold text-foreground">{cycle.participant_count}</p>
              <p className="text-[10px] text-muted-foreground">Players</p>
            </div>
            <div className="bg-background/50 rounded-xl p-3">
              <Trophy className="w-5 h-5 text-gold mx-auto mb-1" />
              <p className="text-lg font-bold text-foreground">Top {cycle.winner_count}</p>
              <p className="text-[10px] text-muted-foreground">Winners</p>
            </div>
            <div className="bg-background/50 rounded-xl p-3">
              <Ticket className="w-5 h-5 text-green-400 mx-auto mb-1" />
              <p className="text-lg font-bold text-foreground">{formatMoney(cycle.entry_fee)}</p>
              <p className="text-[10px] text-muted-foreground">Entry</p>
            </div>
          </div>

          {/* Timer Section */}
          <div className={`rounded-2xl p-4 ${
            isOpening 
              ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30' 
              : 'bg-gradient-to-r from-blue-500/20 to-indigo-500/20 border border-blue-500/30'
          }`}>
            {isWaiting ? (
              <>
                <p className="text-xs text-blue-400 font-medium mb-2">Entry Opens In</p>
                <p className="text-3xl font-black text-blue-400">{formatTimeDetailed(timeUntilOpening)}</p>
                <p className="text-xs text-muted-foreground mt-2">Goes live in {formatTimeDetailed(timeUntilLive)}</p>
              </>
            ) : (
              <>
                <p className="text-xs text-green-400 font-medium mb-2 flex items-center justify-center gap-1">
                  <Radio className="w-3 h-3 animate-pulse" /> Game Goes Live In
                </p>
                <p className="text-3xl font-black text-green-400">{formatTimeDetailed(timeUntilLive)}</p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Prize Distribution */}
      <div className="mx-4 mt-4 p-4 rounded-2xl bg-card border border-border">
        <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
          <Trophy className="w-4 h-4 text-gold" />
          Prize Distribution
        </h3>
        <div className="space-y-2">
          {cycle.prize_distribution.slice(0, cycle.winner_count).map((percent, i) => {
            const prizeAmount = (effectivePrizePool * percent) / 100;
            const medals = ['🥇', '🥈', '🥉'];
            return (
              <div key={i} className="flex items-center justify-between py-2 px-3 rounded-xl bg-muted/50">
                <span className="text-lg">{medals[i] || `#${i + 1}`}</span>
                <span className="text-sm font-bold text-foreground">{formatMoney(prizeAmount)}</span>
                <span className="text-xs text-muted-foreground">{percent}%</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Participants Sheet */}
      <div className="mx-4 mt-4">
        <PoolParticipantsSheet
          gameId={cycle.id}
          gameName={cycle.template_name || 'Royal Rumble'}
          participantCount={cycle.participant_count}
          poolValue={effectivePrizePool}
          entryFee={cycle.entry_fee}
        />
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Bottom Actions */}
      <div className="sticky bottom-0 p-4 bg-gradient-to-t from-background via-background to-transparent">
        {participation.isParticipant ? (
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-green-500/20 border border-green-500/30">
              <Shield className="w-5 h-5 text-green-400" />
              <span className="font-bold text-green-400">
                {participation.isSpectator ? 'Watching as Spectator' : 'You\'re In!'}
              </span>
            </div>
            <p className="text-center text-sm text-muted-foreground">
              {isOpening 
                ? 'Game starts soon. Stay on this page!' 
                : 'Waiting for entry to open...'}
            </p>
          </div>
        ) : isOpening ? (
          <div className="space-y-3">
            <button
              onClick={() => handleJoin(false)}
              disabled={joining || !hasBalance}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-bold text-lg flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {joining ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Zap className="w-5 h-5" />
                  Join Game • {formatMoney(cycle.entry_fee)}
                </>
              )}
            </button>
            
            {!hasBalance && (
              <p className="text-center text-sm text-red-400">
                Insufficient balance. Top up your wallet.
              </p>
            )}

            {cycle.allow_spectators && (
              <button
                onClick={() => handleJoin(true)}
                disabled={joining}
                className="w-full py-3 rounded-xl bg-muted text-muted-foreground font-medium flex items-center justify-center gap-2"
              >
                <Eye className="w-4 h-4" />
                Watch as Spectator (Free)
              </button>
            )}
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-muted-foreground">Entry opens in {formatTimeDetailed(timeUntilOpening)}</p>
          </div>
        )}
      </div>
    </div>
  );
};
