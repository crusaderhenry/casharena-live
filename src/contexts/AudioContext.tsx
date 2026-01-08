import { createContext, useContext, useState, useCallback, useRef, useEffect, ReactNode } from 'react';

interface AudioSettings {
  musicEnabled: boolean;
  sfxEnabled: boolean;
  commentaryEnabled: boolean;
  volume: number;
  hostMuted: boolean;
  voiceRoomMuted: boolean;
}

interface AudioContextType {
  settings: AudioSettings;
  toggleMusic: () => void;
  toggleSfx: () => void;
  toggleCommentary: () => void;
  setVolume: (volume: number) => void;
  playBackgroundMusic: (type: 'lobby' | 'arena' | 'tense', customUrl?: string | null) => void;
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

// Ambient sound generators using Web Audio API
const createAmbientSound = (ctx: AudioContext, type: 'lobby' | 'arena' | 'tense') => {
  const masterGain = ctx.createGain();
  masterGain.connect(ctx.destination);
  masterGain.gain.value = 0.15; // Increased master volume

  // Create low frequency oscillator for ambient hum
  const lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = type === 'tense' ? 55 : type === 'arena' ? 80 : 60;
  
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 0.4; // Increased from 0.02
  
  lfo.connect(lfoGain);
  lfoGain.connect(masterGain);
  
  // Add subtle pulse
  const pulse = ctx.createOscillator();
  pulse.type = 'triangle';
  pulse.frequency.value = type === 'tense' ? 110 : 100;
  
  const pulseGain = ctx.createGain();
  pulseGain.gain.value = 0.2; // Increased from 0.01
  
  pulse.connect(pulseGain);
  pulseGain.connect(masterGain);

  // Add a third layer for richer sound
  const pad = ctx.createOscillator();
  pad.type = 'sine';
  pad.frequency.value = type === 'tense' ? 220 : type === 'arena' ? 160 : 120;
  
  const padGain = ctx.createGain();
  padGain.gain.value = 0.1;
  
  pad.connect(padGain);
  padGain.connect(masterGain);

  return { 
    start: () => {
      lfo.start();
      pulse.start();
      pad.start();
      console.log('[Audio] Ambient sound started:', type);
    },
    stop: () => {
      try {
        lfo.stop();
        pulse.stop();
        pad.stop();
        console.log('[Audio] Ambient sound stopped');
      } catch {}
    },
    gainNode: masterGain,
  };
};

export const AudioProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState<AudioSettings>(() => {
    const saved = localStorage.getItem('fortuneshq_audio');
    return saved ? JSON.parse(saved) : {
      musicEnabled: true,
      sfxEnabled: true,
      commentaryEnabled: true,
      volume: 0.5,
      hostMuted: false,
      voiceRoomMuted: false,
    };
  });

  const audioContextRef = useRef<AudioContext | null>(null);
  const ambientRef = useRef<ReturnType<typeof createAmbientSound> | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    localStorage.setItem('fortuneshq_audio', JSON.stringify(settings));
  }, [settings]);

  const getContext = useCallback(() => {
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    // Resume if suspended (requires user interaction)
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    return audioContextRef.current;
  }, []);

  const toggleMusic = useCallback(() => {
    setSettings(prev => {
      const newEnabled = !prev.musicEnabled;
      if (!newEnabled && ambientRef.current) {
        ambientRef.current.stop();
        ambientRef.current = null;
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

  const setVolume = useCallback((volume: number) => {
    setSettings(prev => ({ ...prev, volume }));
    if (ambientRef.current) {
      ambientRef.current.gainNode.gain.value = volume * 0.05;
    }
  }, []);

  const playBackgroundMusic = useCallback((type: 'lobby' | 'arena' | 'tense', customUrl?: string | null) => {
    if (!settings.musicEnabled) {
      console.log('[Audio] Music disabled, not playing');
      return;
    }
    
    console.log('[Audio] Playing background music:', type, customUrl ? '(custom)' : '(generated)');
    
    // Stop existing music (both generated and uploaded)
    if (ambientRef.current) {
      ambientRef.current.stop();
      ambientRef.current = null;
    }
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.src = '';
      audioElementRef.current = null;
    }

    // If custom URL provided, play uploaded audio file
    if (customUrl) {
      try {
        const audio = new Audio(customUrl);
        audio.loop = true;
        audio.volume = settings.volume * 0.3;
        audio.play().catch(err => {
          console.warn('[Audio] Failed to play custom music:', err);
          // Fallback to generated audio
          const ctx = getContext();
          ambientRef.current = createAmbientSound(ctx, type);
          ambientRef.current.gainNode.gain.value = settings.volume * 0.15;
          ambientRef.current.start();
        });
        audioElementRef.current = audio;
        return;
      } catch (err) {
        console.warn('[Audio] Error loading custom music, falling back to generated:', err);
      }
    }

    // Use generated ambient sounds
    const ctx = getContext();
    ambientRef.current = createAmbientSound(ctx, type);
    ambientRef.current.gainNode.gain.value = settings.volume * 0.15;
    ambientRef.current.start();
  }, [settings.musicEnabled, settings.volume, getContext]);

  const stopBackgroundMusic = useCallback(() => {
    if (ambientRef.current) {
      ambientRef.current.stop();
      ambientRef.current = null;
    }
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
