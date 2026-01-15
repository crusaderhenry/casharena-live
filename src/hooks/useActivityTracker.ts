import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const THROTTLE_INTERVAL = 5 * 60 * 1000; // 5 minutes in milliseconds

/**
 * Tracks user activity (clicks, touches, keystrokes, scrolls, mouse movements)
 * and updates last_active_at in the database, throttled to every 5 minutes.
 */
export const useActivityTracker = () => {
  const { user, updateLastActive } = useAuth();
  const lastUpdateRef = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleActivity = useCallback(() => {
    if (!user) return;

    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdateRef.current;

    // Only update if enough time has passed since last update
    if (timeSinceLastUpdate >= THROTTLE_INTERVAL) {
      lastUpdateRef.current = now;
      updateLastActive();
    } else if (!timeoutRef.current) {
      // Schedule an update for the remaining time
      const remainingTime = THROTTLE_INTERVAL - timeSinceLastUpdate;
      timeoutRef.current = setTimeout(() => {
        lastUpdateRef.current = Date.now();
        updateLastActive();
        timeoutRef.current = null;
      }, remainingTime);
    }
  }, [user, updateLastActive]);

  useEffect(() => {
    if (!user) return;

    // Events to track for activity
    const events = ['click', 'touchstart', 'keydown', 'scroll', 'mousemove'];

    // Add event listeners
    events.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Cleanup
    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [user, handleActivity]);
};
