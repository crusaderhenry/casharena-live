import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { VoiceRoomLive } from '@/components/VoiceRoomLive';
import { TestControls } from '@/components/TestControls';
import { useGame } from '@/contexts/GameContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLiveGame } from '@/hooks/useLiveGame';
import { useSounds } from '@/hooks/useSounds';
import { useHaptics } from '@/hooks/useHaptics';
import { useCrusaderHost } from '@/hooks/useCrusaderHost';
import { useAudio } from '@/contexts/AudioContext';
import { useToast } from '@/hooks/use-toast';
import { Send, Crown, Clock, Mic, Volume2, VolumeX, Users, LogOut } from 'lucide-react';
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
  const { isTestMode, resetFingerGame, userProfile } = useGame();
  const { profile, user } = useAuth();
  const { game, comments, participants, winners, sendComment, loading } = useLiveGame();
  const { play } = useSounds();
  const { vibrate, buttonClick } = useHaptics();
  const crusader = useCrusaderHost();
  const { playBackgroundMusic, stopBackgroundMusic } = useAudio();
  const { toast } = useToast();
  
  const [timer, setTimer] = useState(60);
  const [gameTime, setGameTime] = useState(20 * 60);
  const [inputValue, setInputValue] = useState('');
  const [isGameOver, setIsGameOver] = useState(false);
  const [showFreezeScreen, setShowFreezeScreen] = useState(false);
  const [systemMessage, setSystemMessage] = useState('');
  const [topThree, setTopThree] = useState<TopThree[]>([]);
  const [lastLeader, setLastLeader] = useState('');
  const [isShaking, setIsShaking] = useState(false);
  const [isSpectator, setIsSpectator] = useState(false);
  const [hostMuted, setHostMuted] = useState(false);
  const [audienceMuted, setAudienceMuted] = useState(false);
  const [sending, setSending] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);
  const hasAnnouncedStart = useRef(false);
  const lastHypeRef = useRef(0);

  // Sync with server game state
  useEffect(() => {
    if (game) {
      setTimer(game.countdown || 60);
      
      // Calculate remaining game time
      if (game.start_time) {
        const startTime = new Date(game.start_time).getTime();
        const now = Date.now();
        const elapsed = Math.floor((now - startTime) / 1000);
        const remaining = (game.max_duration * 60) - elapsed;
        setGameTime(Math.max(0, remaining));
      }

      // Update Crusader with current game state
      crusader.updateGameState({
        timer: game.countdown || 60,
        participantCount: game.participant_count || participants.length,
        poolValue: game.pool_value || 0,
        isLive: game.status === 'live',
        leader: topThree[0]?.name || null,
        commentCount: comments.length,
      });
    }
  }, [game?.countdown, game?.start_time, game?.max_duration, game?.pool_value, game?.participant_count, participants.length, topThree, comments.length, crusader]);

  // Check for game ended
  useEffect(() => {
    if (game?.status === 'ended' && !isGameOver) {
      setIsGameOver(true);
      setShowFreezeScreen(true);
      stopBackgroundMusic();
      play('gameOver');
      vibrate('success');
      
      // Announce with winner info
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

  // Update top 3 from comments
  useEffect(() => {
    const uniquePlayers = new Map<string, TopThree>();
    comments.forEach(comment => {
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

    // Announce leader changes
    if (top[0] && top[0].name !== lastLeader && lastLeader !== '') {
      crusader.announceLeaderChange(top[0].name);
      play('leaderChange');
    }
    if (top[0]) {
      setLastLeader(top[0].name);
    }
  }, [comments, lastLeader, crusader, play]);

  // Start background music and welcome
  useEffect(() => {
    playBackgroundMusic('arena');
    if (!hasAnnouncedStart.current && game) {
      showSystemMessage('Game started! Be the last commenter!');
      // Update game state first, then announce
      crusader.updateGameState({
        participantCount: game.participant_count || participants.length,
        poolValue: game.pool_value || 0,
        isLive: true,
      });
      setTimeout(() => crusader.announceGameStart(), 500);
      hasAnnouncedStart.current = true;
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
    
    // Announce at key timer milestones
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

  const isGameTimeDanger = gameTime <= 5 * 60;
  const audienceCount = participants.length || game?.participant_count || 0;

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

  const currentUsername = profile?.username || userProfile.username;
  const currentAvatar = profile?.avatar || userProfile.avatar;
  const poolValue = game?.pool_value || 0;

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Entering arena...</p>
        </div>
      </div>
    );
  }

  // Freeze Screen
  if (showFreezeScreen) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-foreground mb-2 animate-bounce-in">🏆 GAME OVER!</h1>
          <p className="text-muted-foreground">Winners determined!</p>
        </div>

        {/* Podium Display */}
        <div className="flex items-end justify-center gap-3 mb-8 w-full max-w-sm">
          {/* 2nd Place */}
          <div className="flex flex-col items-center flex-1">
            <div className="w-14 h-14 rounded-full bg-card-elevated flex items-center justify-center text-2xl border-2 border-silver mb-2 animate-fade-in" style={{ animationDelay: '0.3s' }}>
              {topThree[1]?.avatar || '🥈'}
            </div>
            <div className="podium-2 rounded-t-xl w-full py-4 text-center" style={{ height: '70px' }}>
              <p className="font-bold text-sm text-foreground truncate px-2">{topThree[1]?.name || '—'}</p>
              <p className="text-xs text-silver">2nd</p>
            </div>
          </div>

          {/* 1st Place */}
          <div className="flex flex-col items-center flex-1">
            <div className="text-2xl mb-1 animate-bounce-in">👑</div>
            <div className="w-16 h-16 rounded-full bg-card-elevated flex items-center justify-center text-2xl border-2 border-gold avatar-gold animate-winner-glow mb-2">
              {topThree[0]?.avatar || '🥇'}
            </div>
            <div className="podium-1 rounded-t-xl w-full py-6 text-center" style={{ height: '90px' }}>
              <p className="font-bold text-foreground truncate px-2">{topThree[0]?.name || '—'}</p>
              <p className="text-sm font-bold text-gold">1st</p>
            </div>
          </div>

          {/* 3rd Place */}
          <div className="flex flex-col items-center flex-1">
            <div className="w-14 h-14 rounded-full bg-card-elevated flex items-center justify-center text-2xl border-2 border-bronze mb-2 animate-fade-in" style={{ animationDelay: '0.5s' }}>
              {topThree[2]?.avatar || '🥉'}
            </div>
            <div className="podium-3 rounded-t-xl w-full py-3 text-center" style={{ height: '55px' }}>
              <p className="font-bold text-sm text-foreground truncate px-2">{topThree[2]?.name || '—'}</p>
              <p className="text-xs text-bronze">3rd</p>
            </div>
          </div>
        </div>

        <p className="text-muted-foreground text-sm animate-pulse">Calculating prizes...</p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-background flex flex-col ${isShaking ? 'animate-intense-shake' : ''}`}>
      {/* Header */}
      <div className="bg-card/98 backdrop-blur-xl border-b border-border/50 p-4 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            {/* Leave Button */}
            {isSpectator ? (
              <button
                onClick={() => navigate('/home')}
                className="p-2 rounded-full bg-muted text-muted-foreground hover:bg-muted/80 transition-all"
                title="Leave Arena"
              >
                <LogOut className="w-4 h-4" />
              </button>
            ) : (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    className="p-2 rounded-full bg-muted text-muted-foreground hover:bg-destructive/20 hover:text-destructive transition-all"
                    title="Leave Arena"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Leave the Arena?</AlertDialogTitle>
                    <AlertDialogDescription>
                      ⚠️ You're an active player in this game. If you leave now and a winner is determined before you return, you may lose your chance to win!
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
                <span className="live-dot" />
                Live Finger Arena
              </h1>
              <p className="text-xs text-muted-foreground flex items-center gap-2">
                <span>Last comment standing wins!</span>
                <span className="inline-flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {audienceCount} playing
                </span>
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              Game Time
            </div>
            <p className={`font-bold ${isGameTimeDanger ? 'text-destructive animate-pulse' : 'text-foreground'}`}>
              {formatGameTime(gameTime)}
            </p>
          </div>
        </div>

        {/* Pool Display */}
        <div className="bg-gradient-to-r from-primary/20 to-secondary/20 rounded-xl p-3 mb-3 border border-primary/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">💰</span>
              <span className="text-sm text-muted-foreground">Prize Pool</span>
            </div>
            <div className="text-right">
              <p className="font-black text-xl text-primary">₦{poolValue.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground">{audienceCount} players</p>
            </div>
          </div>
        </div>
        
        {/* Timer */}
        <div className={`text-center py-3 rounded-xl transition-all ${timer < 15 ? 'bg-destructive/20 border-2 border-destructive/50' : timer < 30 ? 'bg-orange-500/20 border border-orange-500/50' : 'bg-primary/10 border border-primary/30'}`}>
          <p className="text-xs text-muted-foreground mb-1">Time Until Winner</p>
          <p className={`timer-display ${timer < 15 ? 'timer-urgent animate-pulse' : timer < 30 ? 'text-orange-400' : ''}`}>{timer}s</p>
        </div>

        {/* Live Top 3 Podium */}
        <div className="mt-3 bg-muted/30 rounded-xl p-3 border border-border/50">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 text-center">🏆 Current Top 3</p>
          <div className="flex items-end justify-center gap-2">
            {/* 2nd Place */}
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-card flex items-center justify-center text-sm border border-silver">
                {topThree[1]?.avatar || '—'}
              </div>
              <div className="text-[10px] text-silver font-bold mt-1">2nd</div>
              <div className="text-[9px] text-muted-foreground truncate max-w-[50px]">{topThree[1]?.name?.split(' ')[0] || ''}</div>
            </div>
            
            {/* 1st Place */}
            <div className="flex flex-col items-center -mt-2">
              <Crown className="w-4 h-4 text-gold mb-0.5" />
              <div className={`w-10 h-10 rounded-full bg-card flex items-center justify-center text-lg border-2 border-gold ${topThree[0]?.name === currentUsername ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}`}>
                {topThree[0]?.avatar || '—'}
              </div>
              <div className="text-xs text-gold font-bold mt-1">1st</div>
              <div className="text-[10px] text-foreground font-medium truncate max-w-[60px]">{topThree[0]?.name?.split(' ')[0] || ''}</div>
            </div>
            
            {/* 3rd Place */}
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-card flex items-center justify-center text-sm border border-bronze">
                {topThree[2]?.avatar || '—'}
              </div>
              <div className="text-[10px] text-bronze font-bold mt-1">3rd</div>
              <div className="text-[9px] text-muted-foreground truncate max-w-[50px]">{topThree[2]?.name?.split(' ')[0] || ''}</div>
            </div>
          </div>
        </div>

        {/* Crusader Host Bar with Mute Controls */}
        <div className="mt-2 flex items-center gap-2 bg-primary/10 rounded-lg px-3 py-1.5 border border-primary/30">
          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-sm">
            🎙️
          </div>
          <span className="text-xs text-primary font-medium">Crusader</span>
          {!hostMuted && <Mic className="w-3 h-3 text-primary animate-pulse" />}
          <span className="text-[10px] text-muted-foreground ml-1">Hosting live</span>
          
          <div className="ml-auto flex items-center gap-2">
            {/* Host Mute */}
            <button
              onClick={() => setHostMuted(!hostMuted)}
              className={`p-1.5 rounded-full transition-all ${hostMuted ? 'bg-destructive/20 text-destructive' : 'bg-primary/20 text-primary'}`}
              title={hostMuted ? 'Unmute Host' : 'Mute Host'}
            >
              {hostMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Spectator Mode Badge */}
        {isSpectator && (
          <div className="mt-2 bg-orange-500/20 border border-orange-500/50 rounded-lg px-3 py-2 text-center">
            <p className="text-xs text-orange-400 font-medium flex items-center justify-center gap-1">
              <Users className="w-3 h-3" />
              Spectator Mode - Watch only
            </p>
          </div>
        )}

        {/* System Message */}
        {systemMessage && (
          <div className="mt-2 text-center text-sm text-primary font-medium animate-fade-in">
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
            <button
              onClick={() => setIsSpectator(!isSpectator)}
              className="w-full text-xs py-1.5 rounded bg-muted text-muted-foreground"
            >
              Toggle Spectator Mode
            </button>
          </div>
        )}
      </div>

      {/* Voice Room */}
      <div className="px-4 py-2">
        {game?.id && (
          <VoiceRoomLive 
            gameId={game.id}
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
        <div className="space-y-1.5">
          {comments.slice(0, 30).map((comment, index) => {
            const username = comment.profile?.username || 'Unknown';
            const avatar = comment.profile?.avatar || '🎮';
            const isLeader = username === topThree[0]?.name;
            const isUser = comment.user_id === user?.id;
            
            return (
              <div
                key={comment.id}
                className={`flex items-start gap-2 p-2 rounded-lg animate-slide-up ${
                  isUser 
                    ? 'bg-primary/15 border border-primary/30' 
                    : isLeader
                      ? 'bg-card border border-gold/30'
                      : 'bg-card/50 border border-border/30'
                }`}
                style={{ animationDelay: `${index * 10}ms` }}
              >
                <div className={`w-8 h-8 rounded-full bg-card-elevated flex items-center justify-center text-sm shrink-0 ${isLeader ? 'ring-1 ring-gold' : ''}`}>
                  {avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className={`font-bold text-xs ${
                      isUser ? 'text-primary' : 
                      isLeader ? 'text-gold' : 'text-foreground'
                    }`}>
                      {username}
                    </p>
                    {isLeader && (
                      <Crown className="w-3 h-3 text-gold" />
                    )}
                  </div>
                  <p className="text-foreground text-sm">{comment.content}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Input */}
      <div className="bg-card/98 backdrop-blur-xl border-t border-border/50 p-4 sticky bottom-0">
        {isSpectator ? (
          <div className="text-center py-3 bg-muted/50 rounded-xl">
            <p className="text-sm text-muted-foreground">👀 You're watching as a spectator</p>
            <p className="text-xs text-muted-foreground mt-1">You can still talk in voice chat</p>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type to claim the lead..."
              className="flex-1 bg-muted/50 border border-border/50 rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              disabled={sending}
            />
            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || sending}
              className="btn-primary px-5 disabled:opacity-50"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};