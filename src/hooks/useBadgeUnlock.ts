import { useEffect, useState, useCallback, useRef } from 'react';
import { useSounds } from '@/hooks/useSounds';
import { useHaptics } from '@/hooks/useHaptics';
import React from 'react';
import { Trophy, Star, Medal, Crown, Flame, Zap, Gamepad2, Target, LucideIcon } from 'lucide-react';

const STORAGE_KEY_PREFIX = 'unlocked_badges_';
const SESSION_KEY = 'badge_session_initialized';

// Interface for badge celebration component (with rendered icon)
export interface CelebrationBadge {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

// Internal badge definition for unlock checking
interface InternalBadge {
  id: string;
  name: string;
  description: string;
  iconComponent: LucideIcon;
  requirement: { type: 'wins' | 'games'; value: number };
  color: string;
  bgColor: string;
}

// Static badge definitions for unlock checking (kept in sync with useBadges fallback)
const BADGES: InternalBadge[] = [
  { id: 'first_win', name: 'First Blood', description: 'Win your first game', iconComponent: Trophy, requirement: { type: 'wins', value: 1 }, color: 'text-green-400', bgColor: 'bg-green-500/20' },
  { id: 'winner_5', name: 'Rising Star', description: 'Win 5 games', iconComponent: Star, requirement: { type: 'wins', value: 5 }, color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
  { id: 'winner_10', name: 'Competitor', description: 'Win 10 games', iconComponent: Medal, requirement: { type: 'wins', value: 10 }, color: 'text-purple-400', bgColor: 'bg-purple-500/20' },
  { id: 'winner_25', name: 'Champion', description: 'Win 25 games', iconComponent: Crown, requirement: { type: 'wins', value: 25 }, color: 'text-yellow-400', bgColor: 'bg-yellow-500/20' },
  { id: 'winner_50', name: 'Legend', description: 'Win 50 games', iconComponent: Flame, requirement: { type: 'wins', value: 50 }, color: 'text-orange-400', bgColor: 'bg-orange-500/20' },
  { id: 'winner_100', name: 'Unstoppable', description: 'Win 100 games', iconComponent: Zap, requirement: { type: 'wins', value: 100 }, color: 'text-red-400', bgColor: 'bg-red-500/20' },
  { id: 'player_10', name: 'Rookie', description: 'Play 10 games', iconComponent: Gamepad2, requirement: { type: 'games', value: 10 }, color: 'text-slate-400', bgColor: 'bg-slate-500/20' },
  { id: 'player_50', name: 'Regular', description: 'Play 50 games', iconComponent: Gamepad2, requirement: { type: 'games', value: 50 }, color: 'text-cyan-400', bgColor: 'bg-cyan-500/20' },
  { id: 'player_100', name: 'Veteran', description: 'Play 100 games', iconComponent: Gamepad2, requirement: { type: 'games', value: 100 }, color: 'text-indigo-400', bgColor: 'bg-indigo-500/20' },
  { id: 'player_500', name: 'Dedicated', description: 'Play 500 games', iconComponent: Target, requirement: { type: 'games', value: 500 }, color: 'text-pink-400', bgColor: 'bg-pink-500/20' },
];

const getUnlockedBadges = (stats: { total_wins: number; games_played: number }): InternalBadge[] => {
  return BADGES.filter(badge => {
    const { type, value } = badge.requirement;
    switch (type) {
      case 'wins':
        return stats.total_wins >= value;
      case 'games':
        return stats.games_played >= value;
      default:
        return false;
    }
  });
};

// Convert InternalBadge to CelebrationBadge with rendered icon
const badgeToCelebrationBadge = (badge: InternalBadge): CelebrationBadge => {
  const IconComponent = badge.iconComponent;
  return {
    id: badge.id,
    name: badge.name,
    description: badge.description,
    icon: React.createElement(IconComponent, { className: 'w-5 h-5' }),
    color: badge.color,
    bgColor: badge.bgColor,
  };
};

interface BadgeUnlockState {
  newBadge: CelebrationBadge | null;
  showCelebration: boolean;
  dismissCelebration: () => void;
}

export const useBadgeUnlock = (
  stats: { total_wins: number; games_played: number },
  userId?: string
): BadgeUnlockState => {
  const [newBadge, setNewBadge] = useState<CelebrationBadge | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const { play } = useSounds();
  const { success } = useHaptics();
  const hasCheckedRef = useRef(false);
  const prevStatsRef = useRef<{ total_wins: number; games_played: number } | null>(null);

  useEffect(() => {
    // Don't run without a userId or valid stats
    if (!userId || (stats.total_wins === 0 && stats.games_played === 0)) {
      return;
    }

    const storageKey = `${STORAGE_KEY_PREFIX}${userId}`;
    const sessionKey = `${SESSION_KEY}_${userId}`;
    
    // Check if this session has already been initialized for this user
    const sessionInitialized = sessionStorage.getItem(sessionKey) === 'true';
    
    // Get currently unlocked badges
    const currentBadges = getUnlockedBadges(stats);
    const currentBadgeIds = currentBadges.map(b => b.id);

    // Get previously stored badge IDs
    const storedBadgesJson = localStorage.getItem(storageKey);
    const previousBadgeIds: string[] = storedBadgesJson ? JSON.parse(storedBadgesJson) : [];

    // Find newly unlocked badges
    const newlyUnlocked = currentBadges.filter(b => !previousBadgeIds.includes(b.id));

    // Only celebrate if:
    // 1. There are new badges
    // 2. The session was already initialized (prevents celebration on login/navigation)
    // 3. There were previous badges stored (prevents celebration after cache clear)
    // 4. Stats actually changed since last check (real progress, not just remount)
    const statsChanged = prevStatsRef.current && (
      prevStatsRef.current.total_wins !== stats.total_wins ||
      prevStatsRef.current.games_played !== stats.games_played
    );
    
    if (newlyUnlocked.length > 0 && sessionInitialized && storedBadgesJson && statsChanged) {
      // Show the most recent/highest achievement
      const latestBadge = newlyUnlocked[newlyUnlocked.length - 1];
      setNewBadge(badgeToCelebrationBadge(latestBadge));
      setShowCelebration(true);

      // Play celebration sound and haptic
      play('win');
      success();
    }
    
    // Always update stored badges
    localStorage.setItem(storageKey, JSON.stringify(currentBadgeIds));
    
    // Store current stats for comparison
    prevStatsRef.current = { ...stats };
    
    // Mark session as initialized after first run
    if (!sessionInitialized) {
      sessionStorage.setItem(sessionKey, 'true');
    }
    
    hasCheckedRef.current = true;
  }, [stats.total_wins, stats.games_played, userId, play, success]);

  const dismissCelebration = useCallback(() => {
    setShowCelebration(false);
    setNewBadge(null);
  }, []);

  return { newBadge, showCelebration, dismissCelebration };
};
