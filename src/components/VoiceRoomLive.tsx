import { useCallback } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Users, Radio, VolumeOff, Wifi, WifiOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAudio } from '@/contexts/AudioContext';
import { useMockSimulation } from '@/hooks/useMockSimulation';
import { useLiveKitVoice, VoiceParticipant } from '@/hooks/useLiveKitVoice';
import { LiveKitAudioPlayer } from '@/components/LiveKitAudioPlayer';

interface VoiceRoomLiveProps {
  gameId: string;
  onMicToggle?: (enabled: boolean) => void;
  onSpeakerToggle?: (enabled: boolean) => void;
  onHostMuteToggle?: (muted: boolean) => void;
  simulatedParticipants?: VoiceParticipant[];
}

export const VoiceRoomLive = ({ gameId, onMicToggle, onSpeakerToggle, onHostMuteToggle, simulatedParticipants }: VoiceRoomLiveProps) => {
  const { user } = useAuth();
  const { settings: audioSettings, setVoiceRoomMuted, setHostMuted } = useAudio();
  const { mockVoiceParticipants } = useMockSimulation(false, gameId);
  
  // LiveKit voice chat
  const {
    room,
    participants: liveKitParticipants,
    isConnected,
    isConnecting,
    isMicEnabled,
    connectionError,
    toggleMic
  } = useLiveKitVoice(gameId);

  // Priority: simulatedParticipants > mockVoiceParticipants > LiveKit participants
  const hasSimulatedParticipants = simulatedParticipants && simulatedParticipants.length > 0;
  
  const toggleSpeaker = useCallback(() => {
    const newState = !audioSettings.voiceRoomMuted;
    setVoiceRoomMuted(newState);
    onSpeakerToggle?.(!newState);
  }, [audioSettings.voiceRoomMuted, setVoiceRoomMuted, onSpeakerToggle]);

  const toggleHostMute = useCallback(() => {
    const newState = !audioSettings.hostMuted;
    setHostMuted(newState);
    onHostMuteToggle?.(newState);
  }, [audioSettings.hostMuted, setHostMuted, onHostMuteToggle]);

  const handleMicToggle = useCallback(async () => {
    const nextEnabled = !isMicEnabled;
    await toggleMic();
    onMicToggle?.(nextEnabled);
  }, [toggleMic, isMicEnabled, onMicToggle]);

  // Use speaker enabled from audio context (inverted from muted)
  const isSpeakerEnabled = !audioSettings.voiceRoomMuted;
  const isHostMuted = audioSettings.hostMuted;

  // Use simulated > mock > LiveKit participants
  const displaySource = hasSimulatedParticipants 
    ? simulatedParticipants 
    : mockVoiceParticipants.length > 0 
      ? mockVoiceParticipants 
      : liveKitParticipants;
  
  const speakingParticipants = displaySource.filter(p => p.is_speaking);
  const displayParticipants = displaySource.slice(0, 6);
  const totalOnline = displaySource.length;

  // Find current user's speaking state
  const currentUserSpeaking = liveKitParticipants.find(p => p.user_id === user?.id)?.is_speaking || false;

  return (
    <div className="bg-card/80 backdrop-blur-sm rounded-xl p-3 border border-border/50">
      <LiveKitAudioPlayer room={room} />
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Radio className={`w-4 h-4 ${isConnected ? 'text-primary animate-pulse' : 'text-muted-foreground'}`} />
          <span className="text-sm font-semibold text-foreground">Voice Room</span>
          <span className="text-xs text-muted-foreground">• {totalOnline} online</span>
          
          {/* Connection status */}
          {isConnecting && (
            <span className="text-[10px] text-accent animate-pulse">connecting...</span>
          )}
          {connectionError && (
            <span className="text-[10px] text-destructive">{connectionError}</span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {/* Connection indicator */}
          <div className={`p-1.5 rounded-full ${isConnected ? 'text-primary' : 'text-muted-foreground'}`}>
            {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
          </div>

          {/* Speaker toggle (voice room) */}
          <button
            onClick={toggleSpeaker}
            className={`p-2 rounded-full transition-all ${
              isSpeakerEnabled 
                ? 'bg-muted text-muted-foreground hover:bg-muted/80' 
                : 'bg-destructive/20 text-destructive'
            }`}
            title={isSpeakerEnabled ? 'Mute Voice Room' : 'Unmute Voice Room'}
          >
            {isSpeakerEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Mic toggle */}
          <button
            onClick={handleMicToggle}
            disabled={!isConnected}
            className={`p-2 rounded-full transition-all ${
              !isConnected
                ? 'bg-muted/50 text-muted-foreground cursor-not-allowed'
                : isMicEnabled 
                  ? currentUserSpeaking 
                    ? 'bg-primary/30 text-primary ring-2 ring-primary/50 animate-pulse' 
                    : 'bg-primary/20 text-primary'
                  : 'bg-destructive/20 text-destructive'
            }`}
            title={isMicEnabled ? 'Mute Mic' : 'Unmute Mic'}
          >
            {isMicEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Participants */}
      <div className="flex flex-wrap gap-2">
        {displayParticipants.map((participant) => {
          const isMe = participant.user_id === user?.id;
          const speaking = participant.is_speaking;
          
          return (
            <div 
              key={participant.user_id}
              className="flex flex-col items-center gap-1"
            >
              <div className="relative">
                {/* Speaking ring animation */}
                {speaking && isSpeakerEnabled && (
                  <div className="absolute inset-0 rounded-full bg-primary/40 animate-ping" />
                )}
                <div
                  className={`relative w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all ${
                    speaking && isSpeakerEnabled
                      ? 'bg-primary/30 ring-2 ring-primary shadow-lg shadow-primary/30'
                      : participant.is_muted && !isMe
                        ? 'bg-muted/50 opacity-60'
                        : 'bg-card-elevated'
                  } ${isMe ? 'ring-2 ring-accent/50' : ''}`}
                >
                  {participant.avatar}
                </div>
                {/* Voice waveform indicator for speaking participants */}
                {speaking && isSpeakerEnabled && (
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex items-end gap-[1px]">
                    <span className="w-[2px] h-[6px] bg-primary rounded-full animate-[wave_0.5s_ease-in-out_infinite]" />
                    <span className="w-[2px] h-[10px] bg-primary rounded-full animate-[wave_0.5s_ease-in-out_infinite_0.1s]" />
                    <span className="w-[2px] h-[8px] bg-primary rounded-full animate-[wave_0.5s_ease-in-out_infinite_0.2s]" />
                    <span className="w-[2px] h-[12px] bg-primary rounded-full animate-[wave_0.5s_ease-in-out_infinite_0.15s]" />
                    <span className="w-[2px] h-[6px] bg-primary rounded-full animate-[wave_0.5s_ease-in-out_infinite_0.25s]" />
                  </div>
                )}
              </div>
              <span className={`text-[9px] truncate max-w-[40px] ${
                speaking && isSpeakerEnabled ? 'text-primary font-bold' : isMe ? 'text-primary font-medium' : 'text-muted-foreground'
              }`}>
                {isMe ? 'You' : participant.username.split(' ')[0]}
              </span>
            </div>
          );
        })}
        
        {liveKitParticipants.length > 6 && (
          <div className="flex flex-col items-center gap-1">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
              +{liveKitParticipants.length - 6}
            </div>
            <span className="text-[9px] text-muted-foreground">more</span>
          </div>
        )}

        {displaySource.length === 0 && (
          <div className="w-full text-center py-2 text-xs text-muted-foreground">
            <Users className="w-4 h-4 mx-auto mb-1 opacity-50" />
            {isConnecting ? 'Connecting to voice...' : 'No one in voice yet'}
          </div>
        )}
      </div>

      {/* Mute status indicators */}
      {(isHostMuted || !isSpeakerEnabled) && (
        <div className="mt-2 pt-2 border-t border-border/30 flex flex-wrap gap-2">
          {isHostMuted && (
            <span className="text-[10px] text-accent bg-accent/10 px-2 py-0.5 rounded-full flex items-center gap-1">
              <VolumeOff className="w-3 h-3" />
              Host muted
            </span>
          )}
          {!isSpeakerEnabled && (
            <span className="text-[10px] text-destructive bg-destructive/10 px-2 py-0.5 rounded-full flex items-center gap-1">
              <VolumeX className="w-3 h-3" />
              Voice room muted
            </span>
          )}
        </div>
      )}

      {/* Speaking indicator */}
      {speakingParticipants.length > 0 && isSpeakerEnabled && (
        <div className="mt-2 pt-2 border-t border-border/30">
          <div className="flex items-center gap-1.5 text-[10px] text-primary">
            <div className="voice-wave scale-50">
              <span /><span /><span />
            </div>
            <span>
              {speakingParticipants.map(p => p.username.split(' ')[0]).join(', ')} speaking
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
