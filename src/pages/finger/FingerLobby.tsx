import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { BottomNav } from '@/components/BottomNav';
import { TestControls } from '@/components/TestControls';
import { CrusaderHost } from '@/components/CrusaderHost';
import { MicCheckModal } from '@/components/MicCheckModal';
import { useGame } from '@/contexts/GameContext';
import { useLiveGame } from '@/hooks/useLiveGame';
import { useGameTimer } from '@/hooks/useServerTime';
import { useCrusader } from '@/hooks/useCrusader';
import { useAudio } from '@/contexts/AudioContext';
import { useSounds } from '@/hooks/useSounds';
import { useHaptics } from '@/hooks/useHaptics';
import { ChevronLeft, Zap, Lock, Users, Mic, Wifi, WifiOff } from 'lucide-react';

const CRUSADER_LOBBY_MESSAGES = [
  "What's good everyone! Get ready for some ACTION! 🔥",
  "Yo! The energy in here is ELECTRIC! Let's GO!",
  "Welcome legends! Your boy Crusader is hyped!",
  "Fingers ready, minds sharp - this is gonna be WILD!",
];

export const FingerLobby = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const preferLobby = Boolean((location.state as any)?.preferLobby);

  const { isTestMode, resetFingerGame } = useGame();
  const { game, participants, loading } = useLiveGame();
  const { lobbyCountdown, synced } = useGameTimer(game);
  const crusader = useCrusader();
  const { playBackgroundMusic, stopBackgroundMusic } = useAudio();
  const { play } = useSounds();
  const { buttonClick } = useHaptics();
  
  const [entryClosed, setEntryClosed] = useState(false);
  const [crusaderMessage, setCrusaderMessage] = useState(CRUSADER_LOBBY_MESSAGES[0]);
  const [showMicCheck, setShowMicCheck] = useState(false);
  const [micCheckComplete, setMicCheckComplete] = useState(false);

  // Use server-synced countdown
  const countdown = lobbyCountdown;

  // Check entry closed state
  useEffect(() => {
    if (countdown <= 10 && !entryClosed) {
      setEntryClosed(true);
      play('countdown');
    }
    
    // Reset entry closed if countdown goes back up (game reset)
    if (countdown > 10) {
      setEntryClosed(false);
    }
  }, [countdown, entryClosed, play]);

  // Handle navigation when countdown ends
  useEffect(() => {
    if (countdown <= 0 && game?.status !== 'ended') {
      // Small delay to ensure server has updated
      const timeout = setTimeout(() => {
        if (!(preferLobby && game?.status === 'live')) {
          navigate('/finger/arena');
        }
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [countdown, game?.status, preferLobby, navigate]);

  // Redirect if game is ended
  useEffect(() => {
    if (game?.status === 'ended') {
      navigate('/finger/results');
      return;
    }

    if (game?.status === 'live' && !preferLobby) {
      navigate('/finger/arena');
    }
  }, [game?.status, preferLobby, navigate]);

  // Start lobby music and Crusader welcome
  useEffect(() => {
    playBackgroundMusic('lobby');
    crusader.welcomeLobby();
    
    // Show mic check if not done before
    const micCheckDone = sessionStorage.getItem('micCheckComplete');
    if (!micCheckDone) {
      setTimeout(() => setShowMicCheck(true), 1500);
    } else {
      setMicCheckComplete(true);
    }
    
    // Rotate Crusader messages
    const messageInterval = setInterval(() => {
      setCrusaderMessage(CRUSADER_LOBBY_MESSAGES[Math.floor(Math.random() * CRUSADER_LOBBY_MESSAGES.length)]);
    }, 8000);

    return () => {
      stopBackgroundMusic();
      clearInterval(messageInterval);
    };
  }, []);

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
    setEntryClosed(false);
  };

  const handleBack = () => {
    play('click');
    buttonClick();
    navigate('/finger');
  };

  const handleMicCheckComplete = () => {
    setMicCheckComplete(true);
    sessionStorage.setItem('micCheckComplete', 'true');
  };

  const poolValue = game?.pool_value || 0;
  const playerCount = participants.length || game?.participant_count || 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading lobby...</p>
        </div>
      </div>
    );
  }

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
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              {synced ? (
                <>
                  <Wifi className="w-3 h-3 text-green-500" />
                  <span>Synced</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3 text-yellow-500" />
                  <span>Syncing...</span>
                </>
              )}
            </p>
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
              {playerCount}
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
            {participants.slice(0, 12).map((participant, index) => (
              <div key={participant.id} className="flex flex-col items-center animate-scale-in" style={{ animationDelay: `${index * 30}ms` }}>
                <div className="w-12 h-12 rounded-full bg-card-elevated flex items-center justify-center text-xl border border-border/50">
                  {participant.profile?.avatar || '🎮'}
                </div>
                <p className="text-xs mt-1.5 truncate w-full text-center font-medium text-muted-foreground">
                  {participant.profile?.username?.split(' ')[0] || 'Player'}
                </p>
              </div>
            ))}
            {playerCount > 12 && (
              <div className="flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-sm border border-border/50">
                  +{playerCount - 12}
                </div>
                <p className="text-xs mt-1.5 text-muted-foreground">more</p>
              </div>
            )}
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

        {/* Mic Check Button */}
        {!micCheckComplete && (
          <button
            onClick={() => setShowMicCheck(true)}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-primary/10 border border-primary/30 text-primary font-medium transition-all hover:bg-primary/20"
          >
            <Mic className="w-4 h-4" />
            Test Your Microphone
          </button>
        )}
        
        {micCheckComplete && (
          <div className="flex items-center justify-center gap-2 py-2 text-sm text-primary">
            <Mic className="w-4 h-4" />
            <span>Mic ready!</span>
            <button 
              onClick={() => setShowMicCheck(true)}
              className="text-muted-foreground hover:text-primary underline"
            >
              Test again
            </button>
          </div>
        )}
      </div>
      
      <BottomNav />

      {/* Mic Check Modal */}
      <MicCheckModal 
        open={showMicCheck}
        onOpenChange={setShowMicCheck}
        onComplete={handleMicCheckComplete}
      />
    </div>
  );
};