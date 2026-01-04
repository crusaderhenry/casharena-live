import { Plus, Sparkles } from 'lucide-react';
import { useWallet } from '@/contexts/WalletContext';
import { useState, useEffect } from 'react';
import { useSounds } from '@/hooks/useSounds';
import { useHaptics } from '@/hooks/useHaptics';

interface WalletCardProps {
  compact?: boolean;
}

export const WalletCard = ({ compact = false }: WalletCardProps) => {
  const { balance, addFunds } = useWallet();
  const { play } = useSounds();
  const { success } = useHaptics();
  const [displayBalance, setDisplayBalance] = useState(balance);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (displayBalance !== balance) {
      setIsAnimating(true);
      const diff = balance - displayBalance;
      const steps = 20;
      const increment = diff / steps;
      let current = displayBalance;
      let step = 0;

      const timer = setInterval(() => {
        step++;
        current += increment;
        if (step >= steps) {
          setDisplayBalance(balance);
          setIsAnimating(false);
          clearInterval(timer);
        } else {
          setDisplayBalance(Math.round(current));
        }
      }, 30);

      return () => clearInterval(timer);
    }
  }, [balance, displayBalance]);

  const handleAddFunds = () => {
    addFunds(5000);
    play('coin');
    success();
  };

  if (compact) {
    return (
      <div className="flex items-center gap-3 bg-card rounded-xl px-4 py-3 border border-border/50">
        <div className="flex-1">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Balance</p>
          <p className={`text-xl font-black text-money ${isAnimating ? 'animate-count-up' : ''}`}>
            ₦{displayBalance.toLocaleString()}
          </p>
        </div>
        <button
          onClick={handleAddFunds}
          className="btn-outline flex items-center gap-1 py-2 px-3 text-sm"
        >
          <Plus className="w-4 h-4" />
          Add
        </button>
      </div>
    );
  }

  return (
    <div className="card-premium glow-primary relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      
      <div className="relative">
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Available Balance</p>
            <p className={`text-4xl font-black text-money tracking-tight ${isAnimating ? 'animate-count-up' : ''}`}>
              ₦{displayBalance.toLocaleString()}
            </p>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center glow-primary">
            <Sparkles className="w-7 h-7 text-primary" />
          </div>
        </div>
        <button
          onClick={handleAddFunds}
          className="w-full btn-primary flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add Demo Funds (+₦5,000)
        </button>
      </div>
    </div>
  );
};
