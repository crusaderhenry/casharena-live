import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCycleJoin } from '@/hooks/useCycleJoin';
import { useAuth } from '@/contexts/AuthContext';
import { useSounds } from '@/hooks/useSounds';
import { useHaptics } from '@/hooks/useHaptics';
import { useLobbyAudio } from '@/hooks/useLobbyAudio';
import { supabase } from '@/integrations/supabase/client';
import { PoolParticipantsSheet } from '@/components/PoolParticipantsSheet';
import { GameRulesSection } from '@/components/GameRulesSection';
import { MusicToggle } from '@/components/MusicToggle';
import { MicCheckModal } from '@/components/MicCheckModal';
import { AuthPromptModal } from '@/components/AuthPromptModal';
import { GameShareModal } from '@/components/GameShareModal';
import { 
  ArrowLeft, Users, Crown, Eye, Trophy, 
  Radio, Sparkles, Ticket, Mic,
  Shield, Zap, AlertTriangle, LogOut, Share2
} from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

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
  min_participants: number;
  template_name?: string;
  ambient_music_style?: 'chill' | 'intense' | 'retro' | 'none';
  lobby_music_url?: string | null;
  sponsor_name?: string | null;
}

const MIC_CHECK_KEY = 'royal_rumble_mic_checked';

export const CycleLobby = () => {
  const { cycleId } = useParams<{ cycleId: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { play } = useSounds();
  const { buttonClick, success: hapticSuccess } = useHaptics();
  const { joinCycle, leaveCycle, upgradeToParticipant, joining, leaving, upgrading, checkParticipation } = useCycleJoin();
  
  const [cycle, setCycle] = useState<CycleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [participation, setParticipation] = useState<{ isParticipant: boolean; isSpectator: boolean }>({ isParticipant: false, isSpectator: false });
  const [timeUntilOpening, setTimeUntilOpening] = useState(0);
  const [timeUntilLive, setTimeUntilLive] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const [flashActive, setFlashActive] = useState(false);
  const [showMicCheck, setShowMicCheck] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  // Lobby audio hook with ambient style from cycle
  useLobbyAudio({
    timeUntilLive,
    isInLobby: !!cycle && (cycle.status === 'waiting' || cycle.status === 'opening'),
    ambientMusicStyle: cycle?.ambient_music_style || 'chill',
    customMusicUrl: cycle?.lobby_music_url,
  });

  // Check if mic check should show on first visit
  useEffect(() => {
    const hasCheckedMic = localStorage.getItem(MIC_CHECK_KEY);
    if (!hasCheckedMic && cycle) {
      setShowMicCheck(true);
    }
  }, [cycle]);

  const handleMicCheckComplete = () => {
    localStorage.setItem(MIC_CHECK_KEY, 'true');
    setShowMicCheck(false);
  };

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

    // CRITICAL: Handle cancelled/ended games immediately before showing lobby
    if (data.status === 'cancelled') {
      if (data.participant_count === 0) {
        toast.info('Game cancelled — no players joined');
        navigate('/arena', { replace: true });
      } else {
        navigate(`/arena/${cycleId}/results`, { replace: true });
      }
      return;
    }

    if (data.status === 'ended' || data.status === 'settled') {
      navigate(`/arena/${cycleId}/results`, { replace: true });
      return;
    }

    if (data.status === 'live' || data.status === 'ending') {
      navigate(`/arena/${cycleId}/live`, { replace: true });
      return;
    }

    // Get template name
    const { data: template } = await supabase
      .from('game_templates')
      .select('name')
      .eq('id', data.template_id)
      .single();

    setCycle({ 
      ...data, 
      template_name: template?.name || 'Royal Rumble',
      ambient_music_style: data.ambient_music_style as CycleData['ambient_music_style'],
    });
    
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

  // Proactive status sync: when local timer says "opening" but DB is still "waiting"
  // Trigger cycle-manager tick to sync the status before user tries to join
  useEffect(() => {
    if (!cycle || !cycleId) return;
    
    // If local timer says entries should be open, but DB status is waiting, trigger tick
    if (cycle.status === 'waiting' && timeUntilOpening <= 0) {
      console.log('[CycleLobby] Status mismatch detected (waiting but should be opening) - triggering tick...');
      supabase.functions.invoke('cycle-manager', { body: { action: 'tick' } })
        .then(() => {
          // Refetch cycle data after tick
          setTimeout(fetchCycle, 500);
        })
        .catch(err => console.error('[CycleLobby] Proactive tick error:', err));
    }
  }, [cycle?.status, timeUntilOpening, cycleId, fetchCycle]);

  // Check user participation
  useEffect(() => {
    const check = async () => {
      if (!cycleId) return;
      const result = await checkParticipation(cycleId);
      setParticipation(result);
    };
    check();
  }, [cycleId, checkParticipation]);

  // Real-time subscription for cycle updates (including participant count)
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

          // Handle status transitions via realtime
          if (updated.status === 'live') {
            play('gameStart');
            hapticSuccess();
            setFlashActive(true);
            setTransitioning(true);
            // Navigate immediately - no delay needed
            navigate(`/arena/${cycleId}/live`, { replace: true });
          } else if (updated.status === 'cancelled') {
            // Handle cancelled games - route based on participant count
            if (updated.participant_count === 0) {
              toast.info('Game cancelled — no players joined');
              navigate('/arena', { replace: true });
            } else {
              navigate(`/arena/${cycleId}/results`, { replace: true });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [cycleId, navigate, play, hapticSuccess]);

  // Local timer ticker with instant transition at 0
  // Uses dedicated status-check endpoint for faster polling near transitions
  useEffect(() => {
    if (!cycle) return;

    // Force backend to process state transition immediately, then check and navigate
    const triggerTickAndNavigate = async () => {
      try {
        console.log('[CycleLobby] Triggering immediate cycle-manager tick...');
        
        // First, trigger cycle-manager tick to force immediate state transition
        await supabase.functions.invoke('cycle-manager', {
          body: { action: 'tick' }
        });
        
        // Brief pause to allow state update to propagate
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Now check the updated status
        const { data, error } = await supabase.functions.invoke('cycle-status-check', {
          body: { cycle_id: cycleId }
        });
        
        if (error) {
          console.log('[CycleLobby] Status check failed:', error);
          return;
        }
        
        const computedStatus = data?.computed_status;
        const participantCount = data?.participant_count ?? 0;
        
        console.log('[CycleLobby] Status after tick:', computedStatus);
        
        if (computedStatus === 'live') {
          // Backend confirmed live - trigger transition immediately
          play('gameStart');
          hapticSuccess();
          setFlashActive(true);
          setTransitioning(true);
          navigate(`/arena/${cycleId}/live`, { replace: true });
        } else if (computedStatus === 'cancelled') {
          // Game cancelled - route based on participant count
          if (participantCount === 0) {
            toast.info('Game cancelled — no players joined');
            navigate('/arena', { replace: true });
          } else {
            navigate(`/arena/${cycleId}/results`, { replace: true });
          }
        }
      } catch (e) {
        console.log('[CycleLobby] Tick/status check failed:', e);
      }
    };

    let fastPollInterval: NodeJS.Timeout | null = null;

    const interval = setInterval(() => {
      // Always tick both timers regardless of backend status
      // This ensures instant UI transitions when timers hit 0
      if (cycle.status === 'waiting' || cycle.status === 'opening') {
        setTimeUntilOpening(prev => {
          const newVal = Math.max(0, prev - 1);
          // Trigger backend sync when entry opens
          if (newVal === 0 && prev > 0) {
            triggerTickAndNavigate();
          }
          return newVal;
        });
        
        setTimeUntilLive(prev => {
          const newVal = Math.max(0, prev - 1);
          
          // Start fast polling when < 10 seconds (every 2 seconds)
          if (newVal <= 10 && newVal > 0 && !fastPollInterval) {
            fastPollInterval = setInterval(triggerTickAndNavigate, 2000);
            triggerTickAndNavigate();
          }
          
          // At T=0, navigate immediately without waiting for backend
          if (newVal === 0 && prev > 0) {
            play('gameStart');
            hapticSuccess();
            setFlashActive(true);
            setTransitioning(true);
            // Navigate immediately - don't wait for backend confirmation
            navigate(`/arena/${cycleId}/live`, { replace: true });
            // Trigger backend tick in background
            supabase.functions.invoke('cycle-manager', { body: { action: 'tick' } })
              .catch(err => console.error('[CycleLobby] Background tick error:', err));
          }
          return newVal;
        });
      }
    }, 1000);

    return () => {
      clearInterval(interval);
      if (fastPollInterval) clearInterval(fastPollInterval);
    };
  }, [cycle?.status, cycleId, navigate, play, hapticSuccess]);

  const handleJoin = async (asSpectator: boolean = false) => {
    if (!cycleId) return;
    play('click');
    buttonClick();

    // Check if user is authenticated
    if (!user) {
      setShowAuthPrompt(true);
      return;
    }

    const result = await joinCycle(cycleId, asSpectator);
    if (result.success) {
      setParticipation({ isParticipant: true, isSpectator: asSpectator });
      hapticSuccess();
    }
  };

  const handleLeave = async () => {
    if (!cycleId) return;
    play('click');
    buttonClick();

    const result = await leaveCycle(cycleId);
    if (result.success) {
      setParticipation({ isParticipant: false, isSpectator: false });
      setShowLeaveConfirm(false);
    }
  };

  const formatMoney = (amount: number) => {
    if (amount >= 1_000_000) return `₦${(amount / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
    if (amount >= 1_000) return `₦${(amount / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
    return `₦${amount.toLocaleString()}`;
  };

  const formatTimeDetailed = (seconds: number) => {
    if (seconds <= 0) return '🚀 GOING LIVE!';
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

  // FIXED: Redirect cancelled games to results page (shows cancellation + refund info)
  if (cycle.status === 'cancelled') {
    navigate(`/arena/${cycleId}/results`, { replace: true });
    return null;
  }

  // If game is live, redirect
  if (cycle.status === 'live' || cycle.status === 'ending') {
    navigate(`/arena/${cycleId}/live`, { replace: true });
    return null;
  }

  // If game has ended, redirect to results
  if (cycle.status === 'ended' || cycle.status === 'settled') {
    navigate(`/arena/${cycleId}/results`, { replace: true });
    return null;
  }

  const effectivePrizePool = cycle.pool_value + (cycle.sponsored_prize_amount || 0);
  
  // Compute display status based on local timers for instant UI transitions
  // When entry_open_at countdown reaches 0, show "opening" UI immediately
  const displayStatus = (() => {
    if (cycle.status === 'waiting' && timeUntilOpening <= 0) {
      return 'opening'; // Show "Game Goes Live In" before backend confirms
    }
    return cycle.status;
  })();
  
  const isWaiting = displayStatus === 'waiting';
  const isOpening = displayStatus === 'opening';
  const canJoin = isOpening && !participation.isParticipant;
  const hasBalance = (profile?.wallet_balance || 0) >= cycle.entry_fee;
  const isLastMinute = timeUntilLive <= 30;
  const canLeave = timeUntilLive > 10; // 10 seconds before live

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Screen Flash Effect */}
      {flashActive && (
        <div 
          className="fixed inset-0 z-[100] bg-white pointer-events-none animate-[flash_0.4s_ease-out_forwards]"
          style={{
            animation: 'flash 0.4s ease-out forwards'
          }}
        />
      )}

      {/* Mic Check Modal */}
      <MicCheckModal 
        open={showMicCheck} 
        onOpenChange={setShowMicCheck}
        onComplete={handleMicCheckComplete}
      />

      {/* Leave Confirmation Dialog */}
      <AlertDialog open={showLeaveConfirm} onOpenChange={setShowLeaveConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave Game?</AlertDialogTitle>
            <AlertDialogDescription>
              {cycle.entry_fee > 0 
                ? `Your entry fee of ${formatMoney(cycle.entry_fee)} will be refunded to your wallet.`
                : 'Are you sure you want to leave this game?'
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleLeave} disabled={leaving}>
              {leaving ? 'Leaving...' : 'Leave Game'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Auth Prompt for Guests */}
      <AuthPromptModal 
        open={showAuthPrompt} 
        onOpenChange={setShowAuthPrompt}
        action="game"
      />

      <div className={`flex flex-col flex-1 transition-all duration-300 ${
        transitioning ? 'opacity-0 scale-110 blur-sm' : 'opacity-100 animate-fade-in'
      }`}>
        {/* Header */}
        <div className="sticky top-0 z-20 pt-safe bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => { play('click'); buttonClick(); navigate('/arena'); }}
                className="w-9 h-9 rounded-xl bg-muted/80 flex items-center justify-center"
              >
                <ArrowLeft className="w-4 h-4 text-foreground" />
              </button>
              <h1 className="text-base font-bold text-foreground">Lobby</h1>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Wallet Balance Display */}
              {user && (
                <button
                  onClick={() => { play('click'); buttonClick(); navigate('/wallet'); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-colors"
                  title="View Wallet"
                >
                  <span className="text-xs font-bold text-primary">
                    {formatMoney(profile?.wallet_balance || 0)}
                  </span>
                </button>
              )}
              
              <MusicToggle />
              
              <button
                onClick={() => { play('click'); buttonClick(); setShowMicCheck(true); }}
                className="p-2 rounded-xl bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
                title="Audio Settings"
              >
                <Mic className="w-4 h-4" />
              </button>
              
              <button
                onClick={() => { play('click'); buttonClick(); setShowShareModal(true); }}
                className="p-2 rounded-xl bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
                title="Share"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Hero Card */}
          <div className="mx-4 mt-4 rounded-3xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border border-primary/30 overflow-hidden">
          <div className="p-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Crown className="w-8 h-8 text-gold" />
              <h2 className="text-2xl font-black text-foreground">{cycle.template_name}</h2>
            </div>
            
            <div className="mb-4">
              <p className="text-4xl font-black text-gold">{formatMoney(effectivePrizePool)}</p>
              <p className="text-sm text-muted-foreground">Prize Pool</p>
              {cycle.sponsored_prize_amount > 0 && (
                <span className="inline-flex items-center gap-1 mt-2 px-3 py-1 bg-primary/20 text-primary text-xs font-medium rounded-full">
                  <Sparkles className="w-3 h-3" />
                  {cycle.sponsor_name ? `Sponsored by ${cycle.sponsor_name}` : 'Sponsored'}
                </span>
              )}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              {/* Player Count - Clear count with "need X more" badge */}
              <div className={`relative bg-background/50 rounded-xl p-3 ${
                cycle.participant_count < cycle.min_participants 
                  ? 'ring-1 ring-orange-400/50' 
                  : 'ring-1 ring-green-400/50'
              }`}>
                <Users className={`w-5 h-5 mx-auto mb-1 ${
                  cycle.participant_count < cycle.min_participants 
                    ? 'text-orange-400' 
                    : 'text-green-400'
                }`} />
                <p className="text-lg font-bold text-foreground">
                  {cycle.participant_count}
                </p>
                <p className="text-[10px] text-muted-foreground">Players</p>
                {/* Status Badge */}
                {cycle.participant_count >= cycle.min_participants ? (
                  <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 bg-green-500 text-[8px] font-bold text-white rounded-full shadow-sm">
                    ✓ Ready
                  </span>
                ) : (
                  <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 bg-orange-500 text-[8px] font-bold text-white rounded-full shadow-sm animate-pulse">
                    Need {cycle.min_participants - cycle.participant_count}+
                  </span>
                )}
              </div>
              <div className="bg-background/50 rounded-xl p-3">
                <Trophy className="w-5 h-5 text-gold mx-auto mb-1" />
                <p className="text-lg font-bold text-foreground">Top {cycle.winner_count}</p>
                <p className="text-[10px] text-muted-foreground">Winners</p>
              </div>
              <div className="bg-background/50 rounded-xl p-3">
                <Ticket className="w-5 h-5 text-green-400 mx-auto mb-1" />
                <p className="text-lg font-bold text-foreground">
                  {cycle.entry_fee > 0 ? formatMoney(cycle.entry_fee) : 'FREE'}
                </p>
                <p className="text-[10px] text-muted-foreground">Entry</p>
              </div>
            </div>

            {/* Insufficient Participants Warning */}
            {isOpening && cycle.participant_count < cycle.min_participants && (
              <div className="mt-4 p-3 bg-orange-500/10 border border-orange-500/30 rounded-xl flex items-center gap-3 animate-pulse">
                <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0" />
                <div className="text-left flex-1">
                  <p className="text-sm font-semibold text-orange-400">Needs More Players!</p>
                  <p className="text-xs text-muted-foreground">
                    {cycle.min_participants - cycle.participant_count} more needed or game will be cancelled and refunded
                  </p>
                </div>
              </div>
            )}

            {/* Timer Section - Enhanced with intensity-based pulsing */}
            {(() => {
              // Calculate pulse intensity based on time remaining
              const isUrgent = timeUntilLive <= 10;
              const isCritical = timeUntilLive <= 5;
              const pulseSpeed = isCritical ? 'animate-[pulse_0.3s_ease-in-out_infinite]' 
                : isUrgent ? 'animate-[pulse_0.5s_ease-in-out_infinite]'
                : isLastMinute ? 'animate-[pulse_1s_ease-in-out_infinite]' 
                : '';
              const glowIntensity = isCritical ? 'shadow-[0_0_30px_rgba(239,68,68,0.5)]'
                : isUrgent ? 'shadow-[0_0_20px_rgba(239,68,68,0.4)]'
                : isLastMinute ? 'shadow-[0_0_15px_rgba(239,68,68,0.3)]'
                : '';
              
              return (
                <div className={`relative rounded-2xl p-4 transition-all duration-300 ${
                  isLastMinute && isOpening
                    ? `bg-gradient-to-r from-red-500/30 via-orange-500/20 to-red-500/30 border-2 border-red-500/50 ${pulseSpeed} ${glowIntensity}` 
                    : isOpening 
                      ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30' 
                      : 'bg-gradient-to-r from-blue-500/20 to-indigo-500/20 border border-blue-500/30'
                }`}>
                  {/* Animated ring effect for critical countdown */}
                  {isCritical && isOpening && (
                    <div className="absolute inset-0 rounded-2xl border-2 border-red-500 animate-ping opacity-30" />
                  )}
                  
                  {isWaiting ? (
                    <>
                      <p className="text-xs text-blue-400 font-medium mb-2">Entry Opens In</p>
                      <p className="text-3xl font-black text-blue-400">{formatTimeDetailed(timeUntilOpening)}</p>
                      <p className="text-xs text-muted-foreground mt-2">Goes live in {formatTimeDetailed(timeUntilLive)}</p>
                    </>
                  ) : (
                    <>
                      <p className={`text-xs font-medium mb-2 flex items-center justify-center gap-1 ${
                        isLastMinute ? 'text-red-400' : 'text-green-400'
                      }`}>
                        {isLastMinute && <AlertTriangle className={`w-3 h-3 ${isCritical ? 'animate-bounce' : 'animate-pulse'}`} />}
                        <Radio className={`w-3 h-3 ${isCritical ? 'animate-ping' : 'animate-pulse'}`} /> 
                        {isCritical ? '🔥 LAUNCHING IN' : isUrgent ? '⚡ ALMOST LIVE' : 'Game Goes Live In'}
                        {isLastMinute && <AlertTriangle className={`w-3 h-3 ${isCritical ? 'animate-bounce' : 'animate-pulse'}`} />}
                      </p>
                      
                      {/* Large animated countdown number */}
                      <div className={`relative ${isCritical ? 'scale-110' : isUrgent ? 'scale-105' : ''} transition-transform duration-300`}>
                        <p className={`text-3xl font-black ${
                          isCritical ? 'text-red-500 animate-pulse' 
                          : isUrgent ? 'text-orange-400' 
                          : isLastMinute ? 'text-red-400' 
                          : 'text-green-400'
                        }`}>
                          {formatTimeDetailed(timeUntilLive)}
                        </p>
                        
                        {/* Seconds indicator for last 10 seconds */}
                        {isUrgent && (
                          <div className="flex justify-center gap-1 mt-2">
                            {Array.from({ length: Math.min(timeUntilLive, 10) }).map((_, i) => (
                              <div 
                                key={i} 
                                className={`w-2 h-2 rounded-full ${
                                  i < 3 ? 'bg-red-500' : i < 6 ? 'bg-orange-400' : 'bg-yellow-400'
                                } ${i === 0 ? 'animate-ping' : ''}`}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                      
                      {isLastMinute && (
                        <p className={`text-xs mt-2 font-medium ${
                          isCritical ? 'text-red-500 animate-pulse' : 'text-red-400'
                        }`}>
                          {isCritical ? '🚀 GET READY TO PLAY!' : isUrgent ? '⚡ Game starting soon!' : '⏱️ Less than 30 seconds!'}
                        </p>
                      )}
                    </>
                  )}
                </div>
              );
            })()}

            {/* View Pool CTA */}
            <div className="mt-4">
              <PoolParticipantsSheet
                gameId={cycle.id}
                gameName={cycle.template_name || 'Royal Rumble'}
                participantCount={cycle.participant_count}
                poolValue={effectivePrizePool}
                entryFee={cycle.entry_fee}
              >
                <Eye className="w-3.5 h-3.5" />
                View {cycle.participant_count} in pool
              </PoolParticipantsSheet>
            </div>
          </div>
        </div>

        {/* Prize Distribution - Real-time updates */}
        <div className="mx-4 mt-4 p-4 rounded-2xl bg-card border border-border">
          <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-gold" />
            Prize Distribution
            <span className="text-[10px] text-muted-foreground font-normal ml-auto">Live</span>
          </h3>
          <div className="space-y-2">
            {cycle.prize_distribution.slice(0, cycle.winner_count).map((percent, i) => {
              const prizeAmount = (effectivePrizePool * percent) / 100;
              const medals = ['🥇', '🥈', '🥉'];
              return (
                <div key={i} className="flex items-center justify-between py-2 px-3 rounded-xl bg-muted/50">
                  <span className="text-lg">{medals[i] || `#${i + 1}`}</span>
                  <span className="text-sm font-bold text-foreground transition-all">{formatMoney(prizeAmount)}</span>
                  <span className="text-xs text-muted-foreground">{percent}%</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Game Rules Section */}
        <div className="mx-4 mt-4">
          <GameRulesSection
            entryFee={cycle.entry_fee}
            sponsoredPrizeAmount={cycle.sponsored_prize_amount}
            winnerCount={cycle.winner_count}
            prizeDistribution={cycle.prize_distribution}
            commentTimer={cycle.comment_timer}
            allowSpectators={cycle.allow_spectators}
            poolValue={cycle.pool_value}
            minParticipants={cycle.min_participants}
          />
        </div>

        {/* Bottom spacing for fixed CTA */}
        <div className="h-32" />
      </div>
      </div>

      {/* Bottom Actions - Fixed with safe area */}
      <div className="fixed bottom-0 left-0 right-0 z-40 p-4 pb-safe bg-background/95 backdrop-blur-lg border-t border-border/30" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 1rem)' }}>
        {participation.isParticipant ? (
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-green-500/20 border border-green-500/30">
              <Shield className="w-5 h-5 text-green-400" />
              <span className="font-bold text-green-400">
                {participation.isSpectator ? 'Watching as Spectator' : 'You\'re In!'}
              </span>
            </div>
            
            {/* Upgrade to Player Button - For spectators during opening phase */}
            {participation.isSpectator && isOpening && (
              <button
                onClick={async () => {
                  if (!cycleId) return;
                  play('click');
                  buttonClick();
                  const result = await upgradeToParticipant(cycleId);
                  if (result.success) {
                    setParticipation({ isParticipant: true, isSpectator: false });
                    hapticSuccess();
                  }
                }}
                disabled={upgrading || !hasBalance}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm disabled:opacity-50 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
              >
                {upgrading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    Upgrading...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Upgrade to Player • {cycle?.entry_fee ? formatMoney(cycle.entry_fee) : 'Free'}
                  </>
                )}
              </button>
            )}
            
            {participation.isSpectator && isOpening && !hasBalance && cycle?.entry_fee > 0 && (
              <p className="text-center text-xs text-destructive">
                Insufficient balance to upgrade
              </p>
            )}
            
            {/* Leave Game Button - Only if 5+ min before live */}
            {canLeave && !participation.isSpectator && (
              <button
                onClick={() => setShowLeaveConfirm(true)}
                disabled={leaving}
                className="w-full py-2.5 rounded-xl bg-muted text-muted-foreground font-medium flex items-center justify-center gap-2 hover:bg-destructive/10 hover:text-destructive transition-colors"
              >
                <LogOut className="w-4 h-4" />
                {leaving ? 'Leaving...' : 'Leave Game'}
              </button>
            )}
            
            <p className="text-center text-sm text-muted-foreground">
              {participation.isSpectator && isOpening
                ? 'Upgrade to compete for the prize pool!'
                : isOpening 
                  ? isLastMinute 
                    ? '🔥 Game starts in moments! Stay here!' 
                    : canLeave 
                      ? 'Game starts soon. You can leave until 5 min before.'
                      : 'Less than 5 min to go. Locked in!'
                  : 'Waiting for entry to open...'}
            </p>
          </div>
        ) : isOpening ? (
          <div className="space-y-2">
            <div className={`flex gap-2 ${cycle.allow_spectators ? '' : ''}`}>
              <button
                onClick={() => handleJoin(false)}
                disabled={joining || !hasBalance}
                className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm disabled:opacity-50 active:scale-[0.98] transition-transform"
              >
                {joining ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    Joining...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-1.5">
                    <Zap className="w-4 h-4" />
                    Join {cycle.entry_fee > 0 ? `• ${formatMoney(cycle.entry_fee)}` : '• Free'}
                  </span>
                )}
              </button>

              {cycle.allow_spectators && (
                <button
                  onClick={() => handleJoin(true)}
                  disabled={joining}
                  className="py-3 px-5 rounded-xl bg-muted text-muted-foreground font-medium text-sm border border-border disabled:opacity-50 active:scale-[0.98] transition-transform"
                >
                  <Eye className="w-4 h-4" />
                </button>
              )}
            </div>

            {!hasBalance && cycle.entry_fee > 0 && (
              <p className="text-center text-xs text-destructive">Insufficient balance</p>
            )}
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-muted-foreground">Entry opens in {formatTimeDetailed(timeUntilOpening)}</p>
          </div>
        )}
      </div>

      {/* Game Share Modal */}
      {cycle && (
        <GameShareModal
          open={showShareModal}
          onOpenChange={setShowShareModal}
          cycle={{
            id: cycle.id,
            template_id: cycle.template_id,
            template_name: cycle.template_name || 'Royal Rumble',
            status: cycle.status as 'waiting' | 'opening' | 'live' | 'ending' | 'ended' | 'cancelled',
            entry_fee: cycle.entry_fee,
            pool_value: cycle.pool_value,
            sponsored_prize_amount: cycle.sponsored_prize_amount,
            participant_count: cycle.participant_count,
            winner_count: cycle.winner_count,
            prize_distribution: cycle.prize_distribution,
            countdown: cycle.countdown,
            allow_spectators: cycle.allow_spectators,
            seconds_until_opening: timeUntilOpening,
            seconds_until_live: timeUntilLive,
            seconds_remaining: cycle.countdown,
            game_type: 'fastest_finger',
            entry_open_at: cycle.entry_open_at,
            entry_close_at: cycle.entry_close_at,
            live_start_at: cycle.live_start_at,
            live_end_at: cycle.live_end_at,
          }}
          variant="lobby"
        />
      )}
    </div>
  );
};
