import { Plus, Wallet, TrendingUp } from 'lucide-react';
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
      <div className="card-glass flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
            <Wallet className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-2xs text-muted-foreground uppercase tracking-wider font-medium">Balance</p>
            <p className={`text-xl font-extrabold text-money ${isAnimating ? 'animate-pulse' : ''}`}>
              ₦{displayBalance.toLocaleString()}
            </p>
          </div>
        </div>
        <button
          onClick={handleAddFunds}
          className="btn-outline py-2.5 px-4 text-sm flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add
        </button>
      </div>
    );
  }

  return (
    <div className="card-glow relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-secondary/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
      
      <div className="relative">
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Available Balance</p>
              <div className="flex items-center gap-1 text-2xs text-primary">
                <TrendingUp className="w-3 h-3" />
                <span>+₦2,450</span>
              </div>
            </div>
            <p className={`text-5xl font-extrabold text-money tracking-tight ${isAnimating ? 'animate-pulse' : ''}`}>
              ₦{displayBalance.toLocaleString()}
            </p>
          </div>
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center shadow-glow">
            <Wallet className="w-8 h-8 text-primary" />
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
