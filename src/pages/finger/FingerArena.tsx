import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar } from '@/components/Avatar';
import { VoiceRoom } from '@/components/VoiceRoom';
import { LiveTimer } from '@/components/Countdown';
import { TestControls, useTestMode } from '@/components/TestModeToggle';
import { useSounds } from '@/hooks/useSounds';
import { useHaptics } from '@/hooks/useHaptics';
import { Send, Zap, Crown, Clock, AlertTriangle } from 'lucide-react';

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
  const [top3, setTop3] = useState<string[]>([]);
  const [gameTime, setGameTime] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [systemMessage, setSystemMessage] = useState('');
  const chatRef = useRef<HTMLDivElement>(null);
  const { play } = useSounds();
  const { buttonClick, success, warning } = useHaptics();
  const { isTestMode } = useTestMode();

  useEffect(() => {
    const initialComments: Comment[] = [
      { id: 'init_1', user: 'Emeka A.', text: 'Let\'s go! 🔥', timestamp: new Date(Date.now() - 5000) },
      { id: 'init_2', user: 'Grace O.', text: 'Ready!', timestamp: new Date(Date.now() - 3000) },
      { id: 'init_3', user: 'Kemi L.', text: 'Game on! ⚡', timestamp: new Date(Date.now() - 1000) },
    ];
    setComments(initialComments);
    setCurrentLeader('Kemi L.');
    setTop3(['Kemi L.', 'Grace O.', 'Emeka A.']);
    showSystemMessage('🎮 Game started! Be the last commenter!');
  }, []);

  const showSystemMessage = (msg: string) => {
    setSystemMessage(msg);
    setTimeout(() => setSystemMessage(''), 3000);
  };

  const updateTop3 = (newLeader: string) => {
    setTop3(prev => {
      const filtered = prev.filter(p => p !== newLeader);
      return [newLeader, ...filtered].slice(0, 3);
    });
    setCurrentLeader(newLeader);
  };

  useEffect(() => {
    if (isGameOver) return;

    const interval = setInterval(() => {
      const chance = timer < 20 ? 0.6 : timer < 40 ? 0.4 : 0.25;
      
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
        updateTop3(randomPlayer);
        setTimer(60);
        showSystemMessage(`⏱️ Timer reset — ${randomPlayer.split(' ')[0]} is leading!`);
        play('click');
      }
    }, 800 + Math.random() * 1500);

    return () => clearInterval(interval);
  }, [timer, isGameOver, play]);

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
        if (prev >= 1200) {
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
    showSystemMessage(timeout ? '⏰ Game auto-ended — 20 min limit!' : '🏆 Time\'s up — Game over!');
  };

  useEffect(() => {
    if (isGameOver) {
      setTimeout(() => {
        navigate('/finger/results', { 
          state: { 
            winners: top3,
            totalPool: 23 * 700,
            isWinner: top3.includes('You'),
            position: top3.indexOf('You') + 1,
          } 
        });
      }, 2500);
    }
  }, [isGameOver, top3, navigate]);

  const handleSend = () => {
    if (!inputValue.trim() || isGameOver) return;

    const newComment: Comment = {
      id: `user_${Date.now()}`,
      user: 'You',
      text: inputValue.trim(),
      timestamp: new Date(),
    };

    setComments(prev => [newComment, ...prev].slice(0, 50));
    updateTop3('You');
    setTimer(60);
    setInputValue('');
    showSystemMessage('⏱️ Timer reset — You\'re leading!');
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
    const winningComment: Comment = {
      id: `user_win_${Date.now()}`,
      user: 'You',
      text: '🏆 Victory!',
      timestamp: new Date(),
    };
    setComments(prev => [winningComment, ...prev]);
    setTop3(['You', top3[0] === 'You' ? top3[1] : top3[0], top3[1] === 'You' ? top3[2] : top3[1]]);
    setCurrentLeader('You');
    endGame();
  };

  const handleTestReset = () => {
    setTimer(60);
    setGameTime(0);
    setIsGameOver(false);
    setCurrentLeader('');
    setTop3([]);
    setComments([]);
  };

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = 0;
    }
  }, [comments]);

  if (isGameOver) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="w-28 h-28 rounded-full bg-primary/20 flex items-center justify-center mb-8 shadow-glow-lg animate-bounce-in">
          <Crown className="w-14 h-14 text-primary" />
        </div>
        <h1 className="text-3xl font-extrabold text-foreground mb-2">Game Over!</h1>
        <p className="text-muted-foreground mb-6">Calculating winners...</p>
        <p className="text-xl font-bold text-primary">{currentLeader} wins!</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="bg-background/80 backdrop-blur-xl border-b border-border/30 p-4 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="font-bold text-foreground flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              Live Finger Arena
            </h1>
            <p className="text-xs text-muted-foreground">Last comment wins!</p>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-bold text-foreground tabular-nums">
              {Math.floor(gameTime / 60)}:{(gameTime % 60).toString().padStart(2, '0')}
            </span>
          </div>
        </div>
        
        {/* Timer */}
        <div className={`text-center py-5 rounded-2xl mb-4 transition-all duration-300 ${
          timer < 15 
            ? 'bg-destructive/15 border border-destructive/40' 
            : 'bg-primary/10 border border-primary/30'
        }`}>
          <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-medium">Time Until Winner</p>
          <LiveTimer seconds={timer} size="lg" warning={timer < 15} />
        </div>

        {/* Live Top 3 Panel */}
        <div className="card-glass mb-4">
          <p className="text-2xs text-muted-foreground uppercase tracking-widest mb-3 text-center font-semibold">
            Live Rankings
          </p>
          <div className="flex items-center justify-center gap-6">
            {top3.map((player, i) => (
              <div key={player} className="flex flex-col items-center">
                <div className={`relative ${i === 0 ? 'animate-glow-pulse' : ''}`}>
                  <Avatar name={player} size="md" position={i + 1} isWinner={i === 0} />
                </div>
                <p className={`text-2xs mt-2 font-bold truncate max-w-[60px] ${
                  player === 'You' ? 'text-primary' : 'text-muted-foreground'
                }`}>
                  {player === 'You' ? 'You' : player.split(' ')[0]}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* System Message */}
        {systemMessage && (
          <div className="text-center text-sm text-secondary font-bold animate-slide-down bg-secondary/10 rounded-xl py-2.5 mb-4 border border-secondary/30">
            {systemMessage}
          </div>
        )}

        {/* Test Controls */}
        {isTestMode && (
          <TestControls
            onStart={() => {}}
            onEnd={handleTestEnd}
            onReset={handleTestReset}
            isStarted={true}
            endLabel="End & Win"
          />
        )}
      </div>

      {/* Voice Room */}
      <div className="px-4 pt-3">
        <VoiceRoom />
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
              className={`flex items-start gap-3 p-3 rounded-2xl animate-slide-up transition-all ${
                comment.user === 'You' 
                  ? 'bg-primary/15 border border-primary/30' 
                  : comment.user === currentLeader
                    ? 'bg-secondary/10 border border-secondary/30'
                    : 'bg-card border border-border/40'
              }`}
              style={{ animationDelay: `${index * 15}ms` }}
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
                    <span className="badge-gold text-2xs py-0.5 px-2">
                      LEADER
                    </span>
                  )}
                </div>
                <p className="text-foreground text-sm mt-0.5">{comment.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="bg-background/80 backdrop-blur-xl border-t border-border/30 p-4 sticky bottom-0">
        <div className="flex gap-3">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type to claim the lead..."
            className="flex-1 bg-muted/40 border border-border/50 rounded-2xl px-5 py-3.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all"
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim()}
            className="btn-primary px-5 disabled:opacity-40"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
