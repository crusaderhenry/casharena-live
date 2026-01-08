import { Music, Music2 } from 'lucide-react';
import { useAudio } from '@/contexts/AudioContext';

// Audio wave bars animation component
const AudioWaveAnimation = () => (
  <div className="flex items-end gap-[2px] h-3">
    {[1, 2, 3].map((bar) => (
      <div
        key={bar}
        className="w-[2px] bg-current rounded-full animate-pulse"
        style={{
          height: `${40 + bar * 20}%`,
          animationDelay: `${bar * 150}ms`,
          animationDuration: '0.6s',
        }}
      />
    ))}
  </div>
);

interface MusicToggleProps {
  className?: string;
}

export const MusicToggle = ({ className = '' }: MusicToggleProps) => {
  const { settings, toggleMusic, stopBackgroundMusic } = useAudio();
  
  const handleToggle = () => {
    if (settings.musicEnabled) {
      stopBackgroundMusic();
    }
    toggleMusic();
  };

  return (
    <button
      onClick={handleToggle}
      className={`p-2 rounded-xl transition-all flex items-center gap-1.5 ${
        settings.musicEnabled 
          ? 'bg-primary/20 text-primary' 
          : 'bg-muted/80 text-muted-foreground'
      } ${className}`}
      title={settings.musicEnabled ? 'Mute Music' : 'Unmute Music'}
    >
      {settings.musicEnabled ? (
        <>
          <Music className="w-4 h-4" />
          <AudioWaveAnimation />
        </>
      ) : (
        <Music2 className="w-4 h-4 opacity-50" />
      )}
    </button>
  );
};
