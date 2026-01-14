import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Trophy, Star, Medal, Crown, Flame, Zap, Gamepad2, Target } from 'lucide-react';
import { LucideIcon } from 'lucide-react';

export interface BadgeConfig {
  id: string;
  name: string;
  description: string;
  requirement_type: 'wins' | 'games' | 'earnings';
  requirement_value: number;
  color: string;
  bg_color: string;
  icon_name: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  requirement: { type: 'wins' | 'games' | 'earnings'; value: number };
  color: string;
  bgColor: string;
}

// Map icon names to Lucide components
const ICON_MAP: Record<string, LucideIcon> = {
  Trophy,
  Star,
  Medal,
  Crown,
  Flame,
  Zap,
  Gamepad2,
  Target,
};

// Fallback badges in case database is empty
const FALLBACK_BADGES: BadgeConfig[] = [
  { id: 'first_win', name: 'First Blood', description: 'Win your first game', requirement_type: 'wins', requirement_value: 1, color: 'text-green-400', bg_color: 'bg-green-500/20', icon_name: 'Trophy', sort_order: 1, is_active: true, created_at: '' },
  { id: 'winner_5', name: 'Rising Star', description: 'Win 5 games', requirement_type: 'wins', requirement_value: 5, color: 'text-blue-400', bg_color: 'bg-blue-500/20', icon_name: 'Star', sort_order: 2, is_active: true, created_at: '' },
  { id: 'winner_10', name: 'Competitor', description: 'Win 10 games', requirement_type: 'wins', requirement_value: 10, color: 'text-purple-400', bg_color: 'bg-purple-500/20', icon_name: 'Medal', sort_order: 3, is_active: true, created_at: '' },
  { id: 'winner_25', name: 'Champion', description: 'Win 25 games', requirement_type: 'wins', requirement_value: 25, color: 'text-yellow-400', bg_color: 'bg-yellow-500/20', icon_name: 'Crown', sort_order: 4, is_active: true, created_at: '' },
  { id: 'winner_50', name: 'Legend', description: 'Win 50 games', requirement_type: 'wins', requirement_value: 50, color: 'text-orange-400', bg_color: 'bg-orange-500/20', icon_name: 'Flame', sort_order: 5, is_active: true, created_at: '' },
  { id: 'winner_100', name: 'Unstoppable', description: 'Win 100 games', requirement_type: 'wins', requirement_value: 100, color: 'text-red-400', bg_color: 'bg-red-500/20', icon_name: 'Zap', sort_order: 6, is_active: true, created_at: '' },
  { id: 'player_10', name: 'Rookie', description: 'Play 10 games', requirement_type: 'games', requirement_value: 10, color: 'text-slate-400', bg_color: 'bg-slate-500/20', icon_name: 'Gamepad2', sort_order: 7, is_active: true, created_at: '' },
  { id: 'player_50', name: 'Regular', description: 'Play 50 games', requirement_type: 'games', requirement_value: 50, color: 'text-cyan-400', bg_color: 'bg-cyan-500/20', icon_name: 'Gamepad2', sort_order: 8, is_active: true, created_at: '' },
  { id: 'player_100', name: 'Veteran', description: 'Play 100 games', requirement_type: 'games', requirement_value: 100, color: 'text-indigo-400', bg_color: 'bg-indigo-500/20', icon_name: 'Gamepad2', sort_order: 9, is_active: true, created_at: '' },
  { id: 'player_500', name: 'Dedicated', description: 'Play 500 games', requirement_type: 'games', requirement_value: 500, color: 'text-pink-400', bg_color: 'bg-pink-500/20', icon_name: 'Target', sort_order: 10, is_active: true, created_at: '' },
];

const configToBadge = (config: BadgeConfig): Badge => ({
  id: config.id,
  name: config.name,
  description: config.description,
  icon: ICON_MAP[config.icon_name] || Trophy,
  requirement: { type: config.requirement_type, value: config.requirement_value },
  color: config.color,
  bgColor: config.bg_color,
});

export const useBadges = () => {
  const [badgeConfigs, setBadgeConfigs] = useState<BadgeConfig[]>(FALLBACK_BADGES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBadges = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('badges')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;
      
      if (data && data.length > 0) {
        // Cast the requirement_type to proper type
        const typedData = data.map(b => ({
          ...b,
          requirement_type: b.requirement_type as 'wins' | 'games' | 'earnings',
        }));
        setBadgeConfigs(typedData);
      }
    } catch (err) {
      console.error('Failed to fetch badges:', err);
      setError('Failed to load badges');
      // Keep fallback badges
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBadges();

    // Subscribe to changes
    const channel = supabase
      .channel('badges_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'badges',
        },
        () => {
          fetchBadges();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchBadges]);

  // Convert configs to Badge objects
  const badges = useMemo(() => badgeConfigs.map(configToBadge), [badgeConfigs]);

  const getUnlockedBadges = useCallback((stats: { total_wins: number; games_played: number; total_earnings?: number }): Badge[] => {
    return badges.filter(badge => {
      const { type, value } = badge.requirement;
      switch (type) {
        case 'wins':
          return stats.total_wins >= value;
        case 'games':
          return stats.games_played >= value;
        case 'earnings':
          return (stats.total_earnings || 0) >= value;
        default:
          return false;
      }
    });
  }, [badges]);

  const getNextBadge = useCallback((stats: { total_wins: number; games_played: number }): Badge | null => {
    const lockedBadges = badges.filter(badge => {
      const { type, value } = badge.requirement;
      switch (type) {
        case 'wins':
          return stats.total_wins < value;
        case 'games':
          return stats.games_played < value;
        default:
          return true;
      }
    });

    if (lockedBadges.length === 0) return null;

    // Sort by progress percentage (closest to unlocking)
    return lockedBadges.sort((a, b) => {
      const getProgress = (badge: Badge) => {
        const { type, value } = badge.requirement;
        const current = type === 'wins' ? stats.total_wins : stats.games_played;
        return current / value;
      };
      return getProgress(b) - getProgress(a);
    })[0];
  }, [badges]);

  return {
    badges,
    badgeConfigs,
    loading,
    error,
    getUnlockedBadges,
    getNextBadge,
    refetch: fetchBadges,
  };
};
