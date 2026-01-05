import { useAdmin } from '@/contexts/AdminContext';
import { StatCard } from '@/components/admin/StatCard';
import { Wallet, TrendingUp, Clock, CheckCircle, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export const AdminWallet = () => {
  const { stats, transactions, approvePayout } = useAdmin();

  const pendingPayouts = transactions.filter(t => t.type === 'payout' && t.status === 'pending');

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'entry': return 'Game Entry';
      case 'win': return 'Game Win';
      case 'platform_cut': return 'Platform Cut';
      case 'payout': return 'Payout';
      default: return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'entry': return 'text-blue-400';
      case 'win': return 'text-green-400';
      case 'platform_cut': return 'text-gold';
      case 'payout': return 'text-red-400';
      default: return 'text-foreground';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-foreground">Wallet & Payouts</h1>
        <p className="text-sm text-muted-foreground">Financial overview and transaction management</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Platform Balance"
          value={`₦${stats.totalPlatformBalance.toLocaleString()}`}
          icon={Wallet}
          variant="primary"
        />
        <StatCard
          label="Total User Balances"
          value={`₦${stats.totalUserBalances.toLocaleString()}`}
          icon={TrendingUp}
        />
        <StatCard
          label="Pending Payouts"
          value={`₦${stats.pendingPayouts.toLocaleString()}`}
          icon={Clock}
        />
        <StatCard
          label="Completed Payouts"
          value={`₦${stats.completedPayouts.toLocaleString()}`}
          icon={CheckCircle}
          variant="gold"
        />
      </div>

      {/* Pending Payouts */}
      {pendingPayouts.length > 0 && (
        <div className="bg-card rounded-xl border border-yellow-500/30 p-4">
          <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-yellow-400" />
            Pending Payouts ({pendingPayouts.length})
          </h3>
          <div className="space-y-2">
            {pendingPayouts.map((txn) => (
              <div key={txn.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                    <ArrowUpRight className="w-5 h-5 text-yellow-400" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{txn.username}</p>
                    <p className="text-[10px] text-muted-foreground">{txn.id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-lg font-bold text-foreground">₦{txn.amount.toLocaleString()}</span>
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
        <div className="p-4 border-b border-border">
          <h3 className="font-bold text-foreground">Transaction History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left p-4 text-[10px] text-muted-foreground uppercase tracking-wider">ID</th>
                <th className="text-left p-4 text-[10px] text-muted-foreground uppercase tracking-wider">Type</th>
                <th className="text-left p-4 text-[10px] text-muted-foreground uppercase tracking-wider">User</th>
                <th className="text-left p-4 text-[10px] text-muted-foreground uppercase tracking-wider">Amount</th>
                <th className="text-left p-4 text-[10px] text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="text-left p-4 text-[10px] text-muted-foreground uppercase tracking-wider">Time</th>
              </tr>
            </thead>
            <tbody>
              {transactions.slice(0, 20).map((txn) => (
                <tr key={txn.id} className="border-b border-border/50 hover:bg-muted/20">
                  <td className="p-4 text-sm text-muted-foreground">{txn.id}</td>
                  <td className="p-4">
                    <span className={`text-sm font-medium ${getTypeColor(txn.type)}`}>
                      {getTypeLabel(txn.type)}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-foreground">{txn.username}</td>
                  <td className="p-4">
                    <span className={`text-sm font-bold ${
                      txn.type === 'win' || txn.type === 'platform_cut' ? 'text-green-400' : 
                      txn.type === 'payout' ? 'text-red-400' : 'text-foreground'
                    }`}>
                      {txn.type === 'payout' ? '-' : '+'}₦{txn.amount.toLocaleString()}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 text-[10px] rounded-full uppercase ${
                      txn.status === 'completed' 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {txn.status}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-muted-foreground">
                    {new Date(txn.createdAt).toLocaleTimeString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
