import { createContext, useContext, useState, useCallback, useRef, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AudioUnlockBanner } from '@/components/AudioUnlockBanner';

export type AmbientMusicStyle = 'chill' | 'intense' | 'retro' | 'none';

type MusicType = 'lobby' | 'arena' | 'tense';

interface AudioSettings {
  musicEnabled: boolean;
  sfxEnabled: boolean;
  commentaryEnabled: boolean;
  tickEnabled: boolean;
  volume: number;
  hostMuted: boolean;
  voiceRoomMuted: boolean;
}

interface AudioContextType {
  settings: AudioSettings;
  toggleMusic: () => void;
  toggleSfx: () => void;
  toggleCommentary: () => void;
  toggleTick: () => void;
  setVolume: (volume: number) => void;
  playBackgroundMusic: (
    type: MusicType,
    customUrl?: string | null,
    ambientStyle?: AmbientMusicStyle
  ) => void;
  stopBackgroundMusic: () => void;
  toggleHostMute: () => void;
  toggleVoiceRoomMute: () => void;
  setHostMuted: (muted: boolean) => void;
  setVoiceRoomMuted: (muted: boolean) => void;
}

const AudioContext = createContext<AudioContextType | null>(null);

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio must be used within AudioProvider');
  }
  return context;
};

const MUSIC_CACHE_VERSION = 'v2';

const isAudioDebugEnabled = () => {
  try {
    return localStorage.getItem('debug_audio') === '1';
  } catch {
    return false;
  }
};

// Fetch and cache AI-generated music from ElevenLabs
const fetchGeneratedMusic = async (type: MusicType, style: AmbientMusicStyle): Promise<string | null> => {
  if (style === 'none') return null;

  if (isAudioDebugEnabled()) {
    console.log('[AudioDebug] fetchGeneratedMusic request', { type, style });
  }

  try {
    const { data, error } = await supabase.functions.invoke('elevenlabs-music', {
      body: { type, style },
    });

    if (isAudioDebugEnabled()) {
      console.log('[AudioDebug] fetchGeneratedMusic response', {
        useFallback: !!data?.useFallback,
        cached: data?.cached,
        hasAudioUrl: !!data?.audioUrl,
        hasAudioContent: !!data?.audioContent,
        audioContentLength: typeof data?.audioContent === 'string' ? data.audioContent.length : undefined,
      });
    }

    if (error) {
      console.warn('[Audio] Music function error:', error);
      return null;
    }

    if (data?.useFallback) {
      console.log('[Audio] ElevenLabs not configured, using silent fallback');
      return null;
    }

    if (data?.audioUrl) {
      console.log('[Audio] Got cached music URL:', data.cached ? 'from cache' : 'freshly generated');
      return data.audioUrl;
    }

    if (data?.audioContent) {
      console.log('[Audio] Got base64 audio, creating data URI');
      return `data:audio/mpeg;base64,${data.audioContent}`;
    }

    return null;
  } catch (error) {
    console.warn('[Audio] Error fetching generated music:', error);
    return null;
  }
};

export const AudioProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState<AudioSettings>(() => {
    const saved = localStorage.getItem('fortuneshq_audio');
    return saved
      ? JSON.parse(saved)
      : {
          musicEnabled: true,
          sfxEnabled: true,
          commentaryEnabled: true,
          tickEnabled: true,
          volume: 0.5,
          hostMuted: false,
          voiceRoomMuted: false,
        };
  });

  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const musicCacheRef = useRef<Map<string, string>>(new Map());

  const [showUnlockBanner, setShowUnlockBanner] = useState(false);
  const pendingMusicRef = useRef<{ type: MusicType; customUrl?: string | null; style?: AmbientMusicStyle } | null>(null);

  const audioDebugRef = useRef(false);
  const audioDlog = useCallback((...args: unknown[]) => {
    if (!audioDebugRef.current) return;
    console.log('[AudioDebug]', ...args);
  }, []);

  useEffect(() => {
    audioDebugRef.current = isAudioDebugEnabled();
    if (audioDebugRef.current) {
      console.log('[AudioDebug] enabled (set localStorage.debug_audio="0" to disable)');
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('fortuneshq_audio', JSON.stringify(settings));
  }, [settings]);

  const toggleMusic = useCallback(() => {
    setSettings((prev) => {
      const newEnabled = !prev.musicEnabled;
      if (!newEnabled && audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current.src = '';
        audioElementRef.current = null;
      }
      return { ...prev, musicEnabled: newEnabled };
    });
  }, []);

  const toggleSfx = useCallback(() => {
    setSettings((prev) => ({ ...prev, sfxEnabled: !prev.sfxEnabled }));
  }, []);

  const toggleCommentary = useCallback(() => {
    setSettings((prev) => ({ ...prev, commentaryEnabled: !prev.commentaryEnabled }));
  }, []);

  const toggleTick = useCallback(() => {
    setSettings((prev) => ({ ...prev, tickEnabled: !prev.tickEnabled }));
  }, []);

  const setVolume = useCallback((volume: number) => {
    setSettings((prev) => ({ ...prev, volume }));
    if (audioElementRef.current) {
      audioElementRef.current.volume = volume * 0.3;
    }
  }, []);

  const stopBackgroundMusic = useCallback(() => {
    const current = audioElementRef.current;
    if (current) {
      audioDlog('stopBackgroundMusic', {
        src: current.currentSrc,
        paused: current.paused,
        readyState: current.readyState,
      });
      current.pause();
      current.src = '';
      audioElementRef.current = null;
    } else {
      audioDlog('stopBackgroundMusic (no active audio)');
    }
  }, [audioDlog]);

  const playBackgroundMusic = useCallback(
    async (type: MusicType, customUrl?: string | null, ambientStyle?: AmbientMusicStyle) => {
      audioDlog('playBackgroundMusic called', {
        type,
        ambientStyle,
        customUrlPresent: !!customUrl,
        musicEnabled: settings.musicEnabled,
        volume: settings.volume,
      });

      if (!settings.musicEnabled) {
        console.log('[Audio] Music disabled, not playing');
        return;
      }

      const style = ambientStyle || 'chill';

      // If style is 'none', don't play any music
      if (style === 'none' && !customUrl) {
        console.log('[Audio] Music style set to none, not playing');
        audioDlog('aborting: style is none and no customUrl');
        return;
      }

      console.log('[Audio] Playing background music:', type, customUrl ? '(custom)' : `(generated: ${style})`);

      // Stop existing music
      if (audioElementRef.current) {
        audioDlog('stopping existing music before starting new', {
          previousSrc: audioElementRef.current.currentSrc,
        });
        audioElementRef.current.pause();
        audioElementRef.current.src = '';
        audioElementRef.current = null;
      }

      // Determine music URL: custom > cached > fetch from API
      let musicUrl = customUrl || null;

      if (!musicUrl) {
        const cacheKey = `${MUSIC_CACHE_VERSION}_${type}_${style}`;
        audioDlog('resolved cacheKey', cacheKey);

        // Check local cache first
        if (musicCacheRef.current.has(cacheKey)) {
          musicUrl = musicCacheRef.current.get(cacheKey) || null;
          console.log('[Audio] Using locally cached music for', cacheKey);
        } else {
          // Try to fetch from backend function
          console.log('[Audio] Fetching generated music from backend...');
          musicUrl = await fetchGeneratedMusic(type, style);

          audioDlog('fetchGeneratedMusic result', {
            present: !!musicUrl,
            kind: musicUrl?.startsWith('data:') ? 'data-uri' : 'url',
          });

          if (musicUrl) {
            musicCacheRef.current.set(cacheKey, musicUrl);
          }
        }
      }

      // Play the music if we have a URL
      if (musicUrl) {
        const audio = new Audio(musicUrl);
        audio.loop = true;
        audio.volume = settings.volume * 0.3;

        audioDlog('created Audio()', {
          src: musicUrl.startsWith('data:') ? 'data:audio...' : musicUrl,
          volume: audio.volume,
        });

        audio.addEventListener('canplay', () => {
          audioDlog('audio canplay', { src: audio.currentSrc, readyState: audio.readyState });
        });
        audio.addEventListener('playing', () => {
          audioDlog('audio playing', { src: audio.currentSrc, currentTime: audio.currentTime });
        });
        audio.addEventListener('pause', () => {
          audioDlog('audio paused', { src: audio.currentSrc, currentTime: audio.currentTime });
        });
        audio.addEventListener('error', () => {
          audioDlog('audio error event', { src: audio.currentSrc, code: audio.error?.code });
        });

        audio.onerror = () => {
          console.warn('[Audio] Failed to load music', { src: audio.currentSrc, code: audio.error?.code });
          audioElementRef.current = null;
        };

        try {
          await audio.play();
          audioElementRef.current = audio;
          console.log('[Audio] Music playing successfully');
          audioDlog('audio.play resolved');
        } catch (err) {
          const errName = (err as any)?.name;
          if (errName === 'NotAllowedError') {
            console.log('[Audio] Autoplay blocked; waiting for user interaction');
            audioDlog('autoplay blocked; showing unlock banner', { type, style });
            pendingMusicRef.current = { type, customUrl: customUrl ?? null, style };
            setShowUnlockBanner(true);
            return;
          }

          console.warn('[Audio] Error playing music:', err);
          audioDlog('audio.play rejected', { errName });
        }
      } else {
        console.log('[Audio] No music URL available, playing in silence');
        audioDlog('no musicUrl available');
      }
    },
    [settings.musicEnabled, settings.volume, audioDlog]
  );

  const unlockAudio = useCallback(() => {
    audioDlog('unlockAudio clicked', {
      hadPending: !!pendingMusicRef.current,
    });

    setShowUnlockBanner(false);
    const pending = pendingMusicRef.current;
    pendingMusicRef.current = null;
    if (pending) {
      // Runs inside a user gesture from the banner click.
      playBackgroundMusic(pending.type, pending.customUrl, pending.style);
    }
  }, [playBackgroundMusic, audioDlog]);

  const toggleHostMute = useCallback(() => {
    setSettings((prev) => ({ ...prev, hostMuted: !prev.hostMuted }));
  }, []);

  const toggleVoiceRoomMute = useCallback(() => {
    setSettings((prev) => ({ ...prev, voiceRoomMuted: !prev.voiceRoomMuted }));
  }, []);

  const setHostMuted = useCallback((muted: boolean) => {
    setSettings((prev) => ({ ...prev, hostMuted: muted }));
  }, []);

  const setVoiceRoomMuted = useCallback((muted: boolean) => {
    setSettings((prev) => ({ ...prev, voiceRoomMuted: muted }));
  }, []);

  return (
    <AudioContext.Provider
      value={{
        settings,
        toggleMusic,
        toggleSfx,
        toggleCommentary,
        toggleTick,
        setVolume,
        playBackgroundMusic,
        stopBackgroundMusic,
        toggleHostMute,
        toggleVoiceRoomMute,
        setHostMuted,
        setVoiceRoomMuted,
      }}
    >
      {showUnlockBanner && <AudioUnlockBanner onUnlock={unlockAudio} />}
      {children}
    </AudioContext.Provider>
  );
};

