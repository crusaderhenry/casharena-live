import { useState, useEffect, useCallback, useRef } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Users, Radio } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useGame } from '@/contexts/GameContext';
import { useMockSimulation } from '@/hooks/useMockSimulation';

interface VoiceParticipant {
  user_id: string;
  username: string;
  avatar: string;
  is_speaking: boolean;
  is_muted: boolean;
}

interface VoiceRoomLiveProps {
  gameId: string;
  onMicToggle?: (enabled: boolean) => void;
  onSpeakerToggle?: (enabled: boolean) => void;
}

export const VoiceRoomLive = ({ gameId, onMicToggle, onSpeakerToggle }: VoiceRoomLiveProps) => {
  const { user, profile } = useAuth();
  const { isTestMode } = useGame();
  const { mockVoiceParticipants } = useMockSimulation(isTestMode, gameId);
  
  const [participants, setParticipants] = useState<VoiceParticipant[]>([]);
  const [isMicEnabled, setIsMicEnabled] = useState(false);
  const [isSpeakerEnabled, setIsSpeakerEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [micVolume, setMicVolume] = useState(0);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);

  const presenceChannelRef = useRef<any>(null);
  const rafRef = useRef<number | null>(null);
  const lastSpeakingRef = useRef(false);

  // Join presence channel
  useEffect(() => {
    if (!gameId || !user) return;

    const channel = supabase.channel(`voice-${gameId}`, {
      config: { presence: { key: user.id } },
    });

    presenceChannelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<VoiceParticipant>();
        const allParticipants: VoiceParticipant[] = [];

        Object.values(state).forEach((presences) => {
          if (presences && presences.length > 0) {
            allParticipants.push(presences[0] as VoiceParticipant);
          }
        });

        setParticipants(allParticipants);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: user.id,
            username: profile?.username || 'Player',
            avatar: profile?.avatar || '🎮',
            is_speaking: false,
            is_muted: true,
          });
        }
      });

    return () => {
      presenceChannelRef.current = null;
      channel.unsubscribe();
    };
  }, [gameId, user, profile]);

  // Handle microphone
  const startMicrophone = useCallback(async () => {
    if (!gameId || !user) return;

    try {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      setStream(mediaStream);

      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      setAudioContext(ctx);

      const source = ctx.createMediaStreamSource(mediaStream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      // Mark as unmuted in presence immediately
      presenceChannelRef.current?.track({
        user_id: user.id,
        username: profile?.username || 'Player',
        avatar: profile?.avatar || '🎮',
        is_speaking: false,
        is_muted: false,
      });

      lastSpeakingRef.current = false;
      setIsSpeaking(false);

      // Voice activity detection loop
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const detectVoice = () => {
        // Stop the loop if mic got turned off
        if (!mediaStream.getTracks().some((t) => t.readyState === 'live')) return;

        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];

        const avg = sum / dataArray.length / 255;
        setMicVolume(avg);

        const speaking = avg > 0.1;
        if (speaking !== lastSpeakingRef.current) {
          lastSpeakingRef.current = speaking;
          setIsSpeaking(speaking);

          // Broadcast speaking state to other participants (presence)
          presenceChannelRef.current?.track({
            user_id: user.id,
            username: profile?.username || 'Player',
            avatar: profile?.avatar || '🎮',
            is_speaking: speaking,
            is_muted: false,
          });
        }

        rafRef.current = requestAnimationFrame(detectVoice);
      };

      detectVoice();
      setIsMicEnabled(true);
      onMicToggle?.(true);
    } catch (error) {
      console.error('Microphone access denied:', error);
    }
  }, [gameId, user, profile, onMicToggle]);

  const stopMicrophone = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }

    if (audioContext) {
      audioContext.close();
      setAudioContext(null);
    }

    setIsMicEnabled(false);
    setIsSpeaking(false);
    setMicVolume(0);
    lastSpeakingRef.current = false;

    // Broadcast muted state
    if (user) {
      presenceChannelRef.current?.track({
        user_id: user.id,
        username: profile?.username || 'Player',
        avatar: profile?.avatar || '🎮',
        is_speaking: false,
        is_muted: true,
      });
    }

    onMicToggle?.(false);
  }, [stream, audioContext, user, profile, onMicToggle]);

  const toggleMic = useCallback(() => {
    if (isMicEnabled) {
      stopMicrophone();
    } else {
      startMicrophone();
    }
  }, [isMicEnabled, startMicrophone, stopMicrophone]);

  const toggleSpeaker = useCallback(() => {
    const newState = !isSpeakerEnabled;
    setIsSpeakerEnabled(newState);
    onSpeakerToggle?.(newState);
  }, [isSpeakerEnabled, onSpeakerToggle]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (audioContext) {
        audioContext.close();
      }
    };
  }, []);

  // Use mock participants in test mode, real ones otherwise
  const displaySource = isTestMode ? mockVoiceParticipants : participants;
  const speakingParticipants = displaySource.filter(p => p.is_speaking);
  const displayParticipants = displaySource.slice(0, 6);

  return (
    <div className="bg-card/80 backdrop-blur-sm rounded-xl p-3 border border-border/50">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Radio className={`w-4 h-4 ${isSpeakerEnabled ? 'text-primary animate-pulse' : 'text-muted-foreground'}`} />
          <span className="text-sm font-semibold text-foreground">Voice Room</span>
          <span className="text-xs text-muted-foreground">• {displaySource.length} online</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Speaker toggle */}
          <button
            onClick={toggleSpeaker}
            className={`p-2 rounded-full transition-all ${
              isSpeakerEnabled 
                ? 'bg-muted text-muted-foreground hover:bg-muted/80' 
                : 'bg-destructive/20 text-destructive'
            }`}
            title={isSpeakerEnabled ? 'Mute Others' : 'Unmute Others'}
          >
            {isSpeakerEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Mic toggle */}
          <button
            onClick={toggleMic}
            className={`p-2 rounded-full transition-all ${
              isMicEnabled 
                ? isSpeaking 
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

      {/* Mic volume indicator */}
      {isMicEnabled && (
        <div className="mb-3">
          <div className="h-1 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-75"
              style={{ width: `${micVolume * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Participants */}
      <div className="flex flex-wrap gap-2">
        {displayParticipants.map((participant) => {
          const isMe = participant.user_id === user?.id;
          const speaking = participant.is_speaking || (isMe && isSpeaking);
          
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
                {/* Small speaking indicator dot */}
                {speaking && isSpeakerEnabled && (
                  <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-primary border-2 border-background" />
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
        
        {participants.length > 6 && (
          <div className="flex flex-col items-center gap-1">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
              +{participants.length - 6}
            </div>
            <span className="text-[9px] text-muted-foreground">more</span>
          </div>
        )}

        {participants.length === 0 && (
          <div className="w-full text-center py-2 text-xs text-muted-foreground">
            <Users className="w-4 h-4 mx-auto mb-1 opacity-50" />
            No one in voice yet
          </div>
        )}
      </div>

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
