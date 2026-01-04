import { useNavigate } from 'react-router-dom';
import { BottomNav } from '@/components/BottomNav';
import { Confetti } from '@/components/Confetti';
import { useGame } from '@/contexts/GameContext';
import { Flame, ChevronRight } from 'lucide-react';

export const StreakTask = () => {
  const navigate = useNavigate();
  const { currentStreak } = useGame();

  const prizes = [0, 0, 300, 600, 1200, 2500, 5000];
  const wonPrize = prizes[currentStreak - 1] || 0;

  return (
    <div className="min-h-screen bg-background pb-24 flex flex-col">
      {wonPrize > 0 && <Confetti />}
      
      <div className="p-4 flex-1 flex flex-col items-center justify-center text-center">
        <div className="w-24 h-24 rounded-full bg-secondary/20 flex items-center justify-center mb-6 animate-bounce-in glow-secondary">
          <Flame className="w-12 h-12 text-secondary" />
        </div>
        
        <h1 className="text-3xl font-bold text-foreground mb-2 animate-slide-up">
          Day {currentStreak} Complete! 🔥
        </h1>
        
        <p className="text-lg text-muted-foreground mb-8 animate-fade-in">
          Your streak is on fire!
        </p>
        
        {wonPrize > 0 && (
          <div className="bg-secondary/10 rounded-2xl p-6 border border-secondary/30 mb-8 animate-scale-in">
            <p className="text-sm text-muted-foreground mb-2">You earned</p>
            <p className="text-4xl font-bold text-gold">₦{wonPrize.toLocaleString()}</p>
          </div>
        )}
        
        <div className="w-full space-y-3 animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <div className="bg-card rounded-2xl p-4 border border-border">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Current Streak</span>
              <span className="font-bold text-secondary text-xl">{currentStreak} days</span>
            </div>
          </div>
          
          {currentStreak < 7 && (
            <p className="text-sm text-muted-foreground">
              Come back tomorrow to continue your streak!
            </p>
          )}
          
          <button
            onClick={() => navigate('/streak/dashboard')}
            className="w-full btn-outline flex items-center justify-center gap-2"
          >
            View Dashboard
            <ChevronRight className="w-5 h-5" />
          </button>
          
          <button
            onClick={() => navigate('/home')}
            className="w-full btn-primary"
          >
            Back to Home
          </button>
        </div>
      </div>
      
      <BottomNav />
    </div>
  );
};
