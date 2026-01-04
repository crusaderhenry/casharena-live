import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { VoiceRoom } from '@/components/VoiceRoom';
import { TestControls } from '@/components/TestControls';
import { useGame, mockPlayers, Comment } from '@/contexts/GameContext';
import { useSounds } from '@/hooks/useSounds';
import { useHaptics } from '@/hooks/useHaptics';
import { useCrusader } from '@/hooks/useCrusader';
import { useVoiceChat } from '@/hooks/useVoiceChat';
import { useAudio } from '@/contexts/AudioContext';
import { Send, Crown, Clock, Mic, Volume2, VolumeX, Users } from 'lucide-react';

const AI_COMMENTS = [
  'Go!', '💨', 'Mine!', 'Here!', '👀', 'Now!', 'Yes!', '🔥', 'Me!', 'Ha!',
  'Try me', 'Too slow', 'Catch up', 'Easy', 'Next!', '😎', 'Winner', 'Last!',
  'Nope!', 'Watch this', 'Coming through', '⚡', 'Not yet!', 'Boom!', '🚀',
  'Lol', 'Nah', 'Mine!!!', '🏆', 'Let\'s go!', 'EZ', 'GG', 'Wait', 'Yo!',
  'Bruh', 'Cap', 'Facts', 'W', 'No way', 'Fr fr', 'Yooo', '💀', 'Bet',
  'Clutch!', 'Top 3 locked', 'Not today!', 'Incoming!', 'Move!', 'Quick!',
];

interface TopThree {
  name: string;
  avatar: string;
  comment: string;
}

// Game settings (would come from backend in production)
const GAME_SETTINGS = {
  gameDurationSeconds: 30 * 60, // 30 minutes
  commentTimerSeconds: 60, // 60 seconds between comments
  dangerThresholdMinutes: 5, // Last 5 minutes is danger zone
};

export const FingerArena = () => {
  const navigate = useNavigate();
  const { isTestMode, resetFingerGame, userProfile, fingerPoolValue } = useGame();
  const { play } = useSounds();
  const { vibrate, buttonClick } = useHaptics();
  const crusader = useCrusader();
  const { simulatePlayerVoice } = useVoiceChat();
  const { playBackgroundMusic, stopBackgroundMusic } = useAudio();
  
  const [timer, setTimer] = useState(GAME_SETTINGS.commentTimerSeconds);
  const [gameTime, setGameTime] = useState(GAME_SETTINGS.gameDurationSeconds);
  const [inputValue, setInputValue] = useState('');
  const [isGameOver, setIsGameOver] = useState(false);
  const [showFreezeScreen, setShowFreezeScreen] = useState(false);
  const [systemMessage, setSystemMessage] = useState('');
  const [localComments, setLocalComments] = useState<Comment[]>([]);
  const [topThree, setTopThree] = useState<TopThree[]>([]);
  const [lastLeader, setLastLeader] = useState('');
  const [isShaking, setIsShaking] = useState(false);
  const [isSpectator, setIsSpectator] = useState(false);
  const [hostMuted, setHostMuted] = useState(false);
  const [audienceMuted, setAudienceMuted] = useState(false);
  const [audienceCount, setAudienceCount] = useState(() => 120 + Math.floor(Math.random() * 80));
  const chatRef = useRef<HTMLDivElement>(null);
  const hasAnnouncedStart = useRef(false);
  const lastHypeRef = useRef(0);
  const timerRef = useRef(GAME_SETTINGS.commentTimerSeconds);

  // Keep timer ref in sync
  useEffect(() => {
    timerRef.current = timer;
  }, [timer]);

  // Simulate live audience count
  useEffect(() => {
    const interval = setInterval(() => {
      setAudienceCount((prev) => {
        const step = Math.ceil(Math.random() * 3);
        const delta = Math.random() > 0.55 ? step : -step;
        return Math.max(0, prev + delta);
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Start background music
  useEffect(() => {
    playBackgroundMusic('arena');
    return () => stopBackgroundMusic();
  }, []);

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

  // Check for game time danger zone
  const isGameTimeDanger = gameTime <= GAME_SETTINGS.dangerThresholdMinutes * 60;

  // Update top 3 from comments
  useEffect(() => {
    const uniquePlayers = new Map<string, TopThree>();
    localComments.forEach(comment => {
      if (!uniquePlayers.has(comment.playerName)) {
        uniquePlayers.set(comment.playerName, {
          name: comment.playerName,
          avatar: comment.playerAvatar,
          comment: comment.text,
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
  }, [localComments, lastLeader, crusader, play]);

  // Start with some initial comments
  useEffect(() => {
    const initialComments: Comment[] = mockPlayers.slice(0, 5).map((player, i) => ({
      id: `init_${i}`,
      playerId: player.id,
      playerName: player.name,
      playerAvatar: player.avatar,
      text: AI_COMMENTS[Math.floor(Math.random() * AI_COMMENTS.length)],
      timestamp: new Date(Date.now() - (5 - i) * 1000),
    }));
    setLocalComments(initialComments);
    showSystemMessage('Game started! Be the last commenter!');

    if (!hasAnnouncedStart.current) {
      setTimeout(() => crusader.announceGameStart(), 500);
      hasAnnouncedStart.current = true;
    }
  }, []);

  const showSystemMessage = (msg: string) => {
    setSystemMessage(msg);
    setTimeout(() => setSystemMessage(''), 3000);
  };

  // Reset the 60s countdown whenever a new comment arrives
  useEffect(() => {
    if (isGameOver) return;
    if (localComments.length === 0) return;

    setTimer((prev) => (prev === GAME_SETTINGS.commentTimerSeconds ? prev : GAME_SETTINGS.commentTimerSeconds));
  }, [isGameOver, localComments[0]?.id]);

  // AI comments simulation (slower so the 60s timer actually counts down)
  useEffect(() => {
    if (isGameOver) return;

    const interval = setInterval(() => {
      const currentTimer = timerRef.current;

      // Lower chance overall, and VERY low near the end so the game can finish
      const chance = currentTimer <= 10 ? 0.06 : currentTimer <= 20 ? 0.16 : 0.26;

      if (Math.random() < chance) {
        const randomPlayer = mockPlayers[Math.floor(Math.random() * mockPlayers.length)];
        const randomComment = AI_COMMENTS[Math.floor(Math.random() * AI_COMMENTS.length)];

        const newComment: Comment = {
          id: `ai_${Date.now()}_${Math.random()}`,
          playerId: randomPlayer.id,
          playerName: randomPlayer.name,
          playerAvatar: randomPlayer.avatar,
          text: randomComment,
          timestamp: new Date(),
        };

        setLocalComments(prev => [newComment, ...prev].slice(0, 100));

        // Simulate player voice chat occasionally (respect audience mute)
        if (Math.random() > 0.85 && !audienceMuted) {
          simulatePlayerVoice(randomPlayer.name);
        }

        if (Math.random() > 0.75) {
          showSystemMessage(`⏱️ ${randomPlayer.name} reset the timer!`);
        }
      }
    }, 2500 + Math.random() * 3500); // 2.5s - 6s

    return () => clearInterval(interval);
  }, [isGameOver, audienceMuted, simulatePlayerVoice]);

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

  // Comment timer countdown (resets on new comment)
  useEffect(() => {
    if (isGameOver) return;

    const interval = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          endGame();
          return 0;
        }
        
        // Timer sound effects and screen shake
        if (prev <= 10) {
          play('urgent');
          vibrate('heavy');
          playBackgroundMusic('tense');
        } else if (prev <= 30) {
          play('tick');
        }
        
        // Crusader commentary for low timer
        crusader.announceTimerLow(prev);
        
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isGameOver, play, vibrate, crusader, playBackgroundMusic]);

  // Game time countdown (30 min total)
  useEffect(() => {
    if (isGameOver) return;

    const interval = setInterval(() => {
      setGameTime(prev => {
        if (prev <= 1) {
          endGame(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isGameOver]);

  const endGame = (timeout = false) => {
    setIsGameOver(true);
    setShowFreezeScreen(true);
    setIsShaking(false);
    stopBackgroundMusic();
    play('gameOver');
    vibrate('success');
    
    // Announce game over first
    crusader.announceGameOver();
    
    // Announce all winners
    if (topThree.length > 0) {
      // Announce 1st place winner
      setTimeout(() => {
        if (topThree[0]) {
          crusader.announceWinner(topThree[0].name, 1);
        }
      }, 2000);
      
      // Announce 2nd place
      setTimeout(() => {
        if (topThree[1]) {
          crusader.announceWinner(topThree[1].name, 2);
        }
      }, 4000);
      
      // Announce 3rd place
      setTimeout(() => {
        if (topThree[2]) {
          crusader.announceWinner(topThree[2].name, 3);
        }
      }, 6000);
    }
    
    showSystemMessage(timeout ? '⏰ Game time ended - 30 min limit!' : '🏆 60 seconds passed - Game over!');
  };

  // Navigate to results after freeze screen
  useEffect(() => {
    if (showFreezeScreen) {
      const timer = setTimeout(() => {
        const lastThreeCommenters = localComments.slice(0, 3).map(c => c.playerName);
        navigate('/finger/results', { 
          state: { 
            winners: lastThreeCommenters,
            totalPool: fingerPoolValue,
            isWinner: lastThreeCommenters.includes(userProfile.username),
            position: lastThreeCommenters.indexOf(userProfile.username) + 1,
          } 
        });
      }, 8000); // Extended to allow winner announcements
      return () => clearTimeout(timer);
    }
  }, [showFreezeScreen, localComments, navigate, userProfile.username, fingerPoolValue]);

  const handleSend = () => {
    if (!inputValue.trim() || isGameOver || isSpectator) return;

    const newComment: Comment = {
      id: `user_${Date.now()}`,
      playerId: 'user',
      playerName: userProfile.username,
      playerAvatar: userProfile.avatar,
      text: inputValue.trim(),
      timestamp: new Date(),
    };

    setLocalComments(prev => [newComment, ...prev].slice(0, 100));
    // Reset timer to 60 seconds
    setTimer(GAME_SETTINGS.commentTimerSeconds);
    setInputValue('');
    showSystemMessage("⏱️ Timer reset - You're leading!");
    
    play('send');
    buttonClick();
    
    // Crusader might comment on close calls
    if (timer < 10) {
      crusader.announceCloseCall();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTestEnd = () => {
    const winningComment: Comment = {
      id: `user_win_${Date.now()}`,
      playerId: 'user',
      playerName: userProfile.username,
      playerAvatar: userProfile.avatar,
      text: '🏆 Victory!',
      timestamp: new Date(),
    };
    setLocalComments(prev => [winningComment, ...prev]);
    endGame();
  };

  const handleTestReset = () => {
    resetFingerGame();
    setTimer(GAME_SETTINGS.commentTimerSeconds);
    setGameTime(GAME_SETTINGS.gameDurationSeconds);
    setIsGameOver(false);
    setShowFreezeScreen(false);
    setLocalComments([]);
    setTopThree([]);
    setLastLeader('');
    setIsShaking(false);
    hasAnnouncedStart.current = false;
  };

  const formatGameTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

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
          <div>
            <h1 className="font-bold text-foreground flex items-center gap-2">
              <span className="live-dot" />
              Live Finger Arena
            </h1>
            <p className="text-xs text-muted-foreground flex items-center gap-2">
              <span>Last comment standing wins!</span>
              <span className="inline-flex items-center gap-1">
                <Users className="w-3 h-3" />
                {audienceCount} watching
              </span>
            </p>
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
              <p className="font-black text-xl text-primary">₦{fingerPoolValue.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground">{mockPlayers.length + 10} players</p>
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
              <div className={`w-10 h-10 rounded-full bg-card flex items-center justify-center text-lg border-2 border-gold ${topThree[0]?.name === userProfile.username ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}`}>
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
        <VoiceRoom 
          players={mockPlayers.slice(0, 6)} 
          audienceMuted={audienceMuted}
          onAudienceMuteToggle={setAudienceMuted}
          audienceCount={audienceCount}
          isSpectator={isSpectator}
        />
      </div>

      {/* Chat Feed */}
      <div 
        ref={chatRef}
        className="flex-1 overflow-y-auto p-4 flex flex-col-reverse"
      >
        <div className="space-y-1.5">
          {localComments.slice(0, 30).map((comment, index) => {
            const isLeader = comment.playerName === topThree[0]?.name;
            const isUser = comment.playerId === 'user';
            
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
                  {comment.playerAvatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className={`font-bold text-xs ${
                      isUser ? 'text-primary' : 
                      isLeader ? 'text-gold' : 'text-foreground'
                    }`}>
                      {comment.playerName}
                    </p>
                    {isLeader && (
                      <Crown className="w-3 h-3 text-gold" />
                    )}
                  </div>
                  <p className="text-foreground text-sm">{comment.text}</p>
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
            />
            <button
              onClick={handleSend}
              disabled={!inputValue.trim()}
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
