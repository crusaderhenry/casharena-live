import { useEffect } from 'react';
import { useSounds, SOUND_EVENT } from '@/hooks/useSounds';

/**
 * Global component that listens for sound trigger events and plays them.
 * This allows sounds to be triggered from contexts or other non-hook locations.
 */
export const GlobalSoundPlayer = () => {
  const { play } = useSounds();

  useEffect(() => {
    const handleSoundEvent = (event: CustomEvent<{ sound: string }>) => {
      play(event.detail.sound as any);
    };

    window.addEventListener(SOUND_EVENT, handleSoundEvent as EventListener);
    return () => {
      window.removeEventListener(SOUND_EVENT, handleSoundEvent as EventListener);
    };
  }, [play]);

  return null;
};
