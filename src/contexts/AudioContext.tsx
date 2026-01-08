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

// Ambient sound generators using Web Audio API with different styles
const createAmbientSound = (ctx: AudioContext, type: 'lobby' | 'arena' | 'tense', style: AmbientMusicStyle = 'chill') => {
  const masterGain = ctx.createGain();
  masterGain.connect(ctx.destination);
  masterGain.gain.value = 0.15;

  const oscillators: OscillatorNode[] = [];
  const gains: GainNode[] = [];

  // Style-specific configurations
  const styleConfigs = {
    chill: {
      lfoFreq: type === 'tense' ? 55 : type === 'arena' ? 65 : 50,
      lfoType: 'sine' as OscillatorType,
      lfoGain: 0.3,
      pulseFreq: type === 'tense' ? 82.5 : 75,
      pulseType: 'sine' as OscillatorType,
      pulseGain: 0.15,
      padFreq: type === 'tense' ? 165 : type === 'arena' ? 130 : 100,
      padType: 'sine' as OscillatorType,
      padGain: 0.1,
      // Extra warm layer for chill
      extraFreq: type === 'arena' ? 196 : 147,
      extraType: 'sine' as OscillatorType,
      extraGain: 0.08,
    },
    intense: {
      lfoFreq: type === 'tense' ? 73 : type === 'arena' ? 110 : 82,
      lfoType: 'sawtooth' as OscillatorType,
      lfoGain: 0.5,
      pulseFreq: type === 'tense' ? 146 : 130,
      pulseType: 'square' as OscillatorType,
      pulseGain: 0.25,
      padFreq: type === 'tense' ? 293 : type === 'arena' ? 220 : 165,
      padType: 'triangle' as OscillatorType,
      padGain: 0.15,
      // Aggressive sub bass for intense
      extraFreq: type === 'tense' ? 36 : 30,
      extraType: 'sine' as OscillatorType,
      extraGain: 0.4,
    },
    retro: {
      lfoFreq: type === 'tense' ? 65 : type === 'arena' ? 87 : 73,
      lfoType: 'square' as OscillatorType,
      lfoGain: 0.2,
      pulseFreq: type === 'tense' ? 130 : 110,
      pulseType: 'square' as OscillatorType,
      pulseGain: 0.15,
      padFreq: type === 'tense' ? 260 : type === 'arena' ? 175 : 146,
      padType: 'triangle' as OscillatorType,
      padGain: 0.12,
      // 8-bit arpeggio layer for retro
      extraFreq: type === 'arena' ? 440 : 330,
      extraType: 'square' as OscillatorType,
      extraGain: 0.06,
    },
  };

  const config = styleConfigs[style === 'none' ? 'chill' : style];

  // LFO layer
  const lfo = ctx.createOscillator();
  lfo.type = config.lfoType;
  lfo.frequency.value = config.lfoFreq;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = config.lfoGain;
  lfo.connect(lfoGain);
  lfoGain.connect(masterGain);
  oscillators.push(lfo);
  gains.push(lfoGain);

  // Pulse layer
  const pulse = ctx.createOscillator();
  pulse.type = config.pulseType;
  pulse.frequency.value = config.pulseFreq;
  const pulseGain = ctx.createGain();
  pulseGain.gain.value = config.pulseGain;
  pulse.connect(pulseGain);
  pulseGain.connect(masterGain);
  oscillators.push(pulse);
  gains.push(pulseGain);

  // Pad layer
  const pad = ctx.createOscillator();
  pad.type = config.padType;
  pad.frequency.value = config.padFreq;
  const padGain = ctx.createGain();
  padGain.gain.value = config.padGain;
  pad.connect(padGain);
  padGain.connect(masterGain);
  oscillators.push(pad);
  gains.push(padGain);

  // Extra layer (style-specific)
  const extra = ctx.createOscillator();
  extra.type = config.extraType;
  extra.frequency.value = config.extraFreq;
  const extraGain = ctx.createGain();
  extraGain.gain.value = config.extraGain;
  extra.connect(extraGain);
  extraGain.connect(masterGain);
  oscillators.push(extra);
  gains.push(extraGain);

  return { 
    start: () => {
      oscillators.forEach(osc => osc.start());
      console.log('[Audio] Ambient sound started:', type, 'style:', style);
    },
    stop: () => {
      try {
        oscillators.forEach(osc => osc.stop());
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
      tickEnabled: true,
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

  const toggleTick = useCallback(() => {
    setSettings(prev => ({ ...prev, tickEnabled: !prev.tickEnabled }));
  }, []);

  const setVolume = useCallback((volume: number) => {
    setSettings(prev => ({ ...prev, volume }));
    if (ambientRef.current) {
      ambientRef.current.gainNode.gain.value = volume * 0.05;
    }
  }, []);

  const playBackgroundMusic = useCallback((type: 'lobby' | 'arena' | 'tense', customUrl?: string | null, ambientStyle?: AmbientMusicStyle) => {
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
          // Fallback to generated audio with style
          const ctx = getContext();
          ambientRef.current = createAmbientSound(ctx, type, style);
          ambientRef.current.gainNode.gain.value = settings.volume * 0.15;
          ambientRef.current.start();
        });
        audioElementRef.current = audio;
        return;
      } catch (err) {
        console.warn('[Audio] Error loading custom music, falling back to generated:', err);
      }
    }

    // Use generated ambient sounds with style
    const ctx = getContext();
    ambientRef.current = createAmbientSound(ctx, type, style);
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
