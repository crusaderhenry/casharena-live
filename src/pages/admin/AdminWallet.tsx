import { useState, useEffect } from 'react';
import { useAdmin } from '@/contexts/AdminContext';

import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { StatCard } from '@/components/admin/StatCard';
import { Wallet, TrendingUp, Clock, CheckCircle, ArrowUpRight, Filter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface AdminTransaction {
  id: string;
  user_id: string;
  type: string;
  amount: number;
  description: string | null;
  status: string;
  reference: string | null;
  mode: string;
  provider_reference: string | null;
  created_at: string;
  username?: string;
}

export const AdminWallet = () => {
  const { approvePayout } = useAdmin();
  const { isTestMode } = usePlatformSettings();
  const [transactions, setTransactions] = useState<AdminTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [modeFilter, setModeFilter] = useState<'all' | 'test' | 'live'>('all');

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        // Fetch transactions with user profiles
        const { data, error } = await supabase
          .from('wallet_transactions')
          .select(`
            *,
            profiles:user_id (username)
          `)
          .order('created_at', { ascending: false })
          .limit(100);

        if (error) throw error;

        const formattedTransactions = (data || []).map((tx: any) => ({
          ...tx,
          username: tx.profiles?.username || 'Unknown',
        }));

        setTransactions(formattedTransactions);
      } catch (err) {
        console.error('Failed to fetch transactions:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();

    // Subscribe to changes
    const channel = supabase
      .channel('admin_wallet_transactions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wallet_transactions',
        },
        () => {
          fetchTransactions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filteredTransactions = transactions.filter(tx => {
    if (modeFilter === 'all') return true;
    return tx.mode === modeFilter;
  });

  const pendingPayouts = filteredTransactions.filter(t => t.type === 'withdrawal' && t.status === 'pending');

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'entry': return 'Game Entry';
      case 'win': return 'Game Win';
      case 'platform_cut': return 'Platform Cut';
      case 'payout': return 'Payout';
      case 'deposit': return 'Deposit';
      case 'withdrawal': return 'Withdrawal';
      default: return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'entry': return 'text-blue-400';
      case 'win': return 'text-green-400';
      case 'deposit': return 'text-green-400';
      case 'platform_cut': return 'text-yellow-400';
      case 'payout': 
      case 'withdrawal': return 'text-red-400';
      default: return 'text-foreground';
    }
  };

  const getModeBadge = (mode: string) => {
    if (mode === 'test') {
      return <span className="px-1.5 py-0.5 text-[10px] rounded bg-yellow-500/20 text-yellow-500 uppercase">Test</span>;
    }
    return <span className="px-1.5 py-0.5 text-[10px] rounded bg-green-500/20 text-green-400 uppercase">Live</span>;
  };

  // Calculate stats from transactions
  const testDeposits = transactions.filter(t => t.mode === 'test' && t.type === 'deposit' && t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
  const liveDeposits = transactions.filter(t => t.mode === 'live' && t.type === 'deposit' && t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
  // Platform balance from platform_cut transactions
  const platformBalance = transactions.filter(t => t.type === 'platform_cut').reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-foreground">Wallet & Payouts</h1>
          <p className="text-sm text-muted-foreground">Financial overview and transaction management</p>
        </div>
        <div className={`px-4 py-2 rounded-full text-sm font-medium ${isTestMode ? 'bg-yellow-500/20 text-yellow-500' : 'bg-green-500/20 text-green-400'}`}>
          {isTestMode ? '🧪 Test Mode' : '🟢 Live Mode'}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Platform Balance"
          value={`₦${platformBalance.toLocaleString()}`}
          icon={Wallet}
          variant="primary"
        />
        <StatCard
          label="Test Deposits"
          value={`₦${testDeposits.toLocaleString()}`}
          icon={TrendingUp}
        />
        <StatCard
          label="Live Deposits"
          value={`₦${liveDeposits.toLocaleString()}`}
          icon={CheckCircle}
          variant="gold"
        />
        <StatCard
          label="Pending Withdrawals"
          value={pendingPayouts.length.toString()}
          icon={Clock}
        />
      </div>

      {/* Pending Payouts */}
      {pendingPayouts.length > 0 && (
        <div className="bg-card rounded-xl border border-yellow-500/30 p-4">
          <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-yellow-400" />
            Pending Withdrawals ({pendingPayouts.length})
          </h3>
          <div className="space-y-2">
            {pendingPayouts.map((txn) => (
              <div key={txn.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                    <ArrowUpRight className="w-5 h-5 text-yellow-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground">{txn.username}</p>
                      {getModeBadge(txn.mode)}
                    </div>
                    <p className="text-[10px] text-muted-foreground">{txn.reference || txn.id.substring(0, 8)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-lg font-bold text-foreground">₦{Math.abs(txn.amount).toLocaleString()}</span>
                  <button
                    onClick={() => approvePayout(txn.id)}
                    className="px-4 py-2 bg-green-500/20 text-green-400 rounded-lg font-medium hover:bg-green-500/30"
                  >
                    Approve
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transaction History */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="font-bold text-foreground">Transaction History</h3>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <select
              value={modeFilter}
              onChange={(e) => setModeFilter(e.target.value as 'all' | 'test' | 'live')}
              className="bg-muted text-foreground text-sm rounded-lg px-3 py-1.5 border border-border"
            >
              <option value="all">All Modes</option>
              <option value="test">Test Only</option>
              <option value="live">Live Only</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left p-4 text-[10px] text-muted-foreground uppercase tracking-wider">Reference</th>
                <th className="text-left p-4 text-[10px] text-muted-foreground uppercase tracking-wider">Type</th>
                <th className="text-left p-4 text-[10px] text-muted-foreground uppercase tracking-wider">User</th>
                <th className="text-left p-4 text-[10px] text-muted-foreground uppercase tracking-wider">Amount</th>
                <th className="text-left p-4 text-[10px] text-muted-foreground uppercase tracking-wider">Mode</th>
                <th className="text-left p-4 text-[10px] text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="text-left p-4 text-[10px] text-muted-foreground uppercase tracking-wider">Time</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">Loading...</td>
                </tr>
              ) : filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">No transactions found</td>
                </tr>
              ) : (
                filteredTransactions.slice(0, 20).map((txn) => (
                  <tr key={txn.id} className="border-b border-border/50 hover:bg-muted/20">
                    <td className="p-4 text-sm text-muted-foreground font-mono">
                      {txn.reference?.substring(0, 15) || txn.id.substring(0, 8)}...
                    </td>
                    <td className="p-4">
                      <span className={`text-sm font-medium ${getTypeColor(txn.type)}`}>
                        {getTypeLabel(txn.type)}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-foreground">{txn.username}</td>
                    <td className="p-4">
                      <span className={`text-sm font-bold ${
                        txn.amount >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {txn.amount >= 0 ? '+' : ''}₦{Math.abs(txn.amount).toLocaleString()}
                      </span>
                    </td>
                    <td className="p-4">
                      {getModeBadge(txn.mode)}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 text-[10px] rounded-full uppercase ${
                        txn.status === 'completed' 
                          ? 'bg-green-500/20 text-green-400' 
                          : txn.status === 'failed'
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {txn.status}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {new Date(txn.created_at).toLocaleTimeString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
