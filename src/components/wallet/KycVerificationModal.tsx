import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, ShieldCheck, AlertTriangle, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface KycVerificationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVerified: (firstName: string, lastName: string) => void;
}

export const KycVerificationModal = ({ open, onOpenChange, onVerified }: KycVerificationModalProps) => {
  const [kycType, setKycType] = useState<'nin' | 'bvn'>('nin');
  const [kycNumber, setKycNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [verifiedName, setVerifiedName] = useState({ firstName: '', lastName: '' });

  const handleVerify = async () => {
    if (kycNumber.length !== 11) {
      toast.error(`${kycType.toUpperCase()} must be exactly 11 digits`);
      return;
    }

    if (!/^\d+$/.test(kycNumber)) {
      toast.error(`${kycType.toUpperCase()} must contain only numbers`);
      return;
    }

    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Please log in to verify your identity');
      }

      const { data, error } = await supabase.functions.invoke('verify-kyc', {
        body: {
          type: kycType,
          number: kycNumber,
        },
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      if (data.already_verified) {
        toast.info('Your identity is already verified');
        onVerified(data.first_name, data.last_name);
        onOpenChange(false);
        return;
      }

      setVerifiedName({ firstName: data.first_name, lastName: data.last_name });
      setSuccess(true);
      toast.success('Identity verified successfully!');

      setTimeout(() => {
        onVerified(data.first_name, data.last_name);
        onOpenChange(false);
        setSuccess(false);
        setKycNumber('');
      }, 2000);

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Verification failed';
      console.error('KYC verification error:', message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            Identity Verification
          </DialogTitle>
          <DialogDescription>
            One-time verification required for withdrawals
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="py-8 text-center">
            <CheckCircle className="w-16 h-16 text-primary mx-auto mb-4" />
            <h3 className="text-xl font-bold text-foreground mb-2">Verified!</h3>
            <p className="text-muted-foreground">
              {verifiedName.firstName} {verifiedName.lastName}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg border border-muted">
              <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-1">Why we need this</p>
                <p>
                  To ensure your security, we verify that withdrawals only go to bank accounts 
                  matching your verified identity. This is a one-time verification.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <Label>Verification Method</Label>
              <RadioGroup 
                value={kycType} 
                onValueChange={(value) => setKycType(value as 'nin' | 'bvn')}
                className="grid grid-cols-2 gap-3"
              >
                <div className={`flex items-center space-x-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                  kycType === 'nin' ? 'border-primary bg-primary/10' : 'border-muted hover:border-muted-foreground/30'
                }`}>
                  <RadioGroupItem value="nin" id="nin" />
                  <Label htmlFor="nin" className="cursor-pointer font-medium">NIN</Label>
                </div>
                <div className={`flex items-center space-x-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                  kycType === 'bvn' ? 'border-primary bg-primary/10' : 'border-muted hover:border-muted-foreground/30'
                }`}>
                  <RadioGroupItem value="bvn" id="bvn" />
                  <Label htmlFor="bvn" className="cursor-pointer font-medium">BVN</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="kyc-number">{kycType.toUpperCase()} Number</Label>
              <Input
                id="kyc-number"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={11}
                placeholder={`Enter your 11-digit ${kycType.toUpperCase()}`}
                value={kycNumber}
                onChange={(e) => setKycNumber(e.target.value.replace(/\D/g, ''))}
                className="text-lg tracking-wider"
              />
              <p className="text-xs text-muted-foreground">
                {kycNumber.length}/11 digits
              </p>
            </div>

            <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg">
              <p className="font-medium mb-1">🔒 Your data is secure</p>
              <p>We only use this to verify your identity and match withdrawal accounts. Your {kycType.toUpperCase()} is not stored.</p>
            </div>

            <Button
              onClick={handleVerify}
              disabled={loading || kycNumber.length !== 11}
              className="w-full"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                `Verify ${kycType.toUpperCase()}`
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
