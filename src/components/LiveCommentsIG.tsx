import { useRef, useEffect } from 'react';
import { Award, Crown } from 'lucide-react';

interface Comment {
  id: string;
  user_id: string;
  username: string;
  avatar: string;
  content: string;
  server_timestamp: string;
}

interface Commenter {
  id: string;
  user_id: string;
  username: string;
  avatar: string;
}

interface LiveCommentsIGProps {
  comments: Comment[];
  orderedCommenters: Commenter[];
  winnerCount: number;
  currentUserId?: string;
  maxHeight?: string;
  highlightWinners?: boolean;
  bottomOffset?: string;
}

export const LiveCommentsIG = ({ 
  comments, 
  orderedCommenters, 
  winnerCount, 
  currentUserId,
  maxHeight = '300px',
  highlightWinners = false,
  bottomOffset = '0px'
}: LiveCommentsIGProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom (newest) on new comments
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [comments.length]);

  // Reverse comments for IG-style (newest at bottom)
  const reversedComments = [...comments].reverse();

  const getPosition = (userId: string): number | null => {
    const idx = orderedCommenters.findIndex(c => c.user_id === userId);
    return idx >= 0 && idx < winnerCount ? idx + 1 : null;
  };

  const getPositionIcon = (position: number) => {
    switch (position) {
      case 1: return <Crown className="w-3 h-3 text-gold" />;
      case 2: return <span className="text-[10px]">🥈</span>;
      case 3: return <span className="text-[10px]">🥉</span>;
      default: return <Award className="w-3 h-3 text-primary/60" />;
    }
  };

  if (comments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
          <span className="text-2xl">💬</span>
        </div>
        <p className="text-sm text-muted-foreground">Be the first to comment!</p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          Last commenter when timer ends wins
        </p>
      </div>
    );
  }

  // Get the last (most recent) comment - this is the winning comment
  const winningCommentId = comments.length > 0 ? comments[0].id : null;

  return (
    <div className="relative" style={{ height: maxHeight }}>
      {/* Gradient fade at top */}
      <div className="absolute top-0 left-0 right-0 h-12 bg-gradient-to-b from-background to-transparent z-10 pointer-events-none" />
      
      {/* Pinned Last Comment (Winning Comment) for transparency */}
      {highlightWinners && comments.length > 0 && (
        <div className="absolute bottom-0 left-0 right-0 z-20 p-2 bg-gradient-to-t from-background via-background to-transparent">
          <div className="p-3 rounded-xl bg-gold/20 border border-gold/30">
            <p className="text-[10px] text-gold uppercase font-bold mb-1">🏆 Last Comment (Winner)</p>
            <div className="flex items-center gap-2">
              <span className="text-lg">{comments[0].avatar}</span>
              <div className="flex-1 min-w-0">
                <span className="text-xs font-bold text-gold">{comments[0].username}</span>
                <p className="text-sm text-foreground truncate">{comments[0].content}</p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Comments container - IG style (newest at bottom) */}
      <div 
        ref={containerRef}
        className="h-full overflow-y-auto px-2 py-2 space-y-1 scroll-smooth"
        style={{ 
          scrollbarWidth: 'none', 
          msOverflowStyle: 'none',
          paddingBottom: highlightWinners ? '6rem' : `calc(${bottomOffset} + 16px)`
        }}
      >
        <style>{`div::-webkit-scrollbar { display: none; }`}</style>
        
        {reversedComments.map((comment, idx) => {
          const position = getPosition(comment.user_id);
          const isCurrentUser = comment.user_id === currentUserId;
          const isNewest = idx === reversedComments.length - 1;
          const isWinningComment = comment.id === winningCommentId;
          
          return (
            <div 
              key={comment.id} 
              className={`flex items-start gap-2 py-1.5 px-2 rounded-xl transition-all ${
                isNewest ? 'animate-slide-in-bottom' : ''
              } ${
                isWinningComment && highlightWinners
                  ? 'bg-gold/20 border border-gold/30 ring-2 ring-gold/20'
                  : isCurrentUser 
                    ? 'bg-primary/10' 
                    : position 
                      ? 'bg-gold/5' 
                      : 'bg-transparent'
              }`}
            >
              {/* Avatar */}
              <div className="relative shrink-0">
                <span className="text-lg">{comment.avatar}</span>
                {position && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-background flex items-center justify-center">
                    {getPositionIcon(position)}
                  </div>
                )}
              </div>
              
              {/* Content */}
              <div className="flex-1 min-w-0">
                <span className={`text-xs font-bold ${
                  isWinningComment && highlightWinners ? 'text-gold' :
                  position === 1 ? 'text-gold' : 
                  position ? 'text-primary' : 
                  isCurrentUser ? 'text-primary' :
                  'text-foreground'
                }`}>
                  {comment.username}
                  {isCurrentUser && <span className="ml-1 text-[10px] font-normal">(you)</span>}
                  {isWinningComment && highlightWinners && <span className="ml-1 text-[10px] font-normal">🏆</span>}
                </span>
                <p className="text-sm text-foreground/90 break-words leading-tight">
                  {comment.content}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
