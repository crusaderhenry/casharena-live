import { createContext, useContext, useState, useCallback, useRef, useEffect, ReactNode } from 'react';

interface AudioSettings {
  musicEnabled: boolean;
  sfxEnabled: boolean;
  commentaryEnabled: boolean;
  volume: number;
}

interface AudioContextType {
  settings: AudioSettings;
  toggleMusic: () => void;
  toggleSfx: () => void;
  toggleCommentary: () => void;
  setVolume: (volume: number) => void;
  playBackgroundMusic: (type: 'lobby' | 'arena' | 'tense') => void;
  stopBackgroundMusic: () => void;
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
  const gainNode = ctx.createGain();
  gainNode.connect(ctx.destination);
  gainNode.gain.value = 0.03;

  // Create low frequency oscillator for ambient hum
  const lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = type === 'tense' ? 55 : type === 'arena' ? 80 : 60;
  
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 0.02;
  
  lfo.connect(lfoGain);
  lfoGain.connect(gainNode);
  
  // Add subtle pulse
  const pulse = ctx.createOscillator();
  pulse.type = 'triangle';
  pulse.frequency.value = type === 'tense' ? 110 : 100;
  
  const pulseGain = ctx.createGain();
  pulseGain.gain.value = 0.01;
  
  pulse.connect(pulseGain);
  pulseGain.connect(gainNode);

  return { 
    start: () => {
      lfo.start();
      pulse.start();
    },
    stop: () => {
      try {
        lfo.stop();
        pulse.stop();
      } catch {}
    },
    gainNode,
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
    };
  });

  const audioContextRef = useRef<AudioContext | null>(null);
  const ambientRef = useRef<ReturnType<typeof createAmbientSound> | null>(null);

  useEffect(() => {
    localStorage.setItem('fortuneshq_audio', JSON.stringify(settings));
  }, [settings]);

  const getContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
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

  const playBackgroundMusic = useCallback((type: 'lobby' | 'arena' | 'tense') => {
    if (!settings.musicEnabled) return;
    
    // Stop existing
    if (ambientRef.current) {
      ambientRef.current.stop();
    }

    const ctx = getContext();
    ambientRef.current = createAmbientSound(ctx, type);
    ambientRef.current.gainNode.gain.value = settings.volume * 0.05;
    ambientRef.current.start();
  }, [settings.musicEnabled, settings.volume, getContext]);

  const stopBackgroundMusic = useCallback(() => {
    if (ambientRef.current) {
      ambientRef.current.stop();
      ambientRef.current = null;
    }
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
    }}>
      {children}
    </AudioContext.Provider>
  );
};
