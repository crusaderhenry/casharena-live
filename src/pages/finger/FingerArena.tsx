import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar } from '@/components/Avatar';
import { LiveTimer } from '@/components/Countdown';
import { Send, AlertTriangle } from 'lucide-react';

interface Comment {
  id: string;
  user: string;
  text: string;
  timestamp: Date;
}

const AI_COMMENTS = [
  'Go!', '💨', 'Mine!', 'Here!', '👀', 'Now!', 'Yes!', '🔥', 'Me!', 'Ha!',
  'Try me', 'Too slow', 'Catch up', 'Easy', 'Next!', '😎', 'Winner', 'Last!',
];

const AI_PLAYERS = [
  'Adebayo K.', 'Chidinma U.', 'Emeka A.', 'Fatima B.', 'Grace O.',
  'Henry I.', 'Ifeoma C.', 'John D.', 'Kemi L.', 'Ladi M.',
];

export const FingerArena = () => {
  const navigate = useNavigate();
  const [timer, setTimer] = useState(60);
  const [comments, setComments] = useState<Comment[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [currentLeader, setCurrentLeader] = useState('');
  const [gameTime, setGameTime] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  // AI comments simulation
  useEffect(() => {
    if (isGameOver) return;

    const interval = setInterval(() => {
      // Random chance of AI commenting (increases as timer gets lower)
      const chance = timer < 30 ? 0.4 : timer < 45 ? 0.25 : 0.15;
      
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
      }
    }, 1000 + Math.random() * 2000);

    return () => clearInterval(interval);
  }, [timer, isGameOver]);

  // Timer countdown
  useEffect(() => {
    if (isGameOver) return;

    const interval = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          setIsGameOver(true);
          return 0;
        }
        return prev - 1;
      });
      
      setGameTime(prev => {
        // Max game duration: 20 minutes
        if (prev >= 1200) {
          setIsGameOver(true);
          return prev;
        }
        return prev + 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isGameOver]);

  // Navigate to results when game over
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
      }, 2000);
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
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  // Scroll to show latest
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = 0;
    }
  }, [comments]);

  if (isGameOver) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="w-24 h-24 rounded-full bg-secondary/20 flex items-center justify-center mb-6 animate-pulse">
          <AlertTriangle className="w-12 h-12 text-secondary" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Game Over!</h1>
        <p className="text-muted-foreground">Calculating winners...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="bg-card border-b border-border p-4 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="font-bold text-foreground">Live Finger Arena</h1>
            <p className="text-xs text-muted-foreground">Last comment standing wins!</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Game Time</p>
            <p className="font-medium text-foreground">{Math.floor(gameTime / 60)}:{(gameTime % 60).toString().padStart(2, '0')}</p>
          </div>
        </div>
        
        {/* Timer */}
        <div className={`text-center py-3 rounded-xl ${timer < 15 ? 'bg-destructive/20' : 'bg-secondary/10'}`}>
          <p className="text-xs text-muted-foreground mb-1">Time Until Winner</p>
          <LiveTimer seconds={timer} size="lg" warning={timer < 15} />
        </div>

        {/* Current Leader */}
        {currentLeader && (
          <div className="mt-3 flex items-center justify-center gap-2 bg-primary/10 rounded-xl p-2">
            <Avatar name={currentLeader} size="sm" />
            <span className={`font-bold ${currentLeader === 'You' ? 'text-primary' : 'text-foreground'}`}>
              {currentLeader === 'You' ? '🔥 You\'re leading!' : `${currentLeader} is leading`}
            </span>
          </div>
        )}
      </div>

      {/* Chat Feed */}
      <div 
        ref={chatRef}
        className="flex-1 overflow-y-auto p-4 flex flex-col-reverse"
      >
        <div className="space-y-2">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className={`flex items-start gap-3 p-3 rounded-xl animate-slide-up ${
                comment.user === 'You' 
                  ? 'bg-primary/10 border border-primary/30' 
                  : 'bg-card'
              }`}
            >
              <Avatar name={comment.user} size="sm" />
              <div className="flex-1 min-w-0">
                <p className={`font-medium text-sm ${
                  comment.user === 'You' ? 'text-primary' : 'text-foreground'
                }`}>
                  {comment.user}
                </p>
                <p className="text-foreground">{comment.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="bg-card border-t border-border p-4 sticky bottom-0">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type to claim the lead..."
            className="flex-1 bg-muted rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim()}
            className="btn-secondary px-4 disabled:opacity-50"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
