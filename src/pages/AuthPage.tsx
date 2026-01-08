import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Zap, Mail, User, ArrowRight, ArrowLeft, Gift } from 'lucide-react';
import { z } from 'zod';
import { FunctionsHttpError, FunctionsFetchError, FunctionsRelayError } from '@supabase/supabase-js';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';

const emailSchema = z.string().email('Invalid email address');
const usernameSchema = z.string().min(3, 'Username must be at least 3 characters').max(20, 'Username too long');

const REMEMBERED_EMAIL_KEY = 'fortunes_remembered_email';

const tryExtractJsonError = (message: string): string | null => {
  const match = message.match(/\{[\s\S]*\}$/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]);
    if (parsed && typeof parsed === 'object' && typeof parsed.error === 'string') return parsed.error;
  } catch {
    // ignore
  }
  return null;
};

const getEdgeFunctionErrorMessage = async (err: unknown): Promise<string> => {
  if (err instanceof FunctionsHttpError) {
    try {
      const body = await err.context.json();
      if (body && typeof body === 'object' && 'error' in body && typeof (body as any).error === 'string') {
        return (body as any).error;
      }
    } catch {
      // ignore
    }
    return tryExtractJsonError(err.message) ?? 'Request failed';
  }

  if (err instanceof FunctionsRelayError || err instanceof FunctionsFetchError) {
    return tryExtractJsonError(err.message) ?? err.message;
  }

  if (err && typeof err === 'object' && 'message' in err && typeof (err as any).message === 'string') {
    return tryExtractJsonError((err as any).message) ?? (err as any).message;
  }

  return 'Request failed';
};

// Google icon component
const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

type AuthStep = 'email' | 'otp' | 'username';

export const AuthPage = () => {
  const navigate = useNavigate();
  const { 
    googleAuthEnabled, 
    loading: settingsLoading,
    welcomeBonusEnabled,
    welcomeBonusAmount,
    welcomeBonusLimit,
    welcomeBonusMessage
  } = usePlatformSettings();
  
  const [step, setStep] = useState<AuthStep>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [bonusRecipientCount, setBonusRecipientCount] = useState(0);
  const [bonusLoading, setBonusLoading] = useState(true);

  // Fetch bonus recipient count
  useEffect(() => {
    const fetchBonusCount = async () => {
      if (!welcomeBonusEnabled) {
        setBonusLoading(false);
        return;
      }
      
      const { count, error } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('received_welcome_bonus', true);
      
      if (!error) {
        setBonusRecipientCount(count || 0);
      }
      setBonusLoading(false);
    };
    
    fetchBonusCount();
  }, [welcomeBonusEnabled]);

  // Load remembered email on mount
  useEffect(() => {
    const remembered = localStorage.getItem(REMEMBERED_EMAIL_KEY);
    if (remembered) {
      setEmail(remembered);
    }
  }, []);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      emailSchema.parse(email);
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(err.errors[0].message);
      }
      return;
    }

    setLoading(true);

    try {
      // Call the send-otp edge function
      const { data, error: invokeError } = await supabase.functions.invoke('send-otp', {
        body: { email },
      });

      if (invokeError) {
        setError(await getEdgeFunctionErrorMessage(invokeError));
        return;
      }

      if (data?.error) {
        setError(data.error);
        return;
      }

      // Remember email
      localStorage.setItem(REMEMBERED_EMAIL_KEY, email);
      setSuccess('Check your email for the verification code!');
      setResendCooldown(60);
      setStep('otp');
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (otp.length !== 6) {
      setError('Please enter the 6-digit code');
      return;
    }

    setLoading(true);

    try {
      // Call the verify-otp edge function
      const { data, error: invokeError } = await supabase.functions.invoke('verify-otp', {
        body: { email, code: otp },
      });

      if (invokeError) {
        setError(await getEdgeFunctionErrorMessage(invokeError));
        return;
      }

      if (data?.error) {
        setError(data.error);
        return;
      }

      if (data?.tokenHash && data?.type) {
        // Verify the magic link token to establish a session
        const { error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: data.tokenHash,
          type: 'magiclink',
        });

        if (verifyError) {
          console.error('Session verification error:', verifyError);
          setError('Failed to establish session. Please try again.');
          return;
        }

        // Check if user needs to set username
        if (!data.hasUsername) {
          setStep('username');
        } else {
          navigate('/home');
        }
      } else {
        setError('Invalid response from server');
      }
    } catch (err) {
      console.error('Verify OTP error:', err);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSetUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      usernameSchema.parse(username);
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(err.errors[0].message);
      }
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setError('Session expired. Please try again.');
        setStep('email');
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          username,
          avatar: ['🎮', '🎯', '⚡', '🔥', '💎', '🚀'][Math.floor(Math.random() * 6)],
        })
        .eq('id', user.id);

      if (error) {
        if (error.message.includes('duplicate') || error.message.includes('unique')) {
          setError('Username already taken. Choose another.');
        } else {
          setError(error.message);
        }
        return;
      }

      localStorage.setItem(`username_set_${user.id}`, 'true');
      navigate('/home');
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendCooldown > 0) return;
    
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('send-otp', {
        body: { email },
      });

      if (invokeError) {
        setError(await getEdgeFunctionErrorMessage(invokeError));
        return;
      }

      if (data?.error) {
        setError(data.error);
        return;
      }

      setSuccess('New code sent!');
      setResendCooldown(60);
    } catch (err) {
      setError('Failed to resend code');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setError(null);
    setGoogleLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/home`,
        },
      });

      if (error) {
        setError(error.message);
      }
    } catch (err) {
      setError('Failed to connect with Google');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleBack = () => {
    setError(null);
    setSuccess(null);
    setOtp('');
    if (step === 'username') {
      // Can't go back from username step - they're already logged in
      return;
    }
    setStep('email');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      {/* Logo */}
      <div className="mb-8 text-center">
        <div className="w-20 h-20 rounded-3xl bg-primary/20 flex items-center justify-center mx-auto mb-4 glow-primary">
          <Zap className="w-10 h-10 text-primary" />
        </div>
        <h1 className="text-3xl font-black text-foreground">
          <span className="text-primary">Fortunes</span>HQ
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Share the pool or Take it all</p>
      </div>

      {/* Auth Form */}
      <div className="w-full max-w-sm">
        <div className="bg-card rounded-2xl border border-border p-6">
          
          {/* Step 1: Email Entry */}
          {step === 'email' && (
            <>
              <h2 className="text-xl font-bold text-foreground mb-2">Enter your email</h2>
              <p className="text-sm text-muted-foreground mb-4">We'll send you a verification code</p>

              {/* Welcome Bonus Banner */}
              {welcomeBonusEnabled && !bonusLoading && welcomeBonusLimit > bonusRecipientCount && (
                <div className="mb-6 p-3 bg-gradient-to-r from-primary/10 to-gold/10 border border-primary/30 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <Gift className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-foreground">
                        {welcomeBonusMessage
                          .replace('{amount}', `₦${welcomeBonusAmount.toLocaleString()}`)
                          .replace('{spots}', (welcomeBonusLimit - bonusRecipientCount).toLocaleString())}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={handleSendOTP} className="space-y-4">
                <div>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="w-full pl-12 pr-4 py-3 bg-muted rounded-xl border border-border focus:border-primary focus:outline-none text-foreground"
                      disabled={loading}
                      required
                      autoFocus
                    />
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
                    <p className="text-sm text-red-400">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  ) : (
                    <>
                      Continue
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </form>

              {/* Google OAuth - only show if enabled */}
              {!settingsLoading && googleAuthEnabled && (
                <>
                  <div className="flex items-center gap-4 my-6">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-sm text-muted-foreground">or</span>
                    <div className="flex-1 h-px bg-border" />
                  </div>

                  <button
                    type="button"
                    onClick={handleGoogleAuth}
                    disabled={googleLoading || loading}
                    className="w-full py-3 bg-white hover:bg-gray-50 text-gray-800 rounded-xl font-medium transition-colors flex items-center justify-center gap-3 border border-gray-300 disabled:opacity-50"
                  >
                    {googleLoading ? (
                      <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                    ) : (
                      <>
                        <GoogleIcon />
                        Continue with Google
                      </>
                    )}
                  </button>
                </>
              )}
            </>
          )}

          {/* Step 2: OTP Verification */}
          {step === 'otp' && (
            <>
              <button
                onClick={handleBack}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Use different email
              </button>

              <h2 className="text-xl font-bold text-foreground mb-2">Check your email</h2>
              <p className="text-sm text-muted-foreground mb-4">
                We sent a 6-digit code to <span className="text-foreground font-medium">{email}</span>
              </p>
              <div className="p-3 bg-muted/50 border border-border rounded-xl mb-6">
                <p className="text-xs text-muted-foreground">
                  💡 <span className="font-medium text-foreground">Can't find it?</span> Check your spam/junk folder. Look for an email with a 6-digit code.
                </p>
              </div>

              <form onSubmit={handleVerifyOTP} className="space-y-4">
                <div className="flex justify-center">
                  <InputOTP
                    value={otp}
                    onChange={setOtp}
                    maxLength={6}
                    disabled={loading}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
                    <p className="text-sm text-red-400">{error}</p>
                  </div>
                )}

                {success && (
                  <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-xl">
                    <p className="text-sm text-green-400">{success}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  ) : (
                    <>
                      Verify
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>

                <div className="text-center">
                  <p className="text-sm text-muted-foreground">
                    Didn't receive it?{' '}
                    <button
                      type="button"
                      onClick={handleResendOTP}
                      disabled={resendCooldown > 0 || loading}
                      className="text-primary font-medium hover:underline disabled:opacity-50 disabled:no-underline"
                    >
                      {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend'}
                    </button>
                  </p>
                </div>
              </form>
            </>
          )}

          {/* Step 3: Username Selection */}
          {step === 'username' && (
            <>
              <div className="text-center mb-6">
                <div className="text-4xl mb-2">🎉</div>
                <h2 className="text-xl font-bold text-foreground">Welcome to FortunesHQ!</h2>
                <p className="text-sm text-muted-foreground mt-1">Choose a username for the arena</p>
              </div>

              <form onSubmit={handleSetUsername} className="space-y-4">
                <div>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Choose a username"
                      className="w-full pl-12 pr-4 py-3 bg-muted rounded-xl border border-border focus:border-primary focus:outline-none text-foreground"
                      disabled={loading}
                      required
                      autoFocus
                      minLength={3}
                      maxLength={20}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">3-20 characters</p>
                </div>

                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
                    <p className="text-sm text-red-400">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || username.length < 3}
                  className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  ) : (
                    <>
                      Enter the Arena
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </form>
            </>
          )}
        </div>

        {/* Security Note */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          🔒 Passwordless login for your security
        </p>
      </div>
    </div>
  );
};
