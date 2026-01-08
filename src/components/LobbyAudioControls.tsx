import { Volume2, VolumeX, Mic } from 'lucide-react';
import { useAudio } from '@/contexts/AudioContext';

interface LobbyAudioControlsProps {
  onMicTest?: () => void;
}

export const LobbyAudioControls = ({ onMicTest }: LobbyAudioControlsProps) => {
  const { settings, toggleMusic, toggleSfx, playBackgroundMusic, stopBackgroundMusic } = useAudio();
  
  // Combined mute state - muted when BOTH are off
  const isMuted = !settings.musicEnabled && !settings.sfxEnabled;
  // Consider "on" if either is enabled
  const isAudioOn = settings.musicEnabled || settings.sfxEnabled;

  const handleToggleMute = () => {
    if (isAudioOn) {
      // Mute both
      if (settings.musicEnabled) {
        toggleMusic();
        stopBackgroundMusic();
      }
      if (settings.sfxEnabled) toggleSfx();
    } else {
      // Unmute both and restart music
      if (!settings.musicEnabled) {
        toggleMusic();
        // Small delay to let state update, then play music
        setTimeout(() => {
          playBackgroundMusic('lobby');
        }, 50);
      }
      if (!settings.sfxEnabled) toggleSfx();
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Combined Audio Toggle (Music + SFX) */}
      <button
        onClick={handleToggleMute}
        className={`p-2 rounded-lg transition-all ${
          isAudioOn 
            ? 'bg-primary/20 text-primary' 
            : 'bg-muted text-muted-foreground'
        }`}
        title={isAudioOn ? 'Mute Audio' : 'Unmute Audio'}
      >
        {isAudioOn ? (
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
