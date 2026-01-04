import { useNavigate } from 'react-router-dom';
import { BottomNav } from '@/components/BottomNav';
import { useWallet } from '@/contexts/WalletContext';
import { useGame } from '@/contexts/GameContext';
import { ChevronLeft, Flame, Check, Lock } from 'lucide-react';

export const StreakDashboard = () => {
  const navigate = useNavigate();
  const { addWinnings } = useWallet();
  const { currentStreak, streakCompleted, completeStreakTask, addActivity } = useGame();

  const prizes = [0, 0, 300, 600, 1200, 2500, 5000];
  const tasks = [
    'Watch a 30-second video',
    'Answer a trivia question',
    'Share with a friend',
    'Complete a mini puzzle',
    'Rate your experience',
    'Predict the winner',
    'Final challenge quiz',
  ];

  const handleCompleteTask = () => {
    const prize = prizes[currentStreak];
    completeStreakTask();
    addActivity(`Completed Day ${currentStreak + 1} streak task`, 'streak');
    
    if (prize > 0) {
      addWinnings(prize, 'streak_win', `Streak Day ${currentStreak + 1} Reward`);
      addActivity(`Won ₦${prize.toLocaleString()} streak reward!`, 'streak');
    }
    
    navigate('/streak/task');
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 pt-2">
          <button 
            onClick={() => navigate('/streak')}
            className="w-10 h-10 rounded-xl bg-card flex items-center justify-center"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">Streak Dashboard</h1>
            <p className="text-sm text-muted-foreground">Your daily progress</p>
          </div>
          <div className="flex items-center gap-2 bg-secondary/20 px-3 py-2 rounded-xl">
            <Flame className="w-5 h-5 text-secondary" />
            <span className="font-bold text-secondary">{currentStreak}</span>
          </div>
        </div>

        {/* Today's Task */}
        {!streakCompleted && currentStreak < 7 && (
          <div className="card-game border-secondary/50 glow-secondary">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-secondary/20 flex items-center justify-center text-2xl">
                🎯
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Day {currentStreak + 1} Task</p>
                <p className="font-bold text-foreground">{tasks[currentStreak]}</p>
              </div>
            </div>
            
            {prizes[currentStreak] > 0 && (
              <div className="bg-secondary/10 rounded-xl p-3 mb-4">
                <p className="text-sm text-center">
                  Complete to earn <span className="font-bold text-secondary">₦{prizes[currentStreak].toLocaleString()}</span>
                </p>
              </div>
            )}
            
            <button
              onClick={handleCompleteTask}
              className="w-full btn-secondary"
            >
              Complete Task
            </button>
          </div>
        )}

        {streakCompleted && currentStreak < 7 && (
          <div className="card-game border-primary/50">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                <Check className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="font-bold text-foreground">Day {currentStreak} Completed!</p>
                <p className="text-sm text-muted-foreground">Come back tomorrow for Day {currentStreak + 1}</p>
              </div>
            </div>
          </div>
        )}

        {currentStreak >= 7 && (
          <div className="card-game border-gold/50 text-center py-8">
            <div className="text-5xl mb-4">🏆</div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Streak Complete!</h2>
            <p className="text-muted-foreground">You've conquered the 7-day challenge!</p>
            <p className="text-lg font-bold text-money mt-4">Total Earned: ₦9,600</p>
          </div>
        )}

        {/* Days Overview */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Your Journey
          </h3>
          {tasks.map((task, index) => {
            const isCompleted = index < currentStreak;
            const isCurrent = index === currentStreak && !streakCompleted;
            const isLocked = index > currentStreak;
            
            return (
              <div
                key={index}
                className={`card-game flex items-center gap-3 py-3 ${
                  isCurrent ? 'border-secondary/50' : ''
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  isCompleted 
                    ? 'bg-primary/20' 
                    : isCurrent 
                      ? 'bg-secondary/20' 
                      : 'bg-muted'
                }`}>
                  {isCompleted ? (
                    <Check className="w-5 h-5 text-primary" />
                  ) : isLocked ? (
                    <Lock className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <span className="font-bold text-secondary">{index + 1}</span>
                  )}
                </div>
                <div className="flex-1">
                  <p className={`font-medium ${isLocked ? 'text-muted-foreground' : 'text-foreground'}`}>
                    Day {index + 1}
                  </p>
                  <p className="text-xs text-muted-foreground">{task}</p>
                </div>
                {prizes[index] > 0 && (
                  <span className={`text-sm font-bold ${isCompleted ? 'text-primary' : 'text-muted-foreground'}`}>
                    ₦{prizes[index].toLocaleString()}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
      
      <BottomNav />
    </div>
  );
};
