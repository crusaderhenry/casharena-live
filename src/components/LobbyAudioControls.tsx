import { Volume2, VolumeX, Mic } from 'lucide-react';
import { useAudio } from '@/contexts/AudioContext';

interface LobbyAudioControlsProps {
  onMicTest?: () => void;
}

export const LobbyAudioControls = ({ onMicTest }: LobbyAudioControlsProps) => {
  const { settings, toggleMusic, toggleSfx } = useAudio();
  
  // Combined mute state - both music and SFX are controlled together
  const isMuted = !settings.musicEnabled && !settings.sfxEnabled;

  const handleToggleMute = () => {
    // Toggle both music and SFX together
    if (isMuted) {
      // Unmute both
      if (!settings.musicEnabled) toggleMusic();
      if (!settings.sfxEnabled) toggleSfx();
    } else {
      // Mute both
      if (settings.musicEnabled) toggleMusic();
      if (settings.sfxEnabled) toggleSfx();
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Combined Audio Toggle (Music + SFX) */}
      <button
        onClick={handleToggleMute}
        className={`p-2 rounded-lg transition-all ${
          !isMuted 
            ? 'bg-primary/20 text-primary' 
            : 'bg-muted text-muted-foreground'
        }`}
        title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
      >
        {!isMuted ? (
          <Volume2 className="w-4 h-4" />
        ) : (
          <VolumeX className="w-4 h-4 opacity-50" />
        )}
      </button>

      {/* Mic Test Button */}
      {onMicTest && (
        <button
          onClick={onMicTest}
          className="p-2 rounded-lg transition-all bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
          title="Test Microphone & Speakers"
        >
          <Mic className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
