import { Mic, VolumeOff, Volume2 } from 'lucide-react';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { getHostById } from '@/hooks/useCrusaderHost';
import { useAudio } from '@/contexts/AudioContext';

interface CompactHostBannerProps {
  isLive?: boolean;
  isSpeaking?: boolean;
}

export const CompactHostBanner = ({ isLive, isSpeaking }: CompactHostBannerProps) => {
  const { selectedHost, secondaryHost, isCoHostMode } = usePlatformSettings();
  const { settings: audioSettings, setHostMuted } = useAudio();
  const host = getHostById(selectedHost);
  const coHost = secondaryHost ? getHostById(secondaryHost) : null;

  const toggleHostMute = () => {
    setHostMuted(!audioSettings.hostMuted);
  };

  return (
    <div className="flex items-center justify-between p-2 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/30">
      <div className="flex items-center gap-2">
        {/* Host avatars - compact */}
        <div className="relative">
          <div className={`w-8 h-8 rounded-full bg-gradient-to-br from-primary to-teal-400 flex items-center justify-center text-lg border-2 ${isSpeaking ? 'border-primary animate-pulse ring-2 ring-primary/50' : 'border-primary/50'}`}>
            {host.emoji}
          </div>
          {isCoHostMode && coHost && (
            <div className="absolute -right-1.5 -bottom-0.5 w-6 h-6 rounded-full bg-gradient-to-br from-gold to-orange-400 flex items-center justify-center text-xs border-2 border-background">
              {coHost.emoji}
            </div>
          )}
          {isLive && (
            <div className="absolute -top-0.5 -right-0.5">
              <span className="w-2 h-2 bg-red-500 rounded-full block animate-pulse" />
            </div>
          )}
        </div>

        {/* Host name(s) */}
        <div className="flex items-center gap-1.5">
          {isCoHostMode && coHost ? (
            <span className="text-sm font-semibold text-foreground">
              {host.name} & {coHost.name}
            </span>
          ) : (
            <span className="text-sm font-semibold text-foreground">{host.name}</span>
          )}
          <span className="px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider bg-primary/20 text-primary rounded-full flex items-center gap-0.5">
            <Mic className="w-2.5 h-2.5" />
            {isCoHostMode ? 'Hosts' : 'Host'}
          </span>
        </div>
      </div>

      {/* Mute button */}
      <button
        onClick={toggleHostMute}
        className={`p-2 rounded-lg transition-all ${
          audioSettings.hostMuted 
            ? 'bg-orange-500/20 text-orange-400' 
            : 'bg-muted/50 text-muted-foreground hover:bg-muted'
        }`}
        title={audioSettings.hostMuted ? 'Unmute Host' : 'Mute Host'}
      >
        {audioSettings.hostMuted ? (
          <VolumeOff className="w-4 h-4" />
        ) : (
          <Volume2 className="w-4 h-4" />
        )}
      </button>
    </div>
  );
};
