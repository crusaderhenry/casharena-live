import { useEffect, useState, useCallback } from 'react';
import { Badge, getUnlockedBadges } from '@/components/ProfileBadges';
import { useSounds } from '@/hooks/useSounds';
import { useHaptics } from '@/hooks/useHaptics';

const STORAGE_KEY = 'unlocked_badges';

interface BadgeUnlockState {
  newBadge: Badge | null;
  showCelebration: boolean;
  dismissCelebration: () => void;
}

export const useBadgeUnlock = (stats: { total_wins: number; games_played: number }): BadgeUnlockState => {
  const [newBadge, setNewBadge] = useState<Badge | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const { play } = useSounds();
  const { success } = useHaptics();

  useEffect(() => {
    // Get currently unlocked badges
    const currentBadges = getUnlockedBadges(stats);
    const currentBadgeIds = currentBadges.map(b => b.id);

    // Get previously stored badge IDs
    const storedBadgesJson = localStorage.getItem(STORAGE_KEY);
    const previousBadgeIds: string[] = storedBadgesJson ? JSON.parse(storedBadgesJson) : [];

    // Find newly unlocked badges
    const newlyUnlocked = currentBadges.filter(b => !previousBadgeIds.includes(b.id));

    if (newlyUnlocked.length > 0) {
      // Show the most recent/highest achievement
      const latestBadge = newlyUnlocked[newlyUnlocked.length - 1];
      setNewBadge(latestBadge);
      setShowCelebration(true);

      // Play celebration sound and haptic
      play('win');
      success();

      // Store updated badge list
      localStorage.setItem(STORAGE_KEY, JSON.stringify(currentBadgeIds));
    } else if (currentBadgeIds.length > 0 && !storedBadgesJson) {
      // First time - store current badges without celebration
      localStorage.setItem(STORAGE_KEY, JSON.stringify(currentBadgeIds));
    }
  }, [stats.total_wins, stats.games_played, play, success]);

  const dismissCelebration = useCallback(() => {
    setShowCelebration(false);
    setNewBadge(null);
  }, []);

  return { newBadge, showCelebration, dismissCelebration };
};
