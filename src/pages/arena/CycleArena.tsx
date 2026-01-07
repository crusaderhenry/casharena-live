import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BottomNav } from '@/components/BottomNav';
import { useCycleJoin } from '@/hooks/useCycleJoin';
import { useCycleComments } from '@/hooks/useCycleComments';
import { useAuth } from '@/contexts/AuthContext';
import { useSounds } from '@/hooks/useSounds';
import { useHaptics } from '@/hooks/useHaptics';
import { supabase } from '@/integrations/supabase/client';
import { 
  ArrowLeft, Send, Users, Timer, Crown, Eye, Trophy, 
  Zap, MessageCircle, Clock, Play, Radio, Sparkles 
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
  const commentsContainerRef = useRef<HTMLDivElement>(null);

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
          if (updated.status === 'ended') {
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
    }, 1000);

    return () => clearInterval(interval);
  }, [cycle?.status]);

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
  const isLive = cycle.status === 'live' || cycle.status === 'ending';
  const canComment = participation.isParticipant && !participation.isSpectator && isLive;
  const orderedCommenters = getOrderedCommenters();

  return (
    <div className="min-h-screen bg-background flex flex-col">
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
              <Crown className="w-5 h-5 text-primary" />
              {cycle.template_name}
            </h1>
            <div className="flex items-center gap-2">
              <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                isLive ? 'bg-red-500/20 text-red-400' : 
                cycle.status === 'opening' ? 'bg-green-500/20 text-green-400' :
                'bg-blue-500/20 text-blue-400'
              }`}>
                {isLive ? <Radio className="w-3 h-3" /> : 
                 cycle.status === 'opening' ? <Play className="w-3 h-3" /> :
                 <Clock className="w-3 h-3" />}
                {cycle.status.toUpperCase()}
              </span>
            </div>
          </div>
          
          {/* Countdown Timer - Large */}
          <div className={`text-center px-4 py-2 rounded-xl ${isLive ? 'bg-red-500/20' : 'bg-muted'}`}>
            <p className="text-[10px] text-muted-foreground uppercase">
              {isLive ? 'Timer' : 'Starts In'}
            </p>
            <p className={`text-2xl font-black ${isLive ? 'text-red-400' : 'text-foreground'}`}>
              {formatTime(localCountdown)}
            </p>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="px-4 pb-3 grid grid-cols-3 gap-3">
          <div className="text-center py-2 rounded-xl bg-muted/50">
            <p className="text-[10px] text-muted-foreground uppercase">Prize Pool</p>
            <p className="text-lg font-bold text-gold">{formatMoney(effectivePrizePool)}</p>
          </div>
          <div className="text-center py-2 rounded-xl bg-muted/50">
            <p className="text-[10px] text-muted-foreground uppercase">Players</p>
            <p className="text-lg font-bold text-foreground flex items-center justify-center gap-1">
              <Users className="w-4 h-4 text-primary" /> {cycle.participant_count}
            </p>
          </div>
          <div className="text-center py-2 rounded-xl bg-muted/50">
            <p className="text-[10px] text-muted-foreground uppercase">Winners</p>
            <p className="text-lg font-bold text-foreground">Top {cycle.winner_count}</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Leaderboard Preview - Top Commenters */}
        {isLive && orderedCommenters.length > 0 && (
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="w-4 h-4 text-gold" />
              <span className="text-sm font-bold text-foreground">Current Leaders</span>
            </div>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
              {orderedCommenters.slice(0, cycle.winner_count).map((c, i) => (
                <div key={c.user_id} className={`flex items-center gap-2 px-3 py-2 rounded-xl flex-shrink-0 ${
                  i === 0 ? 'bg-gold/20' : i === 1 ? 'bg-gray-400/20' : 'bg-amber-700/20'
                }`}>
                  <span className="text-lg">{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</span>
                  <span className="text-xl">{c.avatar}</span>
                  <span className="text-sm font-medium text-foreground truncate max-w-[80px]">
                    {c.username}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Comments Feed */}
        <div 
          ref={commentsContainerRef}
          className="flex-1 overflow-y-auto p-4 space-y-3"
        >
          {comments.length === 0 ? (
            <div className="text-center py-12">
              <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">
                {isLive ? 'Be the first to comment!' : 'Comments will appear here when the game goes live'}
              </p>
            </div>
          ) : (
            comments.map((comment) => (
              <div 
                key={comment.id} 
                className={`flex gap-3 p-3 rounded-xl ${
                  comment.user_id === user?.id ? 'bg-primary/10 border border-primary/20' : 'bg-muted/50'
                }`}
              >
                <div className="text-2xl flex-shrink-0">{comment.avatar}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-sm text-foreground">{comment.username}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(comment.server_timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-sm text-foreground break-words">{comment.content}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Action Area */}
        <div className="sticky bottom-0 bg-background border-t border-border p-4 space-y-3">
          {/* Not joined yet - State-aware actions */}
          {!participation.isParticipant && (
            <div className="flex gap-3">
              {/* Opening: Show Enter Game button */}
              {cycle.status === 'opening' && (
                <button
                  onClick={() => handleJoin(false)}
                  disabled={joining}
                  className="flex-1 btn-primary flex items-center justify-center gap-2"
                >
                  {joining ? (
                    <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  ) : (
                    <>
                      <Zap className="w-5 h-5" />
                      Enter Game • {cycle.entry_fee > 0 ? formatMoney(cycle.entry_fee) : 'FREE'}
                    </>
                  )}
                </button>
              )}
              
              {/* Live: Show Watch as Spectator button if allowed */}
              {isLive && (
                <>
                  {cycle.allow_spectators ? (
                    <button
                      onClick={() => handleJoin(true)}
                      disabled={joining}
                      className="flex-1 py-3 px-4 rounded-xl bg-muted text-foreground font-medium flex items-center justify-center gap-2"
                    >
                      <Eye className="w-5 h-5" />
                      Watch as Spectator
                    </button>
                  ) : (
                    <div className="flex-1 py-3 px-4 rounded-xl bg-muted text-center">
                      <p className="text-sm text-muted-foreground">Entry closed • Spectating disabled</p>
                    </div>
                  )}
                </>
              )}
              
              {/* Waiting: Entry disabled with clear message */}
              {cycle.status === 'waiting' && (
                <div className="flex-1 py-3 px-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center">
                  <p className="text-sm text-blue-400 font-medium flex items-center justify-center gap-2">
                    <Clock className="w-4 h-4" />
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
                placeholder="Type to stay alive..."
                className="flex-1 px-4 py-3 rounded-xl bg-muted border border-border focus:border-primary focus:outline-none text-foreground"
                maxLength={200}
              />
              <button
                onClick={handleSendComment}
                disabled={sending || !commentText.trim()}
                className="w-12 h-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50"
              >
                {sending ? (
                  <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>
          )}

          {/* Spectator notice */}
          {participation.isSpectator && (
            <div className="flex items-center justify-center gap-2 py-3 text-muted-foreground">
              <Eye className="w-5 h-5" />
              <span className="text-sm">Watching as spectator</span>
            </div>
          )}

          {/* Participant but game not live yet */}
          {participation.isParticipant && !participation.isSpectator && !isLive && (
            <div className="flex items-center justify-center gap-2 py-3">
              <Sparkles className="w-5 h-5 text-green-400" />
              <span className="text-sm text-green-400 font-medium">You're in! Waiting for game to start...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};