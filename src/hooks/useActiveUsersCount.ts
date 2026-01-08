import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useActiveUsersCount = () => {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchCount = useCallback(async () => {
    // First check if mock users are globally enabled
    const [settingsResult, realResult] = await Promise.all([
      supabase.from('mock_user_settings').select('enabled').single(),
      supabase.from('profiles').select('id', { count: 'exact', head: true })
    ]);
    
    const mockUsersEnabled = settingsResult.data?.enabled ?? false;
    const realCount = realResult.count || 0;
    
    // Only count mock users if globally enabled
    let mockCount = 0;
    if (mockUsersEnabled) {
      const mockResult = await supabase
        .from('mock_users')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true);
      mockCount = mockResult.count || 0;
    }
    
    setCount(realCount + mockCount);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCount();

    // Subscribe to realtime changes for profiles
    const profilesChannel = supabase
      .channel('active-users-profiles')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'profiles' 
      }, () => {
        fetchCount();
      })
      .subscribe();

    // Subscribe to realtime changes for mock_users
    const mockChannel = supabase
      .channel('active-users-mock')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'mock_users' 
      }, () => {
        fetchCount();
      })
      .subscribe();

    // Subscribe to mock_user_settings changes
    const settingsChannel = supabase
      .channel('mock-user-settings')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'mock_user_settings' 
      }, () => {
        fetchCount();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(profilesChannel);
      supabase.removeChannel(mockChannel);
      supabase.removeChannel(settingsChannel);
    };
  }, [fetchCount]);

  return { count, loading, refetch: fetchCount };
};
