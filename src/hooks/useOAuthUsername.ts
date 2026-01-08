import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useOAuthUsername = (userId: string | undefined) => {
  const [needsUsername, setNeedsUsername] = useState(false);
  const [checking, setChecking] = useState(true);

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
        return;
      }

      // Check if user has a proper username (not email-based)
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, email')
        .eq('id', userId)
        .maybeSingle();

      if (profile) {
        // If username equals email or starts with email prefix, they need to set one
        const emailPrefix = profile.email?.split('@')[0];
        const needsSet = !profile.username || 
          profile.username === profile.email || 
          profile.username === emailPrefix ||
          profile.username.startsWith('user_');
        
        setNeedsUsername(needsSet);
      }

      setChecking(false);
    };

    checkUsername();
  }, [userId]);

  const markComplete = () => {
    if (userId) {
      localStorage.setItem(`username_set_${userId}`, 'true');
    }
    setNeedsUsername(false);
  };

  return { needsUsername, checking, markComplete };
};
