import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const WELCOME_SHOWN_KEY = 'fortunes_welcome_shown';

export const useOAuthUsername = (userId: string | undefined) => {
  const [needsUsername, setNeedsUsername] = useState(false);
  const [checking, setChecking] = useState(true);
  const welcomeShownRef = useRef(false);

  useEffect(() => {
    if (!userId) {
      setChecking(false);
      return;
    }

    const checkUsername = async () => {
      // Check if username was already set via this flow
      const alreadySet = localStorage.getItem(`username_set_${userId}`);
      if (alreadySet) {
        setNeedsUsername(false);
        setChecking(false);
        
        // Show welcome toast for returning users (first time this session)
        showWelcomeToast(userId);
        return;
      }

      // Check if user has a proper username (not email-based or default)
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, email')
        .eq('id', userId)
        .maybeSingle();

      if (profile) {
        // If username equals email, starts with email prefix, or is a default pattern
        const emailPrefix = profile.email?.split('@')[0];
        const needsSet = !profile.username || 
          profile.username === profile.email || 
          profile.username === emailPrefix ||
          profile.username.startsWith('user_') ||
          profile.username.startsWith('Player');
        
        setNeedsUsername(needsSet);
        
        // Show welcome toast if username is already set properly
        if (!needsSet) {
          showWelcomeToast(userId);
        }
      }

      setChecking(false);
    };

    checkUsername();
  }, [userId]);

  const showWelcomeToast = (uid: string) => {
    // Only show once per session per user
    const welcomeKey = `${WELCOME_SHOWN_KEY}_${uid}`;
    if (welcomeShownRef.current || sessionStorage.getItem(welcomeKey)) return;
    
    welcomeShownRef.current = true;
    sessionStorage.setItem(welcomeKey, 'true');
    
    // Small delay to let the page settle
    setTimeout(() => {
      toast('Welcome to FortunesHQ! 🎉', {
        description: 'Play, Win and Celebrate in the Royal Rumble arena!',
        duration: 5000,
      });
    }, 1000);
  };

  const markComplete = () => {
    if (userId) {
      localStorage.setItem(`username_set_${userId}`, 'true');
      // Show welcome toast after setting username
      showWelcomeToast(userId);
    }
    setNeedsUsername(false);
  };

  return { needsUsername, checking, markComplete };
};
