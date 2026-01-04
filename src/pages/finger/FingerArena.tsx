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
import { Send, Crown, Clock, Mic } from 'lucide-react';

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

export const FingerArena = () => {
  const navigate = useNavigate();
  const { isTestMode, resetFingerGame, userProfile } = useGame();
  const { play } = useSounds();
  const { vibrate, buttonClick } = useHaptics();
  const crusader = useCrusader();
  const { simulatePlayerVoice } = useVoiceChat();
  const { playBackgroundMusic, stopBackgroundMusic } = useAudio();
  
  const [timer, setTimer] = useState(60);
  const [gameTime, setGameTime] = useState(0);
  const [inputValue, setInputValue] = useState('');
  const [isGameOver, setIsGameOver] = useState(false);
  const [showFreezeScreen, setShowFreezeScreen] = useState(false);
  const [systemMessage, setSystemMessage] = useState('');
  const [localComments, setLocalComments] = useState<Comment[]>([]);
  const [topThree, setTopThree] = useState<TopThree[]>([]);
  const [lastLeader, setLastLeader] = useState('');
  const [isShaking, setIsShaking] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);
  const hasAnnouncedStart = useRef(false);
  const lastHypeRef = useRef(0);

  // Start background music
  useEffect(() => {
    playBackgroundMusic('arena');
    return () => stopBackgroundMusic();
  }, []);

  // Screen shake when timer < 10
  useEffect(() => {
    if (timer <= 10 && timer > 0 && !isGameOver) {
      setIsShaking(true);
    } else {
      setIsShaking(false);
    }
  }, [timer, isGameOver]);

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

  // AI comments simulation - MORE FREQUENT for busy feel
  useEffect(() => {
    if (isGameOver) return;

    const interval = setInterval(() => {
      // Much higher chance for busy chat
      const chance = timer < 15 ? 0.85 : timer < 30 ? 0.7 : timer < 45 ? 0.5 : 0.4;
      
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
        setTimer(60);
        
        // Simulate player voice chat occasionally
        if (Math.random() > 0.85) {
          simulatePlayerVoice(randomPlayer.name);
        }
        
        // Only show system message occasionally to avoid spam
        if (Math.random() > 0.7) {
          showSystemMessage(`⏱️ ${randomPlayer.name} reset the timer!`);
        }
      }
    }, 300 + Math.random() * 600); // Much faster interval: 300-900ms

    return () => clearInterval(interval);
  }, [timer, isGameOver]);

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

  // Timer countdown with sound effects and Crusader
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
      
      setGameTime(prev => {
        if (prev >= 1200) {
          endGame(true);
          return prev;
        }
        return prev + 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isGameOver, play, vibrate, crusader, playBackgroundMusic]);

  const endGame = (timeout = false) => {
    setIsGameOver(true);
    setShowFreezeScreen(true);
    setIsShaking(false);
    stopBackgroundMusic();
    play('gameOver');
    vibrate('success');
    
    crusader.announceGameOver();
    if (topThree[0]) {
      crusader.announceWinner(topThree[0].name);
    }
    showSystemMessage(timeout ? '⏰ Game auto-ended - 20 min limit!' : '🏆 60 seconds passed - Game over!');
  };

  // Navigate to results after freeze screen
  useEffect(() => {
    if (showFreezeScreen) {
      const timer = setTimeout(() => {
        const lastThreeCommenters = localComments.slice(0, 3).map(c => c.playerName);
        navigate('/finger/results', { 
          state: { 
            winners: lastThreeCommenters,
            totalPool: 23 * 700,
            isWinner: lastThreeCommenters.includes(userProfile.username),
            position: lastThreeCommenters.indexOf(userProfile.username) + 1,
          } 
        });
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [showFreezeScreen, localComments, navigate, userProfile.username]);

  const handleSend = () => {
    if (!inputValue.trim() || isGameOver) return;

    const newComment: Comment = {
      id: `user_${Date.now()}`,
      playerId: 'user',
      playerName: userProfile.username,
      playerAvatar: userProfile.avatar,
      text: inputValue.trim(),
      timestamp: new Date(),
    };

    setLocalComments(prev => [newComment, ...prev].slice(0, 100));
    setTimer(60);
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
    setTimer(60);
    setGameTime(0);
    setIsGameOver(false);
    setShowFreezeScreen(false);
    setLocalComments([]);
    setTopThree([]);
    setLastLeader('');
    setIsShaking(false);
    hasAnnouncedStart.current = false;
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
            <p className="text-xs text-muted-foreground">Last comment standing wins!</p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              Game Time
            </div>
            <p className="font-bold text-foreground">{Math.floor(gameTime / 60)}:{(gameTime % 60).toString().padStart(2, '0')}</p>
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

        {/* Crusader Host Bar */}
        <div className="mt-2 flex items-center gap-2 bg-primary/10 rounded-lg px-3 py-1.5 border border-primary/30">
          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-sm">
            🎙️
          </div>
          <span className="text-xs text-primary font-medium">Crusader</span>
          <Mic className="w-3 h-3 text-primary animate-pulse" />
          <span className="text-[10px] text-muted-foreground ml-1">Hosting live</span>
        </div>

        {/* System Message */}
        {systemMessage && (
          <div className="mt-2 text-center text-sm text-primary font-medium animate-fade-in">
            {systemMessage}
          </div>
        )}

        {/* Test Controls */}
        {isTestMode && (
          <div className="mt-3">
            <TestControls
              onEnd={handleTestEnd}
              onReset={handleTestReset}
              endLabel="End & Win"
            />
          </div>
        )}
      </div>

      {/* Voice Room */}
      <div className="px-4 py-2">
        <VoiceRoom players={mockPlayers.slice(0, 6)} />
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
      </div>
    </div>
  );
};
