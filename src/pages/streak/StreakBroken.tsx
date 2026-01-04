import { useNavigate } from 'react-router-dom';
import { BottomNav } from '@/components/BottomNav';
import { useGame } from '@/contexts/GameContext';
import { AlertTriangle } from 'lucide-react';

export const StreakBroken = () => {
  const navigate = useNavigate();
  const { breakStreak } = useGame();

  const handleRestart = () => {
    breakStreak();
    navigate('/streak');
  };

  return (
    <div className="min-h-screen bg-background pb-24 flex flex-col">
      <div className="p-4 flex-1 flex flex-col items-center justify-center text-center">
        <div className="w-24 h-24 rounded-full bg-destructive/20 flex items-center justify-center mb-6 animate-bounce-in">
          <AlertTriangle className="w-12 h-12 text-destructive" />
        </div>
        
        <h1 className="text-3xl font-bold text-foreground mb-2 animate-slide-up">
          Streak Broken 😢
        </h1>
        
        <p className="text-lg text-muted-foreground mb-8 animate-fade-in">
          You missed a day and lost your streak.
        </p>
        
        <div className="bg-card rounded-2xl p-6 border border-border mb-8 animate-scale-in">
          <p className="text-muted-foreground mb-2">Don't give up!</p>
          <p className="text-sm text-muted-foreground">
            Start a new streak and aim for the full 7 days this time.
          </p>
        </div>
        
        <div className="w-full space-y-3 animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <button
            onClick={handleRestart}
            className="w-full btn-primary"
          >
            Start New Streak
          </button>
          
          <button
            onClick={() => navigate('/home')}
            className="w-full btn-outline"
          >
            Back to Home
          </button>
        </div>
      </div>
      
      <BottomNav />
    </div>
  );
};
