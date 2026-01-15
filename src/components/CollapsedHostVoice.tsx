import { Volume2, VolumeX, Mic, MicOff, Users } from 'lucide-react';
import { useAudio } from '@/contexts/AudioContext';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { useHosts } from '@/hooks/useHosts';

interface CollapsedHostVoiceProps {
  voiceParticipantCount?: number;
  isSpeakerOn?: boolean;
  isMicOn?: boolean;
  onToggleSpeaker?: () => void;
  onToggleMic?: () => void;
}

export const CollapsedHostVoice = ({
  voiceParticipantCount = 0,
  isSpeakerOn = true,
  isMicOn = false,
  onToggleSpeaker,
  onToggleMic,
}: CollapsedHostVoiceProps) => {
  const { selectedHost } = usePlatformSettings();
  const { hosts } = useHosts();
  const { settings, setHostMuted } = useAudio();
  
  const primaryHost = hosts.find(h => h.id === selectedHost) || hosts[0];
  
  const handleHostMuteToggle = () => {
    setHostMuted(!settings.hostMuted);
  };

  return (
    <div className="flex items-center justify-between px-3 py-2 bg-muted/60 backdrop-blur-sm rounded-xl border border-border/30 animate-fade-in">
      {/* Host Section */}
      <div className="flex items-center gap-2">
        <span className="text-lg">{primaryHost?.emoji || '🎙️'}</span>
        <span className="text-xs font-medium text-foreground truncate max-w-[80px]">
          {primaryHost?.name || 'Host'}
        </span>
        <button
          onClick={handleHostMuteToggle}
          className={`p-1.5 rounded-lg transition-colors ${
            settings.hostMuted ? 'bg-destructive/20 text-destructive' : 'bg-primary/20 text-primary'
          }`}
        >
          {settings.hostMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
        </button>
      </div>
      
      {/* Divider */}
      <div className="h-5 w-px bg-border/50" />
      
      {/* Voice Room Section */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 text-muted-foreground">
          <Users className="w-3.5 h-3.5" />
          <span className="text-xs font-medium">{voiceParticipantCount}</span>
        </div>
        
        <button
          onClick={onToggleSpeaker}
          className={`p-1.5 rounded-lg transition-colors ${
            isSpeakerOn ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
          }`}
        >
          {isSpeakerOn ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
        </button>
        
        <button
          onClick={onToggleMic}
          className={`p-1.5 rounded-lg transition-colors ${
            isMicOn ? 'bg-green-500/20 text-green-400' : 'bg-muted text-muted-foreground'
          }`}
        >
          {isMicOn ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
};