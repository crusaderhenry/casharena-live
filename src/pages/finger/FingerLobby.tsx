import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BottomNav } from '@/components/BottomNav';
import { TestControls } from '@/components/TestControls';
import { useGame, mockPlayers } from '@/contexts/GameContext';
import { ChevronLeft, Zap, Lock, Users } from 'lucide-react';

export const FingerLobby = () => {
  const navigate = useNavigate();
  const { isTestMode, resetFingerGame } = useGame();
  const [countdown, setCountdown] = useState(60);
  const [entryClosed, setEntryClosed] = useState(false);

  const poolValue = mockPlayers.length * 700;

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 10 && !entryClosed) {
          setEntryClosed(true);
        }
        if (prev <= 0) {
          clearInterval(timer);
          navigate('/finger/arena');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [navigate, entryClosed]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleTestStart = () => {
    navigate('/finger/arena');
  };

  const handleTestReset = () => {
    resetFingerGame();
    setCountdown(60);
    setEntryClosed(false);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 pt-2">
          <button 
            onClick={() => navigate('/finger')}
            className="w-10 h-10 rounded-xl bg-card flex items-center justify-center border border-border/50"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">Fastest Finger Lobby</h1>
            <p className="text-sm text-muted-foreground">Waiting for game to start</p>
          </div>
        </div>

        {/* Test Controls */}
        <TestControls
          onStart={handleTestStart}
          onReset={handleTestReset}
          startLabel="Start Game Now"
        />

        {/* Countdown */}
        <div className={`card-game text-center ${entryClosed ? 'border-destructive/50' : 'glow-primary'}`}>
          <div className="relative z-10">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Zap className={`w-6 h-6 ${entryClosed ? 'text-destructive' : 'text-primary'}`} />
              <span className="text-sm text-muted-foreground font-medium">
                {entryClosed ? 'Entry Closed' : 'Game Starts In'}
              </span>
            </div>
            <p className={`timer-display ${entryClosed ? 'text-destructive' : ''}`}>
              {formatTime(countdown)}
            </p>
            {entryClosed && (
              <div className="flex items-center justify-center gap-2 mt-3 text-destructive">
                <Lock className="w-4 h-4" />
                <span className="text-sm font-bold">No more entries</span>
              </div>
            )}
          </div>
        </div>

        {/* Pool Info */}
        <div className="grid grid-cols-2 gap-3">
          <div className="card-panel text-center">
            <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider">Participants</p>
            <p className="text-2xl font-black text-foreground flex items-center justify-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              {mockPlayers.length}
            </p>
          </div>
          <div className="card-panel text-center">
            <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider">Total Pool</p>
            <p className="text-2xl font-black text-primary">₦{poolValue.toLocaleString()}</p>
          </div>
        </div>

        {/* Participants */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Players in Lobby
          </h3>
          <div className="grid grid-cols-4 gap-3">
            {mockPlayers.map((player, index) => (
              <div key={index} className="flex flex-col items-center animate-scale-in" style={{ animationDelay: `${index * 30}ms` }}>
                <div className="w-12 h-12 rounded-full bg-card-elevated flex items-center justify-center text-xl border border-border/50">
                  {player.avatar}
                </div>
                <p className="text-xs mt-1.5 truncate w-full text-center font-medium text-muted-foreground">
                  {player.name.split(' ')[0]}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Tips */}
        <div className="card-panel border-primary/30 bg-primary/5">
          <h3 className="font-bold text-foreground mb-2 flex items-center gap-2">
            💡 Pro Tips
          </h3>
          <ul className="text-sm text-muted-foreground space-y-1.5">
            <li>• Keep your finger ready on the send button</li>
            <li>• Short messages are faster to type</li>
            <li>• Watch the timer - strike at the last second!</li>
          </ul>
        </div>
      </div>
      
      <BottomNav />
    </div>
  );
};
