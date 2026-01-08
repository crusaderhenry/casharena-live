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
import { supabase } from '@/integrations/supabase/client';
import { VoiceRoomLive } from '@/components/VoiceRoomLive';
import { CompactHostBanner } from '@/components/CompactHostBanner';
import { GameEndFreeze } from '@/components/GameEndFreeze';
import { LiveTimer } from '@/components/Countdown';
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
import { 
  ArrowLeft, Send, Users, Timer, Crown, Eye, Trophy, 
  Zap, MessageCircle, Clock, Play, Radio, Sparkles,
  Target, Flame, Award, AlertTriangle, Hourglass,
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
  
  // Demo mode for simulation
  const isDemoMode = searchParams.get('demo') === 'true';
  
  // Platform settings for winner screen duration
  const { winnerScreenDuration } = usePlatformSettings();
  
  // Mobile fullscreen hook - auto fullscreen disabled
  const { isFullscreen, isMobile, toggleFullscreen } = useMobileFullscreen(false);
  
  // Live arena simulation hook for demo mode
  const {
    simulatedComments,
    voiceParticipants: simVoiceParticipants,
    countdown: simCountdown,
    winnerSelected,
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
  const [timeUntilOpening, setTimeUntilOpening] = useState(0);
  const [timeUntilLive, setTimeUntilLive] = useState(0);
  const [hostIsSpeaking, setHostIsSpeaking] = useState(false);
  const [showLeaveWarning, setShowLeaveWarning] = useState(false);
  const [isEntering, setIsEntering] = useState(true);
  const [showGameEndFreeze, setShowGameEndFreeze] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [gameWinner, setGameWinner] = useState<{ name: string; avatar: string; prize: number } | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [leaderChanged, setLeaderChanged] = useState(false);
  const commentsContainerRef = useRef<HTMLDivElement>(null);
  const previousLeaderRef = useRef<string | null>(null);
  const announcedTimersRef = useRef<Set<number>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Use simulated or real data based on demo mode
  const comments = isDemoMode ? simulatedComments : realComments;
  const getOrderedCommenters = isDemoMode ? getSimOrderedCommenters : getRealOrderedCommenters;
  
  // Arena entrance animation
  useEffect(() => {
    const timer = setTimeout(() => setIsEntering(false), 100);
    return () => clearTimeout(timer);
  }, []);

  const isLive = cycle?.status === 'live' || cycle?.status === 'ending';
  
  // Start arena music when live
  useEffect(() => {
    if (isLive) {
      playBackgroundMusic('arena');
    }
    return () => {
      stopBackgroundMusic();
    };
  }, [isLive, playBackgroundMusic, stopBackgroundMusic]);
  
  // Fetch mock voice participants from database
  const { voiceParticipants: mockVoiceParticipants } = useMockVoiceRoom(
    cycleId || null,
    isLive && !isDemoMode
  );
  
  // Use simulated voice participants in demo mode
  const voiceParticipantsToPass = isDemoMode ? simVoiceParticipants : mockVoiceParticipants;
  
  // TTS Hook for host commentary
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

  // Fetch cycle data
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

    // Get template name
    const { data: template } = await supabase
      .from('game_templates')
      .select('name')
      .eq('id', data.template_id)
      .single();

    setCycle({ ...data, template_name: template?.name || 'Royal Rumble' });
    setLocalCountdown(data.countdown);
    
    const now = Date.now();
    const entryOpenAt = new Date(data.entry_open_at).getTime();
    const liveStartAt = new Date(data.live_start_at).getTime();
    const liveEndAt = new Date(data.live_end_at).getTime();
    
    setTimeUntilOpening(Math.max(0, Math.floor((entryOpenAt - now) / 1000)));
    setTimeUntilLive(Math.max(0, Math.floor((liveStartAt - now) / 1000)));
    setGameTimeRemaining(Math.max(0, Math.floor((liveEndAt - now) / 1000)));
    
    setLoading(false);
  }, [cycleId, navigate]);

  // Initial fetch
  useEffect(() => {
    fetchCycle();
  }, [fetchCycle]);

  // Check user participation
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

  // Real-time subscription
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

          // Handle game ending - show freeze overlay
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

  // Local countdown ticker
  useEffect(() => {
    if (!cycle) return;

    const interval = setInterval(() => {
      if (cycle.status === 'live') {
        setLocalCountdown(prev => {
          const newVal = Math.max(0, prev - 1);
          // Trigger freeze when countdown hits 0
          if (newVal === 0 && prev > 0) {
            const orderedCommenters = getOrderedCommenters();
            const winner = orderedCommenters[0];
            const effectivePrizePool = cycle.pool_value + (cycle.sponsored_prize_amount || 0);
            const prizeAmount = Math.floor(effectivePrizePool * 0.9 * (cycle.prize_distribution[0] / 100));
            
            if (winner && !showGameEndFreeze) {
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
          return newVal;
        });
        setGameTimeRemaining(prev => Math.max(0, prev - 1));
      } else if (cycle.status === 'waiting') {
        setTimeUntilOpening(prev => Math.max(0, prev - 1));
        setTimeUntilLive(prev => Math.max(0, prev - 1));
      } else if (cycle.status === 'opening') {
        setTimeUntilLive(prev => Math.max(0, prev - 1));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [cycle?.status, getOrderedCommenters, play, announceGameOver, showGameEndFreeze]);

  // Timer warning announcements
  useEffect(() => {
    if (!isLive) return;
    
    const orderedCommenters = getOrderedCommenters();
    const leader = orderedCommenters[0]?.username || null;
    
    if ([30, 10, 5].includes(localCountdown) && !announcedTimersRef.current.has(localCountdown)) {
      announcedTimersRef.current.add(localCountdown);
      announceTimerWarning(localCountdown, leader);
    }
    
    if (localCountdown > 30) {
      announcedTimersRef.current.clear();
    }
  }, [localCountdown, isLive, getOrderedCommenters, announceTimerWarning]);

  // Leader change detection
  useEffect(() => {
    if (!isLive) return;
    
    const orderedCommenters = getOrderedCommenters();
    const currentLeader = orderedCommenters[0]?.username || null;
    
    if (currentLeader && currentLeader !== previousLeaderRef.current && previousLeaderRef.current !== null) {
      announceLeaderChange(currentLeader, localCountdown);
      play('leaderChange');
      
      // Trigger leader change animation
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

  // Scroll to bottom on new comment
  useEffect(() => {
    if (commentsContainerRef.current) {
      commentsContainerRef.current.scrollTop = 0;
    }
  }, [comments.length]);

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
      // Show confetti when user takes the lead
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    } else {
      const success = await sendRealComment(commentText);
      if (success) {
        setCommentText('');
        // Show confetti when user takes the lead
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);
      }
    }
    
    // Keep focus on input
    inputRef.current?.focus();
  };

  const handleFreezeComplete = useCallback(() => {
    setShowGameEndFreeze(false);
    navigate(`/arena/${cycleId}/results`, { replace: true });
  }, [navigate, cycleId]);

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

  // Redirect non-live games to lobby
  if (cycle.status === 'waiting' || cycle.status === 'opening') {
    navigate(`/arena/${cycleId}`, { replace: true });
    return null;
  }

  // Redirect ended games to results (unless showing freeze)
  if ((cycle.status === 'ended' || cycle.status === 'settled') && !showGameEndFreeze) {
    navigate(`/arena/${cycleId}/results`, { replace: true });
    return null;
  }

  const effectivePrizePool = cycle.pool_value + (cycle.sponsored_prize_amount || 0);
  const canComment = participation.isParticipant && !participation.isSpectator && isLive;
  const orderedCommenters = getOrderedCommenters();
  const displayCountdown = isDemoMode ? simCountdown : localCountdown;
  const isCountdownCritical = displayCountdown <= 10 && isLive;
  const displayParticipantCount = isDemoMode ? simParticipantCount : cycle.participant_count;
  
  // Check if current user is winning (has the latest comment / is leader)
  const currentUserIsWinning = orderedCommenters.length > 0 && 
    orderedCommenters[0]?.id === user?.id && 
    participation.isParticipant && 
    !participation.isSpectator &&
    isLive;

  return (
    <div className={`min-h-screen bg-background flex flex-col transition-all duration-500 ease-out ${isEntering ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
      {/* Confetti on winning comment */}
      {showConfetti && <Confetti duration={3000} />}
      
      {/* YOU ARE WINNING Banner */}
      <WinningBanner 
        isVisible={currentUserIsWinning} 
        prizeAmount={effectivePrizePool * (cycle.prize_distribution[0] / 100)} 
      />
      
      {/* Game End Freeze Overlay */}
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

      {/* Live Header */}
      <div className="sticky top-0 z-20 bg-gradient-to-b from-background via-background to-transparent">
        {/* Top Bar */}
        <div className="p-3 flex items-center justify-between">
          <button
            onClick={() => { 
              play('click'); 
              buttonClick(); 
              if (isLive && participation.isParticipant && !participation.isSpectator) {
                setShowLeaveWarning(true);
              } else {
                navigate('/arena'); 
              }
            }}
            className="w-10 h-10 rounded-xl bg-muted/80 flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          
          <div className="flex items-center gap-2">
            <span className={`flex items-center gap-1.5 text-sm font-bold px-3 py-1.5 rounded-full ${
              isLive ? 'bg-red-500/20 text-red-400 animate-pulse' : 
              cycle.status === 'opening' ? 'bg-green-500/20 text-green-400' :
              'bg-blue-500/20 text-blue-400'
            }`}>
              {isLive ? <Radio className="w-4 h-4" /> : 
               cycle.status === 'opening' ? <Play className="w-4 h-4" /> :
               <Clock className="w-4 h-4" />}
              {isLive ? 'LIVE' : cycle.status.toUpperCase()}
            </span>
          </div>
          
          {/* Share button */}
          <button
            onClick={() => { play('click'); buttonClick(); setShowShareModal(true); }}
            className="w-10 h-10 rounded-xl bg-muted/80 flex items-center justify-center"
          >
            <Share2 className="w-5 h-5 text-foreground" />
          </button>
          
          {/* Fullscreen toggle for mobile */}
          {isMobile && (
            <button
              onClick={toggleFullscreen}
              className="w-10 h-10 rounded-xl bg-muted/80 flex items-center justify-center"
            >
              {isFullscreen ? (
                <Minimize className="w-5 h-5 text-foreground" />
              ) : (
                <Maximize className="w-5 h-5 text-foreground" />
              )}
            </button>
          )}
        </div>

        {/* Game Title & Prize - Compact */}
        <div className="px-4 pb-2 text-center">
          <h1 className="text-lg font-black text-foreground flex items-center justify-center gap-2">
            <Crown className="w-5 h-5 text-gold" />
            {cycle.template_name}
          </h1>
          <p className="text-2xl font-black text-gold">
            {formatMoney(effectivePrizePool)}
          </p>
        </div>

        {/* Compact Host Banner */}
        {isLive && (
          <div className="px-4 pb-2">
            <CompactHostBanner isLive={isLive} isSpeaking={hostIsSpeaking} />
          </div>
        )}

        {/* Stats Bar */}
        <div className="px-4 pb-3 grid grid-cols-3 gap-2">
          <div className="text-center py-2 rounded-xl bg-muted/50 backdrop-blur-sm">
            <p className="text-[10px] text-muted-foreground uppercase flex items-center justify-center gap-1">
              <Users className="w-3 h-3" /> Players
            </p>
            <p className="text-lg font-bold text-foreground">{displayParticipantCount}</p>
          </div>
          
          {isLive && (
            <>
              <div className="text-center py-2 rounded-xl bg-muted/50 backdrop-blur-sm">
                <p className="text-[10px] text-muted-foreground uppercase flex items-center justify-center gap-1">
                  <MessageCircle className="w-3 h-3" /> Comments
                </p>
                <p className="text-lg font-bold text-foreground">{comments.length}</p>
              </div>
              <div className={`text-center py-2 rounded-xl ${
                gameTimeRemaining <= 60 
                  ? 'bg-gradient-to-r from-red-500/20 to-orange-500/20 border border-red-500/30' 
                  : 'bg-muted/50'
              } backdrop-blur-sm`}>
                <p className="text-[10px] text-muted-foreground uppercase flex items-center justify-center gap-1">
                  <Hourglass className={`w-3 h-3 ${gameTimeRemaining <= 60 ? 'text-red-400 animate-pulse' : ''}`} /> 
                  Game Ends
                </p>
                <p className={`text-lg font-bold ${gameTimeRemaining <= 60 ? 'text-red-400' : 'text-foreground'}`}>
                  {formatTime(gameTimeRemaining)}
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Main Content - Scrollable */}
      <div className="flex-1 flex flex-col overflow-hidden px-4">
        {/* Comment Reset Timer - Clean Minimal */}
        {isLive && (
          <div className={`mb-4 rounded-2xl overflow-hidden transition-all duration-300 ${
            isCountdownCritical ? 'ring-2 ring-destructive/50' : ''
          }`}>
            <div className={`px-5 py-4 ${
              isCountdownCritical 
                ? 'bg-destructive/10' 
                : 'bg-muted/40'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    isCountdownCritical 
                      ? 'bg-destructive/20 text-destructive' 
                      : 'bg-primary/10 text-primary'
                  }`}>
                    <Timer className={`w-5 h-5 ${isCountdownCritical ? 'animate-pulse' : ''}`} />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Comment to reset
                    </p>
                    <p className={`text-2xl font-bold tabular-nums tracking-tight ${
                      isCountdownCritical ? 'text-destructive' : 'text-foreground'
                    }`}>
                      {formatTime(displayCountdown)}
                    </p>
                  </div>
                </div>
                
                {isCountdownCritical && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-destructive/20 rounded-full">
                    <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                    <span className="text-xs font-semibold text-destructive uppercase tracking-wide">
                      Hurry!
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Leaders Section - Podium Layout (2nd, 1st, 3rd) */}
        {isLive && orderedCommenters.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Leaders</h3>
              <span className="text-[10px] text-muted-foreground">
                Top {Math.min(orderedCommenters.length, cycle.winner_count)} win
              </span>
            </div>
            
            {/* Podium order: 2nd, 1st, 3rd - with height differentiation */}
            <div className="flex gap-2 items-end justify-center pt-4">
              {(() => {
                const topCommenters = orderedCommenters.slice(0, Math.min(3, cycle.winner_count));
                // Reorder to podium layout: [2nd, 1st, 3rd] for display
                const podiumOrder = topCommenters.length >= 2 
                  ? [topCommenters[1], topCommenters[0], topCommenters[2]].filter(Boolean)
                  : topCommenters;
                
                return podiumOrder.map((c, displayIdx) => {
                  // Get actual position (1st, 2nd, 3rd)
                  const actualPosition = topCommenters.indexOf(c);
                  const prizePercent = cycle.prize_distribution[actualPosition] || 0;
                  const prizeAmount = Math.floor(effectivePrizePool * 0.9 * (prizePercent / 100));
                  const isCurrentUser = c.id === user?.id;
                  const isLeader = actualPosition === 0;
                  
                  // Podium heights: 1st (center) = tallest, 2nd (left) = medium, 3rd (right) = shortest
                  const podiumHeight = actualPosition === 0 ? 'h-28' : actualPosition === 1 ? 'h-24' : 'h-20';
                  const cardSize = actualPosition === 0 ? 'min-w-[110px]' : 'min-w-[90px]';
                  
                  return (
                    <div key={c.user_id} className={`flex flex-col items-center ${cardSize}`}>
                      {/* Card content */}
                      <div 
                        className={`w-full flex flex-col items-center p-3 rounded-t-xl transition-all duration-300 ${
                          isLeader 
                            ? `bg-gold/10 border border-b-0 border-gold/30 ${leaderChanged ? 'animate-scale-in' : ''}` 
                            : 'bg-muted/30 border border-b-0 border-border/50'
                        } ${isCurrentUser ? 'ring-2 ring-primary/40 ring-offset-0' : ''}`}
                      >
                        {/* Avatar */}
                        <span className={`${actualPosition === 0 ? 'text-3xl' : 'text-2xl'} ${isLeader && leaderChanged ? 'animate-bounce' : ''}`}>
                          {c.avatar}
                        </span>
                        
                        {/* Name */}
                        <p className={`text-xs font-semibold truncate max-w-full text-center mt-1 ${
                          isLeader ? 'text-gold' : 'text-foreground'
                        }`}>
                          {c.username}
                        </p>
                        
                        {isCurrentUser && (
                          <span className="text-[9px] text-primary font-medium">You</span>
                        )}
                      </div>
                      
                      {/* Podium base with height variation */}
                      <div 
                        className={`w-full ${podiumHeight} rounded-b-xl flex flex-col items-center justify-start pt-2 ${
                          isLeader 
                            ? 'bg-gradient-to-b from-gold/20 to-gold/5 border-x border-b border-gold/30' 
                            : actualPosition === 1
                              ? 'bg-gradient-to-b from-gray-400/20 to-gray-400/5 border-x border-b border-gray-400/30'
                              : 'bg-gradient-to-b from-amber-600/20 to-amber-600/5 border-x border-b border-amber-600/30'
                        }`}
                      >
                        {/* Position Badge */}
                        <span className={`${actualPosition === 0 ? 'text-2xl' : 'text-xl'}`}>
                          {actualPosition === 0 ? '🥇' : actualPosition === 1 ? '🥈' : '🥉'}
                        </span>
                        
                        {/* Prize */}
                        <p className={`text-xs font-bold mt-1 ${
                          isLeader ? 'text-gold' : actualPosition === 1 ? 'text-gray-300' : 'text-amber-500'
                        }`}>
                          {formatMoney(prizeAmount)}
                        </p>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        )}

        {/* Voice Room */}
        {isLive && cycleId && (
          <div className="mb-3">
            <VoiceRoomLive 
              gameId={cycleId} 
              simulatedParticipants={voiceParticipantsToPass.length > 0 ? voiceParticipantsToPass : undefined}
            />
          </div>
        )}

        {/* Comments Feed - Scrolls behind input */}
        <div className="flex-1 flex flex-col min-h-0 relative">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-foreground flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              Live Comments
            </span>
            {comments.length > 0 && (
              <span className="text-xs text-muted-foreground">{comments.length} messages</span>
            )}
          </div>
          
          {/* Comments container with gradient fade at bottom */}
          <div className="relative flex-1 min-h-0">
            <div 
              ref={commentsContainerRef}
              className="absolute inset-0 overflow-y-auto space-y-2 rounded-xl bg-muted/20 p-3 pb-16"
            >
              {comments.length === 0 ? (
                <div className="text-center py-8">
                  <MessageCircle className="w-10 h-10 text-muted-foreground/50 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {isLive ? 'Be the first to comment!' : 'Comments appear when live'}
                  </p>
                </div>
              ) : (
                comments.map((comment, idx) => {
                  const isTopCommenter = orderedCommenters.findIndex(c => c.user_id === comment.user_id) < cycle.winner_count;
                  
                  return (
                    <div 
                      key={comment.id} 
                      className={`flex gap-2 p-2 rounded-lg transition-all ${
                        comment.user_id === user?.id 
                          ? 'bg-primary/15 border border-primary/30' 
                          : isTopCommenter 
                            ? 'bg-gold/10 border border-gold/20'
                            : 'bg-muted/50'
                      } ${idx === 0 ? 'animate-fade-in' : ''}`}
                    >
                      <div className="text-xl flex-shrink-0">{comment.avatar}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-foreground">{comment.username}</span>
                          {isTopCommenter && <Award className="w-3 h-3 text-gold" />}
                          <span className="text-[9px] text-muted-foreground ml-auto">
                            {new Date(comment.server_timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-sm text-foreground break-words">{comment.content}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            
            {/* Gradient fade overlay at bottom */}
            <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background to-transparent pointer-events-none rounded-b-xl" />
          </div>
        </div>
      </div>

      {/* Action Area - Fixed Bottom with comments scrolling behind */}
      <div className="sticky bottom-0 z-10 bg-background pt-2 px-4 pb-4 space-y-3">
        {/* Not joined yet */}
        {!participation.isParticipant && (
          <div className="flex gap-3">
            {cycle.status === 'opening' && (
              <button
                onClick={() => handleJoin(false)}
                disabled={joining}
                className="flex-1 btn-primary py-4 text-lg font-bold flex items-center justify-center gap-2"
              >
                {joining ? (
                  <div className="w-6 h-6 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                ) : (
                  <>
                    <Zap className="w-6 h-6" />
                    Enter Game • {cycle.entry_fee > 0 ? formatMoney(cycle.entry_fee) : 'FREE'}
                  </>
                )}
              </button>
            )}
            
            {isLive && cycle.allow_spectators && (
              <button
                onClick={() => handleJoin(true)}
                disabled={joining}
                className="flex-1 py-4 px-4 rounded-xl bg-muted text-foreground font-medium flex items-center justify-center gap-2"
              >
                <Eye className="w-5 h-5" />
                Watch Live
              </button>
            )}
            
            {isLive && !cycle.allow_spectators && (
              <div className="flex-1 py-4 px-4 rounded-xl bg-red-500/10 border border-red-500/20 text-center">
                <p className="text-sm text-red-400">Entry closed • Game in progress</p>
              </div>
            )}
          </div>
        )}

        {/* Joined - Comment input */}
        {canComment && (
          <div className="flex gap-3">
            <input
              ref={inputRef}
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendComment()}
              placeholder={isCountdownCritical ? "🔥 QUICK! Type to survive!" : "Type to stay alive..."}
              className={`flex-1 px-4 py-4 rounded-xl bg-muted border-2 focus:outline-none text-foreground text-lg ${
                isCountdownCritical 
                  ? 'border-red-500 focus:border-red-400 placeholder:text-red-400/70' 
                  : 'border-border focus:border-primary'
              }`}
              maxLength={200}
              autoFocus
            />
            <button
              onClick={handleSendComment}
              disabled={sending || !commentText.trim()}
              className={`w-14 h-14 rounded-xl flex items-center justify-center disabled:opacity-50 transition-all ${
                isCountdownCritical 
                  ? 'bg-red-500 text-white' 
                  : 'bg-primary text-primary-foreground'
              }`}
            >
              {sending ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Send className="w-6 h-6" />
              )}
            </button>
          </div>
        )}

        {/* Spectator notice */}
        {participation.isSpectator && (
          <div className="flex items-center justify-center gap-2 py-3 text-muted-foreground bg-muted/50 rounded-xl">
            <Eye className="w-5 h-5" />
            <span className="text-sm">Watching as spectator</span>
          </div>
        )}

        {/* Participant but game not live yet */}
        {participation.isParticipant && !participation.isSpectator && !isLive && (
          <div className="flex items-center justify-center gap-2 py-4 bg-green-500/10 border border-green-500/20 rounded-xl">
            <Sparkles className="w-5 h-5 text-green-400 animate-pulse" />
            <span className="text-sm text-green-400 font-medium">You're in! Waiting for game to start...</span>
          </div>
        )}
      </div>

      {/* Leave Game Warning Dialog */}
      <AlertDialog open={showLeaveWarning} onOpenChange={setShowLeaveWarning}>
        <AlertDialogContent className="max-w-[90vw] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="w-5 h-5" />
              Leave Live Game?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              You are currently in a <strong className="text-foreground">LIVE game</strong>. If you leave now, 
              you will stop receiving comments and could lose your position in the leaderboard.
              Your entry fee is non-refundable.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl">Stay in Game</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => navigate('/arena')}
              className="bg-red-500 hover:bg-red-600 rounded-xl"
            >
              Leave Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
