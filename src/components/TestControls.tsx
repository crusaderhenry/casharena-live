import { Play, Square, RotateCcw, FlaskConical } from 'lucide-react';
import { useGame } from '@/contexts/GameContext';

interface TestControlsProps {
  onStart?: () => void;
  onEnd?: () => void;
  onReset?: () => void;
  startLabel?: string;
  endLabel?: string;
}

export const TestControls = ({
  onStart,
  onEnd,
  onReset,
  startLabel = 'Start Test',
  endLabel = 'Force End',
}: TestControlsProps) => {
  const { isTestMode } = useGame();

  if (!isTestMode) return null;

  return (
    <div className="test-panel space-y-3">
      <div className="flex items-center gap-2 text-sm font-bold" style={{ color: 'hsl(280 100% 70%)' }}>
        <FlaskConical className="w-4 h-4" />
        Test Mode Active
      </div>
      <div className="flex flex-wrap gap-2">
        {onStart && (
          <button onClick={onStart} className="btn-test flex items-center gap-2">
            <Play className="w-4 h-4" />
            {startLabel}
          </button>
        )}
        {onEnd && (
          <button onClick={onEnd} className="btn-test flex items-center gap-2">
            <Square className="w-4 h-4" />
            {endLabel}
          </button>
        )}
        {onReset && (
          <button onClick={onReset} className="btn-test flex items-center gap-2">
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
        )}
      </div>
    </div>
  );
};

export const TestModeToggle = () => {
  const { isTestMode, setTestMode } = useGame();

  return (
    <button
      onClick={() => setTestMode(!isTestMode)}
      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
        isTestMode 
          ? 'bg-purple-500/20 text-purple-400' 
          : 'bg-muted text-muted-foreground hover:text-foreground'
      }`}
      title={isTestMode ? 'Disable Test Mode' : 'Enable Test Mode'}
    >
      <FlaskConical className="w-5 h-5" />
    </button>
  );
};
