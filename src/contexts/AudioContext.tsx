import { createContext, useContext, useState, useCallback, useRef, useEffect, ReactNode } from 'react';

export type AmbientMusicStyle = 'chill' | 'intense' | 'retro' | 'none';

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
  playBackgroundMusic: (type: 'lobby' | 'arena' | 'tense', customUrl?: string | null, ambientStyle?: AmbientMusicStyle) => void;
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

// Default music URLs - can be overridden by custom URLs from admin
// These are placeholder URLs that would be stored in Supabase Storage
const DEFAULT_MUSIC = {
  lobby: {
    chill: null as string | null,
    intense: null as string | null,
    retro: null as string | null,
  },
  arena: {
    chill: null as string | null,
    intense: null as string | null,
    retro: null as string | null,
  },
  tense: {
    chill: null as string | null,
    intense: null as string | null,
    retro: null as string | null,
  },
};

// Fetch and cache AI-generated music from ElevenLabs
const fetchGeneratedMusic = async (type: 'lobby' | 'arena' | 'tense', style: AmbientMusicStyle): Promise<string | null> => {
  if (style === 'none') return null;
  
  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-music`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ type, style }),
      }
    );

    if (!response.ok) {
      console.warn('[Audio] Failed to fetch generated music:', response.status);
      return null;
    }

    const data = await response.json();
    
    if (data.useFallback) {
      console.log('[Audio] ElevenLabs not configured, using silent fallback');
      return null;
    }
    
    if (data.audioUrl) {
      console.log('[Audio] Got cached music URL:', data.cached ? 'from cache' : 'freshly generated');
      return data.audioUrl;
    }
    
    if (data.audioContent) {
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
    return saved ? JSON.parse(saved) : {
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

  useEffect(() => {
    localStorage.setItem('fortuneshq_audio', JSON.stringify(settings));
  }, [settings]);

  const toggleMusic = useCallback(() => {
    setSettings(prev => {
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
    setSettings(prev => ({ ...prev, sfxEnabled: !prev.sfxEnabled }));
  }, []);

  const toggleCommentary = useCallback(() => {
    setSettings(prev => ({ ...prev, commentaryEnabled: !prev.commentaryEnabled }));
  }, []);

  const toggleTick = useCallback(() => {
    setSettings(prev => ({ ...prev, tickEnabled: !prev.tickEnabled }));
  }, []);

  const setVolume = useCallback((volume: number) => {
    setSettings(prev => ({ ...prev, volume }));
    if (audioElementRef.current) {
      audioElementRef.current.volume = volume * 0.3;
    }
  }, []);

  const playBackgroundMusic = useCallback(async (type: 'lobby' | 'arena' | 'tense', customUrl?: string | null, ambientStyle?: AmbientMusicStyle) => {
    if (!settings.musicEnabled) {
      console.log('[Audio] Music disabled, not playing');
      return;
    }

    const style = ambientStyle || 'chill';
    
    // If style is 'none', don't play any music
    if (style === 'none' && !customUrl) {
      console.log('[Audio] Music style set to none, not playing');
      return;
    }
    
    console.log('[Audio] Playing background music:', type, customUrl ? '(custom)' : `(generated: ${style})`);
    
    // Stop existing music
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.src = '';
      audioElementRef.current = null;
    }

    // Determine music URL: custom > cached > fetch from API
    let musicUrl = customUrl || null;
    
    if (!musicUrl) {
      const cacheKey = `${type}_${style}`;
      
      // Check local cache first
      if (musicCacheRef.current.has(cacheKey)) {
        musicUrl = musicCacheRef.current.get(cacheKey) || null;
        console.log('[Audio] Using locally cached music for', cacheKey);
      } else {
        // Try to fetch from ElevenLabs API
        console.log('[Audio] Fetching generated music from API...');
        musicUrl = await fetchGeneratedMusic(type, style);
        
        if (musicUrl) {
          musicCacheRef.current.set(cacheKey, musicUrl);
        }
      }
    }

    // Play the music if we have a URL
    if (musicUrl) {
      try {
        const audio = new Audio(musicUrl);
        audio.loop = true;
        audio.volume = settings.volume * 0.3;
        
        audio.onerror = (err) => {
          console.warn('[Audio] Failed to play music:', err);
          audioElementRef.current = null;
        };
        
        await audio.play();
        audioElementRef.current = audio;
        console.log('[Audio] Music playing successfully');
      } catch (err) {
        console.warn('[Audio] Error playing music:', err);
      }
    } else {
      console.log('[Audio] No music URL available, playing in silence');
    }
  }, [settings.musicEnabled, settings.volume]);

  const stopBackgroundMusic = useCallback(() => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.src = '';
      audioElementRef.current = null;
    }
  }, []);

  const toggleHostMute = useCallback(() => {
    setSettings(prev => ({ ...prev, hostMuted: !prev.hostMuted }));
  }, []);

  const toggleVoiceRoomMute = useCallback(() => {
    setSettings(prev => ({ ...prev, voiceRoomMuted: !prev.voiceRoomMuted }));
  }, []);

  const setHostMuted = useCallback((muted: boolean) => {
    setSettings(prev => ({ ...prev, hostMuted: muted }));
  }, []);

  const setVoiceRoomMuted = useCallback((muted: boolean) => {
    setSettings(prev => ({ ...prev, voiceRoomMuted: muted }));
  }, []);

  return (
    <AudioContext.Provider value={{
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
    }}>
      {children}
    </AudioContext.Provider>
  );
};
