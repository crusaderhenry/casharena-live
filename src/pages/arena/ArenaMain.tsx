import { useNavigate } from 'react-router-dom';
import { BottomNav } from '@/components/BottomNav';
import { WalletCard } from '@/components/WalletCard';
import { SkipTimerButton, useTestMode } from '@/components/TestModeToggle';
import { useWallet } from '@/contexts/WalletContext';
import { useGame } from '@/contexts/GameContext';
import { ChevronLeft, Trophy, Users, Clock, ChevronRight } from 'lucide-react';
import { useSounds } from '@/hooks/useSounds';
import { useHaptics } from '@/hooks/useHaptics';

export const ArenaMain = () => {
  const navigate = useNavigate();
  const { balance, deductFunds } = useWallet();
  const { hasJoinedArena, joinArena, addActivity } = useGame();
  const { play } = useSounds();
  const { buttonClick, success } = useHaptics();
  const { isTestMode } = useTestMode();

  const handleJoin = () => {
    if (deductFunds(500, 'arena_entry', 'Daily Arena Entry')) {
      joinArena();
      addActivity('Joined Daily Cash Arena', 'arena');
      play('coin');
      success();
      navigate('/arena/challenge');
    }
  };

  const handleSkip = () => {
    if (!hasJoinedArena) {
      if (deductFunds(500, 'arena_entry', 'Daily Arena Entry')) {
        joinArena();
        addActivity('Joined Daily Cash Arena', 'arena');
      }
    }
    navigate('/arena/challenge');
  };

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
            <h1 className="text-xl font-bold text-foreground">Daily Cash Arena</h1>
            <p className="text-sm text-muted-foreground">Skill-based challenge</p>
          </div>
        </div>

        <WalletCard compact />

        {/* Arena Info */}
        <div className="card-game">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center">
              <Trophy className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-foreground">Today's Challenge</h2>
              <p className="text-sm text-muted-foreground">Test your skills, climb the ranks</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-muted/50 rounded-xl p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">Entry</p>
              <p className="font-bold text-primary">₦500</p>
            </div>
            <div className="bg-muted/50 rounded-xl p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">Players</p>
              <p className="font-bold text-foreground flex items-center justify-center gap-1">
                <Users className="w-4 h-4" /> 847
              </p>
            </div>
            <div className="bg-muted/50 rounded-xl p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">Ends</p>
              <p className="font-bold text-secondary flex items-center justify-center gap-1">
                <Clock className="w-4 h-4" /> 14h
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-xl p-4 mb-4">
            <p className="text-sm text-muted-foreground mb-2">Prize Pool</p>
            <p className="text-3xl font-bold text-money">₦423,500</p>
            <p className="text-xs text-muted-foreground mt-1">Top 50 players share rewards</p>
            {isTestMode && (
              <div className="mt-3">
                <SkipTimerButton onSkip={handleSkip} label="Start Challenge Now" />
              </div>
            )}
          </div>

          {hasJoinedArena ? (
            <button
              onClick={() => {
                play('click');
                buttonClick();
                navigate('/arena/challenge');
              }}
              className="w-full btn-primary flex items-center justify-center gap-2"
            >
              Continue Challenge
              <ChevronRight className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={handleJoin}
              disabled={balance < 500}
              className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {balance < 500 ? 'Insufficient Balance' : 'Join Arena - ₦500'}
            </button>
          )}
        </div>

        {/* Leaderboard Preview */}
        <button
          onClick={() => {
            play('click');
            buttonClick();
            navigate('/arena/leaderboard');
          }}
          className="w-full card-game flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold/20 flex items-center justify-center">
              🏆
            </div>
            <div className="text-left">
              <p className="font-bold text-foreground">View Leaderboard</p>
              <p className="text-sm text-muted-foreground">See top players</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>
      
      <BottomNav />
    </div>
  );
};
