import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCycleJoin } from '@/hooks/useCycleJoin';
import { useCycleComments } from '@/hooks/useCycleComments';
import { useAuth } from '@/contexts/AuthContext';
import { useSounds } from '@/hooks/useSounds';
import { useHaptics } from '@/hooks/useHaptics';
import { useCycleHostTTS } from '@/hooks/useCycleHostTTS';
import { supabase } from '@/integrations/supabase/client';
import { VoiceRoomLive } from '@/components/VoiceRoomLive';
import { CompactHostBanner } from '@/components/CompactHostBanner';
import { LiveTimer } from '@/components/Countdown';
import { 
  ArrowLeft, Send, Users, Timer, Crown, Eye, Trophy, 
  Zap, MessageCircle, Clock, Play, Radio, Sparkles,
  Target, Flame, Award, AlertTriangle, Hourglass
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
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { play } = useSounds();
  const { buttonClick } = useHaptics();
  const { joinCycle, joining, checkParticipation } = useCycleJoin();
  const { comments, sendComment, sending, getOrderedCommenters } = useCycleComments(cycleId || null);
  
  const [cycle, setCycle] = useState<CycleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [participation, setParticipation] = useState<{ isParticipant: boolean; isSpectator: boolean }>({ isParticipant: false, isSpectator: false });
  const [commentText, setCommentText] = useState('');
  const [localCountdown, setLocalCountdown] = useState(0);
  const [gameTimeRemaining, setGameTimeRemaining] = useState(0);
  const [hostIsSpeaking, setHostIsSpeaking] = useState(false);
  const commentsContainerRef = useRef<HTMLDivElement>(null);
  const previousLeaderRef = useRef<string | null>(null);
  const announcedTimersRef = useRef<Set<number>>(new Set());

  const isLive = cycle?.status === 'live' || cycle?.status === 'ending';
  
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
    
    // Calculate game time remaining
    const liveEndAt = new Date(data.live_end_at).getTime();
    const now = Date.now();
    setGameTimeRemaining(Math.max(0, Math.floor((liveEndAt - now) / 1000)));
    
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
      .channel(`arena-cycle-${cycleId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'game_cycles', filter: `id=eq.${cycleId}` },
        (payload) => {
          const updated = payload.new as CycleData;
          setCycle(prev => prev ? { ...prev, ...updated } : null);
          setLocalCountdown(updated.countdown);

          // Handle game ended
          if (updated.status === 'ended' || updated.status === 'settled') {
            toast.success('Game ended!');
            navigate(`/arena/${cycleId}/results`);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [cycleId, navigate]);

  // Local countdown ticker (visual only, server is authoritative)
  useEffect(() => {
    if (!cycle || cycle.status !== 'live') return;

    const interval = setInterval(() => {
      setLocalCountdown(prev => Math.max(0, prev - 1));
      setGameTimeRemaining(prev => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [cycle?.status]);

  // Timer warning announcements
  useEffect(() => {
    if (!isLive) return;
    
    const orderedCommenters = getOrderedCommenters();
    const leader = orderedCommenters[0]?.username || null;
    
    // Announce at key thresholds
    if ([30, 10, 5].includes(localCountdown) && !announcedTimersRef.current.has(localCountdown)) {
      announcedTimersRef.current.add(localCountdown);
      announceTimerWarning(localCountdown, leader);
    }
    
    // Reset announced timers when countdown resets
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
    }
    
    previousLeaderRef.current = currentLeader;
  }, [comments, isLive, localCountdown, getOrderedCommenters, announceLeaderChange, play]);

  // Announce new comments via TTS
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
    const success = await sendComment(commentText);
    if (success) {
      setCommentText('');
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

  const effectivePrizePool = cycle.pool_value + (cycle.sponsored_prize_amount || 0);
  const canComment = participation.isParticipant && !participation.isSpectator && isLive;
  const orderedCommenters = getOrderedCommenters();
  const isCountdownCritical = localCountdown <= 10 && isLive;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Live Header */}
      <div className="sticky top-0 z-20 bg-gradient-to-b from-background via-background to-transparent">
        {/* Top Bar */}
        <div className="p-3 flex items-center justify-between">
          <button
            onClick={() => { play('click'); buttonClick(); navigate('/arena'); }}
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
          
          <div className="w-10" />
        </div>

        {/* Game Title & Prize */}
        <div className="px-4 pb-2 text-center">
          <h1 className="text-xl font-black text-foreground flex items-center justify-center gap-2">
            <Crown className="w-6 h-6 text-gold" />
            {cycle.template_name}
          </h1>
          <p className="text-3xl font-black text-gold mt-1">
            {formatMoney(effectivePrizePool)}
          </p>
          <p className="text-xs text-muted-foreground">Prize Pool • Top {cycle.winner_count} Winners</p>
        </div>

        {/* Compact Host Banner - Only shows icon, name, and mute button */}
        {isLive && (
          <div className="px-4 pb-2">
            <CompactHostBanner isLive={isLive} isSpeaking={hostIsSpeaking} />
          </div>
        )}

        {/* Live Stats Bar */}
        <div className="px-4 pb-3 grid grid-cols-3 gap-2">
          <div className="text-center py-2 rounded-xl bg-muted/50 backdrop-blur-sm">
            <p className="text-[10px] text-muted-foreground uppercase flex items-center justify-center gap-1">
              <Users className="w-3 h-3" /> Players
            </p>
            <p className="text-lg font-bold text-foreground">{cycle.participant_count}</p>
          </div>
          <div className="text-center py-2 rounded-xl bg-muted/50 backdrop-blur-sm">
            <p className="text-[10px] text-muted-foreground uppercase flex items-center justify-center gap-1">
              <MessageCircle className="w-3 h-3" /> Comments
            </p>
            <p className="text-lg font-bold text-foreground">{comments.length}</p>
          </div>
          {/* PROMINENT Game Ends In */}
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
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden px-4">
        {/* Comment Timer - MOST PROMINENT */}
        {isLive && (
          <div className={`mb-4 p-5 rounded-2xl text-center ${
            isCountdownCritical 
              ? 'bg-gradient-to-r from-red-500/30 via-red-500/40 to-red-500/30 border-2 border-red-500/60 animate-pulse shadow-lg shadow-red-500/20' 
              : 'bg-gradient-to-r from-primary/15 via-primary/25 to-primary/15 border border-primary/40'
          }`}>
            <div className="flex items-center justify-center gap-4">
              {isCountdownCritical ? (
                <AlertTriangle className="w-8 h-8 text-red-400 animate-bounce" />
              ) : (
                <Timer className="w-7 h-7 text-primary" />
              )}
              <div>
                <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${isCountdownCritical ? 'text-red-400' : 'text-muted-foreground'}`}>
                  ⏱️ Comment to Stay Alive
                </p>
                <LiveTimer 
                  seconds={localCountdown} 
                  size="lg" 
                  warning={isCountdownCritical} 
                />
              </div>
              {isCountdownCritical ? (
                <Flame className="w-8 h-8 text-red-400 animate-bounce" />
              ) : (
                <Target className="w-7 h-7 text-primary" />
              )}
            </div>
            {isCountdownCritical && (
              <p className="text-sm text-red-400 mt-3 font-bold animate-pulse">
                ⚠️ DANGER! Timer running low! Send a comment NOW!
              </p>
            )}
          </div>
        )}

        {/* Top 3 Contenders - BELOW Timer */}
        {isLive && orderedCommenters.length > 0 && (
          <div className="mb-4 p-4 rounded-2xl bg-gradient-to-r from-gold/5 via-gold/10 to-gold/5 border border-gold/20">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-gold" />
                <span className="text-sm font-bold text-foreground">Top Contenders</span>
              </div>
              <span className="text-xs text-muted-foreground">{orderedCommenters.length} active</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {orderedCommenters.slice(0, Math.min(3, cycle.winner_count)).map((c, i) => {
                const prizePercent = cycle.prize_distribution[i] || 0;
                const prizeAmount = Math.floor(effectivePrizePool * (0.9) * (prizePercent / 100));
                
                return (
                  <div 
                    key={c.user_id} 
                    className={`relative p-3 rounded-xl text-center ${
                      i === 0 ? 'bg-gradient-to-b from-gold/30 to-gold/10 border border-gold/40' : 
                      i === 1 ? 'bg-gradient-to-b from-gray-400/20 to-gray-400/5 border border-gray-400/30' : 
                      'bg-gradient-to-b from-amber-700/20 to-amber-700/5 border border-amber-700/30'
                    }`}
                  >
                    <div className="text-3xl mb-1">
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}
                    </div>
                    <div className="text-2xl mb-1">{c.avatar}</div>
                    <p className="text-xs font-bold text-foreground truncate">{c.username}</p>
                    <p className="text-[10px] text-gold font-medium">{formatMoney(prizeAmount)}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Voice Room */}
        {isLive && cycleId && (
          <div className="mb-4">
            <VoiceRoomLive gameId={cycleId} />
          </div>
        )}

        {/* Comments Feed */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-foreground flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              Live Comments
            </span>
            {comments.length > 0 && (
              <span className="text-xs text-muted-foreground">{comments.length} messages</span>
            )}
          </div>
          
          <div 
            ref={commentsContainerRef}
            className="flex-1 overflow-y-auto space-y-2 rounded-xl bg-muted/20 p-3"
            style={{ maxHeight: '200px' }}
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
                    } ${idx === 0 ? 'animate-pulse' : ''}`}
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
        </div>
      </div>

      {/* Action Area - Fixed Bottom */}
      <div className="sticky bottom-0 bg-gradient-to-t from-background via-background to-transparent pt-4 px-4 pb-4 space-y-3">
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
            
            {cycle.status === 'waiting' && (
              <div className="flex-1 py-4 px-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center">
                <p className="text-sm text-blue-400 font-medium flex items-center justify-center gap-2">
                  <Clock className="w-4 h-4 animate-pulse" />
                  Entry opens soon
                </p>
              </div>
            )}
          </div>
        )}

        {/* Joined - Comment input */}
        {canComment && (
          <div className="flex gap-3">
            <input
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
                  ? 'bg-red-500 text-white animate-pulse' 
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
    </div>
  );
};
