import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '@/contexts/WalletContext';
import { useGame } from '@/contexts/GameContext';
import { Wallet, Plus, Check } from 'lucide-react';

export const MockFunding = () => {
  const navigate = useNavigate();
  const { balance, addFunds } = useWallet();
  const { completeOnboarding } = useGame();
  const [fundsAdded, setFundsAdded] = useState(false);

  const handleAddFunds = () => {
    addFunds(5000);
    setFundsAdded(true);
  };

  const handleEnter = () => {
    completeOnboarding();
    navigate('/home');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col p-6">
      <div className="flex-1">
        <h1 className="text-3xl font-bold text-foreground mb-2 animate-slide-up">
          Your Demo Wallet
        </h1>
        <p className="text-muted-foreground mb-8 animate-slide-up" style={{ animationDelay: '0.05s' }}>
          Start with demo funds to explore all games
        </p>
        
        <div className="bg-gradient-to-br from-card to-card-elevated rounded-2xl p-6 border border-border glow-primary animate-scale-in" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center">
              <Wallet className="w-7 h-7 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Demo Balance</p>
              <p className="balance-display">₦{balance.toLocaleString()}</p>
            </div>
          </div>
          
          <button
            onClick={handleAddFunds}
            disabled={fundsAdded}
            className={`w-full flex items-center justify-center gap-2 py-4 rounded-xl font-bold transition-all ${
              fundsAdded 
                ? 'bg-primary/20 text-primary cursor-default' 
                : 'btn-outline'
            }`}
          >
            {fundsAdded ? (
              <>
                <Check className="w-5 h-5" />
                Funds Added!
              </>
            ) : (
              <>
                <Plus className="w-5 h-5" />
                Add Demo Funds (+₦5,000)
              </>
            )}
          </button>
        </div>
        
        <div className="mt-8 space-y-4 animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <p className="text-sm text-muted-foreground text-center">
            💡 This is demo money for testing. You can add more anytime from your wallet.
          </p>
        </div>
      </div>
      
      <button
        onClick={handleEnter}
        className="btn-primary w-full text-lg py-4 mt-8 animate-fade-in"
        style={{ animationDelay: '0.4s' }}
      >
        Enter CashArena 🚀
      </button>
    </div>
  );
};
