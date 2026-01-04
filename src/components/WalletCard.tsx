import { Plus } from 'lucide-react';
import { useWallet } from '@/contexts/WalletContext';
import { useState, useEffect } from 'react';

interface WalletCardProps {
  compact?: boolean;
}

export const WalletCard = ({ compact = false }: WalletCardProps) => {
  const { balance, addFunds } = useWallet();
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
  };

  if (compact) {
    return (
      <div className="flex items-center gap-3 bg-card rounded-xl px-4 py-3 border border-border">
        <div className="flex-1">
          <p className="text-xs text-muted-foreground">Balance</p>
          <p className={`text-xl font-bold text-money ${isAnimating ? 'animate-count-up' : ''}`}>
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
    <div className="bg-gradient-to-br from-card to-card-elevated rounded-2xl p-5 border border-border glow-primary">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-sm text-muted-foreground mb-1">Available Balance</p>
          <p className={`balance-display ${isAnimating ? 'animate-count-up' : ''}`}>
            ₦{displayBalance.toLocaleString()}
          </p>
        </div>
        <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
          <span className="text-2xl">💰</span>
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
  );
};
