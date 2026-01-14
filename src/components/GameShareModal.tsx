import { useState, useRef, useCallback, useEffect } from 'react';
import { Share2, MessageCircle, Download, Loader2, Instagram, Facebook, X, Crown, Users, Trophy, Sparkles } from 'lucide-react';
import html2canvas from 'html2canvas';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { GameCycle } from '@/hooks/useActiveCycles';
import { Logo } from '@/components/Logo';
import { useOGImage } from '@/hooks/useOGImage';

interface GameShareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cycle: GameCycle;
  variant?: 'card' | 'live' | 'lobby';
}

export const GameShareModal = ({ open, onOpenChange, cycle, variant = 'card' }: GameShareModalProps) => {
  const { toast } = useToast();
  const cardRef = useRef<HTMLDivElement>(null);
  const storyCardRef = useRef<HTMLDivElement>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const { generateOGImage, generating } = useOGImage();
  const [ogImageUrl, setOgImageUrl] = useState<string | null>(null);

  // Pre-generate OG image when modal opens
  useEffect(() => {
    if (open && cycle?.id && !ogImageUrl) {
      generateOGImage({
        type: 'game',
        game_id: cycle.id,
      }).then(url => {
        if (url) setOgImageUrl(url);
      });
    }
  }, [open, cycle?.id, ogImageUrl, generateOGImage]);

  const formatMoney = useCallback((value: number) => {
    if (value >= 1_000_000) return `₦${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `₦${(value / 1_000).toFixed(0)}K`;
    return `₦${value.toLocaleString()}`;
  }, []);

  const effectivePrizePool = cycle.pool_value + (cycle.sponsored_prize_amount || 0);
  const appUrl = window.location.origin;
  const gameLink = ogImageUrl 
    ? `${appUrl}/arena/${cycle.id}?og_image=${encodeURIComponent(ogImageUrl)}`
    : `${appUrl}/arena/${cycle.id}`;

  const getStatusLabel = useCallback(() => {
    switch (cycle.status) {
      case 'live': return '🔴 LIVE NOW';
      case 'ending': return '⏰ ENDING SOON';
      case 'opening': return '🟢 OPEN FOR ENTRY';
      default: return '📅 COMING SOON';
    }
  }, [cycle.status]);

  const shareMessage = `🎮 ${cycle.template_name} - ${getStatusLabel()}\n\n💰 Prize Pool: ${formatMoney(effectivePrizePool)}\n👥 ${cycle.participant_count} players competing\n🏆 Top ${cycle.winner_count} win!\n\nJoin me on FortunesHQ! 🚀\n\n🎯 Play now: ${gameLink}`;

  // Capture the card as an image
  const captureCard = useCallback(async (forStory = false): Promise<Blob | null> => {
    const ref = forStory ? storyCardRef.current : cardRef.current;
    if (!ref) return null;
    
    try {
      setIsCapturing(true);
      
      const canvas = await html2canvas(ref, {
        backgroundColor: '#0a0a0f',
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
  }, []);

  // Download the image (fallback only)
  const handleDownload = useCallback(async () => {
    const blob = await captureCard();
    if (!blob) {
      toast({ title: 'Error', description: 'Failed to create image', variant: 'destructive' });
      return;
    }
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fortuneshq-game-${cycle.template_name.toLowerCase().replace(/\s+/g, '-')}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({ title: 'Downloaded!', description: 'Share the game on social media!' });
  }, [captureCard, cycle.template_name, toast]);

  // Share with Web Share API (mobile-friendly) - PRIMARY method
  const handleNativeShare = useCallback(async () => {
    const blob = await captureCard();
    
    if (navigator.share) {
      try {
        const files = blob ? [new File([blob], 'fortuneshq-game.png', { type: 'image/png' })] : [];
        const canShareFiles = files.length > 0 && navigator.canShare?.({ files });
        
        await navigator.share({
          title: `${cycle.template_name} on FortunesHQ`,
          text: shareMessage,
          url: gameLink,
          ...(canShareFiles ? { files } : {}),
        });
        
        toast({ title: 'Shared!', description: 'Thanks for sharing!' });
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.error('Share failed:', error);
          // Just copy the message
          try {
            await navigator.clipboard.writeText(shareMessage);
            toast({ title: 'Caption copied!', description: 'Paste it when sharing' });
          } catch {
            toast({ title: 'Share unavailable', description: 'Please copy manually', variant: 'destructive' });
          }
        }
      }
    } else {
      // Desktop fallback
      try {
        await navigator.clipboard.writeText(shareMessage);
        toast({ title: 'Caption copied!', description: 'Paste it when sharing' });
      } catch {
        handleDownload();
      }
    }
  }, [captureCard, cycle.template_name, shareMessage, gameLink, toast, handleDownload]);

  // Share to WhatsApp - text only
  const handleWhatsApp = useCallback(() => {
    const url = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;
    window.open(url, '_blank');
    toast({ title: 'Opening WhatsApp...', description: 'Share this game!' });
  }, [shareMessage, toast]);

  // Share to Twitter/X - text only
  const handleTwitter = useCallback(() => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareMessage)}`;
    window.open(url, '_blank');
    toast({ title: 'Opening Twitter...', description: 'Share this game!' });
  }, [shareMessage, toast]);

  // Share to Instagram Story - uses native share
  const handleInstagramStory = useCallback(async () => {
    const blob = await captureCard(true);
    if (!blob) {
      toast({ title: 'Error', description: 'Failed to create story image', variant: 'destructive' });
      return;
    }
    
    // Try native share first
    if (navigator.share && navigator.canShare) {
      const file = new File([blob], 'fortuneshq-story.png', { type: 'image/png' });
      if (navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: 'FortunesHQ Game',
          });
          toast({ title: 'Shared!', description: 'Select Instagram Stories' });
          return;
        } catch (error: any) {
          if (error.name === 'AbortError') return;
        }
      }
    }
    
    // Fallback: download
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fortuneshq-story-${cycle.template_name.toLowerCase().replace(/\s+/g, '-')}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({ 
      title: 'Story Image Saved!', 
      description: 'Open Instagram and share to your story' 
    });
  }, [captureCard, cycle.template_name, toast]);

  // Share to Facebook - link with quote
  const handleFacebook = useCallback(() => {
    const facebookShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(gameLink)}&quote=${encodeURIComponent(shareMessage)}`;
    window.open(facebookShareUrl, '_blank', 'width=600,height=400');
    toast({ title: 'Opening Facebook...', description: 'Share this game!' });
  }, [gameLink, shareMessage, toast]);

  const getStatusColor = useCallback(() => {
    switch (cycle.status) {
      case 'live': return '#ef4444';
      case 'ending': return '#f97316';
      case 'opening': return '#22c55e';
      default: return '#3b82f6';
    }
  }, [cycle.status]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-primary" />
            Share This Game
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Hidden Story Card (9:16 aspect ratio) */}
          <div className="absolute -left-[9999px]">
            <div 
              ref={storyCardRef}
              className="relative overflow-hidden flex flex-col items-center justify-center"
              style={{
                width: '1080px',
                height: '1920px',
                background: 'linear-gradient(180deg, #0a0a0f 0%, #1a1f2e 30%, #0a0a0f 70%, #1a1f2e 100%)',
              }}
            >
              {/* Background decorations */}
              <div className="absolute inset-0">
                <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full blur-[100px]" style={{ backgroundColor: `${getStatusColor()}30` }} />
                <div className="absolute bottom-40 left-10 w-[300px] h-[300px] bg-primary/15 rounded-full blur-[80px]" />
              </div>
              
              {/* Content */}
              <div className="relative z-10 text-center px-16">
                {/* Status Badge */}
                <div 
                  className="inline-flex items-center gap-3 px-8 py-4 rounded-full text-white text-3xl font-bold mb-12"
                  style={{ backgroundColor: getStatusColor() }}
                >
                  {getStatusLabel()}
                </div>
                
                {/* Game Icon */}
                <div 
                  className="w-48 h-48 rounded-3xl flex items-center justify-center mx-auto mb-10"
                  style={{
                    background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(139, 92, 246, 0.1) 100%)',
                    border: '4px solid rgba(139, 92, 246, 0.3)',
                  }}
                >
                  <Crown className="w-24 h-24 text-primary" />
                </div>
                
                {/* Game Name */}
                <h3 className="text-6xl font-black text-white mb-6">{cycle.template_name}</h3>
                
                {/* Prize Pool */}
                <div 
                  className="py-10 px-16 rounded-3xl mb-12 inline-block"
                  style={{
                    background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.15) 0%, rgba(217, 119, 6, 0.1) 100%)',
                    border: '2px solid rgba(234, 179, 8, 0.3)',
                  }}
                >
                  <p className="text-2xl text-gold/80 uppercase tracking-wider mb-4">Prize Pool</p>
                  <p 
                    className="text-8xl font-black"
                    style={{
                      background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                  >
                    {formatMoney(effectivePrizePool)}
                  </p>
                </div>
                
                {/* Stats */}
                <div className="flex justify-center gap-16 mb-16">
                  <div className="text-center">
                    <p className="text-6xl font-black text-white">{cycle.participant_count}</p>
                    <p className="text-2xl text-white/60">Players</p>
                  </div>
                  <div className="text-center">
                    <p className="text-6xl font-black text-primary">{cycle.winner_count}</p>
                    <p className="text-2xl text-white/60">Winners</p>
                  </div>
                </div>
                
                {/* Branding */}
                <div className="flex items-center justify-center gap-3 mb-6">
                  <span className="text-5xl font-black">
                    <span style={{ color: '#4fd1c5' }}>Fortunes</span>
                    <span style={{ color: '#f59e0b' }}> HQ</span>
                  </span>
                  <Sparkles className="w-10 h-10" style={{ color: '#f59e0b' }} />
                </div>
                
                <p className="text-2xl text-white/50">💰 Real Money | 👥 Real Players | 🎙️ Live Show</p>
              </div>
            </div>
          </div>

          {/* Shareable Card Preview */}
          <div 
            ref={cardRef}
            className="relative overflow-hidden rounded-2xl p-5"
            style={{
              background: 'linear-gradient(135deg, #1a1f2e 0%, #0a0a0f 50%, #1a1f2e 100%)',
              border: '2px solid rgba(139, 92, 246, 0.3)',
            }}
          >
            {/* Background decoration */}
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full blur-3xl" style={{ backgroundColor: getStatusColor() }} />
            </div>
            
            {/* Content */}
            <div className="relative z-10">
              {/* Status Badge */}
              <div className="flex items-center justify-between mb-4">
                <div 
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-white text-xs font-bold"
                  style={{ backgroundColor: getStatusColor() }}
                >
                  {getStatusLabel()}
                </div>
                <span className="text-xs text-white/50">{cycle.prize_distribution.join('/')} split</span>
              </div>
              
              {/* Game Info */}
              <div className="flex items-center gap-3 mb-4">
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(139, 92, 246, 0.1) 100%)',
                    border: '2px solid rgba(139, 92, 246, 0.3)',
                  }}
                >
                  <Crown className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{cycle.template_name}</h3>
                  <p className="text-xs text-white/60">Top {cycle.winner_count} win prizes</p>
                </div>
              </div>
              
              {/* Stats Row */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="text-center py-3 px-2 rounded-xl" style={{ background: 'rgba(234, 179, 8, 0.1)' }}>
                  <p className="text-[10px] text-gold/70 uppercase">Prize Pool</p>
                  <p className="text-lg font-black text-gold">{formatMoney(effectivePrizePool)}</p>
                </div>
                <div className="text-center py-3 px-2 rounded-xl" style={{ background: 'rgba(139, 92, 246, 0.1)' }}>
                  <p className="text-[10px] text-primary/70 uppercase">Players</p>
                  <p className="text-lg font-black text-white flex items-center justify-center gap-1">
                    <Users className="w-4 h-4 text-primary" />
                    {cycle.participant_count}
                  </p>
                </div>
                <div className="text-center py-3 px-2 rounded-xl" style={{ background: 'rgba(139, 92, 246, 0.1)' }}>
                  <p className="text-[10px] text-primary/70 uppercase">Entry</p>
                  <p className="text-lg font-black text-white">
                    {cycle.entry_fee > 0 ? formatMoney(cycle.entry_fee) : 'FREE'}
                  </p>
                </div>
              </div>
              
              {/* Branding */}
              <div className="flex items-center justify-center gap-2 pt-3 border-t border-white/10">
                <span className="text-lg font-black">
                  <span style={{ color: '#4fd1c5' }}>Fortunes</span>
                  <span style={{ color: '#f59e0b' }}> HQ</span>
                </span>
                <Sparkles className="w-4 h-4" style={{ color: '#f59e0b' }} />
              </div>
              <p className="text-[10px] text-white/40 text-center mt-1">💰 Real Money | 👥 Real Players | 🎙️ Live Show</p>
            </div>
          </div>

          {/* Share Buttons */}
          <div className="grid grid-cols-2 gap-3">
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
              <span className="text-lg font-bold">𝕏</span>
              <span className="text-xs">Twitter</span>
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
