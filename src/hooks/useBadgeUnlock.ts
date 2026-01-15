import { useEffect, useState, useCallback, useRef } from 'react';
import { Badge, getUnlockedBadges } from '@/components/ProfileBadges';
import { useSounds } from '@/hooks/useSounds';
import { useHaptics } from '@/hooks/useHaptics';

const STORAGE_KEY_PREFIX = 'unlocked_badges_';

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
  const isFirstLoadRef = useRef(true);

  useEffect(() => {
    // Don't run without a userId
    if (!userId) {
      isFirstLoadRef.current = true;
      return;
    }

    const storageKey = `${STORAGE_KEY_PREFIX}${userId}`;
    
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
    // 2. This is NOT the first load (prevents celebration on login)
    // 3. There were previous badges stored (prevents celebration after cache clear)
    if (newlyUnlocked.length > 0 && !isFirstLoadRef.current && storedBadgesJson) {
      // Show the most recent/highest achievement
      const latestBadge = newlyUnlocked[newlyUnlocked.length - 1];
      setNewBadge(latestBadge);
      setShowCelebration(true);

      // Play celebration sound and haptic
      play('win');
      success();
    }
    
    // Always update stored badges (including first load)
    localStorage.setItem(storageKey, JSON.stringify(currentBadgeIds));
    
    // Mark first load as complete
    isFirstLoadRef.current = false;
  }, [stats.total_wins, stats.games_played, userId, play, success]);

  const dismissCelebration = useCallback(() => {
    setShowCelebration(false);
    setNewBadge(null);
  }, []);

  return { newBadge, showCelebration, dismissCelebration };
};
