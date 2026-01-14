import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PrizeDistributions {
  top3: number[];
  top5: number[];
  top10: number[];
}

// Internal type that matches database (uses Json for some fields)
interface PlatformSettingsDB {
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
  google_auth_enabled: boolean;
  welcome_message: string;
  welcome_bonus_amount: number;
  welcome_bonus_limit: number;
  welcome_bonus_enabled: boolean;
  welcome_bonus_message: string;
  winner_screen_duration: number;
  weekly_reward_1st: number;
  weekly_reward_2nd: number;
  weekly_reward_3rd: number;
  min_deposit: number;
  max_deposit: number;
  min_withdrawal: number;
  deposit_quick_amounts: number[];
  ending_soon_threshold_seconds: number;
  notification_poll_interval_ms: number;
  prize_callout_milestones: number[];
  default_prize_distributions: unknown; // JSON from DB
}

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
  google_auth_enabled: boolean;
  // Welcome settings
  welcome_message: string;
  welcome_bonus_amount: number;
  welcome_bonus_limit: number;
  welcome_bonus_enabled: boolean;
  welcome_bonus_message: string;
  winner_screen_duration: number;
  // NEW: Weekly rewards
  weekly_reward_1st: number;
  weekly_reward_2nd: number;
  weekly_reward_3rd: number;
  // NEW: Wallet limits
  min_deposit: number;
  max_deposit: number;
  min_withdrawal: number;
  deposit_quick_amounts: number[];
  // NEW: Timing
  ending_soon_threshold_seconds: number;
  notification_poll_interval_ms: number;
  // NEW: Host callouts
  prize_callout_milestones: number[];
  // NEW: Prize distributions
  default_prize_distributions: PrizeDistributions;
}

const DEFAULT_PRIZE_DISTRIBUTIONS: PrizeDistributions = {
  top3: [0.5, 0.3, 0.2],
  top5: [0.4, 0.25, 0.15, 0.12, 0.08],
  top10: [0.3, 0.2, 0.15, 0.1, 0.08, 0.06, 0.04, 0.03, 0.02, 0.02],
};

// Helper to convert DB response to typed settings
const convertDbToSettings = (data: PlatformSettingsDB): PlatformSettings => {
  let prizeDistributions: PrizeDistributions = DEFAULT_PRIZE_DISTRIBUTIONS;
  if (data.default_prize_distributions && typeof data.default_prize_distributions === 'object') {
    const dist = data.default_prize_distributions as Record<string, unknown>;
    if ('top3' in dist && 'top5' in dist && 'top10' in dist) {
      prizeDistributions = dist as unknown as PrizeDistributions;
    }
  }
  return {
    ...data,
    default_prize_distributions: prizeDistributions,
  };
};

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
      setSettings(convertDbToSettings(data as unknown as PlatformSettingsDB));
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
            setSettings(convertDbToSettings(payload.new as unknown as PlatformSettingsDB));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchSettings]);

  const updateSettings = useCallback(async (updates: Partial<Omit<PlatformSettings, 'default_prize_distributions'> & { default_prize_distributions?: PrizeDistributions }>) => {
    if (!settings) return false;

    // Optimistically update local state
    setSettings(prev => prev ? { ...prev, ...updates } as PlatformSettings : null);

    try {
      const { error } = await supabase
        .from('platform_settings')
        .update(updates as Record<string, unknown>)
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

  // Parse prize distributions from database
  const parsedPrizeDistributions = (() => {
    if (!settings?.default_prize_distributions) return DEFAULT_PRIZE_DISTRIBUTIONS;
    const dist = settings.default_prize_distributions;
    if (typeof dist === 'object' && 'top3' in dist) {
      return dist as PrizeDistributions;
    }
    return DEFAULT_PRIZE_DISTRIBUTIONS;
  })();

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
    googleAuthEnabled: settings?.google_auth_enabled ?? false,
    // Welcome settings
    welcomeMessage: settings?.welcome_message ?? 'Welcome to FortunesHQ! 🎉 Get ready to play and win!',
    welcomeBonusAmount: settings?.welcome_bonus_amount ?? 5000,
    welcomeBonusLimit: settings?.welcome_bonus_limit ?? 1000,
    welcomeBonusEnabled: settings?.welcome_bonus_enabled ?? true,
    welcomeBonusMessage: settings?.welcome_bonus_message ?? 'Get your welcome bonus! Limited spots available.',
    winnerScreenDuration: settings?.winner_screen_duration ?? 10,
    // NEW: Weekly rewards
    weeklyRewards: {
      first: settings?.weekly_reward_1st ?? 50000,
      second: settings?.weekly_reward_2nd ?? 30000,
      third: settings?.weekly_reward_3rd ?? 20000,
    },
    // NEW: Wallet limits
    walletLimits: {
      minDeposit: settings?.min_deposit ?? 100,
      maxDeposit: settings?.max_deposit ?? 1000000,
      minWithdrawal: settings?.min_withdrawal ?? 100,
      quickAmounts: settings?.deposit_quick_amounts ?? [1000, 2000, 5000, 10000],
    },
    // NEW: Timing
    endingSoonThreshold: settings?.ending_soon_threshold_seconds ?? 300,
    notificationPollInterval: settings?.notification_poll_interval_ms ?? 30000,
    // NEW: Host callouts
    prizeCalloutMilestones: settings?.prize_callout_milestones ?? [5000, 10000, 20000, 50000, 100000, 250000, 500000],
    // NEW: Prize distributions
    defaultPrizeDistributions: parsedPrizeDistributions,
    updateSettings,
    toggleTestMode,
    refetch: fetchSettings,
  };
};
