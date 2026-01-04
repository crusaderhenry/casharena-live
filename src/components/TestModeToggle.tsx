import { useState, createContext, useContext, ReactNode } from 'react';
import { FlaskConical, Play, Square, RotateCcw } from 'lucide-react';
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
          ? 'bg-test/20 border-test text-test' 
          : 'bg-card border-border text-muted-foreground hover:border-test/50'
      }`}
      style={isTestMode ? { boxShadow: '0 0 20px hsl(280 100% 60% / 0.4)' } : {}}
      title={isTestMode ? 'Test Mode: ON' : 'Test Mode: OFF'}
    >
      <FlaskConical className="w-5 h-5" />
    </button>
  );
};

interface TestControlsProps {
  onStart: () => void;
  onEnd: () => void;
  onReset: () => void;
  isStarted?: boolean;
  startLabel?: string;
  endLabel?: string;
}

export const TestControls = ({ 
  onStart, 
  onEnd, 
  onReset, 
  isStarted = false,
  startLabel = 'Start Test',
  endLabel = 'End Test'
}: TestControlsProps) => {
  const { isTestMode } = useTestMode();
  const { play } = useSounds();
  const { buttonClick } = useHaptics();

  if (!isTestMode) return null;

  const handleAction = (action: () => void, sound: 'click' | 'success' = 'click') => {
    action();
    play(sound);
    buttonClick();
  };

  return (
    <div className="test-panel space-y-3">
      <div className="flex items-center gap-2 text-test font-semibold text-sm">
        <FlaskConical className="w-4 h-4" />
        Test Mode Controls
      </div>
      <div className="flex gap-2">
        {!isStarted ? (
          <button
            onClick={() => handleAction(onStart, 'success')}
            className="btn-test flex items-center gap-2 flex-1"
          >
            <Play className="w-4 h-4" />
            {startLabel}
          </button>
        ) : (
          <button
            onClick={() => handleAction(onEnd, 'success')}
            className="btn-test flex items-center gap-2 flex-1"
          >
            <Square className="w-4 h-4" />
            {endLabel}
          </button>
        )}
        <button
          onClick={() => handleAction(onReset)}
          className="btn-test flex items-center gap-2 px-3"
        >
          <RotateCcw className="w-4 h-4" />
          Reset
        </button>
      </div>
    </div>
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
      className="btn-test flex items-center gap-2"
    >
      <Play className="w-4 h-4" />
      {label}
    </button>
  );
};
