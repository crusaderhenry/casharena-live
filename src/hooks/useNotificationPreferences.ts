import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'notification_preferences';

interface NotificationPreferences {
  inAppGameStatus: boolean;
  inAppWins: boolean;
}

const defaultPreferences: NotificationPreferences = {
  inAppGameStatus: false, // Disabled by default as per user request
  inAppWins: true,
};

export const useNotificationPreferences = () => {
  const [preferences, setPreferences] = useState<NotificationPreferences>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? { ...defaultPreferences, ...JSON.parse(stored) } : defaultPreferences;
    } catch {
      return defaultPreferences;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch {
      // Ignore storage errors
    }
  }, [preferences]);

  const toggleInAppGameStatus = useCallback(() => {
    setPreferences(prev => ({ ...prev, inAppGameStatus: !prev.inAppGameStatus }));
  }, []);

  const toggleInAppWins = useCallback(() => {
    setPreferences(prev => ({ ...prev, inAppWins: !prev.inAppWins }));
  }, []);

  return {
    preferences,
    toggleInAppGameStatus,
    toggleInAppWins,
  };
};
