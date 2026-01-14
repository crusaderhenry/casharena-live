import { Timer, Hourglass, Pause } from 'lucide-react';

interface DualTimerDisplayProps {
  commentTimer: number;
  gameTimeRemaining: number;
  isTimerPaused: boolean;
  hasComments: boolean;
}

export const DualTimerDisplay = ({
  commentTimer,
  gameTimeRemaining,
  isTimerPaused,
  hasComments,
}: DualTimerDisplayProps) => {
  const formatTime = (seconds: number) => {
    if (seconds <= 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isCommentCritical = commentTimer <= 10 && hasComments;
  const isGameCritical = gameTimeRemaining <= 60;
  const isGameEnding = gameTimeRemaining <= 10;

  return (
    <div className="grid grid-cols-2 gap-2 mb-3">
      {/* Comment Timer */}
      <div className={`relative p-3 rounded-xl transition-all ${
        isTimerPaused 
          ? 'bg-primary/10 border border-primary/30'
          : isCommentCritical 
            ? 'bg-destructive/15 border border-destructive/40 animate-pulse'
            : 'bg-muted/50'
      }`}>
        <div className="flex items-center gap-2 mb-1">
          {isTimerPaused ? (
            <Pause className="w-4 h-4 text-primary" />
          ) : (
            <Timer className={`w-4 h-4 ${isCommentCritical ? 'text-destructive animate-pulse' : 'text-muted-foreground'}`} />
          )}
          <span className={`text-[10px] uppercase font-medium ${
            isTimerPaused ? 'text-primary' : isCommentCritical ? 'text-destructive' : 'text-muted-foreground'
          }`}>
            {isTimerPaused ? 'Waiting for 1st' : 'Reset Timer'}
          </span>
        </div>
        <p className={`text-2xl font-bold tabular-nums ${
          isTimerPaused 
            ? 'text-primary'
            : isCommentCritical 
              ? 'text-destructive' 
              : 'text-foreground'
        }`}>
          {isTimerPaused ? 'PAUSED' : formatTime(commentTimer)}
        </p>
        
        {/* Critical indicator */}
        {isCommentCritical && (
          <div className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 bg-destructive/20 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
            <span className="text-[8px] font-bold text-destructive uppercase">HURRY</span>
          </div>
        )}
      </div>

      {/* Game End Timer */}
      <div className={`relative p-3 rounded-xl transition-all ${
        isGameEnding 
          ? 'bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-red-500/40 animate-pulse'
          : isGameCritical 
            ? 'bg-orange-500/15 border border-orange-500/30'
            : 'bg-muted/50'
      }`}>
        <div className="flex items-center gap-2 mb-1">
          <Hourglass className={`w-4 h-4 ${
            isGameEnding ? 'text-red-400 animate-bounce' : isGameCritical ? 'text-orange-400' : 'text-muted-foreground'
          }`} />
          <span className={`text-[10px] uppercase font-medium ${
            isGameEnding ? 'text-red-400' : isGameCritical ? 'text-orange-400' : 'text-muted-foreground'
          }`}>
            {isGameEnding ? 'ENDING!' : 'Game Ends'}
          </span>
        </div>
        <p className={`text-2xl font-bold tabular-nums ${
          isGameEnding 
            ? 'text-red-400 animate-pulse text-3xl'
            : isGameCritical 
              ? 'text-orange-400' 
              : 'text-foreground'
        }`}>
          {formatTime(gameTimeRemaining)}
        </p>
        
        {/* Ending soon badge */}
        {isGameCritical && !isGameEnding && (
          <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-orange-500/20 rounded-full">
            <span className="text-[8px] font-bold text-orange-400 uppercase">SOON</span>
          </div>
        )}
      </div>
    </div>
  );
};
