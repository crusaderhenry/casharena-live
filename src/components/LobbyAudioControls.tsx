import { Volume2, VolumeX, Mic } from 'lucide-react';
import { useAudio } from '@/contexts/AudioContext';

interface LobbyAudioControlsProps {
  onMicTest?: () => void;
}

// Audio wave bars animation component
const AudioWaveAnimation = () => (
  <div className="flex items-end gap-[2px] h-3">
    {[1, 2, 3].map((bar) => (
      <div
        key={bar}
        className="w-[3px] bg-primary rounded-full animate-pulse"
        style={{
          height: `${40 + bar * 20}%`,
          animationDelay: `${bar * 150}ms`,
          animationDuration: '0.6s',
        }}
      />
    ))}
  </div>
);

export const LobbyAudioControls = ({ onMicTest }: LobbyAudioControlsProps) => {
  const { settings, toggleMusic, toggleSfx, playBackgroundMusic, stopBackgroundMusic } = useAudio();
  
  // Consider "on" if either is enabled
  const isAudioOn = settings.musicEnabled || settings.sfxEnabled;
  const isMusicPlaying = settings.musicEnabled;

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
        className={`p-2 rounded-lg transition-all flex items-center gap-1.5 ${
          isAudioOn 
            ? 'bg-primary/20 text-primary' 
            : 'bg-muted text-muted-foreground'
        }`}
        title={isAudioOn ? 'Mute Audio' : 'Unmute Audio'}
      >
        {isAudioOn ? (
          <>
            <Volume2 className="w-4 h-4" />
            {isMusicPlaying && <AudioWaveAnimation />}
          </>
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