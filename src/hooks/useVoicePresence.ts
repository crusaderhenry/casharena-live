import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface VoiceParticipant {
  id: string;
  user_id: string;
  game_id: string;
  is_speaking: boolean;
  is_muted: boolean;
  joined_at: string;
  last_active_at: string;
  profile?: {
    username: string;
    avatar: string;
  };
}

export const useVoicePresence = (gameId?: string) => {
  const { user, profile } = useAuth();
  const [participants, setParticipants] = useState<VoiceParticipant[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [myParticipantId, setMyParticipantId] = useState<string | null>(null);

  // Fetch participants
  const fetchParticipants = useCallback(async () => {
    if (!gameId) return;

    const { data, error } = await supabase
      .from('voice_room_participants')
      .select('*')
      .eq('game_id', gameId);

    if (error) {
      console.error('Error fetching voice participants:', error);
      return;
    }

    // Fetch profiles for all participants
    const userIds = [...new Set(data.map(p => p.user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, avatar')
      .in('id', userIds);

    const profileMap = new Map(profiles?.map(p => [p.id, { username: p.username, avatar: p.avatar }]) || []);

    const participantsWithProfiles = data.map(p => ({
      ...p,
      last_active_at: (p as any).last_active_at || p.joined_at,
      profile: profileMap.get(p.user_id),
    }));

    setParticipants(participantsWithProfiles);

    // Check if user is already connected
    const myEntry = data.find(p => p.user_id === user?.id);
    if (myEntry) {
      setMyParticipantId(myEntry.id);
      setIsConnected(true);
      setIsMuted(myEntry.is_muted || true);
      setIsSpeaking(myEntry.is_speaking || false);
    }
  }, [gameId, user?.id]);

  // Join voice room
  const joinVoiceRoom = useCallback(async () => {
    if (!gameId || !user) return false;

    try {
      // Check if already joined
      const { data: existing } = await supabase
        .from('voice_room_participants')
        .select('id')
        .eq('game_id', gameId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        setMyParticipantId(existing.id);
        setIsConnected(true);
        return true;
      }

      const { data, error } = await supabase
        .from('voice_room_participants')
        .insert({
          game_id: gameId,
          user_id: user.id,
          is_muted: true,
          is_speaking: false,
        })
        .select()
        .single();

      if (error) throw error;

      setMyParticipantId(data.id);
      setIsConnected(true);
      setIsMuted(true);
      return true;
    } catch (error) {
      console.error('Error joining voice room:', error);
      return false;
    }
  }, [gameId, user]);

  // Leave voice room
  const leaveVoiceRoom = useCallback(async () => {
    if (!myParticipantId) return;

    try {
      await supabase
        .from('voice_room_participants')
        .delete()
        .eq('id', myParticipantId);

      setMyParticipantId(null);
      setIsConnected(false);
      setIsMuted(true);
      setIsSpeaking(false);
    } catch (error) {
      console.error('Error leaving voice room:', error);
    }
  }, [myParticipantId]);

  // Toggle mute
  const toggleMute = useCallback(async () => {
    if (!myParticipantId) return;

    const newMutedState = !isMuted;

    try {
      await supabase
        .from('voice_room_participants')
        .update({ is_muted: newMutedState, is_speaking: false })
        .eq('id', myParticipantId);

      setIsMuted(newMutedState);
      if (newMutedState) setIsSpeaking(false);
    } catch (error) {
      console.error('Error toggling mute:', error);
    }
  }, [myParticipantId, isMuted]);

  // Update speaking state
  const setSpeakingState = useCallback(async (speaking: boolean) => {
    if (!myParticipantId || isMuted) return;

    try {
      await supabase
        .from('voice_room_participants')
        .update({ 
          is_speaking: speaking,
          last_active_at: new Date().toISOString(),
        })
        .eq('id', myParticipantId);

      setIsSpeaking(speaking);
    } catch (error) {
      console.error('Error updating speaking state:', error);
    }
  }, [myParticipantId, isMuted]);

  // Initial fetch
  useEffect(() => {
    fetchParticipants();
  }, [fetchParticipants]);

  // Real-time subscription
  useEffect(() => {
    if (!gameId) return;

    const channel = supabase
      .channel(`voice-room-${gameId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'voice_room_participants',
          filter: `game_id=eq.${gameId}`,
        },
        async (payload) => {
          console.log('Voice room update:', payload);
          
          if (payload.eventType === 'INSERT') {
            const newParticipant = payload.new as any;
            
            // Fetch profile
            const { data: profileData } = await supabase
              .from('profiles')
              .select('username, avatar')
              .eq('id', newParticipant.user_id)
              .single();

            setParticipants(prev => [
              ...prev,
              {
                ...newParticipant,
                last_active_at: newParticipant.last_active_at || newParticipant.joined_at,
                profile: profileData || undefined,
              },
            ]);
          } else if (payload.eventType === 'UPDATE') {
            setParticipants(prev =>
              prev.map(p =>
                p.id === payload.new.id
                  ? { ...p, ...(payload.new as any) }
                  : p
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setParticipants(prev =>
              prev.filter(p => p.id !== (payload.old as any).id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (myParticipantId && isConnected) {
        // Leave voice room when component unmounts
        supabase
          .from('voice_room_participants')
          .delete()
          .eq('id', myParticipantId)
          .then(() => console.log('Left voice room on cleanup'));
      }
    };
  }, [myParticipantId, isConnected]);

  // Heartbeat to update last_active_at
  useEffect(() => {
    if (!myParticipantId || !isConnected) return;

    const heartbeat = setInterval(async () => {
      // Just update the is_speaking to keep alive - last_active_at will be handled by trigger
      await supabase
        .from('voice_room_participants')
        .update({ is_speaking: isSpeaking })
        .eq('id', myParticipantId);
    }, 30000); // Every 30 seconds

    return () => clearInterval(heartbeat);
  }, [myParticipantId, isConnected]);

  return {
    participants,
    isConnected,
    isMuted,
    isSpeaking,
    joinVoiceRoom,
    leaveVoiceRoom,
    toggleMute,
    setSpeakingState,
    speakingParticipants: participants.filter(p => p.is_speaking),
    mutedParticipants: participants.filter(p => p.is_muted),
    activeParticipants: participants.filter(p => !p.is_muted),
  };
};