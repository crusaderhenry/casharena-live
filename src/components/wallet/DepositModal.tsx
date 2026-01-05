import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, AlertTriangle, CheckCircle, Wallet } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { toast } from 'sonner';

interface DepositModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  defaultAmount?: number | null;
}

const QUICK_AMOUNTS = [1000, 2000, 5000, 10000];

export const DepositModal = ({ open, onOpenChange, onSuccess, defaultAmount }: DepositModalProps) => {
  const { user, profile, refreshProfile } = useAuth();
  const { isTestMode } = usePlatformSettings();
  const [amount, setAmount] = useState(defaultAmount?.toString() || '');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Update amount when defaultAmount changes
  React.useEffect(() => {
    if (defaultAmount) {
      setAmount(defaultAmount.toString());
    }
  }, [defaultAmount]);

  const handleDeposit = async () => {
    const depositAmount = parseInt(amount);
    
    if (!depositAmount || depositAmount < 100) {
      toast.error('Minimum deposit is ₦100');
      return;
    }

    if (!user || !profile) {
      toast.error('Please log in to deposit');
      return;
    }

    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No session found');
      }

      const { data, error } = await supabase.functions.invoke('paystack-deposit', {
        body: {
          amount: depositAmount,
          email: profile.email,
        },
      });

      if (error) throw error;

      if (data.test_mode) {
        // Test mode - instant success
        setSuccess(true);
        toast.success(`₦${depositAmount.toLocaleString()} added to your wallet!`);
        await refreshProfile();
        
        setTimeout(() => {
          setSuccess(false);
          setAmount('');
          onOpenChange(false);
          onSuccess?.();
        }, 1500);
      } else if (data.authorization_url) {
        // Live mode - redirect to Paystack
        window.location.href = data.authorization_url;
      }
    } catch (err: any) {
      console.error('Deposit error:', err);
      toast.error(err.message || 'Deposit failed');
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" />
            Add Funds
          </DialogTitle>
        </DialogHeader>

        {success ? (
          <div className="py-8 text-center">
            <CheckCircle className="w-16 h-16 text-primary mx-auto mb-4" />
            <h3 className="text-xl font-bold text-foreground mb-2">Deposit Successful!</h3>
            <p className="text-muted-foreground">₦{parseInt(amount).toLocaleString()} has been added to your wallet.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {isTestMode && (
              <div className="flex items-center gap-2 p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
                <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                <span className="text-sm text-yellow-500">Test Mode — funds are simulated</span>
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Amount (₦)</label>
              <Input
                type="number"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="text-lg"
                min={100}
              />
              <p className="text-xs text-muted-foreground mt-1">Minimum: ₦100</p>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {QUICK_AMOUNTS.map((quickAmount) => (
                <button
                  key={quickAmount}
                  onClick={() => setAmount(quickAmount.toString())}
                  className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                    parseInt(amount) === quickAmount
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-muted/80 text-foreground'
                  }`}
                >
                  {formatMoney(quickAmount)}
                </button>
              ))}
            </div>

            <Button
              onClick={handleDeposit}
              disabled={loading || !amount || parseInt(amount) < 100}
              className="w-full"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                `Deposit ${amount ? formatMoney(parseInt(amount)) : ''}`
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
