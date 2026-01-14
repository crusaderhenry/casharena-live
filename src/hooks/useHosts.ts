import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface HostConfig {
  id: string;
  name: string;
  voice_id: string;
  emoji: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

// Fallback hosts in case database is empty
const FALLBACK_HOSTS: HostConfig[] = [
  { id: 'crusader', name: 'Crusader', voice_id: 'I26ofw8CwlRZ6PZzoFaX', emoji: '🎙️', description: 'Bold African voice, high energy hype man', is_active: true, created_at: '' },
  { id: 'mark', name: 'Mark', voice_id: 'owJJWiaBmclx8j0HiPWm', emoji: '🎤', description: 'Smooth and confident host', is_active: true, created_at: '' },
  { id: 'adaobi', name: 'Adaobi', voice_id: 'V0PuVTP8lJVnkKNavZmc', emoji: '👸', description: 'Warm Igbo queen, encouraging and graceful energy', is_active: true, created_at: '' },
];

export const useHosts = () => {
  const [hosts, setHosts] = useState<HostConfig[]>(FALLBACK_HOSTS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHosts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('hosts')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      
      if (data && data.length > 0) {
        setHosts(data);
      }
    } catch (err) {
      console.error('Failed to fetch hosts:', err);
      setError('Failed to load hosts');
      // Keep fallback hosts
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHosts();

    // Subscribe to changes
    const channel = supabase
      .channel('hosts_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'hosts',
        },
        () => {
          fetchHosts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchHosts]);

  const getHostById = useCallback((id: string): HostConfig => {
    return hosts.find(h => h.id === id) || hosts[0] || FALLBACK_HOSTS[0];
  }, [hosts]);

  return {
    hosts,
    loading,
    error,
    getHostById,
    refetch: fetchHosts,
  };
};
