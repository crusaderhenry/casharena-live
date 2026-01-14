import { useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { ShareCard } from '@/components/ShareCard';
import { Confetti } from '@/components/Confetti';
import { X, PartyPopper } from 'lucide-react';
import { useSounds } from '@/hooks/useSounds';
import { useHaptics } from '@/hooks/useHaptics';

interface WinnerCelebrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
  avatar: string;
  position: number;
  prizeAmount: number;
  cycleId?: string;
  userId?: string;
}

export const WinnerCelebrationModal = ({
  isOpen,
  onClose,
  username,
  avatar,
  position,
  prizeAmount,
  cycleId,
  userId,
}: WinnerCelebrationModalProps) => {
  const { play } = useSounds();
  const { prizeWin } = useHaptics();

  // Play celebration sound and haptic when modal opens
  useEffect(() => {
    if (isOpen) {
      play('prizeWin');
      prizeWin();
    }
  }, [isOpen, play, prizeWin]);

  const getPositionEmoji = (pos: number) => {
    switch (pos) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return '🏆';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0 overflow-hidden bg-transparent border-0">
        <DialogTitle className="sr-only">Congratulations - You Won!</DialogTitle>
        
        {isOpen && <Confetti />}
        
        <div className="bg-gradient-to-b from-card via-card to-background rounded-2xl border border-gold/30 overflow-hidden">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-background/80 flex items-center justify-center hover:bg-background transition-colors"
          >
            <X className="w-4 h-4 text-foreground" />
          </button>

          {/* Header celebration */}
          <div className="relative bg-gradient-to-r from-gold/20 via-gold/30 to-gold/20 p-6 text-center">
            {/* Animated sparkles */}
            <div className="absolute inset-0 overflow-hidden">
              <PartyPopper className="absolute top-2 left-4 w-6 h-6 text-gold animate-bounce" />
              <PartyPopper className="absolute top-4 right-6 w-5 h-5 text-gold animate-bounce delay-100" />
              <PartyPopper className="absolute bottom-2 left-1/4 w-4 h-4 text-gold animate-bounce delay-200" />
            </div>

            <div className="text-6xl mb-2">{getPositionEmoji(position)}</div>
            <h2 className="text-3xl font-black text-gold mb-1">YOU WON!</h2>
            <p className="text-sm text-muted-foreground">
              {position === 1 ? '1st Place Champion!' : 
               position === 2 ? '2nd Place Winner!' : 
               position === 3 ? '3rd Place Finisher!' : 
               `Position #${position}`}
            </p>
          </div>

          {/* Share card */}
          <div className="p-4">
            <p className="text-sm text-muted-foreground text-center mb-4">
              🎉 Share your victory with friends!
            </p>
            
            <ShareCard
              username={username}
              avatar={avatar}
              position={position}
              amount={prizeAmount}
              gameType="finger"
              cycleId={cycleId}
              userId={userId}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
