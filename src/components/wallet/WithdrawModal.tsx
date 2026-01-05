import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, AlertTriangle, CheckCircle, ArrowUpRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { toast } from 'sonner';

interface Bank {
  code: string;
  name: string;
}

interface WithdrawModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const WithdrawModal = ({ open, onOpenChange, onSuccess }: WithdrawModalProps) => {
  const { user, profile, refreshProfile } = useAuth();
  const { isTestMode } = usePlatformSettings();
  const [amount, setAmount] = useState('');
  const [bankCode, setBankCode] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingBanks, setLoadingBanks] = useState(true);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fetchBanks = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-banks');
        if (error) throw error;
        setBanks(data.banks || []);
      } catch (err) {
        console.error('Failed to fetch banks:', err);
      } finally {
        setLoadingBanks(false);
      }
    };

    if (open) {
      fetchBanks();
      // Pre-fill saved bank details
      if (profile?.bank_account_name) {
        setAccountName(profile.bank_account_name);
      }
      if (profile?.bank_account_number) {
        setAccountNumber(profile.bank_account_number);
      }
      if (profile?.bank_code) {
        setBankCode(profile.bank_code);
      }
    }
  }, [open, profile]);

  const handleWithdraw = async () => {
    const withdrawAmount = parseInt(amount);
    const walletBalance = profile?.wallet_balance || 0;
    
    if (!withdrawAmount || withdrawAmount < 100) {
      toast.error('Minimum withdrawal is ₦100');
      return;
    }

    if (withdrawAmount > walletBalance) {
      toast.error('Insufficient balance');
      return;
    }

    if (!bankCode || !accountNumber || !accountName) {
      toast.error('Please fill in all bank details');
      return;
    }

    if (!user) {
      toast.error('Please log in');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('paystack-withdraw', {
        body: {
          amount: withdrawAmount,
          bank_code: bankCode,
          account_number: accountNumber,
          account_name: accountName,
        },
      });

      if (error) throw error;

      if (data.success) {
        setSuccess(true);
        await refreshProfile();
        
        if (data.test_mode) {
          toast.success(`₦${withdrawAmount.toLocaleString()} withdrawn successfully!`);
        } else {
          toast.success('Withdrawal initiated! You will be notified when complete.');
        }
        
        setTimeout(() => {
          setSuccess(false);
          setAmount('');
          onOpenChange(false);
          onSuccess?.();
        }, 1500);
      }
    } catch (err: any) {
      console.error('Withdrawal error:', err);
      toast.error(err.message || 'Withdrawal failed');
    } finally {
      setLoading(false);
    }
  };

  const formatMoney = (value: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const walletBalance = profile?.wallet_balance || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowUpRight className="w-5 h-5 text-primary" />
            Withdraw Funds
          </DialogTitle>
        </DialogHeader>

        {success ? (
          <div className="py-8 text-center">
            <CheckCircle className="w-16 h-16 text-primary mx-auto mb-4" />
            <h3 className="text-xl font-bold text-foreground mb-2">
              {isTestMode ? 'Withdrawal Successful!' : 'Withdrawal Initiated!'}
            </h3>
            <p className="text-muted-foreground">
              {isTestMode 
                ? `₦${parseInt(amount).toLocaleString()} has been withdrawn.`
                : 'You will be notified when the transfer is complete.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {isTestMode && (
              <div className="flex items-center gap-2 p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
                <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                <span className="text-sm text-yellow-500">Test Mode — instant simulation</span>
              </div>
            )}

            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Available Balance</p>
              <p className="text-xl font-bold text-primary">{formatMoney(walletBalance)}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Amount (₦)</label>
              <Input
                type="number"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                max={walletBalance}
                min={100}
              />
              <p className="text-xs text-muted-foreground mt-1">Minimum: ₦100</p>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Bank</label>
              <Select value={bankCode} onValueChange={setBankCode} disabled={loadingBanks}>
                <SelectTrigger>
                  <SelectValue placeholder={loadingBanks ? 'Loading banks...' : 'Select bank'} />
                </SelectTrigger>
                <SelectContent>
                  {banks.map((bank) => (
                    <SelectItem key={bank.code} value={bank.code}>
                      {bank.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Account Number</label>
              <Input
                type="text"
                placeholder="10 digit account number"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                maxLength={10}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Account Name</label>
              <Input
                type="text"
                placeholder="Account holder name"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
              />
            </div>

            <Button
              onClick={handleWithdraw}
              disabled={
                loading || 
                !amount || 
                parseInt(amount) < 100 || 
                parseInt(amount) > walletBalance ||
                !bankCode ||
                !accountNumber ||
                !accountName
              }
              className="w-full"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                `Withdraw ${amount ? formatMoney(parseInt(amount)) : ''}`
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
