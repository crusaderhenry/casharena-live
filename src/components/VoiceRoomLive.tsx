import { useCallback, useState } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Users, Radio, VolumeOff, Wifi, WifiOff, Volume1 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAudio } from '@/contexts/AudioContext';
import { useMockSimulation } from '@/hooks/useMockSimulation';
import { useLiveKitVoice, VoiceParticipant } from '@/hooks/useLiveKitVoice';
import { LiveKitAudioPlayer, useParticipantAudio } from '@/components/LiveKitAudioPlayer';
import { Slider } from '@/components/ui/slider';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

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
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  
  // Per-user audio controls
  const { toggleUserMute, setUserVolume, isUserMuted, getUserVolume } = useParticipantAudio();
  
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

  const handleUnlockAudio = useCallback(() => {
    // Find container and call unlock
    const container = document.querySelector('[data-livekit-audio]');
    if (container && (container as any).unlockAudio) {
      (container as any).unlockAudio();
    }
    setAutoplayBlocked(false);
  }, []);

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
      <div data-livekit-audio>
        <LiveKitAudioPlayer room={room} onAutoplayBlocked={setAutoplayBlocked} />
      </div>

      {/* Tap to enable audio banner */}
      {autoplayBlocked && isConnected && (
        <button
          onClick={handleUnlockAudio}
          className="w-full mb-3 p-2 bg-accent/20 border border-accent/30 rounded-lg flex items-center justify-center gap-2 text-accent text-sm font-medium animate-pulse active:scale-[0.98] transition-transform"
        >
          <Volume2 className="w-4 h-4" />
          Tap to enable voice audio
        </button>
      )}

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
          const userMuted = isUserMuted(participant.user_id);
          const userVolume = getUserVolume(participant.user_id);
          
          return (
            <Popover key={participant.user_id}>
              <PopoverTrigger asChild>
                <button 
                  className="flex flex-col items-center gap-1 focus:outline-none"
                  disabled={isMe}
                >
                  <div className="relative">
                    {/* Speaking ring animation */}
                    {speaking && isSpeakerEnabled && !userMuted && (
                      <div className="absolute inset-0 rounded-full bg-primary/40 animate-ping" />
                    )}
                    <div
                      className={`relative w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all ${
                        speaking && isSpeakerEnabled && !userMuted
                          ? 'bg-primary/30 ring-2 ring-primary shadow-lg shadow-primary/30'
                          : (participant.is_muted || userMuted) && !isMe
                            ? 'bg-muted/50 opacity-60'
                            : 'bg-card-elevated'
                      } ${isMe ? 'ring-2 ring-accent/50' : ''}`}
                    >
                      {participant.avatar}
                      {/* Per-user mute indicator */}
                      {userMuted && !isMe && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive flex items-center justify-center">
                          <VolumeX className="w-2.5 h-2.5 text-white" />
                        </div>
                      )}
                    </div>
                    {/* Small speaking indicator dot */}
                    {speaking && isSpeakerEnabled && !userMuted && (
                      <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-primary border-2 border-background" />
                    )}
                  </div>
                  <span className={`text-[9px] truncate max-w-[40px] ${
                    speaking && isSpeakerEnabled && !userMuted ? 'text-primary font-bold' : isMe ? 'text-primary font-medium' : 'text-muted-foreground'
                  }`}>
                    {isMe ? 'You' : participant.username.split(' ')[0]}
                  </span>
                </button>
              </PopoverTrigger>
              
              {/* Per-user audio controls popover */}
              {!isMe && (
                <PopoverContent className="w-48 p-3" side="top">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium truncate">{participant.username}</span>
                      <button
                        onClick={() => toggleUserMute(participant.user_id)}
                        className={`p-1.5 rounded-full transition-all ${
                          userMuted 
                            ? 'bg-destructive/20 text-destructive' 
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                      >
                        {userMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <Volume1 className="w-3 h-3 text-muted-foreground" />
                        <Slider
                          value={[userVolume * 100]}
                          onValueChange={([val]) => setUserVolume(participant.user_id, val / 100)}
                          max={100}
                          step={1}
                          disabled={userMuted}
                          className="flex-1"
                        />
                        <span className="text-[10px] text-muted-foreground w-7 text-right">
                          {Math.round(userVolume * 100)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              )}
            </Popover>
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
