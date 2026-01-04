import { useState, createContext, useContext, ReactNode } from 'react';
import { Zap, FlaskConical } from 'lucide-react';
import { useSounds } from '@/hooks/useSounds';
import { useHaptics } from '@/hooks/useHaptics';

interface TestModeContextType {
  isTestMode: boolean;
  toggleTestMode: () => void;
}

const TestModeContext = createContext<TestModeContextType | undefined>(undefined);

export const TestModeProvider = ({ children }: { children: ReactNode }) => {
  const [isTestMode, setIsTestMode] = useState(false);

  const toggleTestMode = () => setIsTestMode(prev => !prev);

  return (
    <TestModeContext.Provider value={{ isTestMode, toggleTestMode }}>
      {children}
    </TestModeContext.Provider>
  );
};

export const useTestMode = () => {
  const context = useContext(TestModeContext);
  if (!context) {
    throw new Error('useTestMode must be used within a TestModeProvider');
  }
  return context;
};

export const TestModeToggle = () => {
  const { isTestMode, toggleTestMode } = useTestMode();
  const { play } = useSounds();
  const { buttonClick } = useHaptics();

  const handleToggle = () => {
    toggleTestMode();
    play(isTestMode ? 'click' : 'success');
    buttonClick();
  };

  return (
    <button
      onClick={handleToggle}
      className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all ${
        isTestMode 
          ? 'bg-primary/20 border-primary text-primary glow-primary' 
          : 'bg-card border-border text-muted-foreground hover:border-primary/50'
      }`}
      title={isTestMode ? 'Test Mode: ON (Skip timers)' : 'Test Mode: OFF'}
    >
      <FlaskConical className="w-5 h-5" />
    </button>
  );
};

export const SkipTimerButton = ({ onSkip, label = 'Start Now' }: { onSkip: () => void; label?: string }) => {
  const { isTestMode } = useTestMode();
  const { play } = useSounds();
  const { buttonClick } = useHaptics();

  if (!isTestMode) return null;

  const handleSkip = () => {
    onSkip();
    play('success');
    buttonClick();
  };

  return (
    <button
      onClick={handleSkip}
      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/20 border border-primary text-primary text-sm font-medium transition-all hover:bg-primary/30 animate-pulse"
    >
      <Zap className="w-4 h-4" />
      {label}
    </button>
  );
};
