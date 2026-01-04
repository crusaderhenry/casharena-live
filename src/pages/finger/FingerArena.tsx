import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { VoiceRoom } from '@/components/VoiceRoom';
import { TestControls } from '@/components/TestControls';
import { useGame, mockPlayers, Comment } from '@/contexts/GameContext';
import { Send, Crown, Clock, AlertTriangle } from 'lucide-react';

const AI_COMMENTS = [
  'Go!', '💨', 'Mine!', 'Here!', '👀', 'Now!', 'Yes!', '🔥', 'Me!', 'Ha!',
  'Try me', 'Too slow', 'Catch up', 'Easy', 'Next!', '😎', 'Winner', 'Last!',
  'Nope!', 'Watch this', 'Coming through', '⚡', 'Not yet!', 'Boom!', '🚀',
];

export const FingerArena = () => {
  const navigate = useNavigate();
  const { isTestMode, resetFingerGame, userProfile, fingerComments, addFingerComment } = useGame();
  
  const [timer, setTimer] = useState(60);
  const [gameTime, setGameTime] = useState(0);
  const [inputValue, setInputValue] = useState('');
  const [currentLeader, setCurrentLeader] = useState('');
  const [isGameOver, setIsGameOver] = useState(false);
  const [systemMessage, setSystemMessage] = useState('');
  const [localComments, setLocalComments] = useState<Comment[]>([]);
  const chatRef = useRef<HTMLDivElement>(null);

  // Start with some initial comments
  useEffect(() => {
    const initialComments: Comment[] = mockPlayers.slice(0, 3).map((player, i) => ({
      id: `init_${i}`,
      playerId: player.id,
      playerName: player.name,
      playerAvatar: player.avatar,
      text: AI_COMMENTS[Math.floor(Math.random() * AI_COMMENTS.length)],
      timestamp: new Date(Date.now() - (3 - i) * 1000),
    }));
    setLocalComments(initialComments);
    setCurrentLeader(initialComments[0]?.playerName || '');
    showSystemMessage('Game started! Be the last commenter!');
  }, []);

  const showSystemMessage = (msg: string) => {
    setSystemMessage(msg);
    setTimeout(() => setSystemMessage(''), 3000);
  };

  // AI comments simulation
  useEffect(() => {
    if (isGameOver) return;

    const interval = setInterval(() => {
      const chance = timer < 20 ? 0.55 : timer < 40 ? 0.35 : 0.25;
      
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
        
        setLocalComments(prev => [newComment, ...prev].slice(0, 50));
        setCurrentLeader(randomPlayer.name);
        setTimer(60);
        showSystemMessage(`⏱️ Timer reset - ${randomPlayer.name} is leading!`);
      }
    }, 800 + Math.random() * 1500);

    return () => clearInterval(interval);
  }, [timer, isGameOver]);

  // Timer countdown
  useEffect(() => {
    if (isGameOver) return;

    const interval = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          endGame();
          return 0;
        }
        return prev - 1;
      });
      
      setGameTime(prev => {
        if (prev >= 1200) { // 20 minutes max
          endGame(true);
          return prev;
        }
        return prev + 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isGameOver]);

  const endGame = (timeout = false) => {
    setIsGameOver(true);
    showSystemMessage(timeout ? '⏰ Game auto-ended - 20 min limit!' : '🏆 60 seconds passed - Game over!');
  };

  // Navigate to results
  useEffect(() => {
    if (isGameOver) {
      const lastThreeCommenters = localComments.slice(0, 3).map(c => c.playerName);
      setTimeout(() => {
        navigate('/finger/results', { 
          state: { 
            winners: lastThreeCommenters,
            totalPool: 23 * 700,
            isWinner: lastThreeCommenters.includes(userProfile.username),
            position: lastThreeCommenters.indexOf(userProfile.username) + 1,
          } 
        });
      }, 2500);
    }
  }, [isGameOver, localComments, navigate, userProfile.username]);

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

    setLocalComments(prev => [newComment, ...prev].slice(0, 50));
    setCurrentLeader(userProfile.username);
    setTimer(60);
    setInputValue('');
    showSystemMessage("⏱️ Timer reset - You're leading!");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTestEnd = () => {
    // Make user the winner
    const winningComment: Comment = {
      id: `user_win_${Date.now()}`,
      playerId: 'user',
      playerName: userProfile.username,
      playerAvatar: userProfile.avatar,
      text: '🏆 Victory!',
      timestamp: new Date(),
    };
    setLocalComments(prev => [winningComment, ...prev]);
    setCurrentLeader(userProfile.username);
    endGame();
  };

  const handleTestReset = () => {
    resetFingerGame();
    setTimer(60);
    setGameTime(0);
    setIsGameOver(false);
    setCurrentLeader('');
    setLocalComments([]);
  };

  if (isGameOver) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center mb-6 glow-primary animate-bounce-in">
          <Crown className="w-12 h-12 text-primary" />
        </div>
        <h1 className="text-2xl font-black text-foreground mb-2">Game Over!</h1>
        <p className="text-muted-foreground mb-4">Calculating winners...</p>
        <p className="text-lg font-bold text-primary">{currentLeader} wins!</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
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
        <div className={`text-center py-3 rounded-xl ${timer < 15 ? 'bg-destructive/20 border border-destructive/50' : 'bg-primary/10 border border-primary/30'}`}>
          <p className="text-xs text-muted-foreground mb-1">Time Until Winner</p>
          <p className={`timer-display ${timer < 15 ? 'timer-urgent' : ''}`}>{timer}s</p>
        </div>

        {/* Current Leader */}
        {currentLeader && (
          <div className={`mt-3 flex items-center justify-center gap-2 rounded-xl p-2.5 ${
            currentLeader === userProfile.username ? 'bg-primary/20 border border-primary/50 glow-primary' : 'bg-muted/50 border border-border/50'
          }`}>
            <Crown className={`w-4 h-4 ${currentLeader === userProfile.username ? 'text-primary' : 'text-muted-foreground'}`} />
            <span className={`font-bold ${currentLeader === userProfile.username ? 'text-primary' : 'text-foreground'}`}>
              {currentLeader === userProfile.username ? "🔥 You're leading!" : `${currentLeader} is leading`}
            </span>
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
        <div className="space-y-2">
          {localComments.map((comment, index) => (
            <div
              key={comment.id}
              className={`flex items-start gap-3 p-3 rounded-xl animate-slide-up ${
                comment.playerId === 'user' 
                  ? 'bg-primary/15 border border-primary/30' 
                  : comment.playerName === currentLeader
                    ? 'bg-card border border-primary/20'
                    : 'bg-card border border-border/50'
              }`}
              style={{ animationDelay: `${index * 20}ms` }}
            >
              <div className="w-10 h-10 rounded-full bg-card-elevated flex items-center justify-center text-lg">
                {comment.playerAvatar}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className={`font-bold text-sm ${
                    comment.playerId === 'user' ? 'text-primary' : 
                    comment.playerName === currentLeader ? 'text-primary' : 'text-foreground'
                  }`}>
                    {comment.playerName}
                  </p>
                  {comment.playerName === currentLeader && (
                    <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full font-bold">
                      LEADER
                    </span>
                  )}
                </div>
                <p className="text-foreground">{comment.text}</p>
              </div>
            </div>
          ))}
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
