import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PlatformSettings {
  id: string;
  test_mode: boolean;
  platform_name: string;
  platform_cut_percent: number;
  updated_at: string;
}

export const usePlatformSettings = () => {
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('*')
        .single();

      if (error) throw error;
      setSettings(data);
    } catch (err) {
      console.error('Failed to fetch platform settings:', err);
      setError('Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();

    // Subscribe to changes
    const channel = supabase
      .channel('platform_settings_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'platform_settings',
        },
        (payload) => {
          console.log('Platform settings changed:', payload);
          if (payload.new) {
            setSettings(payload.new as PlatformSettings);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchSettings]);

  const updateSettings = useCallback(async (updates: Partial<PlatformSettings>) => {
    if (!settings) return false;

    try {
      const { error } = await supabase
        .from('platform_settings')
        .update(updates)
        .eq('id', settings.id);

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Failed to update settings:', err);
      return false;
    }
  }, [settings]);

  const toggleTestMode = useCallback(async () => {
    if (!settings) return false;
    return updateSettings({ test_mode: !settings.test_mode });
  }, [settings, updateSettings]);

  return {
    settings,
    loading,
    error,
    isTestMode: settings?.test_mode ?? true,
    updateSettings,
    toggleTestMode,
    refetch: fetchSettings,
  };
};
