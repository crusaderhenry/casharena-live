import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useActiveUsersCount = () => {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchCount = useCallback(async () => {
    const [realResult, mockResult] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('mock_users').select('id', { count: 'exact', head: true }).eq('is_active', true)
    ]);
    const realCount = realResult.count || 0;
    const mockCount = mockResult.count || 0;
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

    return () => {
      supabase.removeChannel(profilesChannel);
      supabase.removeChannel(mockChannel);
    };
  }, [fetchCount]);

  return { count, loading, refetch: fetchCount };
};
