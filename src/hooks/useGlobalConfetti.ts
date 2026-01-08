import { useState, useEffect, useCallback } from 'react';

// Custom event for triggering confetti globally
export const CONFETTI_EVENT = 'global-confetti';

export const triggerConfetti = (duration?: number) => {
  window.dispatchEvent(new CustomEvent(CONFETTI_EVENT, { detail: { duration } }));
};

export const useGlobalConfetti = () => {
  const [showConfetti, setShowConfetti] = useState(false);
  const [duration, setDuration] = useState(5000);

  useEffect(() => {
    const handleConfetti = (event: CustomEvent<{ duration?: number }>) => {
      setDuration(event.detail?.duration || 5000);
      setShowConfetti(true);
    };

    window.addEventListener(CONFETTI_EVENT, handleConfetti as EventListener);
    return () => {
      window.removeEventListener(CONFETTI_EVENT, handleConfetti as EventListener);
    };
  }, []);

  const hideConfetti = useCallback(() => {
    setShowConfetti(false);
  }, []);

  return { showConfetti, duration, hideConfetti };
};
