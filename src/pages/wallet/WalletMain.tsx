import { useNavigate } from 'react-router-dom';
import { BottomNav } from '@/components/BottomNav';
import { WalletCard } from '@/components/WalletCard';
import { useWallet } from '@/contexts/WalletContext';
import { ChevronLeft, ChevronRight, ArrowUpRight, ArrowDownLeft, Clock, Lock, History } from 'lucide-react';
import { useSounds } from '@/hooks/useSounds';
import { useHaptics } from '@/hooks/useHaptics';

export const WalletMain = () => {
  const navigate = useNavigate();
  const { transactions } = useWallet();
  const { play } = useSounds();
  const { buttonClick } = useHaptics();

  const getTransactionIcon = (type: string) => {
    if (type.includes('win') || type === 'deposit') {
      return <ArrowDownLeft className="w-5 h-5 text-primary" />;
    }
    return <ArrowUpRight className="w-5 h-5 text-destructive" />;
  };

  const getTransactionColor = (amount: number) => {
    return amount >= 0 ? 'text-primary' : 'text-destructive';
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-background safe-bottom">
      <div className="px-5 pt-6 pb-8 space-y-6">
        {/* Header */}
        <header className="flex items-center gap-4 animate-slide-down">
          <button 
            onClick={() => {
              play('click');
              buttonClick();
              navigate('/home');
            }}
            className="btn-icon"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-foreground">Wallet</h1>
            <p className="text-sm text-muted-foreground">Manage your funds</p>
          </div>
        </header>

        <div className="animate-slide-up">
          <WalletCard />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3 animate-slide-up" style={{ animationDelay: '50ms' }}>
          <button
            onClick={() => {
              play('click');
              buttonClick();
              navigate('/wallet/history');
            }}
            className="card-interactive flex items-center justify-between py-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-primary/15 flex items-center justify-center">
                <History className="w-5 h-5 text-primary" />
              </div>
              <span className="font-semibold text-foreground">History</span>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>
          
          <button
            className="card-base flex items-center justify-between py-4 opacity-60 cursor-not-allowed"
            disabled
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center">
                <Lock className="w-5 h-5 text-muted-foreground" />
              </div>
              <span className="font-semibold text-muted-foreground">Withdraw</span>
            </div>
            <span className="text-xs text-muted-foreground">Soon</span>
          </button>
        </div>

        {/* Recent Transactions */}
        <div className="space-y-3 animate-slide-up" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
              Recent Transactions
            </h3>
            {transactions.length > 5 && (
              <button 
                onClick={() => {
                  play('click');
                  buttonClick();
                  navigate('/wallet/history');
                }}
                className="text-sm text-primary font-semibold"
              >
                View All
              </button>
            )}
          </div>
          
          {transactions.length === 0 ? (
            <div className="card-premium text-center py-10">
              <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground font-medium">No transactions yet</p>
              <p className="text-sm text-muted-foreground mt-1">Start playing to see activity here!</p>
            </div>
          ) : (
            transactions.slice(0, 5).map((tx, index) => (
              <div 
                key={tx.id} 
                className="card-interactive flex items-center justify-between py-3 animate-slide-up"
                style={{ animationDelay: `${(index + 3) * 30}ms` }}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                    tx.amount >= 0 ? 'bg-primary/15' : 'bg-destructive/15'
                  }`}>
                    {getTransactionIcon(tx.type)}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{tx.description}</p>
                    <p className="text-xs text-muted-foreground">{formatTime(tx.timestamp)}</p>
                  </div>
                </div>
                <p className={`font-bold ${getTransactionColor(tx.amount)}`}>
                  {tx.amount >= 0 ? '+' : ''}₦{Math.abs(tx.amount).toLocaleString()}
                </p>
              </div>
            ))
          )}
        </div>

        {/* Demo Notice */}
        <div className="card-glass bg-primary/5 border-primary/20 text-center animate-slide-up" style={{ animationDelay: '150ms' }}>
          <p className="text-sm text-muted-foreground">
            🎮 This is a demo wallet. All transactions are simulated.
          </p>
        </div>
      </div>
      
      <BottomNav />
    </div>
  );
};
