import { useState } from 'react';
import { Trophy, X, Crown, Sparkles } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

interface Winner {
  id: string;
  playerName: string;
  playerAvatar: string;
  amount: number;
  position: number;
  gameName?: string;
  timestamp?: string;
}

interface WinnerStoriesProps {
  winners: Winner[];
}

export const WinnerStories = ({ winners }: WinnerStoriesProps) => {
  const [selectedWinner, setSelectedWinner] = useState<Winner | null>(null);
  const [viewedWinners, setViewedWinners] = useState<Set<string>>(new Set());

  // Show placeholder when no real winners yet
  const showPlaceholder = winners.length === 0;

  const formatMoney = (amount: number) => {
    if (amount >= 1_000_000) return `₦${(amount / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
    if (amount >= 1_000) return `₦${(amount / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
    return `₦${amount?.toLocaleString() || 0}`;
  };

  const handleStoryClick = (winner: Winner) => {
    setSelectedWinner(winner);
    setViewedWinners(prev => new Set([...prev, winner.id]));
  };

  const getPositionEmoji = (position: number) => {
    switch (position) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return '🏆';
    }
  };

  const getPositionLabel = (position: number) => {
    switch (position) {
      case 1: return '1st Place';
      case 2: return '2nd Place';
      case 3: return '3rd Place';
      default: return `${position}th Place`;
    }
  };

  return (
    <>
      {/* Stories Row */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2 px-1">
          <Trophy className="w-4 h-4 text-gold" />
          Recent Winners
        </h3>
        
        {showPlaceholder ? (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/30 border border-dashed border-border">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-xl">
              🏆
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground">No winners yet</p>
              <p className="text-xs text-muted-foreground/70">Be the first to win!</p>
            </div>
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            {winners.map((winner, index) => {
              const isViewed = viewedWinners.has(winner.id);
              
              return (
                <button
                  key={winner.id}
                  onClick={() => handleStoryClick(winner)}
                  className="flex-shrink-0 flex flex-col items-center gap-1.5 group"
                >
                  {/* Story ring with gradient */}
                  <div className={`relative p-0.5 rounded-full ${
                    isViewed 
                      ? 'bg-muted' 
                      : index === 0 
                        ? 'bg-gradient-to-br from-gold via-yellow-500 to-orange-500 animate-pulse-slow'
                        : index === 1 
                          ? 'bg-gradient-to-br from-silver via-gray-400 to-gray-500'
                          : 'bg-gradient-to-br from-bronze via-orange-700 to-amber-600'
                  }`}>
                    <div className="relative w-16 h-16 rounded-full bg-card flex items-center justify-center text-2xl border-2 border-background">
                      {winner.playerAvatar}
                      {/* Position badge */}
                      <span className="absolute -bottom-1 -right-1 text-sm">
                        {getPositionEmoji(winner.position)}
                      </span>
                    </div>
                  </div>
                  
                  {/* Name */}
                  <span className="text-[11px] font-medium text-foreground truncate w-16 text-center">
                    {winner.playerName.split(' ')[0]}
                  </span>
                  
                  {/* Amount won */}
                  <span className="text-[10px] font-bold text-gold">
                    +{formatMoney(winner.amount)}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Story Viewer Dialog */}
      <Dialog open={!!selectedWinner} onOpenChange={() => setSelectedWinner(null)}>
        <DialogContent className="sm:max-w-md p-0 bg-gradient-to-b from-card to-background border-0 overflow-hidden">
          <VisuallyHidden>
            <DialogTitle>Winner Story</DialogTitle>
          </VisuallyHidden>
          
          {selectedWinner && (
            <div className="relative min-h-[70vh] flex flex-col items-center justify-center p-8">
              {/* Background effects */}
              <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-64 h-64 bg-gold/20 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-1/4 left-1/4 w-48 h-48 bg-primary/20 rounded-full blur-3xl" />
              </div>
              
              {/* Close button */}
              <button
                onClick={() => setSelectedWinner(null)}
                className="absolute top-4 right-4 p-2 rounded-full bg-background/50 hover:bg-background/80 transition-colors z-10"
              >
                <X className="w-5 h-5" />
              </button>
              
              {/* Content */}
              <div className="relative z-10 text-center space-y-6">
                {/* Crown for 1st place */}
                {selectedWinner.position === 1 && (
                  <Crown className="w-12 h-12 text-gold mx-auto animate-bounce-in" />
                )}
                
                {/* Avatar */}
                <div className="relative inline-block">
                  <div className={`w-28 h-28 rounded-3xl flex items-center justify-center text-6xl border-4 ${
                    selectedWinner.position === 1 
                      ? 'bg-gradient-to-br from-gold/30 to-gold/10 border-gold/50' 
                      : selectedWinner.position === 2 
                        ? 'bg-gradient-to-br from-silver/30 to-silver/10 border-silver/50'
                        : 'bg-gradient-to-br from-bronze/30 to-bronze/10 border-bronze/50'
                  } shadow-2xl animate-scale-in`}>
                    {selectedWinner.playerAvatar}
                  </div>
                  <span className="absolute -bottom-2 -right-2 text-3xl">
                    {getPositionEmoji(selectedWinner.position)}
                  </span>
                </div>
                
                {/* Name & Position */}
                <div className="space-y-1">
                  <h2 className="text-2xl font-black text-foreground">{selectedWinner.playerName}</h2>
                  <p className={`text-sm font-bold uppercase tracking-wider ${
                    selectedWinner.position === 1 ? 'text-gold' :
                    selectedWinner.position === 2 ? 'text-silver' : 'text-bronze'
                  }`}>
                    {getPositionLabel(selectedWinner.position)}
                  </p>
                </div>
                
                {/* Amount won */}
                <div className="bg-gradient-to-r from-gold/20 via-primary/20 to-gold/20 rounded-2xl p-6 border border-gold/30">
                  <p className="text-sm text-muted-foreground mb-1 flex items-center justify-center gap-1">
                    <Sparkles className="w-4 h-4 text-gold" />
                    Won
                  </p>
                  <p className="text-4xl font-black text-gold">
                    {formatMoney(selectedWinner.amount)}
                  </p>
                </div>
                
                {/* Game name if available */}
                {selectedWinner.gameName && (
                  <p className="text-xs text-muted-foreground">
                    Playing {selectedWinner.gameName}
                  </p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
