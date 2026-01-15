// Force rebuild v2.3.0 - Sticky Leaders + Collapsible Host/Voice
import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useCycleJoin } from '@/hooks/useCycleJoin';
import { useCycleComments } from '@/hooks/useCycleComments';
import { useAuth } from '@/contexts/AuthContext';
import { useSounds } from '@/hooks/useSounds';
import { useHaptics } from '@/hooks/useHaptics';
import { useCycleHostTTS } from '@/hooks/useCycleHostTTS';
import { useMockCommentTrigger } from '@/hooks/useMockCommentTrigger';
import { useLiveArenaSimulation } from '@/hooks/useLiveArenaSimulation';
import { useMockVoiceRoom } from '@/hooks/useMockVoiceRoom';
import { useMobileFullscreen } from '@/hooks/useMobileFullscreen';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { useAudio } from '@/contexts/AudioContext';
import { useServerTime } from '@/hooks/useServerTime';
import { supabase } from '@/integrations/supabase/client';
import { VoiceRoomCompact } from '@/components/VoiceRoomCompact';
import { CompactHostBanner } from '@/components/CompactHostBanner';
import { LiveCommentsIG } from '@/components/LiveCommentsIG';
import { SmartCommentInput } from '@/components/SmartCommentInput';
import { CompactLeaderboard } from '@/components/CompactLeaderboard';
import { CollapsedHostVoice } from '@/components/CollapsedHostVoice';
import { Confetti } from '@/components/Confetti';
import { WinningBanner } from '@/components/WinningBanner';
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
import { GameShareModal } from '@/components/GameShareModal';
import { MusicToggle } from '@/components/MusicToggle';
import { 
  Users, Timer, Crown, Eye, 
  Zap, Clock, Radio,
  AlertTriangle, Hourglass,
  Maximize, Minimize, Share2
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
  mock_users_enabled?: boolean;
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
  const { winnerScreenDuration } = usePlatformSettings();
  const { secondsUntil } = useServerTime();
  const { isFullscreen, isMobile, toggleFullscreen } = useMobileFullscreen(false);
  
  const {
    simulatedComments,
    voiceParticipants: simVoiceParticipants,
    countdown: simCountdown,
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
  const [showShareModal, setShowShareModal] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [leaderChanged, setLeaderChanged] = useState(false);
  const [openingTickSent, setOpeningTickSent] = useState(false);
  const [isScrolledPastHost, setIsScrolledPastHost] = useState(false);
  const previousLeaderRef = useRef<string | null>(null);
  const announcedTimersRef = useRef<Set<number>>(new Set());
  const hostVoiceRef = useRef<HTMLDivElement>(null);
  const gameEndTriggeredRef = useRef(false);
  
  const comments = isDemoMode ? simulatedComments : realComments;
  const getOrderedCommenters = isDemoMode ? getSimOrderedCommenters : getRealOrderedCommenters;
  
  useEffect(() => {
    const timer = setTimeout(() => setIsEntering(false), 100);
    return () => clearTimeout(timer);
  }, []);

  // IntersectionObserver for Host/Voice collapse detection
  useEffect(() => {
    const target = hostVoiceRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // Show collapsed card when original section is NOT visible (scrolled past)
        setIsScrolledPastHost(!entry.isIntersecting);
      },
      { threshold: 0, rootMargin: '-100px 0px 0px 0px' }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  const isLive = cycle?.status === 'live' || cycle?.status === 'ending';
  const arenaAmbientStyle = cycle?.ambient_music_style || 'intense';
  
  useEffect(() => {
    if (isLive) {
      playBackgroundMusic('arena', null, arenaAmbientStyle);
    }
    return () => { stopBackgroundMusic(); };
  }, [isLive, arenaAmbientStyle, playBackgroundMusic, stopBackgroundMusic]);

  const { voiceParticipants: mockVoiceParticipants } = useMockVoiceRoom(cycleId || null, isLive && !isDemoMode);
  const voiceParticipantsToPass = isDemoMode ? simVoiceParticipants : mockVoiceParticipants;
  
  useMockCommentTrigger(cycleId || null, isLive && !isDemoMode, cycle?.mock_users_enabled ?? true);
  
  const { announceComment, announceLeaderChange, announceTimerWarning, announceGameOver } = useCycleHostTTS({ 
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

  useEffect(() => { fetchCycle(); }, [fetchCycle]);

  // Opening status: trigger backend tick immediately to transition to live
  useEffect(() => {
    if (cycle?.status === 'opening' && !openingTickSent) {
      setOpeningTickSent(true);
      supabase.functions.invoke('cycle-manager', { body: { action: 'tick' } })
        .then(() => {
          // Refetch after a short delay to get updated status
          setTimeout(fetchCycle, 500);
        })
        .catch(console.error);
    }
  }, [cycle?.status, openingTickSent, fetchCycle]);

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
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'game_cycles', filter: `id=eq.${cycleId}` },
        (payload) => {
          const updated = payload.new as CycleData;
          setCycle(prev => prev ? { ...prev, ...updated } : null);
          setLocalCountdown(updated.countdown);
          
          // Handle status changes via realtime - immediate redirect for ended/settled games
          if (updated.status === 'ended' || updated.status === 'settled') {
            console.log('[CycleArena] Game ended via realtime, navigating to results');
            navigate(`/arena/${cycleId}/results`, { replace: true });
          } else if (updated.status === 'cancelled') {
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
    return () => { supabase.removeChannel(channel); };
  }, [cycleId, navigate]);

  // Game end handler - immediate navigation to results (no delay)
  const handleGameEnd = useCallback(async () => {
    if (gameEndTriggeredRef.current) return;
    gameEndTriggeredRef.current = true;
    
    play('prizeWin');
    
    // Trigger backend settlement in background - don't wait
    supabase.functions.invoke('cycle-manager', { body: { action: 'tick' } })
      .catch(err => console.error('[CycleArena] Background tick error:', err));
    
    // Navigate to results immediately - results page will handle loading state
    navigate(`/arena/${cycleId}/results`, { replace: true });
  }, [cycleId, navigate, play]);

  // Local countdown ticker
  useEffect(() => {
    if (!cycle) return;

    const interval = setInterval(() => {
      if (cycle.status === 'live') {
        const serverSyncedGameTime = secondsUntil(cycle.live_end_at);
        setGameTimeRemaining(serverSyncedGameTime);
        
        // Game end time reached - end game immediately
        if (serverSyncedGameTime <= 0) {
          setLocalCountdown(0);
          handleGameEnd();
          return;
        }
        
        setLocalCountdown(prev => {
          const newVal = Math.max(0, prev - 1);
          // Comment timer reached 0 - end game
          if (newVal === 0 && prev > 0 && serverSyncedGameTime > 0) {
            handleGameEnd();
          }
          return newVal;
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [cycle, handleGameEnd, secondsUntil]);

  // Timer warning announcements - only when timer is active (has comments)
  useEffect(() => {
    if (!isLive || comments.length === 0) return;
    
    const orderedCommenters = getOrderedCommenters();
    const leader = orderedCommenters[0]?.username || null;
    
    if ([30, 10, 5].includes(localCountdown) && !announcedTimersRef.current.has(localCountdown)) {
      announcedTimersRef.current.add(localCountdown);
      announceTimerWarning(localCountdown, leader);
    }
    
    if (localCountdown > 30) {
      announcedTimersRef.current.clear();
    }
  }, [localCountdown, isLive, comments.length, getOrderedCommenters, announceTimerWarning]);

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
      announceComment(latestComment.username, latestComment.content, latestComment.id);
    }
  }, [comments, isLive, announceComment]);

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

  // Route guards - allow opening status to show briefly during transition
  if (cycle.status === 'waiting') {
    navigate(`/arena/${cycleId}`, { replace: true });
    return null;
  }
  
  // For opening status, show brief "Game Starting" while backend transitions
  if (cycle.status === 'opening') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-xl font-bold text-foreground">Game Starting...</p>
          <p className="text-muted-foreground mt-2">Get ready!</p>
        </div>
      </div>
    );
  }

  if (cycle.status === 'cancelled') {
    if (cycle.participant_count === 0) {
      toast.info('Game cancelled — no players joined');
      navigate('/arena', { replace: true });
    } else {
      navigate(`/arena/${cycleId}/results`, { replace: true });
    }
    return null;
  }

  if (cycle.status === 'ended' || cycle.status === 'settled') {
    navigate(`/arena/${cycleId}/results`, { replace: true });
    return null;
  }

  const effectivePrizePool = cycle.pool_value + (cycle.sponsored_prize_amount || 0);
  const canComment = participation.isParticipant && !participation.isSpectator && isLive;
  const orderedCommenters = getOrderedCommenters();
  const displayCountdown = isDemoMode ? simCountdown : localCountdown;
  const isCountdownCritical = displayCountdown <= 10 && isLive && comments.length > 0;
  const displayParticipantCount = isDemoMode ? simParticipantCount : cycle.participant_count;
  const isTimerPaused = comments.length === 0;
  
  const currentUserIsWinning = orderedCommenters.length > 0 && 
    orderedCommenters[0]?.id === user?.id && 
    participation.isParticipant && 
    !participation.isSpectator &&
    isLive;

  return (
    <div className={`min-h-screen bg-background flex flex-col transition-all duration-500 ease-out ${isEntering ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
      {showConfetti && <Confetti duration={3000} />}
      
      <WinningBanner 
        isVisible={currentUserIsWinning} 
        prizeAmount={effectivePrizePool * (cycle.prize_distribution[0] / 100)} 
      />

      {/* IG-Style Header: LIVE | Music | Share | Fullscreen */}
      <div className="sticky top-0 z-20 pt-safe bg-background/95 backdrop-blur-sm border-b border-border/30">
        <div className="px-3 py-2 flex items-center justify-between">
          {/* LIVE indicator */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${
            isLive ? 'bg-red-500/20' : 'bg-muted'
          }`}>
            <div className="relative">
              <Radio className={`w-3.5 h-3.5 ${isLive ? 'text-red-400' : 'text-muted-foreground'}`} />
              {isLive && <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-red-500 rounded-full animate-ping" />}
            </div>
            <span className={`text-xs font-bold uppercase ${isLive ? 'text-red-400' : 'text-muted-foreground'}`}>
              {isLive ? 'Live' : cycle.status}
            </span>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-2">
            <MusicToggle className="w-9 h-9 rounded-xl bg-muted/60" />
            
            <button
              onClick={() => { play('click'); setShowShareModal(true); }}
              className="w-9 h-9 rounded-xl bg-muted/60 flex items-center justify-center"
            >
              <Share2 className="w-4 h-4 text-foreground" />
            </button>
            
            {isMobile && (
              <button
                onClick={toggleFullscreen}
                className="w-9 h-9 rounded-xl bg-muted/60 flex items-center justify-center"
              >
                {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>

        {/* Game Info Bar: Title | Prize | Players */}
        <div className="px-3 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crown className="w-4 h-4 text-gold" />
            <span className="text-sm font-bold text-foreground">{cycle.template_name}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-black text-gold">{formatMoney(effectivePrizePool)}</span>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Users className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">{displayParticipantCount}</span>
            </div>
          </div>
        </div>

        {/* Dual Timers */}
        {isLive && (
          <div className="px-3 pb-2 grid grid-cols-2 gap-2">
            {/* Comment Reset Timer */}
            <div className={`p-2 rounded-xl transition-all ${
              isCountdownCritical 
                ? 'bg-destructive/15 border border-destructive/30' 
                : isTimerPaused 
                  ? 'bg-primary/10 border border-primary/20' 
                  : 'bg-muted/50'
            }`}>
              <div className="flex items-center gap-2">
                <Timer className={`w-4 h-4 ${
                  isCountdownCritical ? 'text-destructive animate-pulse' : 
                  isTimerPaused ? 'text-primary' : 'text-muted-foreground'
                }`} />
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">
                    {isTimerPaused ? 'Waiting for comment' : 'Comment resets'}
                  </p>
                  <p className={`text-lg font-bold tabular-nums ${
                    isTimerPaused ? 'text-primary animate-pulse' :
                    isCountdownCritical ? 'text-destructive' : 'text-foreground'
                  }`}>
                    {isTimerPaused ? 'PAUSED' : formatTime(displayCountdown)}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Game End Timer */}
            <div className={`p-2 rounded-xl transition-all ${
              gameTimeRemaining <= 60 
                ? 'bg-orange-500/15 border border-orange-500/30' 
                : 'bg-muted/50'
            }`}>
              <div className="flex items-center gap-2">
                <Hourglass className={`w-4 h-4 ${
                  gameTimeRemaining <= 60 ? 'text-orange-400 animate-bounce' : 'text-muted-foreground'
                }`} />
                <div>
                  <p className={`text-[10px] uppercase ${
                    gameTimeRemaining <= 60 ? 'text-orange-400 font-bold' : 'text-muted-foreground'
                  }`}>
                    {gameTimeRemaining <= 60 ? 'Ending soon!' : 'Game ends'}
                  </p>
                  <p className={`text-lg font-bold tabular-nums ${
                    gameTimeRemaining <= 60 
                      ? gameTimeRemaining <= 10 ? 'text-red-500' : 'text-orange-400' 
                      : 'text-foreground'
                  }`}>
                    {formatTime(gameTimeRemaining)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Sticky Leaders - inside header */}
        {isLive && orderedCommenters.length > 0 && (
          <div className="px-3 pb-2">
            <CompactLeaderboard
              orderedCommenters={orderedCommenters}
              winnerCount={cycle.winner_count}
              prizeDistribution={cycle.prize_distribution}
              effectivePrizePool={effectivePrizePool}
              currentUserId={user?.id}
            />
          </div>
        )}
      </div>

      {/* Collapsed Host+Voice Card - shows when scrolled past original */}
      {isScrolledPastHost && isLive && (
        <div className="sticky top-[180px] z-15 px-3 py-1">
          <CollapsedHostVoice 
            voiceParticipantCount={voiceParticipantsToPass.length || 3}
          />
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden px-3 py-2 gap-2">
        {/* Host Banner + Voice Room Compact - with ref for intersection */}
        {isLive && (
          <div ref={hostVoiceRef} className="space-y-2">
            <CompactHostBanner isLive={isLive} isSpeaking={hostIsSpeaking} />
            {cycleId && (
              <VoiceRoomCompact 
                gameId={cycleId} 
                simulatedParticipants={voiceParticipantsToPass.length > 0 ? voiceParticipantsToPass : undefined}
              />
            )}
          </div>
        )}

        {/* IG-Style Live Comments */}
        <div className="flex-1 min-h-0">
          <LiveCommentsIG
            comments={comments}
            orderedCommenters={orderedCommenters}
            winnerCount={cycle.winner_count}
            currentUserId={user?.id}
            maxHeight="100%"
          />
        </div>
      </div>

      {/* Bottom Action Area */}
      <div className="sticky bottom-0 z-10 bg-background pt-2 px-3 pb-4 border-t border-border/30">
        {/* Not joined yet */}
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
                className="flex-1 py-3 px-3 rounded-xl bg-muted text-foreground font-medium flex items-center justify-center gap-2"
              >
                <Eye className="w-4 h-4" />
                Watch
              </button>
            )}
            
            {isLive && !cycle.allow_spectators && (
              <div className="flex-1 py-3 px-3 rounded-xl bg-red-500/10 border border-red-500/20 text-center">
                <p className="text-sm text-red-400">Entry closed</p>
              </div>
            )}
          </div>
        )}

        {/* Participant - Smart Comment Input */}
        {canComment && (
          <SmartCommentInput
            value={commentText}
            onChange={setCommentText}
            onSubmit={handleSendComment}
            sending={sending}
            countdown={displayCountdown}
            userAvatar={profile?.avatar || '🎮'}
          />
        )}

        {/* Spectator notice */}
        {participation.isSpectator && (
          <div className="flex items-center justify-center gap-2 py-3 text-muted-foreground bg-muted/50 rounded-xl">
            <Eye className="w-4 h-4" />
            <span className="text-sm">Watching as spectator</span>
          </div>
        )}

        {/* Participant waiting for game */}
        {participation.isParticipant && !participation.isSpectator && !isLive && (
          <div className="flex items-center justify-center gap-2 py-3 bg-green-500/10 border border-green-500/20 rounded-xl">
            <Clock className="w-4 h-4 text-green-400 animate-pulse" />
            <span className="text-sm text-green-400 font-medium">You're in! Waiting for game...</span>
          </div>
        )}
      </div>

      {/* Leave Warning Dialog */}
      <AlertDialog open={showLeaveWarning} onOpenChange={setShowLeaveWarning}>
        <AlertDialogContent position="top" className="max-w-[90vw] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="w-5 h-5" />
              Leave Live Game?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              You are in a <strong className="text-foreground">LIVE game</strong>. Leaving will not pause the game.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl">Stay</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => navigate('/arena')}
              className="bg-red-500 hover:bg-red-600 rounded-xl"
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
