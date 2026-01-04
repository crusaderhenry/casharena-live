import { useNavigate } from 'react-router-dom';
import { BottomNav } from '@/components/BottomNav';
import { WalletCard } from '@/components/WalletCard';
import { TestControls, useTestMode } from '@/components/TestModeToggle';
import { useWallet } from '@/contexts/WalletContext';
import { useGame } from '@/contexts/GameContext';
import { ChevronLeft, Trophy, Users, Clock, ChevronRight, Shield, Target } from 'lucide-react';
import { useSounds } from '@/hooks/useSounds';
import { useHaptics } from '@/hooks/useHaptics';
import { useState } from 'react';

export const ArenaMain = () => {
  const navigate = useNavigate();
  const { balance, deductFunds } = useWallet();
  const { hasJoinedArena, joinArena, resetArena, addActivity } = useGame();
  const { play } = useSounds();
  const { buttonClick, success } = useHaptics();
  const { isTestMode } = useTestMode();
  const [isTestStarted, setIsTestStarted] = useState(false);

  const handleJoin = () => {
    if (deductFunds(500, 'arena_entry', 'Daily Arena Entry')) {
      joinArena();
      addActivity('Joined Daily Cash Arena', 'arena');
      play('coin');
      success();
      navigate('/arena/challenge');
    }
  };

  const handleTestStart = () => {
    setIsTestStarted(true);
    if (!hasJoinedArena) {
      if (deductFunds(500, 'arena_entry', 'Daily Arena Entry')) {
        joinArena();
        addActivity('Joined Daily Cash Arena', 'arena');
      }
    }
    navigate('/arena/challenge');
  };

  const handleTestEnd = () => {
    navigate('/arena/leaderboard');
  };

  const handleTestReset = () => {
    setIsTestStarted(false);
    resetArena();
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
            className="w-10 h-10 rounded-xl bg-card flex items-center justify-center border border-border/50"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-foreground">Daily Cash Arena</h1>
            <p className="text-sm text-muted-foreground">Fair skill-based challenge</p>
          </div>
        </div>

        <WalletCard compact />

        {/* Fairness Badge */}
        <div className="fairness-badge">
          <Shield className="w-4 h-4" />
          <span>Same challenge for all players. No speed advantage.</span>
        </div>

        {/* Test Controls */}
        <TestControls
          onStart={handleTestStart}
          onEnd={handleTestEnd}
          onReset={handleTestReset}
          isStarted={isTestStarted}
          startLabel="Start Challenge"
          endLabel="View Results"
        />

        {/* Arena Info */}
        <div className="card-premium">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-xl bg-primary/15 flex items-center justify-center glow-primary">
              <Trophy className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-foreground">Today's Challenge</h2>
              <p className="text-sm text-muted-foreground">Randomly selected skill test</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-muted/30 rounded-xl p-3 text-center border border-border/50">
              <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider">Entry</p>
              <p className="font-bold text-primary">₦500</p>
            </div>
            <div className="bg-muted/30 rounded-xl p-3 text-center border border-border/50">
              <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider">Players</p>
              <p className="font-bold text-foreground flex items-center justify-center gap-1">
                <Users className="w-4 h-4 text-primary" /> 847
              </p>
            </div>
            <div className="bg-muted/30 rounded-xl p-3 text-center border border-border/50">
              <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider">Ends</p>
              <p className="font-bold text-secondary flex items-center justify-center gap-1">
                <Clock className="w-4 h-4" /> 14h
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-xl p-5 mb-4 text-center border border-primary/20">
            <p className="text-sm text-muted-foreground mb-2">Prize Pool</p>
            <p className="text-4xl font-black text-money">₦423,500</p>
            <p className="text-xs text-muted-foreground mt-2">Top 50 players share rewards</p>
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

        {/* Challenge Types */}
        <div className="card-premium">
          <h3 className="font-bold text-foreground mb-3 flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Fair Challenge Types
          </h3>
          <p className="text-sm text-muted-foreground mb-3">
            One random challenge is selected for ALL players:
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
              <p className="text-sm font-medium text-foreground">🧮 Math Logic</p>
              <p className="text-xs text-muted-foreground">Quick calculations</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
              <p className="text-sm font-medium text-foreground">🔍 Pattern Match</p>
              <p className="text-xs text-muted-foreground">Find the pattern</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
              <p className="text-sm font-medium text-foreground">🧠 Memory Test</p>
              <p className="text-xs text-muted-foreground">Remember & recall</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
              <p className="text-sm font-medium text-foreground">💡 Reasoning</p>
              <p className="text-xs text-muted-foreground">Logic puzzles</p>
            </div>
          </div>
        </div>

        {/* Leaderboard Preview */}
        <button
          onClick={() => {
            play('click');
            buttonClick();
            navigate('/arena/leaderboard');
          }}
          className="w-full card-premium flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gold/20 flex items-center justify-center">
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
