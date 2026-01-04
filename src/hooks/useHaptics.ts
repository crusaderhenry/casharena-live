import { useCallback } from 'react';

type HapticPattern = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

export const useHaptics = () => {
  const vibrate = useCallback((pattern: HapticPattern) => {
    if (!navigator.vibrate) return;
    
    switch (pattern) {
      case 'light':
        navigator.vibrate(10);
        break;
      case 'medium':
        navigator.vibrate(25);
        break;
      case 'heavy':
        navigator.vibrate([50, 30, 50]);
        break;
      case 'success':
        navigator.vibrate([10, 50, 30, 50, 50]);
        break;
      case 'warning':
        navigator.vibrate([50, 100, 50]);
        break;
      case 'error':
        navigator.vibrate([100, 50, 100, 50, 100]);
        break;
    }
  }, []);

  const buttonClick = useCallback(() => vibrate('light'), [vibrate]);
  const success = useCallback(() => vibrate('success'), [vibrate]);
  const warning = useCallback(() => vibrate('warning'), [vibrate]);
  const error = useCallback(() => vibrate('error'), [vibrate]);

  return { vibrate, buttonClick, success, warning, error };
};
