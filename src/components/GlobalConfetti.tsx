import { useEffect } from 'react';
import { useGlobalConfetti } from '@/hooks/useGlobalConfetti';
import { Confetti } from './Confetti';

export const GlobalConfetti = () => {
  const { showConfetti, duration, hideConfetti } = useGlobalConfetti();

  useEffect(() => {
    if (showConfetti) {
      const timeout = setTimeout(hideConfetti, duration);
      return () => clearTimeout(timeout);
    }
  }, [showConfetti, duration, hideConfetti]);

  if (!showConfetti) return null;

  return <Confetti duration={duration} />;
};
