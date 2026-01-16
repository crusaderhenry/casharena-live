import { useEffect, useState, useCallback, useRef } from 'react';
import { useBadges, Badge } from '@/hooks/useBadges';
import { useSounds } from '@/hooks/useSounds';
import { useHaptics } from '@/hooks/useHaptics';
import { LucideIcon } from 'lucide-react';
import React from 'react';

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

interface BadgeUnlockState {
  newBadge: CelebrationBadge | null;
  showCelebration: boolean;
  dismissCelebration: () => void;
}

// Convert Badge with LucideIcon to CelebrationBadge with ReactNode
const badgeToCelebrationBadge = (badge: Badge): CelebrationBadge => {
  const IconComponent = badge.icon as LucideIcon;
  return {
    id: badge.id,
    name: badge.name,
    description: badge.description,
    icon: React.createElement(IconComponent, { className: 'w-5 h-5' }),
    color: badge.color,
    bgColor: badge.bgColor,
  };
};

export const useBadgeUnlock = (
  stats: { total_wins: number; games_played: number },
  userId?: string
): BadgeUnlockState => {
  const [newBadge, setNewBadge] = useState<CelebrationBadge | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const { play } = useSounds();
  const { success } = useHaptics();
  const { getUnlockedBadges } = useBadges();
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
  }, [stats.total_wins, stats.games_played, userId, play, success, getUnlockedBadges]);

  const dismissCelebration = useCallback(() => {
    setShowCelebration(false);
    setNewBadge(null);
  }, []);

  return { newBadge, showCelebration, dismissCelebration };
};
