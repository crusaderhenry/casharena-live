import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar } from '@/components/Avatar';
import { LiveTimer } from '@/components/Countdown';
import { TestControls, useTestMode } from '@/components/TestModeToggle';
import { useSounds } from '@/hooks/useSounds';
import { useHaptics } from '@/hooks/useHaptics';
import { Send, AlertTriangle, Zap, Crown, Clock } from 'lucide-react';

interface Comment {
  id: string;
  user: string;
  text: string;
  timestamp: Date;
}

const AI_COMMENTS = [
  'Go!', '💨', 'Mine!', 'Here!', '👀', 'Now!', 'Yes!', '🔥', 'Me!', 'Ha!',
  'Try me', 'Too slow', 'Catch up', 'Easy', 'Next!', '😎', 'Winner', 'Last!',
  'Nope!', 'Watch this', 'Coming through', '⚡', 'Not yet!', 'Boom!', '🚀',
  'Mine mine', 'Gotcha', 'Nice try', 'Keep up!', 'Almost!', 'Nah', '💪',
];

const AI_PLAYERS = [
  'Adebayo K.', 'Chidinma U.', 'Emeka A.', 'Fatima B.', 'Grace O.',
  'Henry I.', 'Ifeoma C.', 'John D.', 'Kemi L.', 'Ladi M.',
  'Musa N.', 'Ngozi P.', 'Olumide R.', 'Patricia S.', 'Queen T.',
];

export const FingerArena = () => {
  const navigate = useNavigate();
  const [timer, setTimer] = useState(60);
  const [comments, setComments] = useState<Comment[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [currentLeader, setCurrentLeader] = useState('');
  const [gameTime, setGameTime] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [systemMessage, setSystemMessage] = useState('');
  const chatRef = useRef<HTMLDivElement>(null);
  const { play } = useSounds();
  const { buttonClick, success, warning } = useHaptics();
  const { isTestMode } = useTestMode();

  // Start with some initial comments
  useEffect(() => {
    const initialComments: Comment[] = [
      { id: 'init_1', user: 'Emeka A.', text: 'Let\'s go! 🔥', timestamp: new Date(Date.now() - 5000) },
      { id: 'init_2', user: 'Grace O.', text: 'Ready!', timestamp: new Date(Date.now() - 3000) },
      { id: 'init_3', user: 'Kemi L.', text: 'Game on! ⚡', timestamp: new Date(Date.now() - 1000) },
    ];
    setComments(initialComments);
    setCurrentLeader('Kemi L.');
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
        const randomPlayer = AI_PLAYERS[Math.floor(Math.random() * AI_PLAYERS.length)];
        const randomComment = AI_COMMENTS[Math.floor(Math.random() * AI_COMMENTS.length)];
        
        const newComment: Comment = {
          id: `ai_${Date.now()}_${Math.random()}`,
          user: randomPlayer,
          text: randomComment,
          timestamp: new Date(),
        };
        
        setComments(prev => [newComment, ...prev].slice(0, 50));
        setCurrentLeader(randomPlayer);
        setTimer(60);
        showSystemMessage(`⏱️ Timer reset - ${randomPlayer} is leading!`);
        play('click');
      }
    }, 800 + Math.random() * 1500);

    return () => clearInterval(interval);
  }, [timer, isGameOver, play]);

  // Timer countdown
  useEffect(() => {
    if (isGameOver) return;

    const interval = setInterval(() => {
      setTimer(prev => {
        if (prev <= 10 && prev > 0) {
          play('countdown');
          warning();
        }
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
    play('win');
    success();
    showSystemMessage(timeout ? '⏰ Game auto-ended - 20 min limit!' : '🏆 60 seconds passed - Game over!');
  };

  // Navigate to results
  useEffect(() => {
    if (isGameOver) {
      const lastThreeCommenters = comments.slice(0, 3).map(c => c.user);
      setTimeout(() => {
        navigate('/finger/results', { 
          state: { 
            winners: lastThreeCommenters,
            totalPool: 23 * 700,
            isWinner: lastThreeCommenters.includes('You'),
            position: lastThreeCommenters.indexOf('You') + 1,
          } 
        });
      }, 2500);
    }
  }, [isGameOver, comments, navigate]);

  const handleSend = () => {
    if (!inputValue.trim() || isGameOver) return;

    const newComment: Comment = {
      id: `user_${Date.now()}`,
      user: 'You',
      text: inputValue.trim(),
      timestamp: new Date(),
    };

    setComments(prev => [newComment, ...prev].slice(0, 50));
    setCurrentLeader('You');
    setTimer(60);
    setInputValue('');
    showSystemMessage('⏱️ Timer reset - You\'re leading!');
    play('success');
    buttonClick();
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
      user: 'You',
      text: '🏆 Victory!',
      timestamp: new Date(),
    };
    setComments(prev => [winningComment, ...prev]);
    setCurrentLeader('You');
    endGame();
  };

  const handleTestReset = () => {
    setTimer(60);
    setGameTime(0);
    setIsGameOver(false);
    setCurrentLeader('');
    setComments([]);
  };

  // Scroll to top
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = 0;
    }
  }, [comments]);

  if (isGameOver) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center mb-6 glow-strong animate-bounce-in">
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
              <Zap className="w-5 h-5 text-primary" />
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
        <div className={`text-center py-3 rounded-xl ${timer < 15 ? 'bg-destructive/20 animate-pulse border border-destructive/50' : 'bg-primary/10 border border-primary/30'}`}>
          <p className="text-xs text-muted-foreground mb-1">Time Until Winner</p>
          <LiveTimer seconds={timer} size="lg" warning={timer < 15} />
        </div>

        {/* Current Leader */}
        {currentLeader && (
          <div className={`mt-3 flex items-center justify-center gap-2 rounded-xl p-2.5 ${
            currentLeader === 'You' ? 'bg-primary/20 border border-primary/50 glow-primary' : 'bg-muted/50 border border-border/50'
          }`}>
            <Crown className={`w-4 h-4 ${currentLeader === 'You' ? 'text-primary' : 'text-muted-foreground'}`} />
            <span className={`font-bold ${currentLeader === 'You' ? 'text-primary' : 'text-foreground'}`}>
              {currentLeader === 'You' ? '🔥 You\'re leading!' : `${currentLeader} is leading`}
            </span>
          </div>
        )}

        {/* System Message */}
        {systemMessage && (
          <div className="mt-2 text-center text-sm text-secondary font-medium animate-fade-in">
            {systemMessage}
          </div>
        )}

        {/* Test Controls */}
        {isTestMode && (
          <div className="mt-3">
            <TestControls
              onStart={() => {}}
              onEnd={handleTestEnd}
              onReset={handleTestReset}
              isStarted={true}
              endLabel="End & Win"
            />
          </div>
        )}
      </div>

      {/* Chat Feed */}
      <div 
        ref={chatRef}
        className="flex-1 overflow-y-auto p-4 flex flex-col-reverse"
      >
        <div className="space-y-2">
          {comments.map((comment, index) => (
            <div
              key={comment.id}
              className={`flex items-start gap-3 p-3 rounded-xl animate-slide-up ${
                comment.user === 'You' 
                  ? 'bg-primary/15 border border-primary/30' 
                  : comment.user === currentLeader
                    ? 'bg-secondary/15 border border-secondary/30'
                    : 'bg-card border border-border/50'
              }`}
              style={{ animationDelay: `${index * 20}ms` }}
            >
              <Avatar name={comment.user} size="sm" isWinner={comment.user === currentLeader} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className={`font-bold text-sm ${
                    comment.user === 'You' ? 'text-primary' : 
                    comment.user === currentLeader ? 'text-secondary' : 'text-foreground'
                  }`}>
                    {comment.user}
                  </p>
                  {comment.user === currentLeader && (
                    <span className="text-[10px] bg-secondary/20 text-secondary px-1.5 py-0.5 rounded-full font-bold">
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
