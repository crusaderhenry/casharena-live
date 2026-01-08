import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Zap, Mail, Lock, User, ArrowRight, Eye, EyeOff, Shield } from 'lucide-react';
import { z } from 'zod';

const emailSchema = z.string().email('Invalid email address');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');
const usernameSchema = z.string().min(3, 'Username must be at least 3 characters').max(20, 'Username too long');

const REMEMBERED_EMAIL_KEY = 'fortunes_remembered_email';

// Google icon component
const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

export const AuthPage = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [devLoading, setDevLoading] = useState<'member' | 'admin' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rememberEmail, setRememberEmail] = useState(true);

  // Load remembered email on mount
  useEffect(() => {
    const remembered = localStorage.getItem(REMEMBERED_EMAIL_KEY);
    if (remembered) {
      setEmail(remembered);
    }
  }, []);

  const validateInputs = () => {
    try {
      emailSchema.parse(email);
      passwordSchema.parse(password);
      if (!isLogin) {
        usernameSchema.parse(username);
      }
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(err.errors[0].message);
      }
      return false;
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateInputs()) return;

    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            setError('Invalid email or password');
          } else {
            setError(error.message);
          }
          return;
        }

        // Remember email on successful login
        if (rememberEmail) {
          localStorage.setItem(REMEMBERED_EMAIL_KEY, email);
        } else {
          localStorage.removeItem(REMEMBERED_EMAIL_KEY);
        }

        navigate('/home');
      } else {
        // Sign up
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/home`,
            data: {
              username: username || `Player${Math.floor(Math.random() * 10000)}`,
              avatar: ['🎮', '🎯', '⚡', '🔥', '💎', '🚀'][Math.floor(Math.random() * 6)],
            },
          },
        });

        if (error) {
          if (error.message.includes('already registered')) {
            setError('This email is already registered. Please log in.');
          } else {
            setError(error.message);
          }
          return;
        }

        // Remember email on successful signup
        if (rememberEmail) {
          localStorage.setItem(REMEMBERED_EMAIL_KEY, email);
        }

        navigate('/home');
      }
    } catch (err) {
      setError('An unexpected error occurred');
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

  // Quick dev login helper
  const handleDevLogin = async (type: 'member' | 'admin') => {
    setError(null);
    setDevLoading(type);
    
    const credentials = type === 'member' 
      ? { email: 'member@test.com', password: 'Member@Test2024!', username: 'TestMember', avatar: '🧪' }
      : { email: 'admin@test.com', password: 'Admin@Test2024!', username: 'TestAdmin', avatar: '🛡️' };
    
    try {
      // Try to sign in first
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });
      
      if (!signInError) {
        navigate('/home');
        return;
      }
      
      // If login fails, try to create the account
      if (signInError.message.includes('Invalid login credentials')) {
        const { error: signUpError } = await supabase.auth.signUp({
          email: credentials.email,
          password: credentials.password,
          options: {
            emailRedirectTo: `${window.location.origin}/home`,
            data: {
              username: credentials.username,
              avatar: credentials.avatar,
            },
          },
        });
        
        if (signUpError) {
          // If signup fails because user exists, try login again (email confirmation might be pending)
          if (signUpError.message.includes('already registered')) {
            setError(`${type === 'member' ? 'Member' : 'Admin'} account exists but login failed. Check email confirmation.`);
          } else {
            setError(signUpError.message);
          }
          return;
        }
        
        // After signup, try to login again
        const { error: retryError } = await supabase.auth.signInWithPassword({
          email: credentials.email,
          password: credentials.password,
        });
        
        if (retryError) {
          // Signup succeeded but login failed - might need email confirmation
          setError('Account created! Enable auto-confirm in backend settings for instant login.');
          return;
        }
        
        navigate('/home');
      } else {
        setError(signInError.message);
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setDevLoading(null);
    }
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
          <h2 className="text-xl font-bold text-foreground mb-6">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h2>

          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Username</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Choose a username"
                    className="w-full pl-12 pr-4 py-3 bg-muted rounded-xl border border-border focus:border-primary focus:outline-none text-foreground"
                    disabled={loading}
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Email</label>
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
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-12 pr-12 py-3 bg-muted rounded-xl border border-border focus:border-primary focus:outline-none text-foreground"
                  disabled={loading}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Remember Email Toggle */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="rememberEmail"
                checked={rememberEmail}
                onChange={(e) => setRememberEmail(e.target.checked)}
                className="w-4 h-4 rounded border-border bg-muted text-primary focus:ring-primary"
              />
              <label htmlFor="rememberEmail" className="text-sm text-muted-foreground">
                Remember my email
              </label>
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
                  {isLogin ? 'Sign In' : 'Create Account'}
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* OAuth Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-border" />
            <span className="text-sm text-muted-foreground">or continue with</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Google OAuth Button */}
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

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              {isLogin ? "Don't have an account?" : 'Already have an account?'}
              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError(null);
                }}
                className="ml-2 text-primary font-medium hover:underline"
              >
                {isLogin ? 'Sign Up' : 'Sign In'}
              </button>
            </p>
          </div>

          {/* Quick Dev Logins */}
          <div className="mt-4 pt-4 border-t border-border space-y-2">
            <button
              type="button"
              onClick={() => handleDevLogin('member')}
              disabled={devLoading !== null}
              className="w-full py-3 bg-muted hover:bg-muted/80 text-muted-foreground rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              {devLoading === 'member' ? (
                <div className="w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
              ) : (
                <>🧪 Member Login (Dev)</>
              )}
            </button>
            <button
              type="button"
              onClick={() => handleDevLogin('admin')}
              disabled={devLoading !== null}
              className="w-full py-3 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              {devLoading === 'admin' ? (
                <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  Admin Login (Dev)
                </>
              )}
            </button>
          </div>
        </div>

        {/* Promo text */}
        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            💰 Real Money | 👥 Real Players | 🎙️ Live Show
          </p>
        </div>
      </div>
    </div>
  );
};
