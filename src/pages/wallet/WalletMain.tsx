import { useNavigate } from 'react-router-dom';
import { BottomNav } from '@/components/BottomNav';
import { WalletCard } from '@/components/WalletCard';
import { useWallet } from '@/contexts/WalletContext';
import { ChevronLeft, ChevronRight, ArrowUpRight, ArrowDownLeft, Clock, Lock } from 'lucide-react';

export const WalletMain = () => {
  const navigate = useNavigate();
  const { transactions } = useWallet();

  const getTransactionIcon = (type: string) => {
    if (type.includes('win') || type === 'deposit') {
      return <ArrowDownLeft className="w-4 h-4 text-primary" />;
    }
    return <ArrowUpRight className="w-4 h-4 text-destructive" />;
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
    <div className="min-h-screen bg-background pb-24">
      <div className="p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 pt-2">
          <button 
            onClick={() => navigate('/home')}
            className="w-10 h-10 rounded-xl bg-card flex items-center justify-center"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-foreground">Wallet</h1>
            <p className="text-sm text-muted-foreground">Manage your funds</p>
          </div>
        </div>

        <WalletCard />

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => navigate('/wallet/history')}
            className="card-game flex items-center justify-between py-3"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <span className="font-medium text-foreground">History</span>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>
          
          <button
            className="card-game flex items-center justify-between py-3 opacity-60"
            disabled
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                <Lock className="w-5 h-5 text-muted-foreground" />
              </div>
              <span className="font-medium text-muted-foreground">Withdraw</span>
            </div>
            <span className="text-xs text-muted-foreground">Soon</span>
          </button>
        </div>

        {/* Recent Transactions */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Recent Transactions
            </h3>
            {transactions.length > 5 && (
              <button 
                onClick={() => navigate('/wallet/history')}
                className="text-sm text-primary font-medium"
              >
                View All
              </button>
            )}
          </div>
          
          {transactions.length === 0 ? (
            <div className="card-game text-center py-8">
              <p className="text-muted-foreground">No transactions yet</p>
              <p className="text-sm text-muted-foreground mt-1">Start playing to see activity here!</p>
            </div>
          ) : (
            transactions.slice(0, 5).map((tx) => (
              <div key={tx.id} className="card-game flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    tx.amount >= 0 ? 'bg-primary/20' : 'bg-destructive/20'
                  }`}>
                    {getTransactionIcon(tx.type)}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{tx.description}</p>
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
        <div className="card-game bg-primary/5 border-primary/20">
          <p className="text-sm text-center text-muted-foreground">
            🎮 This is a demo wallet. All transactions are simulated.
          </p>
        </div>
      </div>
      
      <BottomNav />
    </div>
  );
};
