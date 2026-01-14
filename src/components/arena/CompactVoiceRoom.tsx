import { useCallback } from 'react';
import { Mic, MicOff, Volume2, VolumeX, VolumeOff, Wifi, WifiOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAudio } from '@/contexts/AudioContext';
import { useMockSimulation } from '@/hooks/useMockSimulation';
import { useLiveKitVoice, VoiceParticipant } from '@/hooks/useLiveKitVoice';
import { LiveKitAudioPlayer } from '@/components/LiveKitAudioPlayer';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { getHostById } from '@/hooks/useCrusaderHost';

interface CompactVoiceRoomProps {
  gameId: string;
  isHostSpeaking?: boolean;
  simulatedParticipants?: VoiceParticipant[];
}

export const CompactVoiceRoom = ({ gameId, isHostSpeaking, simulatedParticipants }: CompactVoiceRoomProps) => {
  const { user } = useAuth();
  const { settings: audioSettings, setVoiceRoomMuted, setHostMuted } = useAudio();
  const { mockVoiceParticipants } = useMockSimulation(false, gameId);
  const { selectedHost, secondaryHost, isCoHostMode } = usePlatformSettings();
  
  const host = getHostById(selectedHost);
  const coHost = secondaryHost ? getHostById(secondaryHost) : null;
  
  const {
    room,
    participants: liveKitParticipants,
    isConnected,
    isConnecting,
    isMicEnabled,
    toggleMic
  } = useLiveKitVoice(gameId);

  const hasSimulatedParticipants = simulatedParticipants && simulatedParticipants.length > 0;
  
  const toggleSpeaker = useCallback(() => {
    setVoiceRoomMuted(!audioSettings.voiceRoomMuted);
  }, [audioSettings.voiceRoomMuted, setVoiceRoomMuted]);

  const toggleHostMute = useCallback(() => {
    setHostMuted(!audioSettings.hostMuted);
  }, [audioSettings.hostMuted, setHostMuted]);

  const handleMicToggle = useCallback(async () => {
    await toggleMic();
  }, [toggleMic]);

  const isSpeakerEnabled = !audioSettings.voiceRoomMuted;
  const isHostMuted = audioSettings.hostMuted;

  const displaySource = hasSimulatedParticipants 
    ? simulatedParticipants 
    : mockVoiceParticipants.length > 0 
      ? mockVoiceParticipants 
      : liveKitParticipants;

  const displayParticipants = displaySource.slice(0, 8);
  const totalOnline = displaySource.length;
  const speakingCount = displaySource.filter(p => p.is_speaking).length;

  return (
    <div className="bg-card/60 backdrop-blur-sm rounded-xl p-2.5 border border-border/50">
      <LiveKitAudioPlayer room={room} />
      
      {/* Header with host info integrated */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {/* Host avatars */}
          <div className="relative flex items-center">
            <div className={`w-7 h-7 rounded-full bg-gradient-to-br from-primary to-teal-400 flex items-center justify-center text-sm border-2 ${isHostSpeaking ? 'border-primary animate-pulse' : 'border-primary/50'}`}>
              {host.emoji}
            </div>
            {isCoHostMode && coHost && (
              <div className="w-6 h-6 -ml-2 rounded-full bg-gradient-to-br from-gold to-orange-400 flex items-center justify-center text-xs border-2 border-background">
                {coHost.emoji}
              </div>
            )}
          </div>
          
          {/* Host name + voice room count */}
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-foreground leading-tight">
              {isCoHostMode && coHost ? `${host.name} & ${coHost.name}` : host.name}
            </span>
            <span className="text-[10px] text-muted-foreground leading-tight">
              {totalOnline} in voice
              {speakingCount > 0 && ` • ${speakingCount} speaking`}
            </span>
          </div>
          
          {/* Connection status */}
          <div className={`p-1 rounded-full ${isConnected ? 'text-primary' : 'text-muted-foreground'}`}>
            {isConnected ? <Wifi className="w-3 h-3" /> : isConnecting ? <Wifi className="w-3 h-3 animate-pulse" /> : <WifiOff className="w-3 h-3" />}
          </div>
        </div>

        {/* Audio controls */}
        <div className="flex items-center gap-1">
          {/* Host mute */}
          <button
            onClick={toggleHostMute}
            className={`p-1.5 rounded-lg transition-all ${
              isHostMuted ? 'bg-orange-500/20 text-orange-400' : 'bg-muted/50 text-muted-foreground'
            }`}
            title={isHostMuted ? 'Unmute Host' : 'Mute Host'}
          >
            {isHostMuted ? <VolumeOff className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
          
          {/* Voice room mute */}
          <button
            onClick={toggleSpeaker}
            className={`p-1.5 rounded-lg transition-all ${
              !isSpeakerEnabled ? 'bg-destructive/20 text-destructive' : 'bg-muted/50 text-muted-foreground'
            }`}
          >
            {isSpeakerEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>

          {/* Mic toggle */}
          <button
            onClick={handleMicToggle}
            disabled={!isConnected}
            className={`p-1.5 rounded-lg transition-all ${
              !isConnected
                ? 'bg-muted/50 text-muted-foreground cursor-not-allowed'
                : isMicEnabled 
                  ? 'bg-primary/20 text-primary'
                  : 'bg-destructive/20 text-destructive'
            }`}
          >
            {isMicEnabled ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Participants - horizontal scroll */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mb-1 scrollbar-hide">
        {displayParticipants.map((participant) => {
          const isMe = participant.user_id === user?.id;
          const speaking = participant.is_speaking && isSpeakerEnabled;
          
          return (
            <div 
              key={participant.user_id}
              className="flex flex-col items-center flex-shrink-0"
            >
              <div className="relative">
                {speaking && (
                  <div className="absolute inset-0 rounded-full bg-primary/40 animate-ping" />
                )}
                <div
                  className={`relative w-8 h-8 rounded-full flex items-center justify-center text-base transition-all ${
                    speaking
                      ? 'bg-primary/30 ring-2 ring-primary'
                      : 'bg-muted/50'
                  } ${isMe ? 'ring-1 ring-accent/50' : ''}`}
                >
                  {participant.avatar}
                </div>
                {speaking && (
                  <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 flex items-end gap-[1px]">
                    <span className="w-[2px] h-[4px] bg-primary rounded-full animate-[wave_0.5s_ease-in-out_infinite]" />
                    <span className="w-[2px] h-[6px] bg-primary rounded-full animate-[wave_0.5s_ease-in-out_infinite_0.1s]" />
                    <span className="w-[2px] h-[4px] bg-primary rounded-full animate-[wave_0.5s_ease-in-out_infinite_0.2s]" />
                  </div>
                )}
              </div>
              <span className={`text-[8px] truncate max-w-[32px] ${
                speaking ? 'text-primary font-bold' : isMe ? 'text-primary' : 'text-muted-foreground'
              }`}>
                {isMe ? 'You' : participant.username.split(' ')[0].slice(0, 5)}
              </span>
            </div>
          );
        })}
        
        {displaySource.length > 8 && (
          <div className="flex flex-col items-center flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground">
              +{displaySource.length - 8}
            </div>
            <span className="text-[8px] text-muted-foreground">more</span>
          </div>
        )}
      </div>
    </div>
  );
};
