import { useRef, useEffect } from 'react';
import { MessageCircle, Award, Send, Flame } from 'lucide-react';

interface Comment {
  id: string;
  user_id: string;
  username: string;
  avatar: string;
  content: string;
  server_timestamp: string;
}

interface IGStyleCommentsProps {
  comments: Comment[];
  currentUserId?: string;
  leaderIds: string[];
  winnerCount: number;
  isLive: boolean;
  // Input props
  canComment: boolean;
  commentText: string;
  onCommentChange: (text: string) => void;
  onSendComment: () => void;
  sending: boolean;
  isCountdownCritical: boolean;
  isTimerPaused: boolean;
}

export const IGStyleComments = ({
  comments,
  currentUserId,
  leaderIds,
  winnerCount,
  isLive,
  canComment,
  commentText,
  onCommentChange,
  onSendComment,
  sending,
  isCountdownCritical,
  isTimerPaused,
}: IGStyleCommentsProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom (newest) when new comments arrive
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [comments.length]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSendComment();
    }
  };

  const getPlaceholder = () => {
    if (isTimerPaused) return 'Be the first to comment! 🎯';
    if (isCountdownCritical) return '🔥 QUICK! Type NOW!';
    return 'Type to stay alive...';
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Comments feed - scrolls from bottom to top (IG style) */}
      <div className="relative flex-1 min-h-0 mb-2">
        {/* Gradient fade at top */}
        <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-background to-transparent z-10 pointer-events-none" />
        
        <div 
          ref={containerRef}
          className="absolute inset-0 overflow-y-auto flex flex-col-reverse p-2 space-y-reverse space-y-1.5"
        >
          {comments.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
              <MessageCircle className="w-8 h-8 text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">
                {isLive ? 'Be the first to comment!' : 'Comments appear when live'}
              </p>
            </div>
          ) : (
            // Reverse order for IG-style (newest at bottom)
            [...comments].reverse().map((comment, idx) => {
              const isTopCommenter = leaderIds.slice(0, winnerCount).includes(comment.user_id);
              const isLeader = leaderIds[0] === comment.user_id;
              const isMe = comment.user_id === currentUserId;
              const isNewest = idx === comments.length - 1;

              return (
                <div 
                  key={comment.id} 
                  className={`flex items-start gap-2 px-2 py-1.5 rounded-xl transition-all ${
                    isMe 
                      ? 'bg-primary/15 border border-primary/30' 
                      : isLeader 
                        ? 'bg-gold/10 border border-gold/30'
                        : isTopCommenter 
                          ? 'bg-gold/5'
                          : 'bg-muted/30'
                  } ${isNewest ? 'animate-fade-in' : ''}`}
                >
                  {/* Avatar */}
                  <span className="text-lg flex-shrink-0">{comment.avatar}</span>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`font-bold text-xs ${isLeader ? 'text-gold' : 'text-foreground'}`}>
                        {comment.username}
                      </span>
                      {isLeader && <Award className="w-3 h-3 text-gold" />}
                      {isTopCommenter && !isLeader && <Award className="w-2.5 h-2.5 text-gold/60" />}
                    </div>
                    <p className="text-sm text-foreground/90 break-words leading-snug">
                      {comment.content}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Smart comment input */}
      {canComment && (
        <div className="flex gap-2 pt-2 border-t border-border/30">
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              value={commentText}
              onChange={(e) => onCommentChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={getPlaceholder()}
              className={`w-full px-4 py-3 rounded-full bg-muted/80 border-2 focus:outline-none text-foreground text-sm transition-all ${
                isCountdownCritical 
                  ? 'border-destructive focus:border-destructive placeholder:text-destructive/70 animate-pulse' 
                  : isTimerPaused
                    ? 'border-primary/50 focus:border-primary placeholder:text-primary/70'
                    : 'border-transparent focus:border-primary'
              }`}
              maxLength={200}
              autoFocus
            />
            
            {/* Critical indicator */}
            {isCountdownCritical && (
              <Flame className="absolute right-12 top-1/2 -translate-y-1/2 w-4 h-4 text-destructive animate-pulse" />
            )}
          </div>
          
          <button
            onClick={onSendComment}
            disabled={sending || !commentText.trim()}
            className={`w-11 h-11 rounded-full flex items-center justify-center disabled:opacity-50 transition-all flex-shrink-0 ${
              isCountdownCritical 
                ? 'bg-destructive text-white animate-pulse' 
                : 'bg-primary text-primary-foreground'
            }`}
          >
            {sending ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      )}
    </div>
  );
};
