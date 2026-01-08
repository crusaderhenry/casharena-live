import { useEffect, useRef, useCallback } from 'react';
import { Room, RoomEvent, Track, RemoteTrackPublication, RemoteParticipant } from 'livekit-client';
import { useAudio } from '@/contexts/AudioContext';

interface LiveKitAudioPlayerProps {
  room: Room | null;
}

/**
 * Handles audio playback for all remote participants in a LiveKit room.
 * Designed for Twitter Spaces-like real-time audio with proper autoplay handling.
 */
export const LiveKitAudioPlayer = ({ room }: LiveKitAudioPlayerProps) => {
  const { settings } = useAudio();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const audioContextRef = useRef<AudioContext | null>(null);
  const hasUserInteractedRef = useRef(false);

  // Initialize audio context on first user interaction (Twitter Spaces style)
  const initAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    hasUserInteractedRef.current = true;
    
    // Resume all existing audio elements
    audioElementsRef.current.forEach((el) => {
      if (!settings.voiceRoomMuted && el.paused) {
        el.play().catch(() => {});
      }
    });
  }, [settings.voiceRoomMuted]);

  // Listen for user interactions to unlock audio
  useEffect(() => {
    const unlockAudio = () => {
      initAudioContext();
      // Clean up after first interaction
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
      document.removeEventListener('keydown', unlockAudio);
    };
    
    document.addEventListener('click', unlockAudio);
    document.addEventListener('touchstart', unlockAudio);
    document.addEventListener('keydown', unlockAudio);
    
    return () => {
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
      document.removeEventListener('keydown', unlockAudio);
    };
  }, [initAudioContext]);

  const attachAudio = useCallback((participantIdentity: string, track: Track) => {
    if (!containerRef.current) return;
    if (track.kind !== Track.Kind.Audio) return;

    // Remove existing element if any
    const existing = audioElementsRef.current.get(participantIdentity);
    if (existing) {
      existing.remove();
      audioElementsRef.current.delete(participantIdentity);
    }

    // LiveKit returns an element already wired to the MediaStreamTrack
    const el = track.attach() as HTMLAudioElement;
    el.autoplay = true;
    el.muted = false; // Never mute the element itself, we control volume
    el.volume = settings.voiceRoomMuted ? 0 : settings.volume;
    el.setAttribute('playsinline', 'true');
    el.setAttribute('data-participant', participantIdentity);

    // Keep it in the DOM to avoid GC + autoplay quirks
    containerRef.current.appendChild(el);
    audioElementsRef.current.set(participantIdentity, el);

    // Attempt playback - this will work if user has interacted
    const playPromise = el.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.log('[LiveKitAudio] autoplay blocked, waiting for user interaction:', participantIdentity);
      });
    }

    console.log('[LiveKitAudio] Attached audio for:', participantIdentity);
  }, [settings.voiceRoomMuted, settings.volume]);

  const detachAudio = useCallback((participantIdentity: string, track?: Track) => {
    const existing = audioElementsRef.current.get(participantIdentity);
    if (existing) {
      try {
        existing.pause();
        existing.srcObject = null;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room]);

  // Update volume live (use volume 0 instead of muted to maintain stream connection)
  useEffect(() => {
    audioElementsRef.current.forEach((el) => {
      el.volume = settings.voiceRoomMuted ? 0 : settings.volume;
      
      // Ensure playback is active
      if (el.paused && hasUserInteractedRef.current) {
        el.play().catch(() => {});
      }
    });
  }, [settings.voiceRoomMuted, settings.volume]);

  // Cleanup audio context on unmount
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  return <div ref={containerRef} className="hidden" />;
};
