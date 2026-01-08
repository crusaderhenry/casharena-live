import { createContext, useContext, useEffect, useState, useCallback, ReactNode, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { triggerConfetti } from '@/hooks/useGlobalConfetti';
import { triggerSound } from '@/hooks/useSounds';

interface Profile {
  id: string;
  username: string;
  email: string;
  avatar: string;
  wallet_balance: number;
  rank_points: number;
  weekly_rank: number | null;
  games_played: number;
  total_wins: number;
  wallet_locked?: boolean;
  bank_account_name?: string | null;
  bank_account_number?: string | null;
  bank_code?: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const welcomeBonusShownRef = useRef<Set<string>>(new Set());

  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*, received_welcome_bonus, welcome_bonus_received_at')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
    return data as (Profile & { received_welcome_bonus?: boolean; welcome_bonus_received_at?: string | null }) | null;
  }, []);

  // Check and show welcome bonus toast for new users
  const checkWelcomeBonusToast = useCallback(async (userId: string, profileData: any) => {
    // Only show once per session per user
    if (welcomeBonusShownRef.current.has(userId)) return;
    
    // Check if user received welcome bonus recently (within last 5 minutes)
    if (profileData?.received_welcome_bonus && profileData?.welcome_bonus_received_at) {
      const bonusTime = new Date(profileData.welcome_bonus_received_at).getTime();
      const now = Date.now();
      const fiveMinutes = 5 * 60 * 1000;
      
      if (now - bonusTime < fiveMinutes) {
        welcomeBonusShownRef.current.add(userId);
        
        // Small delay to let the UI settle
        setTimeout(() => {
          // Trigger confetti and sound
          triggerConfetti(4000);
          triggerSound('welcomeBonus');
          
          // Then show toast
          toast.success(`🎉 Welcome Bonus: ₦${profileData.wallet_balance.toLocaleString()} credited!`, {
            description: 'Your welcome bonus has been added to your wallet',
            duration: 6000,
          });

          // Send welcome bonus email (fire and forget)
          supabase.functions.invoke('send-transactional-email', {
            body: {
              template_key: 'welcome_bonus',
              user_id: userId,
              data: { amount: profileData.wallet_balance.toLocaleString() },
            },
          }).catch(err => console.error('Welcome email failed:', err));
        }, 1500);
      }
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      const profileData = await fetchProfile(user.id);
      setProfile(profileData);
    }
  }, [user?.id, fetchProfile]);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state changed:', event);
        setSession(session);
        setUser(session?.user ?? null);

        // Defer profile fetch with setTimeout to avoid deadlock
        if (session?.user) {
          setTimeout(() => {
            fetchProfile(session.user.id).then((profileData) => {
              setProfile(profileData);
              checkWelcomeBonusToast(session.user.id, profileData);
            });
          }, 0);
        } else {
          setProfile(null);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      // If a stale/invalid session exists in storage, validate it first
      if (session?.user) {
        const { error: userError } = await supabase.auth.getUser();
        if (userError) {
          console.warn('[Auth] Invalid session detected, signing out:', userError.message);
          // Clear all local state and storage
          await supabase.auth.signOut({ scope: 'local' });
          toast.error('Session expired', {
            description: 'Please log in again to continue.',
            duration: 5000,
          });
          setSession(null);
          setUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }

        // Session is valid, set state
        setSession(session);
        setUser(session.user);
        fetchProfile(session.user.id).then((profileData) => {
          setProfile(profileData);
          checkWelcomeBonusToast(session.user.id, profileData);
        });
      } else {
        setSession(null);
        setUser(null);
      }

      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
