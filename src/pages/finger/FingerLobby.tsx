import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { BottomNav } from '@/components/BottomNav';
import { TestControls } from '@/components/TestControls';
import { CrusaderHost } from '@/components/CrusaderHost';
import { MicCheckModal } from '@/components/MicCheckModal';
import { PrizeDistribution } from '@/components/PrizeDistribution';
import { useGame } from '@/contexts/GameContext';
import { useLiveGame } from '@/hooks/useLiveGame';
import { useGameTimer } from '@/hooks/useServerTime';
import { useCrusader } from '@/hooks/useCrusader';
import { useAudio } from '@/contexts/AudioContext';
import { useSounds } from '@/hooks/useSounds';
import { useHaptics } from '@/hooks/useHaptics';
import { ChevronLeft, Zap, Lock, Users, Mic, Wifi, WifiOff, Calendar, Clock } from 'lucide-react';

const CRUSADER_LOBBY_MESSAGES = [
  "What's good everyone! Get ready for some ACTION! 🔥",
  "Yo! The energy in here is ELECTRIC! Let's GO!",
  "Welcome legends! Your boy Crusader is hyped!",
  "Fingers ready, minds sharp - this is gonna be WILD!",
];

const CRUSADER_HYPE_MESSAGES = [
  "ONE MINUTE TO GO! This is about to be CRAZY! 🔥🔥🔥",
  "GET READY! 60 seconds till we go LIVE!",
  "FINAL COUNTDOWN! May the fastest finger WIN!",
  "HERE WE GO! It's almost TIME!",
];

export const FingerLobby = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const preferLobby = Boolean((location.state as any)?.preferLobby);

  const { isTestMode, resetFingerGame } = useGame();
  const { game, participants, loading } = useLiveGame();
  const { 
    lobbyCountdown, 
    countdownToOpen, 
    countdownToLive, 
    countdownToEnd,
    phase,
    synced 
  } = useGameTimer(game);
  const crusader = useCrusader();
  const { playBackgroundMusic, stopBackgroundMusic } = useAudio();
  const { play } = useSounds();
  const { buttonClick } = useHaptics();
  
  const [entryClosed, setEntryClosed] = useState(false);
  const [crusaderMessage, setCrusaderMessage] = useState('');
  const [showMicCheck, setShowMicCheck] = useState(false);
  const [micCheckComplete, setMicCheckComplete] = useState(false);
  const [hostActive, setHostActive] = useState(false);

  // Determine game state
  const isScheduled = phase === 'scheduled';
  const isOpen = phase === 'open';
  const isLive = phase === 'live';

  // Use appropriate countdown based on phase
  const countdown = isOpen ? countdownToLive : isScheduled ? countdownToOpen : countdownToEnd;

  // Determine if waiting for admin (no scheduled_at)
  const waitingForAdmin = isScheduled && countdownToOpen < 0;

  // Check entry closed state (only for open games)
  useEffect(() => {
    if (!isOpen) return;
    
    if (countdown <= 10 && !entryClosed) {
      setEntryClosed(true);
      play('countdown');
    }
    
    // Reset entry closed if countdown goes back up (game reset)
    if (countdown > 10) {
      setEntryClosed(false);
    }
  }, [countdown, entryClosed, play, isOpen]);

  // Activate host only in last 1 minute (60 seconds) for open games
  useEffect(() => {
    if (!isOpen) return;
    
    if (countdown <= 60 && countdown > 0 && !hostActive) {
      setHostActive(true);
      crusader.welcomeLobby();
      setCrusaderMessage(CRUSADER_HYPE_MESSAGES[Math.floor(Math.random() * CRUSADER_HYPE_MESSAGES.length)]);
    }
  }, [countdown, hostActive, crusader, isOpen]);

  // Handle navigation when countdown ends (for open games)
  useEffect(() => {
    if (!isOpen) return;
    
    if (countdown <= 0 && game?.status !== 'ended') {
      const timeout = setTimeout(() => {
        if (!(preferLobby && game?.status === 'live')) {
          navigate('/finger/arena');
        }
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [countdown, game?.status, preferLobby, navigate, isOpen]);

  // Redirect based on game status changes
  useEffect(() => {
    if (game?.status === 'ended') {
      navigate('/finger/results');
      return;
    }

    // When game transitions from open to live, go to arena
    if (game?.status === 'live') {
      // Small delay to show transition
      const timeout = setTimeout(() => {
        navigate('/finger/arena');
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [game?.status, navigate]);

  // Start lobby music
  useEffect(() => {
    playBackgroundMusic('lobby');
    
    // Show mic check if not done before
    const micCheckDone = sessionStorage.getItem('micCheckComplete');
    if (!micCheckDone) {
      setTimeout(() => setShowMicCheck(true), 1500);
    } else {
      setMicCheckComplete(true);
    }
    
    // Rotate Crusader messages only when host is active
    const messageInterval = setInterval(() => {
      if (hostActive) {
        setCrusaderMessage(CRUSADER_HYPE_MESSAGES[Math.floor(Math.random() * CRUSADER_HYPE_MESSAGES.length)]);
      }
    }, 8000);

    return () => {
      stopBackgroundMusic();
      clearInterval(messageInterval);
    };
  }, [hostActive, playBackgroundMusic, stopBackgroundMusic]);

  const formatTime = (seconds: number) => {
    if (seconds <= 0) return '00:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
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

  // Only show pool for open/live games
  const poolValue = (isOpen || isLive) ? (game?.pool_value || 0) : 0;
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
            <h1 className="text-xl font-bold text-foreground">
              {game?.name || 'Fastest Finger'} Lobby
            </h1>
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

        {/* Scheduled Game - Countdown to Open */}
        {isScheduled && (
          <div className="card-game text-center border-yellow-500/30 bg-yellow-500/5">
            <div className="relative z-10">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Calendar className="w-6 h-6 text-yellow-500" />
                <span className="text-sm text-muted-foreground font-medium">
                  {waitingForAdmin ? 'Waiting for Admin' : 'Opens In'}
                </span>
              </div>
              <p className="timer-display text-yellow-500">
                {waitingForAdmin ? '⏳' : countdownToOpen > 0 ? formatTime(countdownToOpen) : '--:--'}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Entry fee: ₦{game?.entry_fee?.toLocaleString() || 700}
              </p>
              <div className="mt-4 py-3 px-4 rounded-xl bg-muted/30 text-muted-foreground text-sm">
                {waitingForAdmin 
                  ? '🔒 Entries will open once the admin starts this game'
                  : '⏳ Join button will activate when entries open'
                }
              </div>
            </div>
          </div>
        )}

        {/* Crusader Host - Only show when active (last 1 minute) and game is open */}
        {hostActive && isOpen && (
          <CrusaderHost isLive message={crusaderMessage} />
        )}

        {/* Waiting message when host not active and game is open */}
        {!hostActive && isOpen && (
          <div className="card-panel text-center border-primary/20 bg-primary/5">
            <p className="text-sm text-muted-foreground">
              🎙️ Crusader will hype you up in the <strong>last 1 minute</strong> before going live!
            </p>
          </div>
        )}

        {/* Test Controls - Only for open games */}
        {isOpen && (
          <TestControls
            onStart={handleTestStart}
            onReset={handleTestReset}
            startLabel="Start Game Now"
          />
        )}

        {/* Countdown - Only for open games */}
        {isOpen && (
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
        )}

        {/* Pool Info - Only show pool value for open/live games */}
        <div className="grid grid-cols-2 gap-3">
          <div className="card-panel text-center">
            <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider">
              {isOpen || isLive ? 'Participants' : 'Entry Fee'}
            </p>
            {isOpen || isLive ? (
              <p className="text-2xl font-black text-foreground flex items-center justify-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                {playerCount}
              </p>
            ) : (
              <p className="text-2xl font-black text-primary">
                ₦{(game?.entry_fee || 700).toLocaleString()}
              </p>
            )}
          </div>
          <div className="card-panel text-center">
            <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider">
              {isOpen || isLive ? 'Total Pool' : 'Duration'}
            </p>
            {isOpen || isLive ? (
              <p className="text-2xl font-black text-primary">₦{poolValue.toLocaleString()}</p>
            ) : (
              <p className="text-2xl font-black text-foreground flex items-center justify-center gap-2">
                <Clock className="w-5 h-5 text-muted-foreground" />
                {game?.max_duration || 20}m
              </p>
            )}
          </div>
        </div>

        {/* Prize Distribution */}
        {game && (
          <PrizeDistribution
            payoutType={game.payout_type || 'top3'}
            payoutDistribution={game.payout_distribution || [0.5, 0.3, 0.2]}
            poolValue={(isOpen || isLive) ? poolValue : undefined}
            showHeader={true}
          />
        )}

        {/* Participants - Only show for open/live games */}
        {(isOpen || isLive) && participants.length > 0 && (
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
        )}

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

        {/* Mic Check Button - Only for open/live games */}
        {(isOpen || isLive) && !micCheckComplete && (
          <button
            onClick={() => setShowMicCheck(true)}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-primary/10 border border-primary/30 text-primary font-medium transition-all hover:bg-primary/20"
          >
            <Mic className="w-4 h-4" />
            Test Your Microphone
          </button>
        )}
        
        {(isOpen || isLive) && micCheckComplete && (
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