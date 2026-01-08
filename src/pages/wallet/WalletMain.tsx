import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { BottomNav } from '@/components/BottomNav';
import { WalletCard } from '@/components/WalletCard';
import { useWalletTransactions } from '@/hooks/useWalletTransactions';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { DepositModal } from '@/components/wallet/DepositModal';
import { WithdrawModal } from '@/components/wallet/WithdrawModal';
import { TestModeBanner } from '@/components/wallet/TestModeBanner';
import { ArrowLeft, ChevronRight, ArrowUpRight, ArrowDownLeft, Clock, Wallet, Zap, AlertTriangle, RefreshCw } from 'lucide-react';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { PullToRefreshIndicator } from '@/components/PullToRefresh';
import { useAuth } from '@/contexts/AuthContext';

export const WalletMain = () => {
  const navigate = useNavigate();
  const { transactions, loading, refetch } = useWalletTransactions();
  const { isTestMode } = usePlatformSettings();
  const { refreshProfile } = useAuth();
  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);

  // Pull to refresh
  const handleRefresh = useCallback(async () => {
    await Promise.all([refetch(), refreshProfile()]);
  }, [refetch, refreshProfile]);

  const { containerRef, isRefreshing, pullDistance, pullProgress } = usePullToRefresh({
    onRefresh: handleRefresh,
  });

  const handleManualRefresh = async () => {
    setIsManualRefreshing(true);
    await handleRefresh();
    setIsManualRefreshing(false);
  };

  const getTransactionIcon = (type: string) => {
    if (type.includes('win') || type === 'deposit') {
      return <ArrowDownLeft className="w-4 h-4 text-primary" />;
    }
    return <ArrowUpRight className="w-4 h-4 text-destructive" />;
  };

  const getTransactionColor = (amount: number) => {
    return amount >= 0 ? 'text-primary' : 'text-destructive';
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return date.toLocaleDateString();
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

  return (
    <div ref={containerRef} className={`min-h-screen bg-background pb-24 overflow-auto scroll-smooth-ios ${isTestMode ? 'pt-10' : ''}`}>
      <TestModeBanner />
      
      <PullToRefreshIndicator 
        pullProgress={pullProgress} 
        isRefreshing={isRefreshing} 
        pullDistance={pullDistance} 
      />
      
      {/* Sticky Header + Balance */}
      <div className="sticky-header border-b border-border/30">
        <div className="p-4 space-y-4">
          {/* Header */}
          <div className="flex items-center gap-3 pt-2">
            <button 
              onClick={() => navigate('/home')}
              className="w-10 h-10 rounded-xl bg-card flex items-center justify-center border border-border/50 touch-feedback"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <div className="flex-1">
              <h1 className="text-xl font-black text-foreground">Wallet</h1>
              <p className="text-sm text-muted-foreground">Manage your funds</p>
            </div>
            <button
              onClick={handleManualRefresh}
              disabled={isManualRefreshing}
              className="w-10 h-10 rounded-xl bg-card flex items-center justify-center border border-border/50 hover:border-primary/40 transition-colors disabled:opacity-50 touch-feedback"
            >
              <RefreshCw className={`w-5 h-5 text-muted-foreground ${isManualRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Balance Card */}
          <WalletCard 
            onDepositClick={() => setDepositOpen(true)}
            onWithdrawClick={() => setWithdrawOpen(true)}
          />
        </div>
      </div>

      <div className="p-4 space-y-5">
        {/* Quick Actions */}
        <button
          onClick={() => navigate('/wallet/history')}
          className="card-panel flex items-center justify-between py-4 hover:border-primary/40 transition-all w-full touch-feedback"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
              <Clock className="w-5 h-5 text-muted-foreground" />
            </div>
            <span className="font-medium text-foreground">Transaction History</span>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </button>

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
          
          {loading ? (
            <div className="card-panel text-center py-8">
              <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-3" />
              <p className="text-muted-foreground">Loading transactions...</p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="card-panel text-center py-8">
              <Zap className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-foreground font-medium">No transactions yet</p>
              <p className="text-sm text-muted-foreground mt-1">Play Royal Rumble to see activity here!</p>
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
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground truncate">{tx.description || tx.type}</p>
                      {tx.status !== 'completed' && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase ${getStatusBadge(tx.status)}`}>
                          {tx.status}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{formatTime(tx.created_at)}</p>
                  </div>
                  <p className={`font-bold ${getTransactionColor(tx.amount)}`}>
                    {tx.amount >= 0 ? '+' : ''}₦{Math.abs(tx.amount).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Mode Notice */}
        {isTestMode && (
          <div className="card-panel bg-yellow-500/10 border-yellow-500/30">
            <div className="flex items-center gap-2 text-sm text-center text-yellow-500">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>Test Mode — all transactions are simulated</span>
            </div>
          </div>
        )}
      </div>
      
      <DepositModal 
        open={depositOpen} 
        onOpenChange={setDepositOpen} 
      />
      <WithdrawModal 
        open={withdrawOpen} 
        onOpenChange={setWithdrawOpen} 
      />
      <BottomNav />
    </div>
  );
};
