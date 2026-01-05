import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { VoiceRoomLive } from '@/components/VoiceRoomLive';
import { TestControls } from '@/components/TestControls';
import { MicCheckModal } from '@/components/MicCheckModal';
import { GameStatusHeader } from '@/components/GameStatusHeader';
import { useGame } from '@/contexts/GameContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLiveGame } from '@/hooks/useLiveGame';
import { useSounds } from '@/hooks/useSounds';
import { useHaptics } from '@/hooks/useHaptics';
import { useCrusaderHost } from '@/hooks/useCrusaderHost';
import { useAudio } from '@/contexts/AudioContext';
import { useToast } from '@/hooks/use-toast';
import { useServerTime } from '@/hooks/useServerTime';
import { useMockSimulation } from '@/hooks/useMockSimulation';
import { useCountdownTicker } from '@/hooks/useCountdownTicker';
import { Send, Crown, Clock, Mic, Volume2, VolumeX, Users, LogOut, AlertTriangle, Zap, Trophy, Radio, Timer, Flame, Eye, Loader2, RotateCcw, Home } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface TopThree {
  name: string;
  avatar: string;
  comment: string;
}

export const FingerArena = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isSpectatorFromState = Boolean((location.state as any)?.isSpectator);
  
  const { isTestMode, resetFingerGame, userProfile } = useGame();
  const { profile, user } = useAuth();
  const { game, comments, participants, winners, sendComment, loading, joinGame, canJoinGame } = useLiveGame();
  const { play } = useSounds();
  const { vibrate, buttonClick } = useHaptics();
  const crusader = useCrusaderHost();
  const { playBackgroundMusic, stopBackgroundMusic } = useAudio();
  const { toast } = useToast();
  const { gameTimeRemaining, synced } = useServerTime();
  
  // Load test scenario from session storage if in test mode
  const testScenario = isTestMode ? (() => {
    const stored = sessionStorage.getItem('testScenario');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch { return null; }
    }
    return null;
  })() : null;
  
  // Mock comment callback to reset timer when other players comment
  const handleMockComment = useCallback(() => {
    // Reset timer when mock players comment (simulating real game behavior)
    setTimer(testScenario?.commentTimer || 60);
  }, [testScenario?.commentTimer]);
  
  const { mockComments, triggerCommentBurst } = useMockSimulation(isTestMode, game?.id, handleMockComment);
  
  // Use countdown ticker to keep backend status/countdowns synced (open→live + live ticks)
  const shouldTickBackend = !isTestMode && (game?.status === 'open' || game?.status === 'live');
  useCountdownTicker(shouldTickBackend, isTestMode, game?.id);
  
  const [timer, setTimer] = useState(testScenario?.commentTimer || 60);
  const [gameTime, setGameTime] = useState(testScenario?.gameTimeRemaining || 20 * 60);
  const [inputValue, setInputValue] = useState('');
  const [isGameOver, setIsGameOver] = useState(false);
  const [isEndingSoon, setIsEndingSoon] = useState(false);
  const [showFreezeScreen, setShowFreezeScreen] = useState(false);
  const [systemMessage, setSystemMessage] = useState('');
  const [topThree, setTopThree] = useState<TopThree[]>([]);
  const [lastLeader, setLastLeader] = useState('');
  const [isShaking, setIsShaking] = useState(false);
  const [isSpectator, setIsSpectator] = useState(isSpectatorFromState);
  const [hostMuted, setHostMuted] = useState(false);
  const [audienceMuted, setAudienceMuted] = useState(false);
  const [sending, setSending] = useState(false);
  const [showMicCheck, setShowMicCheck] = useState(false);
  const [finalizationTimer, setFinalizationTimer] = useState(0);
  const [finalizationPhase, setFinalizationPhase] = useState<'calculating' | 'retrying' | 'stuck'>('calculating');
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [showManualResultsBtn, setShowManualResultsBtn] = useState(false);
  const [joiningFromSpectator, setJoiningFromSpectator] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);
  const hasAnnouncedStart = useRef(false);
  const hasNavigatedToResults = useRef(false);
  const resultsNavTimeoutRef = useRef<number | null>(null);
  const hasStartedAudio = useRef(false);
  const lastHypeRef = useRef(0);
  const finalizationStarted = useRef(false);

  const currentUsername = profile?.username || userProfile.username;
  const currentAvatar = profile?.avatar || userProfile.avatar;
  const poolValue = testScenario?.poolValue || game?.pool_value || 0;
  const audienceCount = testScenario?.playerCount || participants.length || game?.participant_count || 0;
  const isGameTimeDanger = isEndingSoon || gameTime <= 5 * 60;
  const isTimerUrgent = timer <= 15;
  
  // Spectator-to-participant join logic (10+ mins remaining)
  const canAffordEntry = (profile?.wallet_balance || 0) >= (game?.entry_fee || 700) || game?.is_sponsored;
  const gameJoinStatus = canJoinGame(game);
  const canJoinFromSpectator = isSpectator && gameJoinStatus.canJoin && game?.status === 'live';
  
  const handleJoinFromSpectator = async () => {
    if (!game || joiningFromSpectator || !profile) return;
    
    if (!canAffordEntry) {
      play('error');
      return;
    }
    
    setJoiningFromSpectator(true);
    const success = await joinGame(game.id);
    
    if (success) {
      play('success');
      buttonClick();
      setIsSpectator(false); // Switch from spectator to participant
      toast({ title: 'Joined!', description: 'You are now in the pool!' });
    } else {
      play('error');
      toast({ title: 'Join failed', description: 'Could not join the pool', variant: 'destructive' });
    }
    setJoiningFromSpectator(false);
  };

  // Track last server countdown to detect resets
  const lastServerCountdownRef = useRef<number>(game?.countdown || 60);

  // Cleanup: don't cancel scheduled navigation on re-renders; only on unmount
  useEffect(() => {
    return () => {
      if (resultsNavTimeoutRef.current) {
        window.clearTimeout(resultsNavTimeoutRef.current);
      }
    };
  }, []);
  // Sync winner countdown from backend (only meaningful when live)
  useEffect(() => {
    if (isGameOver) return;
    if (isTestMode) return;
    if (game?.status !== 'live') return;

    if (game?.countdown !== undefined && game.countdown !== lastServerCountdownRef.current) {
      lastServerCountdownRef.current = game.countdown;
      setTimer(game.countdown);
    }
  }, [game?.countdown, game?.status, isGameOver, isTestMode]);

  // Local winner countdown tick (only when live/test) - for display only
  // Game over is determined by server status, not local timer
  useEffect(() => {
    if (isGameOver) return;

    const winnerTimerActive = isTestMode || game?.status === 'live';
    if (!winnerTimerActive) return;

    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          // In test mode, end the game locally
          if (isTestMode) {
            setIsGameOver(true);
            setShowFreezeScreen(true);
            stopBackgroundMusic();
            play('gameOver');
            vibrate('success');
          }
          // In live mode, don't end locally - wait for server status change
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isGameOver, isTestMode, game?.status, stopBackgroundMusic, play, vibrate]);

  // Active game time countdown (server-synced in live mode, local in test mode)
  useEffect(() => {
    if (isGameOver) return;
    
    // In test mode, run a local game timer
    if (isTestMode) {
      const interval = setInterval(() => {
        setGameTime(prev => {
          if (prev <= 1) {
            setIsGameOver(true);
            setShowFreezeScreen(true);
            stopBackgroundMusic();
            play('gameOver');
            return 0;
          }
          const inDangerZone = prev <= 300 && prev > 0;
          setIsEndingSoon(inDangerZone);
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
    
    // In live mode, use server time calculation
    if (!game?.start_time) return;
    
    const updateGameTime = () => {
      const remaining = gameTimeRemaining(game.start_time, game.max_duration);
      setGameTime(remaining);
      const inDangerZone = remaining <= 300 && remaining > 0;
      setIsEndingSoon(inDangerZone);
      
      // Auto-end when game time runs out
      if (remaining <= 0) {
        setIsGameOver(true);
        setShowFreezeScreen(true);
        stopBackgroundMusic();
        play('gameOver');
        vibrate('success');
      }
    };
    
    updateGameTime();
    const interval = setInterval(updateGameTime, 1000);
    return () => clearInterval(interval);
  }, [isTestMode, game?.start_time, game?.max_duration, isGameOver, gameTimeRemaining, stopBackgroundMusic, play, vibrate]);

  // Update Crusader with game state
  useEffect(() => {
    if (game) {
      crusader.updateGameState({
        timer: game.countdown || 60,
        gameTimeRemaining: gameTime,
        participantCount: game.participant_count || participants.length,
        poolValue: game.pool_value || 0,
        sponsoredAmount: game.sponsored_amount || 0,
        isSponsored: game.is_sponsored || false,
        entryFee: game.entry_fee || 0,
        isLive: game.status === 'live',
        leader: topThree[0]?.name || null,
        commentCount: comments.length,
      });
      
      // Check for prize milestones when pool value changes
      if (game.pool_value) {
        crusader.checkPrizeMilestone(game.pool_value);
      }
      
      // Check for danger mode
      if (gameTime > 0) {
        crusader.checkDangerMode(gameTime);
      }
    }
  }, [game?.countdown, game?.pool_value, game?.participant_count, game?.sponsored_amount, game?.is_sponsored, game?.entry_fee, topThree[0]?.name, comments.length, gameTime]);

  // Check for game ended
  useEffect(() => {
    if (game?.status === 'ended' && !isGameOver) {
      // Reset redirect guards for this end-of-game transition
      hasNavigatedToResults.current = false;
      if (resultsNavTimeoutRef.current) {
        window.clearTimeout(resultsNavTimeoutRef.current);
        resultsNavTimeoutRef.current = null;
      }
      setFinalizationTimer(0);
      setFinalizationPhase('calculating');
      setRetryAttempt(0);

      setIsGameOver(true);
      setShowFreezeScreen(true);
      stopBackgroundMusic();
      play('gameOver');
      vibrate('success');
      
      const winner = topThree[0]?.name;
      const prize = game?.pool_value ? Math.floor(game.pool_value * 0.45) : 0;
      crusader.announceGameOver(winner, prize);
    }
  }, [game?.status, topThree, game?.pool_value]);

  // Calculate estimated prizes
  const estimatedPrizes = useMemo(() => {
    const pool = poolValue || game?.pool_value || 0;
    const platformCut = Math.floor(pool * 0.1);
    const prizePool = pool - platformCut;
    const distribution = game?.payout_distribution || [0.45, 0.30, 0.15];
    return distribution.map((pct: number) => Math.floor(prizePool * pct));
  }, [poolValue, game?.pool_value, game?.payout_distribution]);

  // Finalization timer when countdown hits 0 but game is still live
  useEffect(() => {
    const isLiveAndCountdownZero = (game?.countdown === 0 || timer === 0) && game?.status === 'live';

    if (isLiveAndCountdownZero && !finalizationStarted.current) {
      finalizationStarted.current = true;

      // Reset redirect guards and UI phases for this finalization run
      hasNavigatedToResults.current = false;
      if (resultsNavTimeoutRef.current) {
        window.clearTimeout(resultsNavTimeoutRef.current);
        resultsNavTimeoutRef.current = null;
      }
      setFinalizationTimer(0);
      setFinalizationPhase('calculating');
      setRetryAttempt(0);

      setShowFreezeScreen(true);
      setIsGameOver(true);
      stopBackgroundMusic();
      play('gameOver');
      vibrate('success');
    }

    // If game becomes ended, stop finalization and navigate
    if (game?.status === 'ended') {
      finalizationStarted.current = false;
    }
  }, [game?.countdown, game?.status, timer]);

  // Finalization timeout & retry logic
  useEffect(() => {
    if (!showFreezeScreen) return;
    if (game?.status === 'ended') return; // Already done
    if (isTestMode) return; // Skip in test mode
    
    const interval = setInterval(() => {
      setFinalizationTimer(prev => {
        const next = prev + 1;
        
        // Phase transitions
        if (next === 10 && finalizationPhase === 'calculating') {
          setFinalizationPhase('retrying');
          setRetryAttempt(1);
          retryEndGame();
        } else if (next === 20 && finalizationPhase === 'retrying') {
          setFinalizationPhase('stuck');
          setRetryAttempt(2);
        }
        
        return next;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [showFreezeScreen, game?.status, isTestMode, finalizationPhase]);

  // Manual retry function
  const retryEndGame = async () => {
    if (!game?.id) return;
    
    try {
      await supabase.functions.invoke('game-timer', {
        body: { action: 'tick', gameId: game.id }
      });
      toast({ 
        title: 'Retrying...', 
        description: 'Attempting to finalize results' 
      });
    } catch (error) {
      console.error('Retry failed:', error);
      toast({ 
        title: 'Retry failed', 
        description: 'Please try force end or return home',
        variant: 'destructive' 
      });
    }
  };

  // Navigate to results when the game is ended
  useEffect(() => {
    if (game?.status !== 'ended') return;
    if (hasNavigatedToResults.current) return;
    if (resultsNavTimeoutRef.current) return;

    // Snapshot values now so the redirect isn't affected by subsequent realtime re-renders
    const sortedWinners = [...winners].sort((a, b) => a.position - b.position);
    const winnerNames =
      sortedWinners.length > 0
        ? sortedWinners.map((w) => w.profile?.username || 'Unknown')
        : topThree.map((t) => t.name).slice(0, 3);

    const isWinner = sortedWinners.some((w) => w.user_id === user?.id);
    const userPosition = sortedWinners.find((w) => w.user_id === user?.id)?.position || 0;

    resultsNavTimeoutRef.current = window.setTimeout(() => {
      // If something else already navigated, don't double-navigate.
      if (hasNavigatedToResults.current) return;
      hasNavigatedToResults.current = true;

      navigate('/finger/results', {
        state: {
          winners: winnerNames,
          totalPool: game?.pool_value || 0,
          isWinner,
          position: userPosition,
        },
      });

      resultsNavTimeoutRef.current = null;
    }, 1500);
  }, [game?.status, winners, topThree, user?.id, game?.pool_value, navigate]);

  // Show manual results button after 3 seconds if still on freeze screen
  useEffect(() => {
    if (game?.status !== 'ended') {
      setShowManualResultsBtn(false);
      return;
    }

    const timeout = window.setTimeout(() => {
      if (!hasNavigatedToResults.current) {
        setShowManualResultsBtn(true);
      }
    }, 3000);

    return () => window.clearTimeout(timeout);
  }, [game?.status]);

  // Combine real and mock comments based on test mode
  const displayComments = useMemo(() => {
    return isTestMode ? mockComments : comments;
  }, [isTestMode, mockComments, comments]);

  // Update top 3 from comments
  useEffect(() => {
    const uniquePlayers = new Map<string, TopThree>();
    displayComments.forEach(comment => {
      const username = comment.profile?.username || 'Unknown';
      if (!uniquePlayers.has(username)) {
        uniquePlayers.set(username, {
          name: username,
          avatar: comment.profile?.avatar || '🎮',
          comment: comment.content,
        });
      }
    });
    const top = Array.from(uniquePlayers.values()).slice(0, 3);
    setTopThree(top);

    if (top[0] && top[0].name !== lastLeader && lastLeader !== '') {
      crusader.announceLeaderChange(top[0].name);
      play('leaderChange');
    }
    if (top[0]) {
      setLastLeader(top[0].name);
    }
  }, [displayComments, lastLeader, crusader, play]);

  // Start background music on mount (guard against unstable context function identities)
  useEffect(() => {
    if (hasStartedAudio.current) return;
    hasStartedAudio.current = true;

    playBackgroundMusic('arena');

    const micCheckDone = sessionStorage.getItem('micCheckComplete');
    if (!micCheckDone) {
      setTimeout(() => setShowMicCheck(true), 2000);
    }

    return () => stopBackgroundMusic();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Welcome announcement (separate effect to avoid loops)
  useEffect(() => {
    if (!hasAnnouncedStart.current && game?.id) {
      showSystemMessage('Game started! Be the last commenter!');
      setTimeout(() => crusader.announceGameStart(), 500);
      hasAnnouncedStart.current = true;
    }
  }, [game?.id]);

  // Handle host mute
  useEffect(() => {
    crusader.setEnabled(!hostMuted);
  }, [hostMuted]);

  // Screen shake when timer < 10
  useEffect(() => {
    if (timer <= 10 && timer > 0 && !isGameOver) {
      setIsShaking(true);
    } else {
      setIsShaking(false);
    }
  }, [timer, isGameOver]);

  // Timer sound effects and announcements
  useEffect(() => {
    if (isGameOver) return;
    
    if (timer <= 10) {
      play('urgent');
      vibrate('heavy');
      playBackgroundMusic('tense');
    } else if (timer <= 30) {
      play('tick');
    }
    
    if ([60, 30, 15, 10, 5].includes(timer)) {
      crusader.announceTimerLow(timer);
    }
  }, [timer]);

  // Random hype from Crusader
  useEffect(() => {
    if (isGameOver) return;
    
    const interval = setInterval(() => {
      const now = Date.now();
      if (now - lastHypeRef.current > 15000 && Math.random() > 0.6) {
        crusader.randomHype();
        lastHypeRef.current = now;
      }
    }, 8000);

    return () => clearInterval(interval);
  }, [isGameOver, crusader]);

  const showSystemMessage = (msg: string) => {
    setSystemMessage(msg);
    setTimeout(() => setSystemMessage(''), 3000);
  };

  const formatGameTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSend = async () => {
    if (!inputValue.trim() || isGameOver || isSpectator || sending) return;

    setSending(true);
    
    // In test mode, simulate successful comment and reset timer
    if (isTestMode) {
      setTimer(testScenario?.commentTimer || 60); // Reset timer like in real game
      setInputValue('');
      showSystemMessage("⏱️ Timer reset - You're leading!");
      play('send');
      buttonClick();
      setSending(false);
      return;
    }
    
    const success = await sendComment(inputValue.trim());
    
    if (success) {
      setInputValue('');
      showSystemMessage("⏱️ Timer reset - You're leading!");
      play('send');
      buttonClick();
      
      if (timer < 10) {
        crusader.announceCloseCall(currentUsername);
      }
    }
    setSending(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTestEnd = () => {
    setIsGameOver(true);
    setShowFreezeScreen(true);
    stopBackgroundMusic();
    play('gameOver');
    vibrate('success');
    crusader.announceGameOver();
  };

  const handleTestReset = () => {
    resetFingerGame();
    setTimer(60);
    setGameTime(20 * 60);
    setIsGameOver(false);
    setShowFreezeScreen(false);
    setTopThree([]);
    setLastLeader('');
    setIsShaking(false);
    hasAnnouncedStart.current = false;
  };

  const handleMicCheckComplete = () => {
    sessionStorage.setItem('micCheckComplete', 'true');
  };

  // Loading state (skip loading spinner in test mode)
  if (loading && !isTestMode) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header Skeleton */}
        <div className="bg-card/80 backdrop-blur-sm border-b border-border p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
              <div className="h-5 w-32 bg-muted rounded animate-pulse" />
            </div>
            <div className="flex items-center gap-2">
              <div className="h-8 w-16 bg-muted rounded-full animate-pulse" />
              <div className="h-8 w-8 bg-muted rounded-full animate-pulse" />
            </div>
          </div>
        </div>
        
        {/* Timer Skeleton */}
        <div className="p-4">
          <div className="bg-card rounded-2xl p-6 border border-border">
            <div className="flex items-center justify-between mb-4">
              <div className="h-4 w-24 bg-muted rounded animate-pulse" />
              <div className="h-6 w-20 bg-muted rounded-full animate-pulse" />
            </div>
            <div className="flex items-center justify-center gap-4">
              <div className="w-20 h-20 rounded-2xl bg-muted animate-pulse" />
              <div className="w-20 h-20 rounded-2xl bg-muted animate-pulse" />
            </div>
          </div>
        </div>
        
        {/* Leaderboard Skeleton */}
        <div className="px-4 mb-4">
          <div className="h-4 w-20 bg-muted rounded animate-pulse mb-3" />
          <div className="flex gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex-1 bg-card rounded-xl p-3 border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
                  <div className="h-3 w-16 bg-muted rounded animate-pulse" />
                </div>
                <div className="h-2 w-full bg-muted rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
        
        {/* Chat Skeleton */}
        <div className="flex-1 px-4 space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-start gap-3" style={{ opacity: 1 - i * 0.2 }}>
              <div className="w-8 h-8 rounded-full bg-muted animate-pulse flex-shrink-0" />
              <div className="flex-1">
                <div className="h-3 w-20 bg-muted rounded animate-pulse mb-2" />
                <div className="h-4 bg-muted rounded animate-pulse" style={{ width: `${70 - i * 10}%` }} />
              </div>
            </div>
          ))}
        </div>
        
        {/* Input Skeleton */}
        <div className="p-4 border-t border-border bg-card/80 backdrop-blur-sm">
          <div className="flex gap-2">
            <div className="flex-1 h-12 bg-muted rounded-xl animate-pulse" />
            <div className="w-12 h-12 bg-muted rounded-xl animate-pulse" />
          </div>
        </div>
        
        {/* Loading indicator */}
        <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm">
          <div className="text-center">
            <div className="w-14 h-14 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground font-medium">Entering arena...</p>
          </div>
        </div>
      </div>
    );
  }

  // Freeze Screen with Finalization States
  if (showFreezeScreen) {
    const isFinalized = game?.status === 'ended';
    const userIsTop3 = topThree.findIndex(t => t.name === currentUsername);
    
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5 flex flex-col items-center justify-center p-6">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4 animate-bounce-in">🏆</div>
          <h1 className="text-3xl font-black text-foreground mb-2">GAME OVER!</h1>
          <p className="text-muted-foreground">
            {isFinalized ? 'Winners confirmed!' : 'Determining winners...'}
          </p>
        </div>

        {/* Podium Display */}
        <div className="flex items-end justify-center gap-4 mb-6 w-full max-w-sm">
          {/* 2nd Place */}
          <div className="flex flex-col items-center flex-1">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-silver/30 to-silver/10 flex items-center justify-center text-2xl border-2 border-silver/50 mb-2 animate-fade-in" style={{ animationDelay: '0.3s' }}>
              {topThree[1]?.avatar || '🥈'}
            </div>
            <div className="bg-gradient-to-t from-silver/20 to-silver/10 rounded-t-xl w-full py-4 text-center border border-silver/30" style={{ height: '70px' }}>
              <p className="font-bold text-sm text-foreground truncate px-2">{topThree[1]?.name || '—'}</p>
              <p className="text-xs text-silver font-bold">2nd</p>
              {estimatedPrizes[1] > 0 && (
                <p className="text-[10px] text-muted-foreground">₦{estimatedPrizes[1].toLocaleString()}</p>
              )}
            </div>
          </div>

          {/* 1st Place */}
          <div className="flex flex-col items-center flex-1">
            <Crown className="w-8 h-8 text-gold mb-2 animate-bounce-in" />
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-gold/30 to-gold/10 flex items-center justify-center text-3xl border-2 border-gold/50 mb-2 animate-winner-glow">
              {topThree[0]?.avatar || '🥇'}
            </div>
            <div className="bg-gradient-to-t from-gold/20 to-gold/10 rounded-t-xl w-full py-6 text-center border border-gold/30" style={{ height: '100px' }}>
              <p className="font-bold text-foreground truncate px-2">{topThree[0]?.name || '—'}</p>
              <p className="text-sm font-black text-gold">1st</p>
              {estimatedPrizes[0] > 0 && (
                <p className="text-xs text-gold font-bold">₦{estimatedPrizes[0].toLocaleString()}</p>
              )}
            </div>
          </div>

          {/* 3rd Place */}
          <div className="flex flex-col items-center flex-1">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-bronze/30 to-bronze/10 flex items-center justify-center text-2xl border-2 border-bronze/50 mb-2 animate-fade-in" style={{ animationDelay: '0.5s' }}>
              {topThree[2]?.avatar || '🥉'}
            </div>
            <div className="bg-gradient-to-t from-bronze/20 to-bronze/10 rounded-t-xl w-full py-3 text-center border border-bronze/30" style={{ height: '55px' }}>
              <p className="font-bold text-sm text-foreground truncate px-2">{topThree[2]?.name || '—'}</p>
              <p className="text-xs text-bronze font-bold">3rd</p>
              {estimatedPrizes[2] > 0 && (
                <p className="text-[10px] text-muted-foreground">₦{estimatedPrizes[2].toLocaleString()}</p>
              )}
            </div>
          </div>
        </div>

        {/* Prize Preview for User */}
        {userIsTop3 >= 0 && userIsTop3 < 3 && (
          <div className="mb-6 bg-primary/10 border border-primary/30 rounded-xl px-6 py-3 text-center animate-fade-in">
            <p className="text-sm text-primary font-bold">🎉 You're in the top 3!</p>
            <p className="text-lg font-black text-foreground">
              Estimated Prize: ₦{estimatedPrizes[userIsTop3]?.toLocaleString() || '—'}
            </p>
          </div>
        )}

        {/* Finalization Status */}
        {!isFinalized ? (
          <div className="text-center space-y-4">
            {/* Phase 1: Calculating (0-10s) */}
            {finalizationPhase === 'calculating' && (
              <div className="flex flex-col items-center gap-2 animate-fade-in">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  <span className="text-sm font-medium">Finalizing results...</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <p className="text-xs text-muted-foreground">Usually takes 3-5 seconds</p>
              </div>
            )}

            {/* Phase 2: Retrying (10-20s) */}
            {finalizationPhase === 'retrying' && (
              <div className="flex flex-col items-center gap-3 animate-fade-in">
                <div className="flex items-center gap-2 text-orange-400">
                  <RotateCcw className="w-5 h-5 animate-spin" />
                  <span className="text-sm font-medium">Taking longer than expected...</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Retry attempt {retryAttempt} of 2
                </p>
                <div className="w-32 h-1 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-orange-400 transition-all duration-1000"
                    style={{ width: `${Math.min((finalizationTimer - 10) * 10, 100)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Phase 3: Stuck (20s+) */}
            {finalizationPhase === 'stuck' && (
              <div className="flex flex-col items-center gap-4 animate-fade-in">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="w-5 h-5" />
                  <span className="text-sm font-medium">Results delayed</span>
                </div>
                <p className="text-xs text-muted-foreground max-w-[250px]">
                  The backend is taking longer than usual. You can try forcing the end or return home.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={retryEndGame}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-all"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Force End
                  </button>
                  <button
                    onClick={() => navigate('/home')}
                    className="flex items-center gap-2 px-4 py-2 bg-muted text-muted-foreground rounded-xl text-sm font-medium hover:bg-muted/80 transition-all"
                  >
                    <Home className="w-4 h-4" />
                    Return Home
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Game ID: {game?.id?.slice(0, 8)}...
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 animate-fade-in">
            <div className="flex items-center gap-2 text-primary">
              <Trophy className="w-5 h-5" />
              <span className="text-sm font-medium">Redirecting to results...</span>
            </div>
            {showManualResultsBtn && (
              <button
                onClick={() => {
                  hasNavigatedToResults.current = true;
                  const sortedWinners = [...winners].sort((a, b) => a.position - b.position);
                  const winnerNames =
                    sortedWinners.length > 0
                      ? sortedWinners.map((w) => w.profile?.username || 'Unknown')
                      : topThree.map((t) => t.name).slice(0, 3);
                  const isWinner = sortedWinners.some((w) => w.user_id === user?.id);
                  const userPosition = sortedWinners.find((w) => w.user_id === user?.id)?.position || 0;
                  navigate('/finger/results', {
                    state: {
                      winners: winnerNames,
                      totalPool: game?.pool_value || 0,
                      isWinner,
                      position: userPosition,
                    },
                  });
                }}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 transition-all animate-fade-in"
              >
                <Trophy className="w-4 h-4" />
                Open Results Now
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  // Mock game for test mode - use scenario values if available
  const mockGame = {
    id: 'test-game',
    name: 'Test Game',
    status: 'live' as const,
    pool_value: testScenario?.poolValue || 35000,
    participant_count: testScenario?.playerCount || 24,
    countdown: testScenario?.commentTimer || 60,
    entry_fee: 700,
    max_duration: 20,
    payout_type: 'top3',
    start_time: new Date().toISOString(),
  };

  // Construct a game object for the header component
  const effectiveGame = game || (isTestMode ? mockGame : null);
  const gameForHeader = effectiveGame ? {
    id: effectiveGame.id,
    name: effectiveGame.name,
    status: effectiveGame.status,
    pool_value: effectiveGame.pool_value,
    participant_count: effectiveGame.participant_count,
    countdown: effectiveGame.countdown,
    entry_fee: effectiveGame.entry_fee,
    max_duration: effectiveGame.max_duration,
    payout_type: effectiveGame.payout_type,
    start_time: effectiveGame.start_time,
  } : null;

  return (
    <div className={`min-h-screen flex flex-col ${isShaking ? 'animate-intense-shake' : ''} ${isGameTimeDanger ? 'bg-gradient-to-b from-background via-destructive/5 to-background' : 'bg-background'}`}>
      {/* Header */}
      <div className={`backdrop-blur-xl border-b p-4 sticky top-0 z-10 ${isGameTimeDanger ? 'bg-destructive/5 border-destructive/30' : 'bg-card/95 border-border/50'}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            {/* Leave Button */}
            {isSpectator ? (
              <button
                onClick={() => navigate('/home')}
                className="p-2 rounded-xl bg-muted text-muted-foreground hover:bg-muted/80 transition-all"
                title="Leave Arena"
              >
                <LogOut className="w-4 h-4" />
              </button>
            ) : (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    className="p-2 rounded-xl bg-muted text-muted-foreground hover:bg-destructive/20 hover:text-destructive transition-all"
                    title="Leave Arena"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Leave the Arena?</AlertDialogTitle>
                    <AlertDialogDescription>
                      ⚠️ You're an active player. Leaving now may cost you the win!
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Stay in Game</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => navigate('/home')}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Leave Anyway
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            <div>
              <h1 className="font-bold text-foreground flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${isGameTimeDanger ? 'bg-destructive' : 'bg-green-500'} animate-pulse`} />
                {isGameTimeDanger ? 'DANGER ZONE' : 'Live Arena'}
                {isSpectator && (
                  <span className="ml-1 px-2 py-0.5 text-[10px] font-bold uppercase bg-orange-500/20 text-orange-400 rounded-full flex items-center gap-1">
                    <Eye className="w-3 h-3" /> Spectator
                  </span>
                )}
              </h1>
              <p className="text-xs text-muted-foreground flex items-center gap-2">
                <span>{isSpectator ? 'Watching only' : 'Last comment wins!'}</span>
                <span className="inline-flex items-center gap-1 text-primary">
                  <Users className="w-3 h-3" />
                  {audienceCount}
                </span>
              </p>
            </div>
          </div>
          
          {/* Game Time */}
          <div className={`text-right px-3 py-1.5 rounded-xl ${isGameTimeDanger ? 'bg-destructive/20 border border-destructive/30' : 'bg-muted/50'}`}>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Timer className="w-3 h-3" />
              Game Time
            </div>
            <p className={`font-mono font-bold ${isGameTimeDanger ? 'text-destructive animate-pulse' : 'text-foreground'}`}>
              {formatGameTime(gameTime)}
            </p>
          </div>
        </div>

        {/* Game Status Header - Shared Component */}
        {gameForHeader && (
          <GameStatusHeader 
            game={gameForHeader} 
            participantCount={audienceCount}
            isSpectator={isSpectator}
            compact
          />
        )}
        
        {/* Dual Timer Display - Prominent */}
        <div className="mt-3 grid grid-cols-2 gap-3">
          {/* Comment Timer - Time Until Winner */}
          <div className={`text-center py-4 rounded-2xl transition-all border-2 ${
            timer <= 10 ? 'bg-destructive/20 border-destructive/50 animate-pulse' : 
            timer <= 30 ? 'bg-orange-500/20 border-orange-500/30' : 
            'bg-primary/10 border-primary/20'
          }`}>
            <div className="flex items-center justify-center gap-1 mb-1">
              <Zap className={`w-4 h-4 ${timer <= 10 ? 'text-destructive' : timer <= 30 ? 'text-orange-400' : 'text-primary'}`} />
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Winner In</p>
            </div>
            <p className={`text-4xl font-black font-mono ${
              timer <= 10 ? 'text-destructive animate-pulse' : 
              timer <= 30 ? 'text-orange-400' : 'text-foreground'
            }`}>{timer}s</p>
            {timer <= 15 && (
              <p className="text-[10px] text-destructive font-bold mt-1 flex items-center justify-center gap-1">
                <Flame className="w-3 h-3" /> COMMENT NOW!
              </p>
            )}
          </div>

          {/* Game Timer - Total Time Remaining */}
          <div className={`text-center py-4 rounded-2xl transition-all border-2 ${
            gameTime <= 60 ? 'bg-destructive/20 border-destructive/50 animate-pulse' : 
            gameTime <= 300 ? 'bg-orange-500/20 border-orange-500/30' : 
            'bg-muted/30 border-border/50'
          }`}>
            <div className="flex items-center justify-center gap-1 mb-1">
              <Timer className={`w-4 h-4 ${gameTime <= 60 ? 'text-destructive' : gameTime <= 300 ? 'text-orange-400' : 'text-muted-foreground'}`} />
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Game Ends</p>
            </div>
            <p className={`text-4xl font-black font-mono ${
              gameTime <= 60 ? 'text-destructive animate-pulse' : 
              gameTime <= 300 ? 'text-orange-400' : 'text-foreground'
            }`}>{formatGameTime(gameTime)}</p>
            {gameTime <= 60 && (
              <p className="text-[10px] text-destructive font-bold mt-1 flex items-center justify-center gap-1">
                <AlertTriangle className="w-3 h-3" /> FINAL MINUTE!
              </p>
            )}
          </div>
        </div>

        {/* Live Top 3 Podium */}
        <div className="mt-3 bg-muted/30 rounded-2xl p-4 border border-border/50">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-3 text-center flex items-center justify-center gap-2">
            <Crown className="w-3 h-3 text-gold" />
            Current Top 3
          </p>
          <div className="flex items-end justify-center gap-3">
            {/* 2nd Place */}
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-silver/20 to-card flex items-center justify-center text-lg border border-silver/50">
                {topThree[1]?.avatar || '—'}
              </div>
              <div className="text-[10px] text-silver font-bold mt-1">2nd</div>
              <div className="text-[9px] text-muted-foreground truncate max-w-[50px]">{topThree[1]?.name?.split(' ')[0] || ''}</div>
            </div>
            
            {/* 1st Place */}
            <div className="flex flex-col items-center -mt-2">
              <Crown className="w-4 h-4 text-gold mb-1" />
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br from-gold/30 to-card flex items-center justify-center text-xl border-2 border-gold/50 ${topThree[0]?.name === currentUsername ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}`}>
                {topThree[0]?.avatar || '—'}
              </div>
              <div className="text-xs text-gold font-bold mt-1">1st</div>
              <div className="text-[10px] text-foreground font-medium truncate max-w-[60px]">{topThree[0]?.name?.split(' ')[0] || ''}</div>
            </div>
            
            {/* 3rd Place */}
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-bronze/20 to-card flex items-center justify-center text-lg border border-bronze/50">
                {topThree[2]?.avatar || '—'}
              </div>
              <div className="text-[10px] text-bronze font-bold mt-1">3rd</div>
              <div className="text-[9px] text-muted-foreground truncate max-w-[50px]">{topThree[2]?.name?.split(' ')[0] || ''}</div>
            </div>
          </div>
        </div>

        {/* Crusader Host Bar */}
        <div className="mt-3 flex items-center gap-2 bg-primary/10 rounded-xl px-3 py-2 border border-primary/30">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-lg">
            🎙️
          </div>
          <div className="flex-1">
            <span className="text-xs text-primary font-bold">Crusader</span>
            <span className="text-[10px] text-muted-foreground ml-2">Hosting live</span>
          </div>
          {!hostMuted && <Mic className="w-3 h-3 text-primary animate-pulse" />}
          
          <button
            onClick={() => setHostMuted(!hostMuted)}
            className={`p-2 rounded-lg transition-all ${hostMuted ? 'bg-destructive/20 text-destructive' : 'bg-primary/20 text-primary'}`}
            title={hostMuted ? 'Unmute Host' : 'Mute Host'}
          >
            {hostMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>

        {/* Spectator Mode Badge with Join Option */}
        {isSpectator && (
          <div className="mt-3 bg-orange-500/10 border border-orange-500/30 rounded-xl px-4 py-3">
            <p className="text-xs text-orange-400 font-medium flex items-center justify-center gap-1 mb-2">
              <Eye className="w-3 h-3" />
              Spectator Mode - Watch only
            </p>
            {/* Show Join Pool button if 10+ mins remaining */}
            {canJoinFromSpectator && (
              <button
                onClick={handleJoinFromSpectator}
                disabled={joiningFromSpectator || !canAffordEntry}
                className="w-full py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity bg-gradient-to-r from-primary to-primary/80 text-primary-foreground disabled:opacity-50"
              >
                <Zap className="w-4 h-4" />
                {joiningFromSpectator ? 'Joining...' : 
                 !canAffordEntry ? `Need ₦${((game?.entry_fee || 700) - (profile?.wallet_balance || 0)).toLocaleString()} more` :
                 game?.is_sponsored ? 'Join Pool FREE' :
                 `Join Pool — ₦${(game?.entry_fee || 700).toLocaleString()}`}
              </button>
            )}
            {!canJoinFromSpectator && game?.status === 'live' && (
              <p className="text-xs text-muted-foreground text-center">
                Less than 10 mins remaining - entries closed
              </p>
            )}
          </div>
        )}

        {/* System Message */}
        {systemMessage && (
          <div className="mt-3 text-center text-sm text-primary font-medium animate-fade-in bg-primary/10 rounded-xl py-2">
            {systemMessage}
          </div>
        )}

        {/* Test Controls */}
        {isTestMode && (
          <div className="mt-3 space-y-2">
            <TestControls
              onEnd={handleTestEnd}
              onReset={handleTestReset}
              endLabel="End & Win"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setIsSpectator(!isSpectator)}
                className="flex-1 text-xs py-2 rounded-xl bg-muted text-muted-foreground hover:bg-muted/80"
              >
                Toggle Spectator
              </button>
              <button
                onClick={() => triggerCommentBurst(8)}
                className="flex-1 text-xs py-2 rounded-xl bg-primary/20 text-primary hover:bg-primary/30"
              >
                ⚡ Comment Burst
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Voice Room */}
      <div className="px-4 py-2">
        {(game?.id || isTestMode) && (
          <VoiceRoomLive 
            gameId={game?.id || 'test-game'}
            onMicToggle={(enabled) => console.log('Mic:', enabled)}
            onSpeakerToggle={(enabled) => setAudienceMuted(!enabled)}
          />
        )}
      </div>

      {/* Chat Feed */}
      <div 
        ref={chatRef}
        className="flex-1 overflow-y-auto p-4 flex flex-col-reverse"
      >
        <div className="space-y-2">
          {displayComments.slice(0, 30).map((comment, index) => {
            const username = comment.profile?.username || 'Unknown';
            const avatar = comment.profile?.avatar || '🎮';
            const isLeader = username === topThree[0]?.name;
            const isUser = comment.user_id === user?.id;
            
            return (
              <div
                key={comment.id}
                className={`flex items-start gap-3 p-3 rounded-xl animate-slide-up transition-all ${
                  isUser 
                    ? 'bg-primary/10 border border-primary/30' 
                    : isLeader
                      ? 'bg-gradient-to-r from-gold/10 to-transparent border border-gold/30'
                      : 'bg-card/50 border border-border/30'
                }`}
                style={{ animationDelay: `${index * 10}ms` }}
              >
                <div className={`w-10 h-10 rounded-xl bg-card flex items-center justify-center text-lg shrink-0 border ${isLeader ? 'border-gold/50' : 'border-border/50'}`}>
                  {avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className={`font-bold text-sm ${
                      isUser ? 'text-primary' : 
                      isLeader ? 'text-gold' : 'text-foreground'
                    }`}>
                      {username}
                    </p>
                    {isLeader && <Crown className="w-3.5 h-3.5 text-gold" />}
                    {index === 0 && <span className="text-[9px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full font-bold">LATEST</span>}
                  </div>
                  <p className="text-foreground text-sm mt-0.5">{comment.content}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Input */}
      <div className={`backdrop-blur-xl border-t p-4 sticky bottom-0 ${isGameTimeDanger ? 'bg-destructive/5 border-destructive/30' : 'bg-card/95 border-border/50'}`}>
        {isSpectator ? (
          <div className="text-center py-3 bg-muted/50 rounded-xl">
            <p className="text-sm text-muted-foreground">👀 You're watching as a spectator</p>
            <p className="text-xs text-muted-foreground mt-1">You can still talk in voice chat</p>
          </div>
        ) : (
          <div className="flex gap-3">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={isGameTimeDanger ? "⚡ Quick! Type to take the lead..." : "Type to claim the lead..."}
              className={`flex-1 border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:border-transparent transition-all ${
                isGameTimeDanger 
                  ? 'bg-destructive/10 border-destructive/30 focus:ring-destructive' 
                  : 'bg-muted/50 border-border/50 focus:ring-primary'
              }`}
              disabled={sending}
            />
            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || sending}
              className={`px-5 rounded-xl font-bold disabled:opacity-50 transition-all ${
                isGameTimeDanger 
                  ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' 
                  : 'bg-primary text-primary-foreground hover:bg-primary/90'
              }`}
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {/* Mic Check Modal */}
      <MicCheckModal 
        open={showMicCheck}
        onOpenChange={setShowMicCheck}
        onComplete={handleMicCheckComplete}
      />
    </div>
  );
};
