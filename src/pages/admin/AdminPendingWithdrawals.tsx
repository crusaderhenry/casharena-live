import { useState, useEffect } from 'react';
import { Clock, CheckCircle, XCircle, RefreshCw, AlertTriangle, Loader2, Search, User, Building2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface PendingWithdrawal {
  id: string;
  user_id: string;
  amount: number;
  reference: string;
  status: string;
  created_at: string;
  description: string | null;
  profile?: {
    username: string;
    email: string;
    bank_account_name: string | null;
    bank_account_number: string | null;
    bank_code: string | null;
  };
}

interface Bank {
  code: string;
  name: string;
}

export const AdminPendingWithdrawals = () => {
  const [withdrawals, setWithdrawals] = useState<PendingWithdrawal[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchWithdrawals = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('type', 'withdrawal')
        .in('status', ['pending', 'processing'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch user profiles for each withdrawal
      const withdrawalsWithProfiles = await Promise.all(
        (data || []).map(async (tx) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('username, email, bank_account_name, bank_account_number, bank_code')
            .eq('id', tx.user_id)
            .single();
          
          return { ...tx, profile };
        })
      );

      setWithdrawals(withdrawalsWithProfiles);
    } catch (err) {
      console.error('Failed to fetch withdrawals:', err);
      toast.error('Failed to load pending withdrawals');
    } finally {
      setLoading(false);
    }
  };

  const fetchBanks = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get-banks');
      if (!error && data?.banks) {
        setBanks(data.banks);
      }
    } catch (err) {
      console.error('Failed to fetch banks:', err);
    }
  };

  useEffect(() => {
    fetchWithdrawals();
    fetchBanks();
  }, []);

  const getBankName = (code: string | null) => {
    if (!code) return 'Unknown Bank';
    const bank = banks.find(b => b.code === code);
    return bank?.name || code;
  };

  const handleApprove = async (withdrawal: PendingWithdrawal) => {
    if (!confirm(`Approve withdrawal of ₦${Math.abs(withdrawal.amount).toLocaleString()} to ${withdrawal.profile?.bank_account_name}?`)) {
      return;
    }

    setProcessing(withdrawal.id);
    try {
      // Update transaction to completed
      const { error } = await supabase
        .from('wallet_transactions')
        .update({
          status: 'completed',
          description: 'Withdrawal (manually approved)',
        })
        .eq('id', withdrawal.id);

      if (error) throw error;

      toast.success('Withdrawal approved successfully');
      fetchWithdrawals();
    } catch (err) {
      console.error('Failed to approve:', err);
      toast.error('Failed to approve withdrawal');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (withdrawal: PendingWithdrawal) => {
    if (!confirm(`Reject and refund ₦${Math.abs(withdrawal.amount).toLocaleString()} to user's wallet?`)) {
      return;
    }

    setProcessing(withdrawal.id);
    try {
      // Get current balance
      const { data: profile } = await supabase
        .from('profiles')
        .select('wallet_balance')
        .eq('id', withdrawal.user_id)
        .single();

      // Refund the amount
      const refundedBalance = (profile?.wallet_balance || 0) + Math.abs(withdrawal.amount);

      await supabase
        .from('profiles')
        .update({ wallet_balance: refundedBalance })
        .eq('id', withdrawal.user_id);

      // Update transaction to failed
      await supabase
        .from('wallet_transactions')
        .update({
          status: 'failed',
          description: 'Withdrawal rejected - refunded',
        })
        .eq('id', withdrawal.id);

      toast.success('Withdrawal rejected and refunded');
      fetchWithdrawals();
    } catch (err) {
      console.error('Failed to reject:', err);
      toast.error('Failed to reject withdrawal');
    } finally {
      setProcessing(null);
    }
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

  const filteredWithdrawals = withdrawals.filter(w => 
    w.profile?.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    w.profile?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    w.reference?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    w.profile?.bank_account_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPending = withdrawals.reduce((sum, w) => sum + Math.abs(w.amount), 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-foreground">Pending Withdrawals</h1>
          <p className="text-sm text-muted-foreground">Review and process withdrawal requests</p>
        </div>
        <Button onClick={fetchWithdrawals} variant="outline" disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pending Count</p>
              <p className="text-2xl font-bold text-foreground">{withdrawals.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Amount</p>
              <p className="text-2xl font-bold text-foreground">₦{totalPending.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
              <Building2 className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Unique Banks</p>
              <p className="text-2xl font-bold text-foreground">
                {new Set(withdrawals.map(w => w.profile?.bank_code).filter(Boolean)).size}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by username, email, or reference..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Withdrawals List */}
      {loading ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-primary" />
          <p className="text-muted-foreground">Loading withdrawals...</p>
        </div>
      ) : filteredWithdrawals.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <CheckCircle className="w-12 h-12 text-primary mx-auto mb-3" />
          <p className="text-foreground font-medium">No pending withdrawals</p>
          <p className="text-sm text-muted-foreground">All withdrawal requests have been processed</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredWithdrawals.map((withdrawal) => (
            <div 
              key={withdrawal.id} 
              className="bg-card rounded-xl border border-border p-5 space-y-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                    <Clock className="w-6 h-6 text-yellow-500" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-foreground">
                      ₦{Math.abs(withdrawal.amount).toLocaleString()}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="w-3 h-3" />
                      <span>{withdrawal.profile?.username || 'Unknown User'}</span>
                      <span>•</span>
                      <span>{withdrawal.profile?.email}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                    withdrawal.status === 'pending' 
                      ? 'bg-yellow-500/20 text-yellow-500' 
                      : 'bg-blue-500/20 text-blue-400'
                  }`}>
                    {withdrawal.status}
                  </span>
                  <p className="text-xs text-muted-foreground mt-1">{formatDate(withdrawal.created_at)}</p>
                </div>
              </div>

              {/* Bank Details */}
              <div className="bg-muted/30 rounded-lg p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Bank</p>
                  <p className="font-medium text-foreground">{getBankName(withdrawal.profile?.bank_code || null)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Account Number</p>
                  <p className="font-medium text-foreground">{withdrawal.profile?.bank_account_number || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Account Name</p>
                  <p className="font-medium text-foreground">{withdrawal.profile?.bank_account_name || 'N/A'}</p>
                </div>
              </div>

              <div className="text-xs text-muted-foreground">
                Reference: <code className="bg-muted px-1 py-0.5 rounded">{withdrawal.reference}</code>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-2 border-t border-border">
                <Button
                  onClick={() => handleApprove(withdrawal)}
                  disabled={processing === withdrawal.id}
                  className="flex-1"
                >
                  {processing === withdrawal.id ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4 mr-2" />
                  )}
                  Approve & Mark Complete
                </Button>
                <Button
                  onClick={() => handleReject(withdrawal)}
                  disabled={processing === withdrawal.id}
                  variant="destructive"
                  className="flex-1"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject & Refund
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
