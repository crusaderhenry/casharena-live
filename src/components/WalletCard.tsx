import { Plus, Sparkles, ArrowUpRight, Loader2, LogIn } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthPromptModal } from '@/components/AuthPromptModal';

interface WalletCardProps {
  compact?: boolean;
  onDepositClick?: () => void;
  onWithdrawClick?: () => void;
}

export const WalletCard = ({ compact = false, onDepositClick, onWithdrawClick }: WalletCardProps) => {
  const { profile, loading, user } = useAuth();
  const { isTestMode } = usePlatformSettings();
  const navigate = useNavigate();
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  
  const realBalance = profile?.wallet_balance ?? 0;
  const [displayBalance, setDisplayBalance] = useState(realBalance);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (displayBalance !== realBalance) {
      setIsAnimating(true);
      const diff = realBalance - displayBalance;
      const steps = 20;
      const increment = diff / steps;
      let current = displayBalance;
      let step = 0;

      const timer = setInterval(() => {
        step++;
        current += increment;
        if (step >= steps) {
          setDisplayBalance(realBalance);
          setIsAnimating(false);
          clearInterval(timer);
        } else {
          setDisplayBalance(Math.round(current));
        }
      }, 30);

      return () => clearInterval(timer);
    }
  }, [realBalance, displayBalance]);

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Show sign in prompt for unauthenticated users
  if (!user && !loading) {
    if (compact) {
      return (
        <>
          <button 
            onClick={() => setShowAuthPrompt(true)}
            className="flex items-center gap-3 bg-card rounded-xl px-4 py-3 border border-border/50 w-full hover:border-primary/40 transition-colors"
          >
            <div className="flex-1 text-left">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Wallet</p>
              <p className="text-sm font-medium text-foreground">Sign in to view balance</p>
            </div>
            <div className="flex items-center gap-1 text-primary text-sm font-medium">
              <LogIn className="w-4 h-4" />
              Sign In
            </div>
          </button>
          <AuthPromptModal open={showAuthPrompt} onOpenChange={setShowAuthPrompt} action="wallet" />
        </>
      );
    }
    
    return (
      <>
        <button 
          onClick={() => setShowAuthPrompt(true)}
          className="card-panel glow-soft relative overflow-hidden w-full text-left hover:border-primary/40 transition-colors"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="relative flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center glow-primary">
              <Sparkles className="w-7 h-7 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Your Wallet</p>
              <p className="text-lg font-bold text-foreground">Sign in to access</p>
            </div>
            <div className="flex items-center gap-2 text-primary font-medium">
              <LogIn className="w-5 h-5" />
              Sign In
            </div>
          </div>
        </button>
        <AuthPromptModal open={showAuthPrompt} onOpenChange={setShowAuthPrompt} action="wallet" />
      </>
    );
  }

  if (loading) {
    return (
      <div className="card-panel flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-3 bg-card rounded-xl px-4 py-3 border border-border/50">
        <div className="flex-1">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Balance</p>
          <p className={`text-xl font-black text-primary ${isAnimating ? 'animate-scale-in' : ''}`}>
            {formatMoney(displayBalance)}
          </p>
        </div>
        {onDepositClick && (
          <button
            onClick={onDepositClick}
            className="btn-outline flex items-center gap-1 py-2 px-3 text-sm"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="card-panel glow-soft relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      
      {isTestMode && (
        <div className="absolute top-3 right-3 px-2 py-0.5 bg-yellow-500/20 rounded text-[10px] font-medium text-yellow-500 uppercase">
          Test
        </div>
      )}
      
      <div className="relative">
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Available Balance</p>
            <p className={`balance-display ${isAnimating ? 'animate-scale-in' : ''}`}>
              {formatMoney(displayBalance)}
            </p>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center glow-primary">
            <Sparkles className="w-7 h-7 text-primary" />
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onDepositClick}
            className="btn-primary flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Deposit
          </button>
          <button
            onClick={onWithdrawClick}
            className="btn-outline flex items-center justify-center gap-2"
          >
            <ArrowUpRight className="w-5 h-5" />
            Withdraw
          </button>
        </div>
      </div>
    </div>
  );
};
