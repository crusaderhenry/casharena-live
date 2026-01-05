import { useState, useEffect, useRef, useMemo } from 'react';
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
import { Send, Crown, Clock, Mic, Volume2, VolumeX, Users, LogOut, AlertTriangle, Zap, Trophy, Radio, Timer, Flame, Eye } from 'lucide-react';
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
  const { game, comments, participants, winners, sendComment, loading } = useLiveGame();
  const { play } = useSounds();
  const { vibrate, buttonClick } = useHaptics();
  const crusader = useCrusaderHost();
  const { playBackgroundMusic, stopBackgroundMusic } = useAudio();
  const { toast } = useToast();
  const { gameTimeRemaining, synced } = useServerTime();
  const { mockComments, triggerCommentBurst } = useMockSimulation(isTestMode, game?.id);
  
  const [timer, setTimer] = useState(60);
  const [gameTime, setGameTime] = useState(20 * 60);
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
  const chatRef = useRef<HTMLDivElement>(null);
  const hasAnnouncedStart = useRef(false);
  const lastHypeRef = useRef(0);

  const currentUsername = profile?.username || userProfile.username;
  const currentAvatar = profile?.avatar || userProfile.avatar;
  const poolValue = game?.pool_value || 0;
  const audienceCount = participants.length || game?.participant_count || 0;
  const isGameTimeDanger = isEndingSoon || gameTime <= 5 * 60;
  const isTimerUrgent = timer <= 15;

  // Sync with server game state using server-authoritative time
  useEffect(() => {
    if (!game) return;
    
    setTimer(game.countdown || 60);
    
    const updateGameTime = () => {
      if (game.start_time) {
        const remaining = gameTimeRemaining(game.start_time, game.max_duration);
        setGameTime(remaining);
        const inDangerZone = remaining <= 300 && remaining > 0;
        setIsEndingSoon(inDangerZone);
      }
    };
    
    updateGameTime();
    const interval = setInterval(updateGameTime, 1000);
    return () => clearInterval(interval);
  }, [game?.countdown, game?.start_time, game?.max_duration, synced, gameTimeRemaining]);

  // Update Crusader with game state
  useEffect(() => {
    if (game) {
      crusader.updateGameState({
        timer: game.countdown || 60,
        participantCount: game.participant_count || participants.length,
        poolValue: game.pool_value || 0,
        isLive: game.status === 'live',
        leader: topThree[0]?.name || null,
        commentCount: comments.length,
      });
    }
  }, [game?.countdown, game?.pool_value, game?.participant_count, topThree[0]?.name, comments.length]);

  // Check for game ended
  useEffect(() => {
    if (game?.status === 'ended' && !isGameOver) {
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

  // Navigate to results when winners are determined
  useEffect(() => {
    if (winners.length > 0 && isGameOver) {
      const timeout = setTimeout(() => {
        const winnerNames = winners.sort((a, b) => a.position - b.position).map(w => w.profile?.username || 'Unknown');
        const isWinner = winners.some(w => w.user_id === user?.id);
        const userPosition = winners.find(w => w.user_id === user?.id)?.position || 0;
        
        navigate('/finger/results', {
          state: {
            winners: winnerNames,
            totalPool: game?.pool_value || 0,
            isWinner,
            position: userPosition,
          }
        });
      }, 5000);
      
      return () => clearTimeout(timeout);
    }
  }, [winners, isGameOver, navigate, user?.id, game?.pool_value]);

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

  // Start background music and welcome
  useEffect(() => {
    playBackgroundMusic('arena');
    if (!hasAnnouncedStart.current && game) {
      showSystemMessage('Game started! Be the last commenter!');
      crusader.updateGameState({
        participantCount: game.participant_count || participants.length,
        poolValue: game.pool_value || 0,
        isLive: true,
      });
      setTimeout(() => crusader.announceGameStart(), 500);
      hasAnnouncedStart.current = true;
    }

    const micCheckDone = sessionStorage.getItem('micCheckComplete');
    if (!micCheckDone) {
      setTimeout(() => setShowMicCheck(true), 2000);
    }

    return () => stopBackgroundMusic();
  }, [game?.id]);

  // Handle host mute
  useEffect(() => {
    crusader.setEnabled(!hostMuted);
  }, [hostMuted, crusader]);

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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-14 h-14 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground font-medium">Entering arena...</p>
        </div>
      </div>
    );
  }

  // Freeze Screen
  if (showFreezeScreen) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5 flex flex-col items-center justify-center p-6">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4 animate-bounce-in">🏆</div>
          <h1 className="text-3xl font-black text-foreground mb-2">GAME OVER!</h1>
          <p className="text-muted-foreground">Winners determined!</p>
        </div>

        {/* Podium Display */}
        <div className="flex items-end justify-center gap-4 mb-8 w-full max-w-sm">
          {/* 2nd Place */}
          <div className="flex flex-col items-center flex-1">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-silver/30 to-silver/10 flex items-center justify-center text-2xl border-2 border-silver/50 mb-2 animate-fade-in" style={{ animationDelay: '0.3s' }}>
              {topThree[1]?.avatar || '🥈'}
            </div>
            <div className="bg-gradient-to-t from-silver/20 to-silver/10 rounded-t-xl w-full py-4 text-center border border-silver/30" style={{ height: '70px' }}>
              <p className="font-bold text-sm text-foreground truncate px-2">{topThree[1]?.name || '—'}</p>
              <p className="text-xs text-silver font-bold">2nd</p>
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
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-muted-foreground animate-pulse">
          <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          <span className="text-sm">Calculating prizes...</span>
        </div>
      </div>
    );
  }

  // Mock game for test mode
  const mockGame = {
    id: 'test-game',
    name: 'Test Game',
    status: 'live' as const,
    pool_value: 35000,
    participant_count: 24,
    countdown: 60,
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
        
        {/* Timer */}
        <div className={`mt-3 text-center py-4 rounded-2xl transition-all border-2 ${
          timer <= 10 ? 'bg-destructive/20 border-destructive/50 animate-pulse' : 
          timer <= 30 ? 'bg-orange-500/20 border-orange-500/30' : 
          'bg-primary/10 border-primary/20'
        }`}>
          <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Time Until Winner</p>
          <p className={`text-5xl font-black font-mono ${
            timer <= 10 ? 'text-destructive animate-pulse' : 
            timer <= 30 ? 'text-orange-400' : 'text-foreground'
          }`}>{timer}s</p>
          {timer <= 15 && (
            <p className="text-xs text-destructive font-bold mt-1 flex items-center justify-center gap-1">
              <Flame className="w-3 h-3" /> CRITICAL - Comment now!
            </p>
          )}
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

        {/* Spectator Mode Badge */}
        {isSpectator && (
          <div className="mt-3 bg-orange-500/10 border border-orange-500/30 rounded-xl px-4 py-2 text-center">
            <p className="text-xs text-orange-400 font-medium flex items-center justify-center gap-1">
              <Users className="w-3 h-3" />
              Spectator Mode - Watch only
            </p>
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
