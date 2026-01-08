import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PlatformSettings {
  id: string;
  test_mode: boolean;
  platform_name: string;
  platform_cut_percent: number;
  selected_host: string;
  secondary_host: string | null;
  updated_at: string;
  default_entry_fee: number;
  default_max_duration: number;
  default_comment_timer: number;
  default_entry_cutoff_minutes: number;
  maintenance_mode: boolean;
  rank_points_win_1st: number;
  rank_points_win_2nd: number;
  rank_points_win_3rd: number;
  rank_points_participation: number;
  hot_game_threshold_live: number;
  hot_game_threshold_opening: number;
  enable_dramatic_sounds: boolean;
  enable_cohost_banter: boolean;
  leave_window_minutes: number;
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

    // Optimistically update local state
    setSettings(prev => prev ? { ...prev, ...updates } : null);

    try {
      const { error } = await supabase
        .from('platform_settings')
        .update(updates)
        .eq('id', settings.id);

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Failed to update settings:', err);
      // Revert on failure
      await fetchSettings();
      return false;
    }
  }, [settings, fetchSettings]);

  const toggleTestMode = useCallback(async (newValue?: boolean) => {
    if (!settings) return false;
    const targetValue = newValue !== undefined ? newValue : !settings.test_mode;
    return updateSettings({ test_mode: targetValue });
  }, [settings, updateSettings]);

  return {
    settings,
    loading,
    error,
    isTestMode: settings?.test_mode ?? false,
    platformName: settings?.platform_name ?? 'FortunesHQ',
    platformCut: settings?.platform_cut_percent ?? 10,
    selectedHost: settings?.selected_host ?? 'crusader',
    secondaryHost: settings?.secondary_host ?? null,
    isCoHostMode: !!(settings?.secondary_host),
    defaultEntryFee: settings?.default_entry_fee ?? 700,
    defaultMaxDuration: settings?.default_max_duration ?? 20,
    defaultCommentTimer: settings?.default_comment_timer ?? 60,
    defaultEntryCutoffMinutes: settings?.default_entry_cutoff_minutes ?? 10,
    maintenanceMode: settings?.maintenance_mode ?? false,
    rankPoints: {
      win1st: settings?.rank_points_win_1st ?? 100,
      win2nd: settings?.rank_points_win_2nd ?? 60,
      win3rd: settings?.rank_points_win_3rd ?? 30,
      participation: settings?.rank_points_participation ?? 5,
    },
    hotGameThresholds: {
      live: settings?.hot_game_threshold_live ?? 10,
      opening: settings?.hot_game_threshold_opening ?? 5,
    },
    enableDramaticSounds: settings?.enable_dramatic_sounds ?? true,
    enableCoHostBanter: settings?.enable_cohost_banter ?? true,
    leaveWindowMinutes: settings?.leave_window_minutes ?? 5,
    updateSettings,
    toggleTestMode,
    refetch: fetchSettings,
  };
};
