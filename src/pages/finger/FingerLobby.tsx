import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BottomNav } from '@/components/BottomNav';
import { TestControls } from '@/components/TestControls';
import { CrusaderHost } from '@/components/CrusaderHost';
import { useGame, mockPlayers } from '@/contexts/GameContext';
import { useCrusader } from '@/hooks/useCrusader';
import { useAudio } from '@/contexts/AudioContext';
import { useSounds } from '@/hooks/useSounds';
import { useHaptics } from '@/hooks/useHaptics';
import { ChevronLeft, Zap, Lock, Users } from 'lucide-react';

const CRUSADER_LOBBY_MESSAGES = [
  "What's good everyone! Get ready for some ACTION! 🔥",
  "Yo! The energy in here is ELECTRIC! Let's GO!",
  "Welcome legends! Your boy Crusader is hyped!",
  "Fingers ready, minds sharp - this is gonna be WILD!",
];

export const FingerLobby = () => {
  const navigate = useNavigate();
  const { isTestMode, resetFingerGame } = useGame();
  const crusader = useCrusader();
  const { playBackgroundMusic, stopBackgroundMusic } = useAudio();
  const { play } = useSounds();
  const { buttonClick } = useHaptics();
  const [countdown, setCountdown] = useState(60);
  const [entryClosed, setEntryClosed] = useState(false);
  const [crusaderMessage, setCrusaderMessage] = useState(CRUSADER_LOBBY_MESSAGES[0]);

  const poolValue = mockPlayers.length * 700;

  // Start lobby music and Crusader welcome
  useEffect(() => {
    playBackgroundMusic('lobby');
    crusader.welcomeLobby();
    
    // Rotate Crusader messages
    const messageInterval = setInterval(() => {
      setCrusaderMessage(CRUSADER_LOBBY_MESSAGES[Math.floor(Math.random() * CRUSADER_LOBBY_MESSAGES.length)]);
    }, 8000);

    return () => {
      stopBackgroundMusic();
      clearInterval(messageInterval);
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 10 && !entryClosed) {
          setEntryClosed(true);
          play('countdown');
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
  }, [navigate, entryClosed, play]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleTestStart = () => {
    play('click');
    buttonClick();
    navigate('/finger/arena');
  };

  const handleTestReset = () => {
    resetFingerGame();
    setCountdown(60);
    setEntryClosed(false);
  };

  const handleBack = () => {
    play('click');
    buttonClick();
    navigate('/finger');
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 pt-2">
          <button 
            onClick={handleBack}
            className="w-10 h-10 rounded-xl bg-card flex items-center justify-center border border-border/50"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">Fastest Finger Lobby</h1>
            <p className="text-sm text-muted-foreground">Waiting for game to start</p>
          </div>
        </div>

        {/* Crusader Host */}
        <CrusaderHost isLive message={crusaderMessage} />

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
            <p className={`timer-display ${entryClosed ? 'text-destructive' : ''} ${countdown <= 10 ? 'animate-pulse' : ''}`}>
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
            💡 Pro Tips from Crusader
          </h3>
          <ul className="text-sm text-muted-foreground space-y-1.5">
            <li>• Keep your finger ready on the send button</li>
            <li>• Short messages are faster to type</li>
            <li>• Watch the timer - strike at the last second!</li>
            <li>• Stay calm when others are spamming!</li>
          </ul>
        </div>
      </div>
      
      <BottomNav />
    </div>
  );
};
