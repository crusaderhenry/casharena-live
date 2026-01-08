import { useEffect, useRef, useState, useCallback } from 'react';
import { Room, RoomEvent, Track, RemoteTrackPublication, RemoteParticipant } from 'livekit-client';
import { useAudio } from '@/contexts/AudioContext';
import { Volume2 } from 'lucide-react';

interface LiveKitAudioPlayerProps {
  room: Room | null;
  onAutoplayBlocked?: (blocked: boolean) => void;
}

/**
 * Handles audio playback for all remote participants in a LiveKit room.
 * Reports autoplay blocked state so parent can show unlock UI.
 */
export const LiveKitAudioPlayer = ({ room, onAutoplayBlocked }: LiveKitAudioPlayerProps) => {
  const { settings } = useAudio();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);

  const tryPlay = useCallback((el: HTMLAudioElement): Promise<boolean> => {
    return el.play()
      .then(() => {
        setAutoplayBlocked(false);
        onAutoplayBlocked?.(false);
        return true;
      })
      .catch(() => {
        setAutoplayBlocked(true);
        onAutoplayBlocked?.(true);
        return false;
      });
  }, [onAutoplayBlocked]);

  const attachAudio = useCallback((participantIdentity: string, track: Track) => {
    if (!containerRef.current) return;
    if (track.kind !== Track.Kind.Audio) return;

    // LiveKit returns an element already wired to the MediaStreamTrack
    const el = track.attach() as HTMLAudioElement;
    el.autoplay = true;
    el.muted = settings.voiceRoomMuted;
    el.volume = settings.volume;
    el.setAttribute('playsinline', 'true');
    el.setAttribute('data-participant', participantIdentity);

    // Keep it in the DOM to avoid GC + autoplay quirks
    containerRef.current.appendChild(el);
    audioElementsRef.current.set(participantIdentity, el);

    // If not muted, try to start playback
    if (!settings.voiceRoomMuted) {
      tryPlay(el);
    }

    console.log('[LiveKitAudio] Attached audio for:', participantIdentity);
  }, [settings.voiceRoomMuted, settings.volume, tryPlay]);

  const detachAudio = useCallback((participantIdentity: string, track?: Track) => {
    const existing = audioElementsRef.current.get(participantIdentity);
    if (existing) {
      try {
        existing.pause();
      } catch {}
      existing.remove();
      audioElementsRef.current.delete(participantIdentity);
    }

    // Also let LiveKit clean up its attached elements
    if (track && track.kind === Track.Kind.Audio) {
      track.detach();
    }

    console.log('[LiveKitAudio] Detached audio for:', participantIdentity);
  }, []);

  // Unlock all audio elements (called from parent after user gesture)
  const unlockAudio = useCallback(() => {
    audioElementsRef.current.forEach((el) => {
      if (!settings.voiceRoomMuted) {
        tryPlay(el);
      }
    });
  }, [settings.voiceRoomMuted, tryPlay]);

  // Expose unlock function via ref on container
  useEffect(() => {
    if (containerRef.current) {
      (containerRef.current as any).unlockAudio = unlockAudio;
    }
  }, [unlockAudio]);

  useEffect(() => {
    if (!room) return;

    const handleTrackSubscribed = (
      track: Track,
      publication: RemoteTrackPublication,
      participant: RemoteParticipant
    ) => {
      attachAudio(participant.identity, track);
    };

    const handleTrackUnsubscribed = (
      track: Track,
      publication: RemoteTrackPublication,
      participant: RemoteParticipant
    ) => {
      detachAudio(participant.identity, track);
    };

    room.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);
    room.on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);

    // Attach already-subscribed tracks
    room.remoteParticipants.forEach((participant) => {
      participant.audioTrackPublications.forEach((publication) => {
        if (publication.track) {
          attachAudio(participant.identity, publication.track);
        }
      });
    });

    return () => {
      room.off(RoomEvent.TrackSubscribed, handleTrackSubscribed);
      room.off(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);

      // Cleanup everything
      audioElementsRef.current.forEach((_, identity) => detachAudio(identity));
      audioElementsRef.current.clear();
    };
  }, [room, attachAudio, detachAudio]);

  // Update mute/volume live
  useEffect(() => {
    audioElementsRef.current.forEach((el) => {
      el.muted = settings.voiceRoomMuted;
      el.volume = settings.volume;

      if (!settings.voiceRoomMuted) {
        tryPlay(el);
      }
    });
  }, [settings.voiceRoomMuted, settings.volume, tryPlay]);

  return <div ref={containerRef} className="hidden" />;
};

// Hook to get per-user audio controls
export const useParticipantAudio = () => {
  const [mutedUsers, setMutedUsers] = useState<Set<string>>(new Set());
  const [userVolumes, setUserVolumes] = useState<Map<string, number>>(new Map());

  const muteUser = useCallback((participantId: string) => {
    setMutedUsers(prev => new Set(prev).add(participantId));
    // Find and mute the audio element
    const el = document.querySelector(`audio[data-participant="${participantId}"]`) as HTMLAudioElement;
    if (el) el.muted = true;
  }, []);

  const unmuteUser = useCallback((participantId: string) => {
    setMutedUsers(prev => {
      const next = new Set(prev);
      next.delete(participantId);
      return next;
    });
    const el = document.querySelector(`audio[data-participant="${participantId}"]`) as HTMLAudioElement;
    if (el) el.muted = false;
  }, []);

  const toggleUserMute = useCallback((participantId: string) => {
    if (mutedUsers.has(participantId)) {
      unmuteUser(participantId);
    } else {
      muteUser(participantId);
    }
  }, [mutedUsers, muteUser, unmuteUser]);

  const setUserVolume = useCallback((participantId: string, volume: number) => {
    setUserVolumes(prev => new Map(prev).set(participantId, volume));
    const el = document.querySelector(`audio[data-participant="${participantId}"]`) as HTMLAudioElement;
    if (el) el.volume = volume;
  }, []);

  const isUserMuted = useCallback((participantId: string) => {
    return mutedUsers.has(participantId);
  }, [mutedUsers]);

  const getUserVolume = useCallback((participantId: string) => {
    return userVolumes.get(participantId) ?? 1;
  }, [userVolumes]);

  return {
    muteUser,
    unmuteUser,
    toggleUserMute,
    setUserVolume,
    isUserMuted,
    getUserVolume,
    mutedUsers
  };
};
