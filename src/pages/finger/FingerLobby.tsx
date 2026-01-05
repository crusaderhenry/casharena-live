import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { BottomNav } from '@/components/BottomNav';
import { TestControls } from '@/components/TestControls';
import { CrusaderHost } from '@/components/CrusaderHost';
import { MicCheckModal } from '@/components/MicCheckModal';
import { GameStatusHeader } from '@/components/GameStatusHeader';
import { useGame } from '@/contexts/GameContext';
import { useLiveGame } from '@/hooks/useLiveGame';
import { useCrusader } from '@/hooks/useCrusader';
import { useAudio } from '@/contexts/AudioContext';
import { useSounds } from '@/hooks/useSounds';
import { useHaptics } from '@/hooks/useHaptics';
import { useServerTime, formatCountdown } from '@/hooks/useServerTime';
import { ChevronLeft, Zap, Lock, Users, Mic, Trophy, Clock, Play, Sparkles, Radio, Eye } from 'lucide-react';

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
  const gameIdFromState = (location.state as any)?.gameId;
  const isSpectatorFromState = Boolean((location.state as any)?.isSpectator);

  const { isTestMode, resetFingerGame } = useGame();
  const { game, participants, loading } = useLiveGame(gameIdFromState);
  const crusader = useCrusader();
  const { playBackgroundMusic, stopBackgroundMusic } = useAudio();
  const { play } = useSounds();
  const { buttonClick } = useHaptics();
  const { secondsUntil, synced } = useServerTime();
  
  const [countdown, setCountdown] = useState(60);
  const [entryClosed, setEntryClosed] = useState(false);
  const [crusaderMessage, setCrusaderMessage] = useState(CRUSADER_LOBBY_MESSAGES[0]);
  const [showMicCheck, setShowMicCheck] = useState(false);
  const [micCheckComplete, setMicCheckComplete] = useState(false);
  const [isSpectator, setIsSpectator] = useState(isSpectatorFromState);

  // Sync with server countdown using server time
  useEffect(() => {
    if (!game) return;
    
    const updateCountdown = () => {
      if (game.start_time) {
        // Calculate seconds until game goes live
        const secsUntilLive = secondsUntil(game.start_time);
        setCountdown(Math.max(0, secsUntilLive));
        
        if (secsUntilLive <= 0 && game.status === 'live') {
          // Game is live, navigate to arena
          if (!preferLobby) {
            navigate('/finger/arena');
          }
        }
      } else {
        // Fallback to game countdown
        setCountdown(game.countdown || 60);
      }
    };
    
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [game, synced, secondsUntil, preferLobby, navigate]);

  // Redirect if game is ended
  useEffect(() => {
    if (game?.status === 'ended') {
      navigate('/finger/results');
      return;
    }

    // If game is live and user doesn't prefer lobby, go to arena
    if (game?.status === 'live' && !preferLobby && countdown <= 0) {
      navigate('/finger/arena');
    }
  }, [game?.status, preferLobby, countdown, navigate]);

  // Start lobby music and Crusader welcome
  useEffect(() => {
    playBackgroundMusic('lobby');
    crusader.welcomeLobby();
    
    const micCheckDone = sessionStorage.getItem('micCheckComplete');
    if (!micCheckDone) {
      setTimeout(() => setShowMicCheck(true), 1500);
    } else {
      setMicCheckComplete(true);
    }
    
    const messageInterval = setInterval(() => {
      setCrusaderMessage(CRUSADER_LOBBY_MESSAGES[Math.floor(Math.random() * CRUSADER_LOBBY_MESSAGES.length)]);
    }, 8000);

    return () => {
      stopBackgroundMusic();
      clearInterval(messageInterval);
    };
  }, []);

  // Entry closed warning
  useEffect(() => {
    if (countdown <= 10 && !entryClosed) {
      setEntryClosed(true);
      play('countdown');
    }
  }, [countdown, entryClosed, play]);

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

  const handleEnterArena = () => {
    play('click');
    buttonClick();
    navigate('/finger/arena', { state: { isSpectator } });
  };

  const handleMicCheckComplete = () => {
    setMicCheckComplete(true);
    sessionStorage.setItem('micCheckComplete', 'true');
  };

  const poolValue = game?.pool_value || 0;
  const playerCount = participants.length || game?.participant_count || 0;
  const gameName = game?.name || 'Fastest Finger';
  const isGameLive = game?.status === 'live';
  
  // Construct a game object for the header component
  const gameForHeader = game ? {
    id: game.id,
    name: game.name,
    status: game.status,
    pool_value: game.pool_value,
    participant_count: game.participant_count,
    countdown: game.countdown,
    entry_fee: game.entry_fee,
    max_duration: game.max_duration,
    payout_type: game.payout_type,
    start_time: game.start_time,
  } : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-14 h-14 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground font-medium">Entering lobby...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="p-4 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-4 pt-2">
          <button 
            onClick={handleBack}
            className="w-11 h-11 rounded-xl bg-card flex items-center justify-center border border-border/50 hover:border-primary/50 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-foreground">{gameName}</h1>
              {isGameLive && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/20 text-xs font-bold text-green-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  LIVE
                </span>
              )}
              {isSpectator && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/20 text-xs font-bold text-orange-400">
                  <Eye className="w-3 h-3" />
                  SPECTATOR
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {isSpectator ? 'Watching as spectator' : isGameLive ? 'Game is live! Jump in now' : 'Waiting for game to start'}
            </p>
          </div>
        </div>

        {/* Game Status Header - Shared Component */}
        {gameForHeader && (
          <GameStatusHeader 
            game={gameForHeader} 
            participantCount={playerCount}
            isSpectator={isSpectator}
          />
        )}

        {/* Crusader Host */}
        <CrusaderHost isLive message={crusaderMessage} />

        {/* Test Controls */}
        <TestControls
          onStart={handleTestStart}
          onReset={handleTestReset}
          startLabel="Start Game Now"
        />

        {/* Action Card */}
        <div className={`relative overflow-hidden rounded-2xl border-2 p-5 text-center ${
          isGameLive 
            ? 'bg-gradient-to-br from-green-500/10 via-card to-card border-green-500/50' 
            : entryClosed 
            ? 'bg-gradient-to-br from-destructive/10 via-card to-card border-destructive/50' 
            : 'bg-gradient-to-br from-primary/10 via-card to-card border-primary/40'
        }`}>
          {/* Glow effect */}
          <div className={`absolute top-0 right-0 w-40 h-40 rounded-full blur-3xl ${
            isGameLive ? 'bg-green-500/20' : entryClosed ? 'bg-destructive/20' : 'bg-primary/20'
          }`} />
          
          <div className="relative z-10">
            {isGameLive ? (
              <>
                <div className="flex items-center justify-center gap-2 mb-3">
                  <Radio className="w-6 h-6 text-green-400 animate-pulse" />
                  <span className="text-sm text-green-400 font-bold uppercase tracking-wider">
                    {isSpectator ? 'Watching Live' : 'Game is Live!'}
                  </span>
                </div>
                <button
                  onClick={handleEnterArena}
                  className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity ${
                    isSpectator 
                      ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white' 
                      : 'bg-gradient-to-r from-green-500 to-green-600 text-white'
                  }`}
                >
                  {isSpectator ? (
                    <>
                      <Eye className="w-5 h-5" />
                      Watch Arena
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5" fill="currentColor" />
                      Enter Arena Now
                    </>
                  )}
                </button>
              </>
            ) : (
              <>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Zap className={`w-6 h-6 ${entryClosed ? 'text-destructive' : 'text-primary'}`} />
                  <span className="text-sm text-muted-foreground font-medium">
                    {entryClosed ? 'Entry Closed' : 'Game Starts In'}
                  </span>
                </div>
                <p className={`text-5xl font-black font-mono ${
                  entryClosed ? 'text-destructive' : 'text-foreground'
                } ${countdown <= 10 ? 'animate-pulse' : ''}`}>
                  {formatTime(countdown)}
                </p>
                {entryClosed && (
                  <div className="flex items-center justify-center gap-2 mt-3 text-destructive">
                    <Lock className="w-4 h-4" />
                    <span className="text-sm font-bold">No more entries</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-border bg-card p-4 text-center">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center mx-auto mb-2">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Players</p>
            <p className="text-2xl font-black text-foreground">{playerCount}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 text-center">
            <div className="w-10 h-10 rounded-xl bg-gold/20 flex items-center justify-center mx-auto mb-2">
              <Trophy className="w-5 h-5 text-gold" />
            </div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Prize Pool</p>
            <p className="text-2xl font-black text-primary">₦{poolValue.toLocaleString()}</p>
          </div>
        </div>

        {/* Participants Grid */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Users className="w-4 h-4" />
            Players in Lobby
          </h3>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
            {participants.slice(0, 12).map((participant, index) => (
              <div key={participant.id} className="flex flex-col items-center animate-scale-in" style={{ animationDelay: `${index * 30}ms` }}>
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-card flex items-center justify-center text-2xl border border-border/50">
                  {participant.profile?.avatar || '🎮'}
                </div>
                <p className="text-xs mt-2 truncate w-full text-center font-medium text-muted-foreground">
                  {participant.profile?.username?.split(' ')[0] || 'Player'}
                </p>
              </div>
            ))}
            {playerCount > 12 && (
              <div className="flex flex-col items-center justify-center">
                <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center text-sm font-bold border border-border/50">
                  +{playerCount - 12}
                </div>
                <p className="text-xs mt-2 text-muted-foreground">more</p>
              </div>
            )}
          </div>
        </div>

        {/* Tips */}
        <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/5 to-transparent p-4">
          <h3 className="font-bold text-foreground mb-3 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Pro Tips from Crusader
          </h3>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              Keep your finger ready on the send button
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              Short messages are faster to type
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              Watch the timer - strike at the last second!
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              Stay calm when others are spamming!
            </li>
          </ul>
        </div>

        {/* Mic Check */}
        {!micCheckComplete ? (
          <button
            onClick={() => setShowMicCheck(true)}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-primary/10 border border-primary/30 text-primary font-medium transition-all hover:bg-primary/20"
          >
            <Mic className="w-5 h-5" />
            Test Your Microphone
          </button>
        ) : (
          <div className="flex items-center justify-center gap-2 py-3 text-sm text-primary bg-primary/5 rounded-xl border border-primary/20">
            <Mic className="w-4 h-4" />
            <span>Mic ready!</span>
            <button 
              onClick={() => setShowMicCheck(true)}
              className="text-muted-foreground hover:text-primary underline ml-2"
            >
              Test again
            </button>
          </div>
        )}
      </div>
      
      <BottomNav />

      <MicCheckModal 
        open={showMicCheck}
        onOpenChange={setShowMicCheck}
        onComplete={handleMicCheckComplete}
      />
    </div>
  );
};
