import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useCycleJoin } from '@/hooks/useCycleJoin';
import { useCycleComments } from '@/hooks/useCycleComments';
import { useAuth } from '@/contexts/AuthContext';
import { useSounds } from '@/hooks/useSounds';
import { useHaptics } from '@/hooks/useHaptics';
import { useCycleHostTTS } from '@/hooks/useCycleHostTTS';
import { useLiveArenaSimulation } from '@/hooks/useLiveArenaSimulation';
import { useMockVoiceRoom } from '@/hooks/useMockVoiceRoom';
import { useMobileFullscreen } from '@/hooks/useMobileFullscreen';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { useAudio } from '@/contexts/AudioContext';
import { useServerTime } from '@/hooks/useServerTime';
import { supabase } from '@/integrations/supabase/client';
import { GameEndFreeze } from '@/components/GameEndFreeze';
import { Confetti } from '@/components/Confetti';
import { WinningBanner } from '@/components/WinningBanner';
import { ArenaHeader } from '@/components/arena/ArenaHeader';
import { DualTimerDisplay } from '@/components/arena/DualTimerDisplay';
import { MinimalLeaderboard } from '@/components/arena/MinimalLeaderboard';
import { CompactVoiceRoom } from '@/components/arena/CompactVoiceRoom';
import { IGStyleComments } from '@/components/arena/IGStyleComments';
import { setActiveGameState } from '@/components/FloatingGameReturn';
import { GameShareModal } from '@/components/GameShareModal';
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
import { 
  Zap, Eye, AlertTriangle, Sparkles
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
  ambient_music_style?: 'chill' | 'intense' | 'retro' | 'none';
}

export const CycleArena = () => {
  const { cycleId } = useParams<{ cycleId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { play } = useSounds();
  const { buttonClick } = useHaptics();
  const { playBackgroundMusic, stopBackgroundMusic } = useAudio();
  const { joinCycle, joining, checkParticipation } = useCycleJoin();
  const { comments: realComments, sendComment: sendRealComment, sending, getOrderedCommenters: getRealOrderedCommenters } = useCycleComments(cycleId || null);
  
  const isDemoMode = searchParams.get('demo') === 'true';
  const { winnerScreenDuration, hotGameThresholdLive } = usePlatformSettings() as any;
  const { secondsUntil } = useServerTime();
  const { isFullscreen, isMobile, toggleFullscreen } = useMobileFullscreen(false);
  
  const {
    simulatedComments,
    voiceParticipants: simVoiceParticipants,
    countdown: simCountdown,
    winner: simWinner,
    addUserComment,
    getOrderedCommenters: getSimOrderedCommenters,
    participantCount: simParticipantCount,
  } = useLiveArenaSimulation(
    isDemoMode,
    cycleId || null,
    user?.id,
    profile ? { username: profile.username, avatar: profile.avatar || '🎮' } : undefined
  );
  
  const [cycle, setCycle] = useState<CycleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [participation, setParticipation] = useState<{ isParticipant: boolean; isSpectator: boolean }>({ isParticipant: false, isSpectator: false });
  const [commentText, setCommentText] = useState('');
  const [localCountdown, setLocalCountdown] = useState(0);
  const [gameTimeRemaining, setGameTimeRemaining] = useState(0);
  const [hostIsSpeaking, setHostIsSpeaking] = useState(false);
  const [showLeaveWarning, setShowLeaveWarning] = useState(false);
  const [isEntering, setIsEntering] = useState(true);
  const [showGameEndFreeze, setShowGameEndFreeze] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [gameWinner, setGameWinner] = useState<{ name: string; avatar: string; prize: number } | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [leaderChanged, setLeaderChanged] = useState(false);
  const previousLeaderRef = useRef<string | null>(null);
  const announcedTimersRef = useRef<Set<number>>(new Set());
  const gameEndTriggeredRef = useRef(false);
  const gameEndNudgedRef = useRef(false);
  
  const comments = isDemoMode ? simulatedComments : realComments;
  const getOrderedCommenters = isDemoMode ? getSimOrderedCommenters : getRealOrderedCommenters;
  
  useEffect(() => {
    const timer = setTimeout(() => setIsEntering(false), 100);
    return () => clearTimeout(timer);
  }, []);

  const isLive = cycle?.status === 'live' || cycle?.status === 'ending';
  const arenaAmbientStyle = cycle?.ambient_music_style || 'intense';
  const isTimerPaused = comments.length === 0 && isLive;
  
  // Start arena music when live
  useEffect(() => {
    if (isLive) {
      playBackgroundMusic('arena', null, arenaAmbientStyle);
    }
    return () => {
      stopBackgroundMusic();
    };
  }, [isLive, arenaAmbientStyle, playBackgroundMusic, stopBackgroundMusic]);

  // Store active game state for floating return button
  useEffect(() => {
    if (isLive && participation.isParticipant && !participation.isSpectator && cycleId && cycle?.live_end_at) {
      setActiveGameState({
        cycleId,
        status: cycle?.status || 'live',
        liveEndAt: cycle.live_end_at,
        isParticipant: true,
      });
    }
    return () => {
      // Clear on unmount (when navigating away from arena)
    };
  }, [isLive, participation, cycleId, cycle?.status, cycle?.live_end_at]);

  const { voiceParticipants: mockVoiceParticipants } = useMockVoiceRoom(
    cycleId || null,
    isLive && !isDemoMode
  );
  
  const voiceParticipantsToPass = isDemoMode ? simVoiceParticipants : mockVoiceParticipants;
  
  const { 
    announceComment, 
    announceLeaderChange, 
    announceTimerWarning,
    announceGameOver 
  } = useCycleHostTTS({ 
    cycleId, 
    isLive: !!isLive,
    onSpeakingChange: setHostIsSpeaking
  });

  const fetchCycle = useCallback(async () => {
    if (!cycleId) return;
    
    const { data, error } = await supabase
      .from('game_cycles')
      .select('*')
      .eq('id', cycleId)
      .single();

    if (error) {
      console.error('[CycleArena] Error:', error);
      toast.error('Game not found');
      navigate('/arena');
      return;
    }

    const { data: template } = await supabase
      .from('game_templates')
      .select('name')
      .eq('id', data.template_id)
      .single();

    setCycle({ 
      ...data, 
      template_name: template?.name || 'Royal Rumble',
      ambient_music_style: (data.ambient_music_style as CycleData['ambient_music_style']) || 'intense',
    });
    setLocalCountdown(data.countdown);
    setGameTimeRemaining(secondsUntil(data.live_end_at));
    gameEndTriggeredRef.current = false;
    setLoading(false);
  }, [cycleId, navigate, secondsUntil]);

  useEffect(() => {
    fetchCycle();
  }, [fetchCycle]);

  useEffect(() => {
    if (isDemoMode) {
      setParticipation({ isParticipant: true, isSpectator: false });
      return;
    }
    
    const check = async () => {
      if (!cycleId) return;
      const result = await checkParticipation(cycleId);
      setParticipation(result);
    };
    check();
  }, [cycleId, checkParticipation, isDemoMode]);

  useEffect(() => {
    if (!cycleId) return;

    const channel = supabase
      .channel(`arena-cycle-${cycleId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'game_cycles', filter: `id=eq.${cycleId}` },
        (payload) => {
          const updated = payload.new as CycleData;
          setCycle(prev => prev ? { ...prev, ...updated } : null);
          setLocalCountdown(updated.countdown);

          if (updated.status === 'ending' || updated.status === 'ended') {
            const orderedCommenters = getOrderedCommenters();
            const winner = orderedCommenters[0];
            const effectivePrizePool = updated.pool_value + (updated.sponsored_prize_amount || 0);
            const prizeAmount = Math.floor(effectivePrizePool * 0.9 * (updated.prize_distribution[0] / 100));
            
            if (winner) {
              play('prizeWin');
              setGameWinner({
                name: winner.username,
                avatar: winner.avatar,
                prize: prizeAmount,
              });
              announceGameOver(winner.username, prizeAmount);
              setShowGameEndFreeze(true);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [cycleId, getOrderedCommenters, play, announceGameOver]);

  useEffect(() => {
    if (!cycle) return;

    const triggerGameEnd = () => {
      if (gameEndTriggeredRef.current || showGameEndFreeze) return;
      gameEndTriggeredRef.current = true;
      
      const orderedCommenters = getOrderedCommenters();
      const winner = orderedCommenters[0];
      const effectivePrizePool = cycle.pool_value + (cycle.sponsored_prize_amount || 0);
      const prizeAmount = Math.floor(effectivePrizePool * 0.9 * (cycle.prize_distribution[0] / 100));
      
      if (winner) {
        play('prizeWin');
        setGameWinner({
          name: winner.username,
          avatar: winner.avatar,
          prize: prizeAmount,
        });
        announceGameOver(winner.username, prizeAmount);
        setShowGameEndFreeze(true);
      }
    };

    const interval = setInterval(() => {
      if (cycle.status === 'live') {
        const serverSyncedGameTime = secondsUntil(cycle.live_end_at);
        setGameTimeRemaining(serverSyncedGameTime);
        
        if (serverSyncedGameTime <= 0) {
          setLocalCountdown(0);
          
          // Proactive backend nudge when game time expires
          if (!gameEndNudgedRef.current) {
            gameEndNudgedRef.current = true;
            supabase.functions.invoke('cycle-status-check', {
              body: { cycle_id: cycleId, force_transition: true }
            }).catch(() => {});
          }
          
          triggerGameEnd();
          return;
        }
        
        // Only decrement countdown if timer is NOT paused (has comments)
        if (comments.length > 0) {
          setLocalCountdown(prev => {
            const newVal = Math.max(0, prev - 1);
            if (newVal === 0 && prev > 0 && serverSyncedGameTime > 0) {
              triggerGameEnd();
            }
            return newVal;
          });
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [cycle, cycleId, comments.length, getOrderedCommenters, play, announceGameOver, showGameEndFreeze, secondsUntil]);

  // Timer warning announcements - skip if timer is paused
  useEffect(() => {
    if (!isLive || isTimerPaused) return;
    
    const orderedCommenters = getOrderedCommenters();
    const leader = orderedCommenters[0]?.username || null;
    
    if ([30, 10, 5].includes(localCountdown) && !announcedTimersRef.current.has(localCountdown)) {
      announcedTimersRef.current.add(localCountdown);
      announceTimerWarning(localCountdown, leader, isTimerPaused);
    }
    
    if (localCountdown > 30) {
      announcedTimersRef.current.clear();
    }
  }, [localCountdown, isLive, isTimerPaused, getOrderedCommenters, announceTimerWarning]);

  // Leader change detection
  useEffect(() => {
    if (!isLive) return;
    
    const orderedCommenters = getOrderedCommenters();
    const currentLeader = orderedCommenters[0]?.username || null;
    
    if (currentLeader && currentLeader !== previousLeaderRef.current && previousLeaderRef.current !== null) {
      announceLeaderChange(currentLeader, localCountdown);
      play('leaderChange');
      setLeaderChanged(true);
      setTimeout(() => setLeaderChanged(false), 600);
    }
    
    previousLeaderRef.current = currentLeader;
  }, [comments, isLive, localCountdown, getOrderedCommenters, announceLeaderChange, play]);

  // Announce new comments
  useEffect(() => {
    if (!isLive || comments.length === 0) return;
    
    const latestComment = comments[0];
    if (latestComment) {
      announceComment(latestComment.username, latestComment.content, latestComment.id, isTimerPaused);
    }
  }, [comments, isLive, isTimerPaused, announceComment]);

  const handleJoin = async (asSpectator: boolean = false) => {
    if (!cycleId) return;
    play('click');
    buttonClick();

    const result = await joinCycle(cycleId, asSpectator);
    if (result.success) {
      setParticipation({ isParticipant: true, isSpectator: asSpectator });
    }
  };

  const handleSendComment = async () => {
    if (!commentText.trim() || !participation.isParticipant || participation.isSpectator) return;
    
    play('click');
    
    if (isDemoMode) {
      addUserComment(commentText);
      setCommentText('');
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    } else {
      const success = await sendRealComment(commentText);
      if (success) {
        setCommentText('');
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);
      }
    }
  };

  const handleFreezeComplete = useCallback(async () => {
    setShowGameEndFreeze(false);
    setActiveGameState(null); // Clear floating button
    
    if (user) {
      const { data: winData } = await supabase
        .from('cycle_winners')
        .select('id')
        .eq('cycle_id', cycleId)
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (winData) {
        navigate(`/arena/${cycleId}/winner`, { replace: true });
        return;
      }
    }
    
    navigate(`/arena/${cycleId}/results`, { replace: true });
  }, [navigate, cycleId, user]);

  const handleBack = useCallback(() => {
    play('click'); 
    buttonClick(); 
    if (isLive && participation.isParticipant && !participation.isSpectator) {
      setShowLeaveWarning(true);
    } else {
      navigate('/arena'); 
    }
  }, [play, buttonClick, isLive, participation, navigate]);

  const handleShare = useCallback(() => {
    play('click'); 
    buttonClick(); 
    setShowShareModal(true);
  }, [play, buttonClick]);

  const formatMoney = (amount: number) => {
    if (amount >= 1_000_000) return `₦${(amount / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
    if (amount >= 1_000) return `₦${(amount / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
    return `₦${amount.toLocaleString()}`;
  };

  if (loading || !cycle) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading arena...</p>
        </div>
      </div>
    );
  }

  const liveStartPassed = cycle.live_start_at && new Date(cycle.live_start_at).getTime() <= Date.now();
  
  if (cycle.status === 'waiting') {
    navigate(`/arena/${cycleId}`, { replace: true });
    return null;
  }
  
  if (cycle.status === 'opening' && !liveStartPassed) {
    navigate(`/arena/${cycleId}`, { replace: true });
    return null;
  }

  if ((cycle.status === 'ended' || cycle.status === 'settled') && !showGameEndFreeze) {
    navigate(`/arena/${cycleId}/results`, { replace: true });
    return null;
  }

  const effectivePrizePool = cycle.pool_value + (cycle.sponsored_prize_amount || 0);
  const canComment = participation.isParticipant && !participation.isSpectator && isLive;
  const orderedCommenters = getOrderedCommenters();
  const displayCountdown = isDemoMode ? simCountdown : localCountdown;
  const isCountdownCritical = displayCountdown <= 10 && isLive && comments.length > 0;
  const displayParticipantCount = isDemoMode ? simParticipantCount : cycle.participant_count;
  const isHotGame = displayParticipantCount >= (hotGameThresholdLive || 10);
  
  const currentUserIsWinning = orderedCommenters.length > 0 && 
    orderedCommenters[0]?.id === user?.id && 
    participation.isParticipant && 
    !participation.isSpectator &&
    isLive;

  const leaderIds = orderedCommenters.map(c => c.user_id);

  return (
    <div className={`min-h-screen bg-background flex flex-col transition-all duration-500 ease-out ${isEntering ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
      {showConfetti && <Confetti duration={3000} />}
      
      <WinningBanner 
        isVisible={currentUserIsWinning} 
        prizeAmount={effectivePrizePool * (cycle.prize_distribution[0] / 100)} 
      />
      
      {gameWinner && (
        <GameEndFreeze
          isActive={showGameEndFreeze}
          winnerName={gameWinner.name}
          winnerAvatar={gameWinner.avatar}
          prizeAmount={gameWinner.prize}
          onComplete={handleFreezeComplete}
          freezeDuration={winnerScreenDuration}
        />
      )}

      {/* New streamlined header */}
      <ArenaHeader
        isLive={!!isLive}
        status={cycle.status}
        gameName={cycle.template_name || 'Royal Rumble'}
        prizePool={effectivePrizePool}
        participantCount={displayParticipantCount}
        isMobile={isMobile}
        isFullscreen={isFullscreen}
        isHotGame={isHotGame}
        onBack={handleBack}
        onShare={handleShare}
        onToggleFullscreen={toggleFullscreen}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden px-3">
        {/* Dual Timer Display */}
        {isLive && (
          <DualTimerDisplay
            commentTimer={displayCountdown}
            gameTimeRemaining={gameTimeRemaining}
            isTimerPaused={isTimerPaused}
            hasComments={comments.length > 0}
          />
        )}

        {/* Minimal Leaderboard */}
        {isLive && (
          <MinimalLeaderboard
            leaders={orderedCommenters.map(c => ({ id: c.id || c.user_id, user_id: c.user_id, username: c.username || 'Player', avatar: c.avatar || '🎮' }))}
            currentUserId={user?.id}
            prizeDistribution={cycle.prize_distribution}
            effectivePrizePool={effectivePrizePool}
            winnerCount={cycle.winner_count}
            isLeaderChanging={leaderChanged}
          />
        )}

        {/* Compact Voice Room */}
        {isLive && cycleId && (
          <div className="mb-2">
            <CompactVoiceRoom 
              gameId={cycleId} 
              isHostSpeaking={hostIsSpeaking}
              simulatedParticipants={voiceParticipantsToPass.length > 0 ? voiceParticipantsToPass : undefined}
            />
          </div>
        )}

        {/* IG-Style Comments */}
        <IGStyleComments
          comments={comments.map(c => ({ id: c.id, user_id: c.user_id, username: c.username || 'Player', avatar: c.avatar || '🎮', content: c.content, server_timestamp: c.server_timestamp }))}
          currentUserId={user?.id}
          leaderIds={leaderIds}
          winnerCount={cycle.winner_count}
          isLive={!!isLive}
          canComment={canComment}
          commentText={commentText}
          onCommentChange={setCommentText}
          onSendComment={handleSendComment}
          sending={sending}
          isCountdownCritical={isCountdownCritical}
          isTimerPaused={isTimerPaused}
        />
      </div>

      {/* Action Area - for non-participants */}
      <div className="sticky bottom-0 z-10 bg-background px-3 pb-4 space-y-2">
        {!participation.isParticipant && (
          <div className="flex gap-2">
            {cycle.status === 'opening' && (
              <button
                onClick={() => handleJoin(false)}
                disabled={joining}
                className="flex-1 btn-primary py-3 text-base font-bold flex items-center justify-center gap-2"
              >
                {joining ? (
                  <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                ) : (
                  <>
                    <Zap className="w-5 h-5" />
                    Enter • {cycle.entry_fee > 0 ? formatMoney(cycle.entry_fee) : 'FREE'}
                  </>
                )}
              </button>
            )}
            
            {isLive && cycle.allow_spectators && (
              <button
                onClick={() => handleJoin(true)}
                disabled={joining}
                className="flex-1 py-3 px-4 rounded-xl bg-muted text-foreground font-medium flex items-center justify-center gap-2"
              >
                <Eye className="w-4 h-4" />
                Watch
              </button>
            )}
            
            {isLive && !cycle.allow_spectators && (
              <div className="flex-1 py-3 px-4 rounded-xl bg-destructive/10 border border-destructive/20 text-center">
                <p className="text-sm text-destructive">Entry closed</p>
              </div>
            )}
          </div>
        )}

        {participation.isSpectator && (
          <div className="flex items-center justify-center gap-2 py-2 text-muted-foreground bg-muted/50 rounded-xl">
            <Eye className="w-4 h-4" />
            <span className="text-sm">Watching as spectator</span>
          </div>
        )}

        {participation.isParticipant && !participation.isSpectator && !isLive && (
          <div className="flex items-center justify-center gap-2 py-3 bg-green-500/10 border border-green-500/20 rounded-xl">
            <Sparkles className="w-4 h-4 text-green-400 animate-pulse" />
            <span className="text-sm text-green-400 font-medium">You're in! Waiting for game...</span>
          </div>
        )}
      </div>

      {/* Leave Game Warning */}
      <AlertDialog open={showLeaveWarning} onOpenChange={setShowLeaveWarning}>
        <AlertDialogContent position="top" className="max-w-[90vw] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Leave Live Game?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              You are in a <strong className="text-foreground">LIVE game</strong>. Leaving could cost you your position. Entry fee is non-refundable.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl">Stay</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => navigate('/arena')}
              className="bg-destructive hover:bg-destructive/90 rounded-xl"
            >
              Leave
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Share Modal */}
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
            seconds_until_opening: 0,
            seconds_until_live: 0,
            seconds_remaining: cycle.countdown,
            game_type: 'fastest_finger',
            entry_open_at: cycle.entry_open_at,
            entry_close_at: cycle.entry_close_at,
            live_start_at: cycle.live_start_at,
            live_end_at: cycle.live_end_at,
          }}
          variant="live"
        />
      )}
    </div>
  );
};
