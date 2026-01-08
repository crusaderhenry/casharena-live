import { Volume2, VolumeX, Bell, BellOff, Music, Music2 } from 'lucide-react';
import { useAudio } from '@/contexts/AudioContext';

interface LobbyAudioControlsProps {
  tickingSoundEnabled: boolean;
  onToggleTickingSound: () => void;
}

export const LobbyAudioControls = ({ 
  tickingSoundEnabled, 
  onToggleTickingSound 
}: LobbyAudioControlsProps) => {
  const { settings, toggleMusic, toggleSfx } = useAudio();

  return (
    <div className="flex items-center gap-2">
      {/* Background Music Toggle */}
      <button
        onClick={toggleMusic}
        className={`p-2 rounded-lg transition-all ${
          settings.musicEnabled 
            ? 'bg-primary/20 text-primary' 
            : 'bg-muted text-muted-foreground'
        }`}
        title={settings.musicEnabled ? 'Mute Music' : 'Unmute Music'}
      >
        {settings.musicEnabled ? (
          <Music className="w-4 h-4" />
        ) : (
          <Music2 className="w-4 h-4 opacity-50" />
        )}
      </button>

      {/* Sound Effects Toggle */}
      <button
        onClick={toggleSfx}
        className={`p-2 rounded-lg transition-all ${
          settings.sfxEnabled 
            ? 'bg-primary/20 text-primary' 
            : 'bg-muted text-muted-foreground'
        }`}
        title={settings.sfxEnabled ? 'Mute SFX' : 'Unmute SFX'}
      >
        {settings.sfxEnabled ? (
          <Volume2 className="w-4 h-4" />
        ) : (
          <VolumeX className="w-4 h-4" />
        )}
      </button>

      {/* Countdown Tick Toggle */}
      <button
        onClick={onToggleTickingSound}
        className={`p-2 rounded-lg transition-all ${
          tickingSoundEnabled 
            ? 'bg-primary/20 text-primary' 
            : 'bg-muted text-muted-foreground'
        }`}
        title={tickingSoundEnabled ? 'Mute Countdown Ticks' : 'Unmute Countdown Ticks'}
      >
        {tickingSoundEnabled ? (
          <Bell className="w-4 h-4" />
        ) : (
          <BellOff className="w-4 h-4" />
        )}
      </button>
    </div>
  );
};
