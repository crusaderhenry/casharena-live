import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSounds } from '@/hooks/useSounds';
import { useHaptics } from '@/hooks/useHaptics';
import { Confetti } from '@/components/Confetti';
import { Share2, Download, MessageCircle, Instagram, Facebook, X, Loader2, ArrowRight } from 'lucide-react';
import html2canvas from 'html2canvas';
import { toast } from 'sonner';

interface WinnerData {
  position: number;
  prize_amount: number;
  username: string;
  avatar: string;
}

export const WinnerCelebration = () => {
  const { cycleId } = useParams<{ cycleId: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { play } = useSounds();
  const { prizeWin } = useHaptics();
  
  const [winner, setWinner] = useState<WinnerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCapturing, setIsCapturing] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchWinnerData = async () => {
      if (!cycleId || !user) {
        navigate(`/arena/${cycleId}/results`);
        return;
      }

      // Check if user won this game
      const { data: winData } = await supabase
        .from('cycle_winners')
        .select('*')
        .eq('cycle_id', cycleId)
        .eq('user_id', user.id)
        .single();

      if (!winData) {
        // User didn't win, redirect to results
        navigate(`/arena/${cycleId}/results`);
        return;
      }

      setWinner({
        position: winData.position,
        prize_amount: winData.prize_amount,
        username: profile?.username || 'Champion',
        avatar: profile?.avatar || '🎮',
      });

      setLoading(false);
      play('prizeWin');
      prizeWin();
    };

    fetchWinnerData();
  }, [cycleId, user, profile, navigate, play, prizeWin]);

  const formatMoney = useCallback((value: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value).replace('NGN', '₦');
  }, []);

  const getPositionText = useCallback((pos: number) => {
    switch (pos) {
      case 1: return '1st Place 🥇';
      case 2: return '2nd Place 🥈';
      case 3: return '3rd Place 🥉';
      default: return `${pos}th Place 🏆`;
    }
  }, []);

  const getPositionEmoji = useCallback((pos: number) => {
    switch (pos) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return '🏆';
    }
  }, []);

  const appUrl = window.location.origin;
  const shareMessage = winner 
    ? `🎉 I just won ${formatMoney(winner.prize_amount)} on FortunesHQ! ${getPositionText(winner.position)} in Royal Rumble! 🚀\n\nJoin me and win big! 💰\n\n🎮 Play now: ${appUrl}/arena`
    : '';

  const captureCard = useCallback(async (): Promise<Blob | null> => {
    if (!cardRef.current) return null;
    
    try {
      setIsCapturing(true);
      const canvas = await html2canvas(cardRef.current, {
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
  }, []);

  const handleDownload = useCallback(async () => {
    const blob = await captureCard();
    if (!blob || !winner) {
      toast.error('Failed to create image');
      return;
    }
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fortuneshq-win-${winner.prize_amount}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Image saved!');
  }, [captureCard, winner]);

  const handleNativeShare = useCallback(async () => {
    const blob = await captureCard();
    
    if (navigator.share) {
      try {
        const files = blob ? [new File([blob], 'fortuneshq-win.png', { type: 'image/png' })] : [];
        const canShareFiles = files.length > 0 && navigator.canShare?.({ files });
        
        await navigator.share({
          title: 'I Won on FortunesHQ!',
          text: shareMessage,
          ...(canShareFiles ? { files } : {}),
        });
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          await navigator.clipboard.writeText(shareMessage);
          toast.success('Caption copied!');
        }
      }
    } else {
      await navigator.clipboard.writeText(shareMessage);
      toast.success('Caption copied!');
    }
  }, [captureCard, shareMessage]);

  const handleWhatsApp = useCallback(() => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareMessage)}`, '_blank');
  }, [shareMessage]);

  const handleTwitter = useCallback(() => {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareMessage)}`, '_blank');
  }, [shareMessage]);

  const handleInstagram = useCallback(async () => {
    const blob = await captureCard();
    if (!blob) {
      toast.error('Failed to create image');
      return;
    }
    
    if (navigator.share && navigator.canShare) {
      const file = new File([blob], 'fortuneshq-story.png', { type: 'image/png' });
      if (navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: 'FortunesHQ Win' });
          return;
        } catch (error: any) {
          if (error.name === 'AbortError') return;
        }
      }
    }
    
    handleDownload();
    toast.success('Image saved! Share to Instagram Stories');
  }, [captureCard, handleDownload]);

  const handleFacebook = useCallback(() => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(appUrl)}&quote=${encodeURIComponent(shareMessage)}`, '_blank');
  }, [appUrl, shareMessage]);

  const handleContinue = useCallback(() => {
    play('click');
    navigate(`/arena/${cycleId}/results`);
  }, [play, navigate, cycleId]);

  if (loading || !winner) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-gold/30 border-t-gold rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      <Confetti duration={10000} />
      
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-gold/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 left-1/4 w-[200px] h-[200px] bg-gold/5 rounded-full blur-[60px]" />
        <div className="absolute bottom-1/3 right-1/4 w-[200px] h-[200px] bg-orange-500/5 rounded-full blur-[60px]" />
      </div>

      {/* Skip button */}
      <button
        onClick={handleContinue}
        className="absolute top-4 right-4 z-20 p-2 rounded-full bg-background/50 text-muted-foreground hover:text-foreground transition-colors"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">
        {/* Shareable Card */}
        <div 
          ref={cardRef}
          className="relative overflow-hidden rounded-3xl p-8 text-center max-w-sm w-full"
          style={{
            background: 'linear-gradient(135deg, #1a1f2e 0%, #0f1419 50%, #1a1f2e 100%)',
          }}
        >
          {/* Background decoration circles */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-4 border-gold/20 rounded-full" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-2 border-gold/10 rounded-full" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 border border-gold/5 rounded-full" />
          </div>

          <div className="relative z-10">
            {/* Position Medal */}
            <div className="text-6xl mb-4 animate-bounce">{getPositionEmoji(winner.position)}</div>
            
            {/* Avatar */}
            <div 
              className="w-24 h-24 rounded-full flex items-center justify-center text-5xl mx-auto mb-4"
              style={{
                background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.2) 0%, rgba(217, 119, 6, 0.2) 100%)',
                border: '4px solid rgba(234, 179, 8, 0.5)',
                boxShadow: '0 0 40px rgba(234, 179, 8, 0.3)',
              }}
            >
              {winner.avatar}
            </div>
            
            {/* Username */}
            <h2 className="text-2xl font-bold text-white mb-1">{winner.username}</h2>
            
            {/* Position */}
            <p className="text-gold font-semibold mb-6">{getPositionText(winner.position)}</p>
            
            {/* Amount Won */}
            <div 
              className="py-5 px-8 rounded-2xl inline-block mb-6"
              style={{
                background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.9) 0%, rgba(245, 158, 11, 0.9) 100%)',
              }}
            >
              <p className="text-xs text-white/80 uppercase tracking-wider mb-1">AMOUNT WON</p>
              <p className="text-4xl font-black text-white drop-shadow-lg">
                {formatMoney(winner.prize_amount)}
              </p>
            </div>
            
            {/* Branding */}
            <div className="flex items-center justify-center gap-2 text-white/80 mb-2">
              <span className="text-2xl">🎯</span>
              <span className="font-bold text-lg">FortunesHQ</span>
            </div>
            
            {/* Tagline */}
            <p className="text-sm text-white/50">Play • Win • Celebrate</p>
          </div>
        </div>
      </div>

      {/* Share Actions */}
      <div className="p-6 space-y-4 relative z-10">
        <p className="text-center text-muted-foreground text-sm mb-2">
          🎉 Share your victory with friends!
        </p>
        
        {/* Main share buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleDownload}
            disabled={isCapturing}
            className="py-3 rounded-xl bg-muted hover:bg-muted/80 text-foreground font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {isCapturing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
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

        {/* Social buttons */}
        <div className="grid grid-cols-4 gap-2">
          <button
            onClick={handleWhatsApp}
            className="py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold flex flex-col items-center justify-center gap-1 transition-all"
          >
            <MessageCircle className="w-5 h-5" />
            <span className="text-xs">WhatsApp</span>
          </button>
          <button
            onClick={handleInstagram}
            className="py-3 rounded-xl text-white font-semibold flex flex-col items-center justify-center gap-1 transition-all"
            style={{
              background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
            }}
          >
            <Instagram className="w-5 h-5" />
            <span className="text-xs">Story</span>
          </button>
          <button
            onClick={handleFacebook}
            className="py-3 rounded-xl bg-[#1877F2] hover:bg-[#166FE5] text-white font-semibold flex flex-col items-center justify-center gap-1 transition-all"
          >
            <Facebook className="w-5 h-5" />
            <span className="text-xs">Facebook</span>
          </button>
          <button
            onClick={handleTwitter}
            className="py-3 rounded-xl bg-black hover:bg-gray-900 text-white font-semibold flex flex-col items-center justify-center gap-1 transition-all border border-gray-700"
          >
            <span className="text-lg">𝕏</span>
            <span className="text-xs">Twitter</span>
          </button>
        </div>

        {/* Continue button */}
        <button
          onClick={handleContinue}
          className="w-full py-4 rounded-xl bg-gold/20 hover:bg-gold/30 text-gold font-bold flex items-center justify-center gap-2 transition-all"
        >
          View Full Results
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
