import { useCallback, useRef, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface VoiceState {
  isMicEnabled: boolean;
  isSpeakerEnabled: boolean;
  isConnected: boolean;
  isSpeaking: boolean;
  micVolume: number;
}

export const useRealVoiceChat = (gameId?: string) => {
  const { user, profile } = useAuth();
  const [voiceState, setVoiceState] = useState<VoiceState>({
    isMicEnabled: false,
    isSpeakerEnabled: true,
    isConnected: false,
    isSpeaking: false,
    micVolume: 0,
  });

  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const speakingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize presence channel for voice room
  useEffect(() => {
    if (!gameId || !user) return;

    const channel = supabase.channel(`voice-room-${gameId}`, {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        console.log('Voice room presence:', state);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined voice room:', key, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left voice room:', key, leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: user.id,
            username: profile?.username || 'Player',
            avatar: profile?.avatar || '🎮',
            is_speaking: false,
            is_muted: true,
            online_at: new Date().toISOString(),
          });
          setVoiceState(prev => ({ ...prev, isConnected: true }));
        }
      });

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [gameId, user, profile]);

  // Voice activity detection
  const detectVoiceActivity = useCallback(() => {
    if (!analyserRef.current) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserRef.current.getByteFrequencyData(dataArray);

    // Calculate average volume
    let sum = 0;
    for (let i = 0; i < bufferLength; i++) {
      sum += dataArray[i];
    }
    const average = sum / bufferLength;
    const normalizedVolume = Math.min(average / 128, 1);

    setVoiceState(prev => ({ ...prev, micVolume: normalizedVolume }));

    // Detect speaking (threshold-based)
    const SPEAKING_THRESHOLD = 0.15;
    const isSpeaking = normalizedVolume > SPEAKING_THRESHOLD;

    if (isSpeaking) {
      // Clear any pending timeout
      if (speakingTimeoutRef.current) {
        clearTimeout(speakingTimeoutRef.current);
      }

      if (!voiceState.isSpeaking) {
        setVoiceState(prev => ({ ...prev, isSpeaking: true }));
        // Update presence
        channelRef.current?.track({
          user_id: user?.id,
          username: profile?.username || 'Player',
          avatar: profile?.avatar || '🎮',
          is_speaking: true,
          is_muted: !voiceState.isMicEnabled,
          online_at: new Date().toISOString(),
        });
      }

      // Set timeout to stop speaking after silence
      speakingTimeoutRef.current = setTimeout(() => {
        setVoiceState(prev => ({ ...prev, isSpeaking: false }));
        channelRef.current?.track({
          user_id: user?.id,
          username: profile?.username || 'Player',
          avatar: profile?.avatar || '🎮',
          is_speaking: false,
          is_muted: !voiceState.isMicEnabled,
          online_at: new Date().toISOString(),
        });
      }, 500);
    }

    animationFrameRef.current = requestAnimationFrame(detectVoiceActivity);
  }, [voiceState.isSpeaking, voiceState.isMicEnabled, user, profile]);

  // Start microphone
  const startMicrophone = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 24000,
        },
      });

      streamRef.current = stream;

      // Create audio context for analysis
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 24000,
      });
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;

      source.connect(analyser);

      // Start voice activity detection
      detectVoiceActivity();

      setVoiceState(prev => ({ ...prev, isMicEnabled: true }));

      // Update presence
      channelRef.current?.track({
        user_id: user?.id,
        username: profile?.username || 'Player',
        avatar: profile?.avatar || '🎮',
        is_speaking: false,
        is_muted: false,
        online_at: new Date().toISOString(),
      });

      return true;
    } catch (error) {
      console.error('Error starting microphone:', error);
      return false;
    }
  }, [detectVoiceActivity, user, profile]);

  // Stop microphone
  const stopMicrophone = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    analyserRef.current = null;

    setVoiceState(prev => ({ 
      ...prev, 
      isMicEnabled: false, 
      isSpeaking: false,
      micVolume: 0,
    }));

    // Update presence
    channelRef.current?.track({
      user_id: user?.id,
      username: profile?.username || 'Player',
      avatar: profile?.avatar || '🎮',
      is_speaking: false,
      is_muted: true,
      online_at: new Date().toISOString(),
    });
  }, [user, profile]);

  // Toggle microphone
  const toggleMic = useCallback(async () => {
    if (voiceState.isMicEnabled) {
      stopMicrophone();
    } else {
      await startMicrophone();
    }
  }, [voiceState.isMicEnabled, startMicrophone, stopMicrophone]);

  // Toggle speaker
  const toggleSpeaker = useCallback(() => {
    setVoiceState(prev => ({ ...prev, isSpeakerEnabled: !prev.isSpeakerEnabled }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMicrophone();
      if (speakingTimeoutRef.current) {
        clearTimeout(speakingTimeoutRef.current);
      }
    };
  }, [stopMicrophone]);

  return {
    ...voiceState,
    toggleMic,
    toggleSpeaker,
    startMicrophone,
    stopMicrophone,
  };
};
