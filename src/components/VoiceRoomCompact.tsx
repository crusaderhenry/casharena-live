import { useCallback } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Users, Radio, Wifi, WifiOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAudio } from '@/contexts/AudioContext';
import { useMockSimulation } from '@/hooks/useMockSimulation';
import { useLiveKitVoice, VoiceParticipant } from '@/hooks/useLiveKitVoice';
import { LiveKitAudioPlayer } from '@/components/LiveKitAudioPlayer';

interface VoiceRoomCompactProps {
  gameId: string;
  onMicToggle?: (enabled: boolean) => void;
  onSpeakerToggle?: (enabled: boolean) => void;
  simulatedParticipants?: VoiceParticipant[];
}

export const VoiceRoomCompact = ({ gameId, onMicToggle, onSpeakerToggle, simulatedParticipants }: VoiceRoomCompactProps) => {
  const { user } = useAuth();
  const { settings: audioSettings, setVoiceRoomMuted } = useAudio();
  const { mockVoiceParticipants } = useMockSimulation(false, gameId);
  
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
    const newState = !audioSettings.voiceRoomMuted;
    setVoiceRoomMuted(newState);
    onSpeakerToggle?.(!newState);
  }, [audioSettings.voiceRoomMuted, setVoiceRoomMuted, onSpeakerToggle]);

  const handleMicToggle = useCallback(async () => {
    const nextEnabled = !isMicEnabled;
    await toggleMic();
    onMicToggle?.(nextEnabled);
  }, [toggleMic, isMicEnabled, onMicToggle]);

  const isSpeakerEnabled = !audioSettings.voiceRoomMuted;

  const displaySource = hasSimulatedParticipants 
    ? simulatedParticipants 
    : mockVoiceParticipants.length > 0 
      ? mockVoiceParticipants 
      : liveKitParticipants;
  
  const displayParticipants = displaySource.slice(0, 8);
  const totalOnline = displaySource.length;
  const currentUserSpeaking = liveKitParticipants.find(p => p.user_id === user?.id)?.is_speaking || false;

  return (
    <div className="bg-muted/30 backdrop-blur-sm rounded-xl p-2 border border-border/30">
      <LiveKitAudioPlayer room={room} />
      
      {/* Single row: Header + Avatars + Controls */}
      <div className="flex items-center gap-2">
        {/* Status icon */}
        <div className="flex items-center gap-1.5 shrink-0">
          <Radio className={`w-3 h-3 ${isConnected ? 'text-primary animate-pulse' : 'text-muted-foreground'}`} />
          <span className="text-xs font-medium text-muted-foreground">{totalOnline}</span>
        </div>

        {/* Avatars row */}
        <div className="flex-1 flex items-center gap-1 overflow-hidden">
          {displayParticipants.map((participant) => {
            const speaking = participant.is_speaking && isSpeakerEnabled;
            const isMe = participant.user_id === user?.id;
            
            return (
              <div 
                key={participant.user_id}
                className={`w-7 h-7 rounded-full flex items-center justify-center text-sm shrink-0 transition-all ${
                  speaking 
                    ? 'bg-primary/30 ring-2 ring-primary shadow-sm shadow-primary/30' 
                    : isMe 
                      ? 'bg-primary/20 ring-1 ring-primary/50' 
                      : 'bg-muted/60'
                }`}
                title={isMe ? 'You' : participant.username}
              >
                {participant.avatar}
              </div>
            );
          })}
          
          {displaySource.length > 8 && (
            <span className="text-[10px] text-muted-foreground shrink-0">
              +{displaySource.length - 8}
            </span>
          )}
          
          {displaySource.length === 0 && (
            <span className="text-[10px] text-muted-foreground">
              {isConnecting ? 'Connecting...' : 'No one in voice'}
            </span>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Connection indicator */}
          <div className={`p-1 ${isConnected ? 'text-primary' : 'text-muted-foreground'}`}>
            {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
          </div>

          {/* Speaker toggle */}
          <button
            onClick={toggleSpeaker}
            className={`p-1.5 rounded-lg transition-all ${
              isSpeakerEnabled 
                ? 'bg-muted text-muted-foreground' 
                : 'bg-destructive/20 text-destructive'
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
                  ? currentUserSpeaking 
                    ? 'bg-primary/30 text-primary animate-pulse' 
                    : 'bg-primary/20 text-primary'
                  : 'bg-destructive/20 text-destructive'
            }`}
          >
            {isMicEnabled ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
};
