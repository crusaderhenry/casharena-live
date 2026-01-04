import { useNavigate } from 'react-router-dom';
import { BottomNav } from '@/components/BottomNav';
import { WalletCard } from '@/components/WalletCard';
import { useWallet } from '@/contexts/WalletContext';
import { ArrowLeft, ChevronRight, ArrowUpRight, ArrowDownLeft, Clock, Lock, Zap } from 'lucide-react';

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

  // Filter for Fastest Finger related transactions only
  const fingerTransactions = transactions.filter(tx => 
    tx.type.includes('finger') || tx.type === 'deposit' || tx.type === 'rank_reward'
  );

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="p-4 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3 pt-2">
          <button 
            onClick={() => navigate('/home')}
            className="w-10 h-10 rounded-xl bg-card flex items-center justify-center border border-border/50"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div>
            <h1 className="text-xl font-black text-foreground">Wallet</h1>
            <p className="text-sm text-muted-foreground">Manage your funds</p>
          </div>
        </div>

        {/* Balance Card */}
        <WalletCard />

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => navigate('/wallet/history')}
            className="card-panel flex items-center gap-3 hover:border-primary/40 transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <Clock className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 text-left">
              <span className="font-medium text-foreground">History</span>
              <p className="text-xs text-muted-foreground">View all</p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>
          
          <button
            className="card-panel flex items-center gap-3 opacity-60 cursor-not-allowed"
            disabled
          >
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
              <Lock className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="flex-1 text-left">
              <span className="font-medium text-muted-foreground">Withdraw</span>
              <p className="text-xs text-muted-foreground">Coming soon</p>
            </div>
          </button>
        </div>

        {/* Recent Transactions */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              Recent Activity
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
            <div className="card-panel text-center py-8">
              <Zap className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-foreground font-medium">No transactions yet</p>
              <p className="text-sm text-muted-foreground mt-1">Play Fastest Finger to see activity here!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.slice(0, 5).map((tx) => (
                <div key={tx.id} className="card-panel flex items-center gap-3 py-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    tx.amount >= 0 ? 'bg-primary/20' : 'bg-destructive/20'
                  }`}>
                    {getTransactionIcon(tx.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{tx.description}</p>
                    <p className="text-xs text-muted-foreground">{formatTime(tx.timestamp)}</p>
                  </div>
                  <p className={`font-bold ${getTransactionColor(tx.amount)}`}>
                    {tx.amount >= 0 ? '+' : ''}₦{Math.abs(tx.amount).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Demo Notice */}
        <div className="card-panel bg-primary/5 border-primary/20">
          <p className="text-sm text-center text-muted-foreground">
            🎮 Demo wallet — all transactions are simulated
          </p>
        </div>
      </div>
      
      <BottomNav />
    </div>
  );
};
