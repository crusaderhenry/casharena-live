import { useEffect, useRef } from 'react';
import { Room, RoomEvent, Track, RemoteTrackPublication, RemoteParticipant } from 'livekit-client';
import { useAudio } from '@/contexts/AudioContext';

interface LiveKitAudioPlayerProps {
  room: Room | null;
}

/**
 * Component that handles audio playback for all remote participants in a LiveKit room.
 * Respects the voiceRoomMuted setting from AudioContext.
 */
export const LiveKitAudioPlayer = ({ room }: LiveKitAudioPlayerProps) => {
  const { settings } = useAudio();
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());

  useEffect(() => {
    if (!room) return;

    const handleTrackSubscribed = (
      track: Track,
      publication: RemoteTrackPublication,
      participant: RemoteParticipant
    ) => {
      if (track.kind === Track.Kind.Audio) {
        const audioElement = track.attach();
        audioElement.muted = settings.voiceRoomMuted;
        audioElement.volume = settings.volume;
        audioElementsRef.current.set(participant.identity, audioElement);
        console.log('[LiveKitAudio] Attached audio track for:', participant.identity);
      }
    };

    const handleTrackUnsubscribed = (
      track: Track,
      publication: RemoteTrackPublication,
      participant: RemoteParticipant
    ) => {
      if (track.kind === Track.Kind.Audio) {
        track.detach();
        audioElementsRef.current.delete(participant.identity);
        console.log('[LiveKitAudio] Detached audio track for:', participant.identity);
      }
    };

    room.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);
    room.on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);

    // Attach existing audio tracks
    room.remoteParticipants.forEach((participant) => {
      participant.audioTrackPublications.forEach((publication) => {
        if (publication.track) {
          const audioElement = publication.track.attach();
          audioElement.muted = settings.voiceRoomMuted;
          audioElement.volume = settings.volume;
          audioElementsRef.current.set(participant.identity, audioElement);
        }
      });
    });

    return () => {
      room.off(RoomEvent.TrackSubscribed, handleTrackSubscribed);
      room.off(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);
      
      // Detach all audio elements
      audioElementsRef.current.forEach((_, identity) => {
        room.remoteParticipants.get(identity)?.audioTrackPublications.forEach((pub) => {
          pub.track?.detach();
        });
      });
      audioElementsRef.current.clear();
    };
  }, [room]);

  // Update mute state when voiceRoomMuted changes
  useEffect(() => {
    audioElementsRef.current.forEach((audioElement) => {
      audioElement.muted = settings.voiceRoomMuted;
      audioElement.volume = settings.volume;
    });
  }, [settings.voiceRoomMuted, settings.volume]);

  // This component doesn't render anything visible
  return null;
};
