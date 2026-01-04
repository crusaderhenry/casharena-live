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
      className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${
        isTestMode 
          ? 'border-test text-test' 
          : 'bg-card border-border text-muted-foreground hover:border-test/50'
      }`}
      style={isTestMode ? { 
        boxShadow: '0 0 20px hsl(280 70% 55% / 0.4)',
        background: 'linear-gradient(135deg, hsl(280 70% 55% / 0.2) 0%, hsl(280 70% 40% / 0.1) 100%)'
      } : {}}
    >
      <FlaskConical className="w-4 h-4" />
      <span className="text-xs font-bold">{isTestMode ? 'TEST ON' : 'Test'}</span>
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
  endLabel = 'Force End'
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
      <div className="flex items-center gap-2 text-test font-bold text-sm">
        <FlaskConical className="w-4 h-4" />
        Test Mode Active
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
        </button>
      </div>
    </div>
  );
};
