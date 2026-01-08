import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Room,
  RoomEvent,
  LocalParticipant,
  RemoteParticipant,
  Track,
  ConnectionState,
  Participant,
  LocalTrackPublication,
  RemoteTrackPublication
} from 'livekit-client';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface VoiceParticipant {
  user_id: string;
  username: string;
  avatar: string;
  is_speaking: boolean;
  is_muted: boolean;
}

interface UseLiveKitVoiceReturn {
  room: Room | null;
  participants: VoiceParticipant[];
  isConnected: boolean;
  isConnecting: boolean;
  isMicEnabled: boolean;
  connectionError: string | null;
  toggleMic: () => Promise<void>;
  connect: () => Promise<void>;
  disconnect: () => void;
}

export const useLiveKitVoice = (gameId?: string): UseLiveKitVoiceReturn => {
  const { user, profile } = useAuth();
  const [room, setRoom] = useState<Room | null>(null);
  const [participants, setParticipants] = useState<VoiceParticipant[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMicEnabled, setIsMicEnabled] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const roomRef = useRef<Room | null>(null);

  // Update participants list from room state
  const updateParticipants = useCallback((currentRoom: Room) => {
    const allParticipants: VoiceParticipant[] = [];

    // Add local participant
    const local = currentRoom.localParticipant;
    if (local) {
      let avatar = '🎮';
      try {
        const meta = JSON.parse(local.metadata || '{}');
        avatar = meta.avatar || '🎮';
      } catch {}
      
      allParticipants.push({
        user_id: local.identity,
        username: local.name || 'You',
        avatar,
        is_speaking: local.isSpeaking,
        is_muted: !local.isMicrophoneEnabled
      });
    }

    // Add remote participants
    currentRoom.remoteParticipants.forEach((participant) => {
      let avatar = '🎮';
      try {
        const meta = JSON.parse(participant.metadata || '{}');
        avatar = meta.avatar || '🎮';
      } catch {}

      allParticipants.push({
        user_id: participant.identity,
        username: participant.name || 'Player',
        avatar,
        is_speaking: participant.isSpeaking,
        is_muted: !participant.isMicrophoneEnabled
      });
    });

    setParticipants(allParticipants);
  }, []);

  // Connect to LiveKit room
  const connect = useCallback(async () => {
    if (!gameId || !user) {
      console.log('[LiveKit] Missing gameId or user, cannot connect');
      return;
    }

    if (roomRef.current?.state === ConnectionState.Connected) {
      console.log('[LiveKit] Already connected');
      return;
    }

    setIsConnecting(true);
    setConnectionError(null);

    try {
      // Get token from edge function
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      if (!accessToken) {
        throw new Error('Not authenticated');
      }

      const response = await supabase.functions.invoke('livekit-token', {
        body: { roomName: gameId }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to get token');
      }

      const { token, url } = response.data;

      console.log('[LiveKit] Got token, connecting to room:', gameId);

      // Create and connect to room
      const newRoom = new Room({
        adaptiveStream: true,
        dynacast: true,
        audioCaptureDefaults: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      // Set up event handlers
      newRoom.on(RoomEvent.Connected, () => {
        console.log('[LiveKit] Connected to room');
        setIsConnected(true);
        setIsConnecting(false);
        updateParticipants(newRoom);
      });

      newRoom.on(RoomEvent.Disconnected, () => {
        console.log('[LiveKit] Disconnected from room');
        setIsConnected(false);
        setIsMicEnabled(false);
        setParticipants([]);
      });

      newRoom.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
        console.log('[LiveKit] Participant connected:', participant.identity);
        updateParticipants(newRoom);
      });

      newRoom.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
        console.log('[LiveKit] Participant disconnected:', participant.identity);
        updateParticipants(newRoom);
      });

      newRoom.on(RoomEvent.ActiveSpeakersChanged, (speakers: Participant[]) => {
        updateParticipants(newRoom);
      });

      newRoom.on(RoomEvent.TrackMuted, () => {
        updateParticipants(newRoom);
      });

      newRoom.on(RoomEvent.TrackUnmuted, () => {
        updateParticipants(newRoom);
      });

      newRoom.on(RoomEvent.LocalTrackPublished, () => {
        setIsMicEnabled(newRoom.localParticipant.isMicrophoneEnabled);
        updateParticipants(newRoom);
      });

      newRoom.on(RoomEvent.LocalTrackUnpublished, () => {
        setIsMicEnabled(newRoom.localParticipant.isMicrophoneEnabled);
        updateParticipants(newRoom);
      });

      newRoom.on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
        console.log('[LiveKit] Connection state:', state);
        if (state === ConnectionState.Disconnected) {
          setIsConnected(false);
        }
      });

      // Connect to the room
      await newRoom.connect(url, token);
      
      roomRef.current = newRoom;
      setRoom(newRoom);

    } catch (error) {
      console.error('[LiveKit] Connection error:', error);
      setConnectionError(error instanceof Error ? error.message : 'Connection failed');
      setIsConnecting(false);
    }
  }, [gameId, user, updateParticipants]);

  // Disconnect from room
  const disconnect = useCallback(() => {
    if (roomRef.current) {
      console.log('[LiveKit] Disconnecting from room');
      roomRef.current.disconnect();
      roomRef.current = null;
      setRoom(null);
      setIsConnected(false);
      setIsMicEnabled(false);
      setParticipants([]);
    }
  }, []);

  // Toggle microphone
  const toggleMic = useCallback(async () => {
    if (!roomRef.current) {
      console.log('[LiveKit] No room to toggle mic');
      return;
    }

    try {
      const enabled = roomRef.current.localParticipant.isMicrophoneEnabled;
      await roomRef.current.localParticipant.setMicrophoneEnabled(!enabled);
      setIsMicEnabled(!enabled);
      console.log('[LiveKit] Mic toggled:', !enabled);
    } catch (error) {
      console.error('[LiveKit] Failed to toggle mic:', error);
    }
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (roomRef.current) {
        roomRef.current.disconnect();
        roomRef.current = null;
      }
    };
  }, []);

  // Auto-connect when gameId changes
  useEffect(() => {
    if (gameId && user) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [gameId, user, connect, disconnect]);

  return {
    room,
    participants,
    isConnected,
    isConnecting,
    isMicEnabled,
    connectionError,
    toggleMic,
    connect,
    disconnect
  };
};
