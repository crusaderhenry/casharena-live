import { useState, useRef } from 'react';
import { Share2, MessageCircle, Download, Copy, Check, Loader2, Instagram, Facebook } from 'lucide-react';
import html2canvas from 'html2canvas';
import { useToast } from '@/hooks/use-toast';

interface ShareCardProps {
  username: string;
  avatar: string;
  position: number;
  amount: number;
  gameType: 'finger' | 'pool';
}

export const ShareCard = ({ username, avatar, position, amount, gameType }: ShareCardProps) => {
  const { toast } = useToast();
  const cardRef = useRef<HTMLDivElement>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [copied, setCopied] = useState(false);

  const formatMoney = (value: number) => {
    if (value >= 1_000_000) return `₦${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `₦${(value / 1_000).toFixed(0)}K`;
    return `₦${value.toLocaleString()}`;
  };

  const formatMoneyFull = (value: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getPositionText = () => {
    if (gameType === 'pool') return 'Winner';
    switch (position) {
      case 1: return '1st Place 🥇';
      case 2: return '2nd Place 🥈';
      case 3: return '3rd Place 🥉';
      default: return `${position}th Place`;
    }
  };

  const getPositionEmoji = () => {
    switch (position) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return '🏆';
    }
  };

  const shareMessage = `🎉 I just won ${formatMoneyFull(amount)} on FortunesHQ! ${getPositionText()} in ${gameType === 'finger' ? 'Royal Rumble' : 'Lucky Pool'}! 🚀\n\nJoin me and win big! 💰`;

  const storyCardRef = useRef<HTMLDivElement>(null);

  // Capture the card as an image
  const captureCard = async (forStory = false): Promise<Blob | null> => {
    const ref = forStory ? storyCardRef.current : cardRef.current;
    if (!ref) return null;
    
    try {
      setIsCapturing(true);
      
      const canvas = await html2canvas(ref, {
        backgroundColor: '#0f1419',
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
      });
      
      return new Promise((resolve) => {
        canvas.toBlob((blob) => {
          setIsCapturing(false);
          resolve(blob);
        }, 'image/png', 1.0);
      });
    } catch (error) {
      console.error('Error capturing card:', error);
      setIsCapturing(false);
      return null;
    }
  };

  // Download the image
  const handleDownload = async () => {
    const blob = await captureCard();
    if (!blob) {
      toast({ title: 'Error', description: 'Failed to create image', variant: 'destructive' });
      return;
    }
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fortuneshq-win-${formatMoney(amount).replace('₦', '')}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({ title: 'Downloaded!', description: 'Share your win on social media!' });
  };

  // Copy message to clipboard
  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(shareMessage);
      setCopied(true);
      toast({ title: 'Copied!', description: 'Caption copied to clipboard' });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Copy failed:', error);
      toast({ title: 'Error', description: 'Failed to copy', variant: 'destructive' });
    }
  };

  // Share with Web Share API (mobile-friendly)
  const handleNativeShare = async () => {
    const blob = await captureCard();
    
    if (navigator.share) {
      try {
        const files = blob ? [new File([blob], 'fortuneshq-win.png', { type: 'image/png' })] : [];
        
        await navigator.share({
          title: 'I Won on FortunesHQ!',
          text: shareMessage,
          files: files.length > 0 && navigator.canShare?.({ files }) ? files : undefined,
        });
        
        toast({ title: 'Shared!', description: 'Thanks for sharing!' });
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.error('Share failed:', error);
          // Fallback to download + copy
          handleDownload();
          handleCopyMessage();
        }
      }
    } else {
      // Fallback for desktop
      handleDownload();
      handleCopyMessage();
    }
  };

  // Share to WhatsApp
  const handleWhatsApp = async () => {
    await handleDownload(); // Download image first
    const url = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;
    window.open(url, '_blank');
  };

  // Share to Twitter/X
  const handleTwitter = async () => {
    await handleDownload(); // Download image first
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareMessage)}`;
    window.open(url, '_blank');
  };

  // Share to Instagram Story (9:16 aspect ratio)
  const handleInstagramStory = async () => {
    const blob = await captureCard(true); // Capture story-sized card
    if (!blob) {
      toast({ title: 'Error', description: 'Failed to create story image', variant: 'destructive' });
      return;
    }
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fortuneshq-story-${formatMoney(amount).replace('₦', '')}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({ 
      title: 'Story Image Saved!', 
      description: 'Open Instagram and share to your story' 
    });
  };

  // Share to Facebook
  const handleFacebook = async () => {
    await handleDownload(); // Download image first for manual attachment
    const appUrl = window.location.origin;
    const facebookShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(appUrl)}&quote=${encodeURIComponent(shareMessage)}`;
    window.open(facebookShareUrl, '_blank', 'width=600,height=400');
  };

  return (
    <div className="space-y-4">
      {/* Hidden Story Card (9:16 aspect ratio) - Only rendered for capture */}
      <div className="absolute -left-[9999px]">
        <div 
          ref={storyCardRef}
          className="relative overflow-hidden flex flex-col items-center justify-center"
          style={{
            width: '1080px',
            height: '1920px',
            background: 'linear-gradient(180deg, #0f1419 0%, #1a1f2e 30%, #0f1419 70%, #1a1f2e 100%)',
          }}
        >
          {/* Background decorations */}
          <div className="absolute inset-0">
            <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-yellow-500/20 rounded-full blur-[100px]" />
            <div className="absolute bottom-40 left-10 w-[300px] h-[300px] bg-yellow-600/15 rounded-full blur-[80px]" />
            <div className="absolute bottom-60 right-10 w-[300px] h-[300px] bg-orange-500/15 rounded-full blur-[80px]" />
          </div>
          
          {/* Content */}
          <div className="relative z-10 text-center px-16">
            {/* Trophy */}
            <div className="text-[120px] mb-8">{getPositionEmoji()}</div>
            
            {/* Avatar */}
            <div 
              className="w-40 h-40 rounded-full flex items-center justify-center text-[80px] mx-auto mb-8"
              style={{
                background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.2) 0%, rgba(217, 119, 6, 0.2) 100%)',
                border: '6px solid rgba(234, 179, 8, 0.5)',
                boxShadow: '0 0 60px rgba(234, 179, 8, 0.3)',
              }}
            >
              {avatar}
            </div>
            
            {/* Username */}
            <h3 className="text-5xl font-bold text-white mb-4">{username}</h3>
            
            {/* Position */}
            <p className="text-yellow-400 font-semibold text-3xl mb-12">{getPositionText()}</p>
            
            {/* Amount Won */}
            <div 
              className="py-10 px-16 rounded-3xl mb-12 inline-block"
              style={{
                background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.15) 0%, rgba(217, 119, 6, 0.1) 100%)',
                border: '2px solid rgba(234, 179, 8, 0.3)',
              }}
            >
              <p className="text-xl text-yellow-500/80 uppercase tracking-wider mb-4">I just won</p>
              <p 
                className="text-7xl font-black"
                style={{
                  background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                {formatMoneyFull(amount)}
              </p>
            </div>
            
            {/* Branding */}
            <div className="flex items-center justify-center gap-4 text-white mb-6">
              <span className="text-6xl">🎯</span>
              <span className="font-bold text-5xl">FortunesHQ</span>
            </div>
            
            {/* Tagline */}
            <p className="text-2xl text-white/50">Play • Win • Celebrate</p>
          </div>
        </div>
      </div>

      {/* Shareable Card - This gets captured as image */}
      <div 
        ref={cardRef}
        className="relative overflow-hidden rounded-2xl p-6 text-center"
        style={{
          background: 'linear-gradient(135deg, #1a1f2e 0%, #0f1419 50%, #1a1f2e 100%)',
          border: '2px solid rgba(234, 179, 8, 0.3)',
        }}
      >
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-yellow-500 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-yellow-600 rounded-full blur-2xl" />
          <div className="absolute bottom-0 right-0 w-32 h-32 bg-orange-500 rounded-full blur-2xl" />
        </div>
        
        {/* Content */}
        <div className="relative z-10">
          {/* Trophy/Position */}
          <div className="text-5xl mb-3">{getPositionEmoji()}</div>
          
          {/* Avatar */}
          <div 
            className="w-20 h-20 rounded-full flex items-center justify-center text-4xl mx-auto mb-3"
            style={{
              background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.2) 0%, rgba(217, 119, 6, 0.2) 100%)',
              border: '3px solid rgba(234, 179, 8, 0.5)',
              boxShadow: '0 0 30px rgba(234, 179, 8, 0.3)',
            }}
          >
            {avatar}
          </div>
          
          {/* Username */}
          <h3 className="text-xl font-bold text-white mb-1">{username}</h3>
          
          {/* Position */}
          <p className="text-yellow-400 font-semibold text-sm mb-4">{getPositionText()}</p>
          
          {/* Amount Won */}
          <div 
            className="py-4 px-6 rounded-xl mb-4 inline-block"
            style={{
              background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.15) 0%, rgba(217, 119, 6, 0.1) 100%)',
              border: '1px solid rgba(234, 179, 8, 0.3)',
            }}
          >
            <p className="text-xs text-yellow-500/80 uppercase tracking-wider mb-1">Amount Won</p>
            <p 
              className="text-4xl font-black"
              style={{
                background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {formatMoneyFull(amount)}
            </p>
          </div>
          
          {/* Branding */}
          <div className="flex items-center justify-center gap-2 text-white/80">
            <span className="text-2xl">🎯</span>
            <span className="font-bold text-lg">FortunesHQ</span>
          </div>
          
          {/* Tagline */}
          <p className="text-xs text-white/50 mt-2">Play • Win • Celebrate</p>
        </div>
      </div>

      {/* Caption Preview */}
      <div className="bg-card rounded-xl p-4 border border-border">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Caption</p>
          <button
            onClick={handleCopyMessage}
            className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
          >
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <p className="text-sm text-foreground whitespace-pre-line">{shareMessage}</p>
      </div>

      {/* Share Buttons */}
      <div className="grid grid-cols-2 gap-3">
        {/* Download Button */}
        <button
          onClick={handleDownload}
          disabled={isCapturing}
          className="py-3 rounded-xl bg-muted hover:bg-muted/80 text-foreground font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
        >
          {isCapturing ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Download className="w-5 h-5" />
          )}
          Save Image
        </button>
        
        {/* Native Share */}
        <button
          onClick={handleNativeShare}
          disabled={isCapturing}
          className="py-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
        >
          <Share2 className="w-5 h-5" />
          Share
        </button>
      </div>

      {/* Social Platform Buttons */}
      <div className="grid grid-cols-4 gap-2">
        <button
          onClick={handleWhatsApp}
          disabled={isCapturing}
          className="py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold flex flex-col items-center justify-center gap-1 transition-all disabled:opacity-50"
        >
          <MessageCircle className="w-5 h-5" />
          <span className="text-xs">WhatsApp</span>
        </button>
        <button
          onClick={handleInstagramStory}
          disabled={isCapturing}
          className="py-3 rounded-xl text-white font-semibold flex flex-col items-center justify-center gap-1 transition-all disabled:opacity-50"
          style={{
            background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
          }}
        >
          <Instagram className="w-5 h-5" />
          <span className="text-xs">Story</span>
        </button>
        <button
          onClick={handleFacebook}
          disabled={isCapturing}
          className="py-3 rounded-xl bg-[#1877F2] hover:bg-[#166FE5] text-white font-semibold flex flex-col items-center justify-center gap-1 transition-all disabled:opacity-50"
        >
          <Facebook className="w-5 h-5" />
          <span className="text-xs">Facebook</span>
        </button>
        <button
          onClick={handleTwitter}
          disabled={isCapturing}
          className="py-3 rounded-xl bg-black hover:bg-gray-900 text-white font-semibold flex flex-col items-center justify-center gap-1 transition-all border border-gray-700 disabled:opacity-50"
        >
          <span className="text-lg">𝕏</span>
          <span className="text-xs">Twitter</span>
        </button>
      </div>
    </div>
  );
};