import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2, ArrowLeft, Home } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

type CallbackStatus = 'loading' | 'success' | 'failed' | 'error';

export const DepositCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { refreshProfile } = useAuth();
  const [status, setStatus] = useState<CallbackStatus>('loading');
  const [amount, setAmount] = useState<number>(0);
  const [reference, setReference] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const verifyTransaction = async () => {
      const ref = searchParams.get('reference') || searchParams.get('trxref');
      
      if (!ref) {
        setStatus('error');
        setErrorMessage('No transaction reference found');
        return;
      }

      setReference(ref);

      try {
        // Check transaction status in our database
        const { data: transaction, error } = await supabase
          .from('wallet_transactions')
          .select('*')
          .eq('reference', ref)
          .single();

        if (error || !transaction) {
          // Transaction not found - might be processing
          // Wait a bit and retry
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          const { data: retryTransaction } = await supabase
            .from('wallet_transactions')
            .select('*')
            .eq('reference', ref)
            .single();

          if (!retryTransaction) {
            setStatus('error');
            setErrorMessage('Transaction not found. Please contact support.');
            return;
          }

          handleTransactionStatus(retryTransaction);
          return;
        }

        handleTransactionStatus(transaction);
      } catch (err) {
        console.error('Verification error:', err);
        setStatus('error');
        setErrorMessage('Failed to verify transaction');
      }
    };

    const handleTransactionStatus = async (transaction: any) => {
      setAmount(Math.abs(transaction.amount));

      switch (transaction.status) {
        case 'completed':
          setStatus('success');
          await refreshProfile();
          break;
        case 'failed':
          setStatus('failed');
          setErrorMessage('Payment was not successful');
          break;
        case 'pending':
        case 'processing':
          // Still processing - wait and check again
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          const { data: updatedTransaction } = await supabase
            .from('wallet_transactions')
            .select('*')
            .eq('reference', transaction.reference)
            .single();

          if (updatedTransaction?.status === 'completed') {
            setStatus('success');
            setAmount(Math.abs(updatedTransaction.amount));
            await refreshProfile();
          } else if (updatedTransaction?.status === 'failed') {
            setStatus('failed');
            setErrorMessage('Payment was not successful');
          } else {
            // Still pending after wait
            setStatus('success');
            setAmount(Math.abs(transaction.amount));
            await refreshProfile();
          }
          break;
        default:
          setStatus('error');
          setErrorMessage('Unknown transaction status');
      }
    };

    verifyTransaction();
  }, [searchParams, refreshProfile]);

  const formatMoney = (value: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="card-panel text-center py-12">
          {status === 'loading' && (
            <>
              <Loader2 className="w-16 h-16 text-primary mx-auto mb-6 animate-spin" />
              <h1 className="text-2xl font-bold text-foreground mb-2">Verifying Payment</h1>
              <p className="text-muted-foreground">Please wait while we confirm your transaction...</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-12 h-12 text-primary" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-2">Deposit Successful!</h1>
              <p className="text-4xl font-black text-primary mb-4">{formatMoney(amount)}</p>
              <p className="text-muted-foreground mb-2">has been added to your wallet</p>
              <p className="text-xs text-muted-foreground mb-8">Reference: {reference}</p>
              
              <div className="space-y-3">
                <Button onClick={() => navigate('/wallet')} className="w-full" size="lg">
                  Go to Wallet
                </Button>
                <Button onClick={() => navigate('/home')} variant="outline" className="w-full">
                  <Home className="w-4 h-4 mr-2" />
                  Back to Home
                </Button>
              </div>
            </>
          )}

          {status === 'failed' && (
            <>
              <div className="w-20 h-20 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-6">
                <XCircle className="w-12 h-12 text-destructive" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-2">Payment Failed</h1>
              <p className="text-muted-foreground mb-2">{errorMessage}</p>
              <p className="text-xs text-muted-foreground mb-8">Reference: {reference}</p>
              
              <div className="space-y-3">
                <Button onClick={() => navigate('/wallet')} className="w-full" size="lg">
                  Try Again
                </Button>
                <Button onClick={() => navigate('/home')} variant="outline" className="w-full">
                  <Home className="w-4 h-4 mr-2" />
                  Back to Home
                </Button>
              </div>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-20 h-20 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-6">
                <XCircle className="w-12 h-12 text-yellow-500" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-2">Something Went Wrong</h1>
              <p className="text-muted-foreground mb-8">{errorMessage}</p>
              
              <div className="space-y-3">
                <Button onClick={() => navigate('/wallet')} className="w-full" size="lg">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Go to Wallet
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
