import { useState, useEffect } from 'react';
import { Volume2, X } from 'lucide-react';

interface AudioUnlockBannerProps {
  onUnlock: () => void;
}

/**
 * A banner that appears when browser autoplay is blocked.
 * Prompts user to tap to enable audio (Twitter Spaces style).
 */
export const AudioUnlockBanner = ({ onUnlock }: AudioUnlockBannerProps) => {
  const [isVisible, setIsVisible] = useState(true);

  const handleUnlock = () => {
    onUnlock();
    setIsVisible(false);
  };

  const handleDismiss = () => {
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
      <div className="flex items-center gap-3 bg-primary/90 backdrop-blur-md text-primary-foreground px-4 py-3 rounded-2xl shadow-lg border border-primary/50">
        <button
          onClick={handleUnlock}
          className="flex items-center gap-2 font-medium"
        >
          <div className="w-8 h-8 rounded-full bg-primary-foreground/20 flex items-center justify-center animate-pulse">
            <Volume2 className="w-4 h-4" />
          </div>
          <span className="text-sm">Tap to enable voice audio</span>
        </button>
        <button
          onClick={handleDismiss}
          className="p-1 rounded-full hover:bg-primary-foreground/20 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
