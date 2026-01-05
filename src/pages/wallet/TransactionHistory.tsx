import { useNavigate } from 'react-router-dom';
import { BottomNav } from '@/components/BottomNav';
import { useWalletTransactions } from '@/hooks/useWalletTransactions';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { TestModeBanner } from '@/components/wallet/TestModeBanner';
import { ChevronLeft, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

export const TransactionHistory = () => {
  const navigate = useNavigate();
  const { transactions, loading } = useWalletTransactions();
  const { isTestMode } = usePlatformSettings();

  const getTransactionIcon = (type: string) => {
    if (type.includes('win') || type === 'deposit') {
      return <ArrowDownLeft className="w-4 h-4 text-primary" />;
    }
    return <ArrowUpRight className="w-4 h-4 text-destructive" />;
  };

  const getTransactionColor = (amount: number) => {
    return amount >= 0 ? 'text-primary' : 'text-destructive';
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-NG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      deposit: 'Deposit',
      withdrawal: 'Withdrawal',
      entry: 'Game Entry',
      win: 'Game Win',
      arena_entry: 'Arena Entry',
      arena_win: 'Arena Win',
      streak_entry: 'Streak Entry',
      streak_win: 'Streak Win',
      pool_entry: 'Pool Entry',
      pool_win: 'Pool Win',
      finger_entry: 'Finger Entry',
      finger_win: 'Finger Win',
      rank_reward: 'Rank Reward',
    };
    return labels[type] || type;
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      completed: 'bg-primary/20 text-primary',
      pending: 'bg-yellow-500/20 text-yellow-500',
      processing: 'bg-blue-500/20 text-blue-400',
      failed: 'bg-destructive/20 text-destructive',
    };
    return styles[status] || 'bg-muted text-muted-foreground';
  };

  const getModeBadge = (mode: string) => {
    if (mode === 'test') {
      return <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-500 uppercase">Test</span>;
    }
    return null;
  };

  return (
    <div className={`min-h-screen bg-background pb-24 ${isTestMode ? 'pt-10' : ''}`}>
      <TestModeBanner />
      
      <div className="p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 pt-2">
          <button 
            onClick={() => navigate('/wallet')}
            className="w-10 h-10 rounded-xl bg-card flex items-center justify-center"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-foreground">Transaction History</h1>
            <p className="text-sm text-muted-foreground">{transactions.length} transactions</p>
          </div>
        </div>

        {/* Transactions */}
        <div className="space-y-2">
          {loading ? (
            <div className="card-game text-center py-12">
              <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-3" />
              <p className="text-muted-foreground">Loading transactions...</p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="card-game text-center py-12">
              <p className="text-muted-foreground">No transactions yet</p>
              <p className="text-sm text-muted-foreground mt-1">Start playing to see activity here!</p>
            </div>
          ) : (
            transactions.map((tx) => (
              <div key={tx.id} className="card-game flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    tx.amount >= 0 ? 'bg-primary/20' : 'bg-destructive/20'
                  }`}>
                    {getTransactionIcon(tx.type)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground">{tx.description || tx.type}</p>
                      {tx.status !== 'completed' && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase ${getStatusBadge(tx.status)}`}>
                          {tx.status}
                        </span>
                      )}
                      {getModeBadge(tx.mode)}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{getTypeLabel(tx.type)}</span>
                      <span>•</span>
                      <span>{formatDate(tx.created_at)}</span>
                    </div>
                  </div>
                </div>
                <p className={`font-bold ${getTransactionColor(tx.amount)}`}>
                  {tx.amount >= 0 ? '+' : ''}₦{Math.abs(tx.amount).toLocaleString()}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
      
      <BottomNav />
    </div>
  );
};
