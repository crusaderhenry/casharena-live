import { useEffect, useRef, useCallback } from 'react';
import { Confetti } from '@/components/Confetti';
import { X, Share2, Twitter, Facebook, MessageCircle } from 'lucide-react';
import html2canvas from 'html2canvas';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface BadgeCelebrationProps {
  badge: {
    id: string;
    name: string;
    description: string;
    icon: React.ReactNode;
    color: string;
    bgColor: string;
  };
  onDismiss: () => void;
}

const BRAGGING_CAPTIONS = [
  "Just unlocked a new badge on FortunesHQ! 🏆🔥",
  "Another achievement unlocked! Who's next? 💪",
  "Making moves on FortunesHQ! 🚀",
  "Badge collector mode: ON 🎮✨",
  "Leveling up one badge at a time! 🎯",
];

export const BadgeCelebration = ({ badge, onDismiss }: BadgeCelebrationProps) => {
  const { profile } = useAuth();
  const shareCardRef = useRef<HTMLDivElement>(null);
  
  const username = profile?.username || 'Player';
  const caption = BRAGGING_CAPTIONS[Math.floor(Math.random() * BRAGGING_CAPTIONS.length)];
  
  // Auto-dismiss after 8 seconds
  useEffect(() => {
    const timer = setTimeout(onDismiss, 8000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const generateShareImage = useCallback(async (): Promise<Blob | null> => {
    if (!shareCardRef.current) return null;
    
    try {
      const canvas = await html2canvas(shareCardRef.current, {
        backgroundColor: '#1a1a2e',
        scale: 2,
      });
      
      return new Promise((resolve) => {
        canvas.toBlob((blob) => resolve(blob), 'image/png', 0.95);
      });
    } catch (error) {
      console.error('Error generating share image:', error);
      return null;
    }
  }, []);

  const shareToTwitter = useCallback(() => {
    const text = `${caption}\n\n🏅 ${badge.name}\n👤 ${username}\n\nJoin me on FortunesHQ!`;
    const url = 'https://fortuneshq.com';
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      '_blank'
    );
    toast.success('Opening Twitter...');
  }, [caption, badge.name, username]);

  const shareToFacebook = useCallback(() => {
    const url = 'https://fortuneshq.com';
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(`${caption} - ${badge.name}`)}`,
      '_blank'
    );
    toast.success('Opening Facebook...');
  }, [caption, badge.name]);

  const shareToWhatsApp = useCallback(() => {
    const text = `${caption}\n\n🏅 ${badge.name}\n👤 ${username}\n\nJoin me on FortunesHQ! https://fortuneshq.com`;
    window.open(
      `https://wa.me/?text=${encodeURIComponent(text)}`,
      '_blank'
    );
    toast.success('Opening WhatsApp...');
  }, [caption, badge.name, username]);

  const handleNativeShare = useCallback(async () => {
    const shareData = {
      title: `${badge.name} - FortunesHQ`,
      text: `${caption}\n\n🏅 ${badge.name}\n👤 ${username}`,
      url: 'https://fortuneshq.com',
    };

    try {
      // Try to generate and share image
      const imageBlob = await generateShareImage();
      
      if (imageBlob && navigator.canShare) {
        const file = new File([imageBlob], 'badge.png', { type: 'image/png' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            ...shareData,
            files: [file],
          });
          toast.success('Shared!');
          return;
        }
      }
      
      if (navigator.share) {
        await navigator.share(shareData);
        toast.success('Shared!');
      } else {
        // Fallback to copying to clipboard
        await navigator.clipboard.writeText(`${shareData.text}\n\n${shareData.url}`);
        toast.success('Copied to clipboard!');
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Share failed:', error);
        // Fallback to copy
        try {
          await navigator.clipboard.writeText(`${shareData.text}\n\n${shareData.url}`);
          toast.success('Copied to clipboard!');
        } catch {
          toast.error('Failed to share');
        }
      }
    }
  }, [badge.name, caption, username, generateShareImage]);

  return (
    <>
      <Confetti duration={4000} />
      
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
        onClick={onDismiss}
      >
        {/* Card */}
        <div 
          className="relative bg-card border border-primary/30 rounded-3xl p-6 max-w-sm w-full text-center animate-scale-in shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button 
            onClick={onDismiss}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Glow effect */}
          <div className={`absolute inset-0 ${badge.bgColor} rounded-3xl blur-xl opacity-50`} />
          
          <div className="relative z-10">
            {/* Title */}
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">
              🎉 Achievement Unlocked!
            </p>

            {/* Shareable Card (hidden, used for screenshot) */}
            <div 
              ref={shareCardRef}
              className="absolute -left-[9999px] w-[400px] h-[400px] bg-gradient-to-br from-[#1a1a2e] to-[#16213e] p-8 flex flex-col items-center justify-center"
            >
              <p className="text-white/60 text-sm mb-4">FortunesHQ</p>
              <div className={`w-32 h-32 rounded-full ${badge.bgColor} ${badge.color} flex items-center justify-center mb-4 border-4 border-current/30`}>
                <span className="text-6xl">{badge.icon}</span>
              </div>
              <h2 className={`text-3xl font-black ${badge.color} mb-2`}>{badge.name}</h2>
              <p className="text-white/60 text-sm mb-4">{badge.description}</p>
              <div className="flex items-center gap-2 mt-4">
                <span className="text-2xl">{profile?.avatar || '🎮'}</span>
                <span className="text-white font-bold text-lg">{username}</span>
              </div>
            </div>

            {/* Badge Icon */}
            <div className={`w-24 h-24 rounded-full ${badge.bgColor} ${badge.color} flex items-center justify-center mx-auto mb-4 border-4 border-current/30 animate-pulse`}>
              <span className="scale-[2]">{badge.icon}</span>
            </div>

            {/* Badge Name */}
            <h2 className={`text-2xl font-black ${badge.color} mb-2`}>
              {badge.name}
            </h2>

            {/* Description */}
            <p className="text-muted-foreground text-sm mb-4">
              {badge.description}
            </p>

            {/* Username */}
            <div className="flex items-center justify-center gap-2 mb-4 text-sm">
              <span className="text-lg">{profile?.avatar || '🎮'}</span>
              <span className="font-bold text-foreground">{username}</span>
            </div>

            {/* Share Section */}
            <div className="border-t border-border pt-4 mb-4">
              <p className="text-xs text-muted-foreground mb-3">Share your achievement</p>
              <div className="flex justify-center gap-3">
                <button
                  onClick={shareToTwitter}
                  className="w-10 h-10 rounded-full bg-[#1DA1F2]/20 flex items-center justify-center text-[#1DA1F2] hover:bg-[#1DA1F2]/30 transition-colors"
                  title="Share on Twitter"
                >
                  <Twitter className="w-5 h-5" />
                </button>
                <button
                  onClick={shareToFacebook}
                  className="w-10 h-10 rounded-full bg-[#4267B2]/20 flex items-center justify-center text-[#4267B2] hover:bg-[#4267B2]/30 transition-colors"
                  title="Share on Facebook"
                >
                  <Facebook className="w-5 h-5" />
                </button>
                <button
                  onClick={shareToWhatsApp}
                  className="w-10 h-10 rounded-full bg-[#25D366]/20 flex items-center justify-center text-[#25D366] hover:bg-[#25D366]/30 transition-colors"
                  title="Share on WhatsApp"
                >
                  <MessageCircle className="w-5 h-5" />
                </button>
                <button
                  onClick={handleNativeShare}
                  className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary hover:bg-primary/30 transition-colors"
                  title="More sharing options"
                >
                  <Share2 className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Action */}
            <button
              onClick={onDismiss}
              className="btn-primary w-full"
            >
              Awesome! 🎮
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
