import { useNavigate } from 'react-router-dom';
import { BottomNav } from '@/components/BottomNav';
import { WalletCard } from '@/components/WalletCard';
import { SkipTimerButton, useTestMode } from '@/components/TestModeToggle';
import { useWallet } from '@/contexts/WalletContext';
import { useGame } from '@/contexts/GameContext';
import { ChevronLeft, Flame, Calendar, Trophy, ChevronRight } from 'lucide-react';
import { useSounds } from '@/hooks/useSounds';
import { useHaptics } from '@/hooks/useHaptics';

export const StreakMain = () => {
  const navigate = useNavigate();
  const { balance, deductFunds } = useWallet();
  const { hasJoinedStreak, currentStreak, streakCompleted, joinStreak, addActivity } = useGame();
  const { play } = useSounds();
  const { buttonClick, success } = useHaptics();
  const { isTestMode } = useTestMode();

  const handleJoin = () => {
    if (deductFunds(300, 'streak_entry', 'Streak Entry')) {
      joinStreak();
      addActivity('Started Streak to Win challenge', 'streak');
      play('coin');
      success();
      navigate('/streak/dashboard');
    }
  };

  const handleSkip = () => {
    if (!hasJoinedStreak) {
      if (deductFunds(300, 'streak_entry', 'Streak Entry')) {
        joinStreak();
        addActivity('Started Streak to Win challenge', 'streak');
      }
    }
    navigate('/streak/task');
  };

  const streakDays = [1, 2, 3, 4, 5, 6, 7];
  const prizes = [0, 0, 300, 600, 1200, 2500, 5000];

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 pt-2">
          <button 
            onClick={() => {
              play('click');
              buttonClick();
              navigate('/home');
            }}
            className="w-10 h-10 rounded-xl bg-card flex items-center justify-center"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-foreground">Streak to Win</h1>
            <p className="text-sm text-muted-foreground">Daily consistency wins</p>
          </div>
        </div>

        <WalletCard compact />

        {/* Streak Info */}
        <div className="card-game">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-xl bg-secondary/20 flex items-center justify-center">
              <Flame className="w-7 h-7 text-secondary" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-foreground">7-Day Challenge</h2>
              <p className="text-sm text-muted-foreground">Complete tasks daily to win big</p>
            </div>
          </div>

          <div className="bg-muted/30 rounded-xl p-4 mb-4">
            <p className="text-sm text-muted-foreground mb-2">How it works:</p>
            <ul className="text-sm text-foreground space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-secondary">•</span>
                Pay ₦300 entry fee
              </li>
              <li className="flex items-start gap-2">
                <span className="text-secondary">•</span>
                Complete one task daily for 7 days
              </li>
              <li className="flex items-start gap-2">
                <span className="text-secondary">•</span>
                Missing a day ends your streak
              </li>
              <li className="flex items-start gap-2">
                <span className="text-secondary">•</span>
                Prizes increase each completed day
              </li>
            </ul>
            {isTestMode && (
              <div className="mt-3">
                <SkipTimerButton onSkip={handleSkip} label="Start Task Now" />
              </div>
            )}
          </div>

          {/* Streak Progress */}
          <div className="flex justify-between mb-6">
            {streakDays.map((day, index) => (
              <div key={day} className="flex flex-col items-center">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  index < currentStreak
                    ? 'bg-secondary text-secondary-foreground'
                    : index === currentStreak && hasJoinedStreak
                      ? 'bg-secondary/30 border-2 border-secondary text-secondary animate-pulse'
                      : 'bg-muted text-muted-foreground'
                }`}>
                  {index < currentStreak ? '✓' : day}
                </div>
                <span className="text-[10px] text-muted-foreground mt-1">
                  {prizes[index] > 0 ? `₦${prizes[index]}` : '-'}
                </span>
              </div>
            ))}
          </div>

          {hasJoinedStreak ? (
            <button
              onClick={() => {
                play('click');
                buttonClick();
                navigate('/streak/dashboard');
              }}
              className="w-full btn-secondary flex items-center justify-center gap-2"
            >
              {streakCompleted ? 'View Progress' : 'Complete Today\'s Task'}
              <ChevronRight className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={handleJoin}
              disabled={balance < 300}
              className="w-full btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {balance < 300 ? 'Insufficient Balance' : 'Start Streak - ₦300'}
            </button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="card-game text-center">
            <Calendar className="w-6 h-6 text-secondary mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">{currentStreak}</p>
            <p className="text-xs text-muted-foreground">Current Streak</p>
          </div>
          <div className="card-game text-center">
            <Trophy className="w-6 h-6 text-gold mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">₦5,000</p>
            <p className="text-xs text-muted-foreground">Day 7 Prize</p>
          </div>
        </div>
      </div>
      
      <BottomNav />
    </div>
  );
};
