import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, AlertTriangle, CheckCircle, ArrowUpRight, BadgeCheck, XCircle, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { KycVerificationModal } from './KycVerificationModal';
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
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [verificationError, setVerificationError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showKycModal, setShowKycModal] = useState(false);
  const [kycVerified, setKycVerified] = useState(false);
  const [kycName, setKycName] = useState({ firstName: '', lastName: '' });
  const [nameMismatchError, setNameMismatchError] = useState(false);
  const [payoutDisabledError, setPayoutDisabledError] = useState(false);

  // Check KYC status on open
  useEffect(() => {
    if (open && profile) {
      // Check if profile has kyc_verified field (we need to fetch it fresh)
      checkKycStatus();
    }
  }, [open, profile]);

  const checkKycStatus = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('kyc_verified, kyc_first_name, kyc_last_name')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      
      if (data?.kyc_verified) {
        setKycVerified(true);
        setKycName({ 
          firstName: data.kyc_first_name || '', 
          lastName: data.kyc_last_name || '' 
        });
      } else {
        setKycVerified(false);
        // Show KYC modal on first withdrawal attempt
        setShowKycModal(true);
      }
    } catch (err) {
      console.error('Failed to check KYC status:', err);
    }
  };

  const handleKycVerified = (firstName: string, lastName: string) => {
    setKycVerified(true);
    setKycName({ firstName, lastName });
    setShowKycModal(false);
    refreshProfile();
  };

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
        setVerified(true); // Already verified if saved
      }
      if (profile?.bank_account_number) {
        setAccountNumber(profile.bank_account_number);
      }
      if (profile?.bank_code) {
        setBankCode(profile.bank_code);
      }
    }
  }, [open, profile]);

  // Reset verification when account number or bank changes
  useEffect(() => {
    if (accountNumber.length === 10 && bankCode && !verified) {
      // Auto-verify when both fields are complete
      verifyAccount();
    } else if (accountNumber.length < 10 || !bankCode) {
      setVerified(false);
      setAccountName('');
      setVerificationError('');
    }
  }, [accountNumber, bankCode]);

  const verifyAccount = async () => {
    if (accountNumber.length !== 10 || !bankCode) return;

    setVerifying(true);
    setVerificationError('');
    setAccountName('');
    setVerified(false);

    try {
      const { data, error } = await supabase.functions.invoke('verify-bank-account', {
        body: {
          account_number: accountNumber,
          bank_code: bankCode,
        },
      });

      if (error) throw error;

      if (data.success) {
        setAccountName(data.account_name);
        setVerified(true);
        toast.success('Account verified!');
      } else {
        setVerificationError(data.error || 'Could not verify account');
      }
    } catch (err: any) {
      console.error('Verification error:', err);
      setVerificationError(err.message || 'Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  const handleWithdraw = async () => {
    // Check KYC first
    if (!kycVerified) {
      setShowKycModal(true);
      return;
    }

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

    if (!verified || !accountName) {
      toast.error('Please verify your bank account first');
      return;
    }

    // Verify account name matches KYC name
    const normalizedAccountName = accountName.toLowerCase();
    
    // Check if account name contains the KYC name parts
    const firstNameMatch = normalizedAccountName.includes(kycName.firstName.toLowerCase());
    const lastNameMatch = normalizedAccountName.includes(kycName.lastName.toLowerCase());
    
    if (!firstNameMatch || !lastNameMatch) {
      setNameMismatchError(true);
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
      const errorMessage = err.message || '';
      
      // Check for Paystack payout disabled error
      if (errorMessage.includes('third party payouts') || errorMessage.includes('cannot initiate')) {
        setPayoutDisabledError(true);
      } else {
        toast.error(errorMessage || 'Withdrawal failed');
      }
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

  const handleClose = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset state when closing
      setAmount('');
      setVerified(false);
      setVerificationError('');
      setSuccess(false);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
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

            {/* KYC Status */}
            {kycVerified ? (
              <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg border border-primary/30">
                <ShieldCheck className="w-4 h-4 text-primary flex-shrink-0" />
                <div className="flex-1">
                  <span className="text-sm text-primary font-medium">Identity Verified</span>
                  <p className="text-xs text-muted-foreground">{kycName.firstName} {kycName.lastName}</p>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowKycModal(true)}
                className="w-full flex items-center gap-2 p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/30 hover:bg-yellow-500/20 transition-colors"
              >
                <ShieldCheck className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                <span className="text-sm text-yellow-500">Tap to verify your identity</span>
              </button>
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
              <Select 
                value={bankCode} 
                onValueChange={(value) => {
                  setBankCode(value);
                  setVerified(false);
                }} 
                disabled={loadingBanks}
              >
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
              <div className="relative">
                <Input
                  type="text"
                  placeholder="10 digit account number"
                  value={accountNumber}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setAccountNumber(value);
                    if (value.length < 10) {
                      setVerified(false);
                    }
                  }}
                  maxLength={10}
                  className="pr-10"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {verifying && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                  {verified && <BadgeCheck className="w-5 h-5 text-primary" />}
                  {verificationError && <XCircle className="w-5 h-5 text-destructive" />}
                </div>
              </div>
              {verificationError && (
                <p className="text-xs text-destructive mt-1">{verificationError}</p>
              )}
            </div>

            {/* Account Name - Auto-filled from verification */}
            {(verified || accountName) && (
              <div className="p-3 bg-primary/10 rounded-lg border border-primary/30">
                <div className="flex items-center gap-2">
                  <BadgeCheck className="w-5 h-5 text-primary flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Account Name</p>
                    <p className="font-medium text-foreground">{accountName}</p>
                  </div>
                </div>
              </div>
            )}

            <Button
              onClick={handleWithdraw}
              disabled={
                loading || 
                !amount || 
                parseInt(amount) < 100 || 
                parseInt(amount) > walletBalance ||
                !verified ||
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

      <KycVerificationModal
        open={showKycModal}
        onOpenChange={setShowKycModal}
        onVerified={handleKycVerified}
      />

      {/* Name Mismatch Error Dialog */}
      <Dialog open={nameMismatchError} onOpenChange={setNameMismatchError}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="w-5 h-5" />
              Account Name Mismatch
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/30">
              <p className="text-sm text-foreground font-medium mb-2">
                Your bank account name does not match your verified identity.
              </p>
              <p className="text-sm text-muted-foreground">
                For security, withdrawals can only be made to bank accounts that match your KYC-verified name.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Your Verified Name</p>
                <p className="font-medium text-primary">{kycName.firstName} {kycName.lastName}</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Bank Account Name</p>
                <p className="font-medium text-foreground">{accountName}</p>
              </div>
            </div>

            <div className="text-xs text-muted-foreground">
              <p className="font-medium mb-1">What you can do:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Use a bank account registered in your verified name</li>
                <li>Contact support if you believe this is an error</li>
              </ul>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={() => setNameMismatchError(false)}>
              Try Different Account
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Paystack Payout Disabled Error Dialog */}
      <Dialog open={payoutDisabledError} onOpenChange={setPayoutDisabledError}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Withdrawals Temporarily Unavailable
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/30">
              <p className="text-sm text-foreground font-medium mb-2">
                Our payment provider is currently unable to process withdrawals.
              </p>
              <p className="text-sm text-muted-foreground">
                This is usually a temporary issue with our payment gateway. Your balance is safe and will remain in your wallet.
              </p>
            </div>

            <div className="p-4 bg-amber-500/10 rounded-lg border border-amber-500/30">
              <p className="text-sm font-medium text-amber-600 mb-2">What's happening?</p>
              <p className="text-sm text-muted-foreground mb-3">
                The payment provider has not yet enabled transfers/payouts on our merchant account, or there's a temporary restriction.
              </p>
              <p className="text-sm font-medium text-amber-600 mb-2">What you can do:</p>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Try again later (usually resolved within 24-48 hours)</li>
                <li>Contact support if this persists</li>
                <li>Your funds are safe in your wallet</li>
              </ul>
            </div>

            <div className="text-xs text-muted-foreground text-center">
              Error: Payment provider payout restriction
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setPayoutDisabledError(false)}>
              Close
            </Button>
            <Button onClick={() => {
              setPayoutDisabledError(false);
              // Could add a support link here
              toast.info('Please contact support for assistance');
            }}>
              Contact Support
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};
