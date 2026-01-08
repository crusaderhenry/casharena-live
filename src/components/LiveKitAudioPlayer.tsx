import { useEffect, useRef } from 'react';
import { Room, RoomEvent, Track, RemoteTrackPublication, RemoteParticipant } from 'livekit-client';
import { useAudio } from '@/contexts/AudioContext';

interface LiveKitAudioPlayerProps {
  room: Room | null;
}

/**
 * Handles audio playback for all remote participants in a LiveKit room.
 *
 * Important: For reliable playback across browsers, we attach audio elements to the DOM
 * (hidden container) and call play() when unmuted.
 */
export const LiveKitAudioPlayer = ({ room }: LiveKitAudioPlayerProps) => {
  const { settings } = useAudio();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());

  const attachAudio = (participantIdentity: string, track: Track) => {
    if (!containerRef.current) return;
    if (track.kind !== Track.Kind.Audio) return;

    // LiveKit returns an element already wired to the MediaStreamTrack
    const el = track.attach() as HTMLAudioElement;
    el.autoplay = true;
    el.muted = settings.voiceRoomMuted;
    el.volume = settings.volume;
    el.setAttribute('playsinline', 'true');

    // Keep it in the DOM to avoid GC + autoplay quirks
    containerRef.current.appendChild(el);

    audioElementsRef.current.set(participantIdentity, el);

    // If not muted, try to start playback (may still be blocked until user gesture)
    if (!settings.voiceRoomMuted) {
      el.play().catch((err) => {
        console.log('[LiveKitAudio] autoplay blocked (will resume on next user gesture):', err);
      });
    }

    console.log('[LiveKitAudio] Attached audio for:', participantIdentity);
  };

  const detachAudio = (participantIdentity: string, track?: Track) => {
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
  };

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

  // Update mute/volume live
  useEffect(() => {
    audioElementsRef.current.forEach((el) => {
      el.muted = settings.voiceRoomMuted;
      el.volume = settings.volume;

      if (!settings.voiceRoomMuted) {
        el.play().catch(() => {});
      }
    });
  }, [settings.voiceRoomMuted, settings.volume]);

  return <div ref={containerRef} className="hidden" />;
};
