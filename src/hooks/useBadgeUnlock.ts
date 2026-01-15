import { useEffect, useState, useCallback, useRef } from 'react';
import { Badge, getUnlockedBadges } from '@/components/ProfileBadges';
import { useSounds } from '@/hooks/useSounds';
import { useHaptics } from '@/hooks/useHaptics';

const STORAGE_KEY_PREFIX = 'unlocked_badges_';
const SESSION_KEY = 'badge_session_initialized';

interface BadgeUnlockState {
  newBadge: Badge | null;
  showCelebration: boolean;
  dismissCelebration: () => void;
}

export const useBadgeUnlock = (
  stats: { total_wins: number; games_played: number },
  userId?: string
): BadgeUnlockState => {
  const [newBadge, setNewBadge] = useState<Badge | null>(null);
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
      setNewBadge(latestBadge);
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
