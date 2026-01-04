import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BottomNav } from '@/components/BottomNav';
import { useWallet } from '@/contexts/WalletContext';
import { useGame } from '@/contexts/GameContext';
import { ChevronLeft, Target, Check } from 'lucide-react';

const QUESTIONS = [
  {
    question: "What is 15% of 240?",
    options: ["32", "36", "38", "40"],
    correct: 1,
  },
  {
    question: "If you invest ₦10,000 at 20% annual interest, what's the total after 1 year?",
    options: ["₦11,000", "₦12,000", "₦10,200", "₦12,500"],
    correct: 1,
  },
  {
    question: "A product costs ₦5,000. With 25% discount, what's the final price?",
    options: ["₦3,500", "₦3,750", "₦4,000", "₦4,250"],
    correct: 1,
  },
];

export const ArenaChallenge = () => {
  const navigate = useNavigate();
  const { addWinnings } = useWallet();
  const { submitArenaScore, addActivity } = useGame();
  const [currentQ, setCurrentQ] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);

  const handleAnswer = (index: number) => {
    if (selectedAnswer !== null) return;
    
    setSelectedAnswer(index);
    const isCorrect = index === QUESTIONS[currentQ].correct;
    
    if (isCorrect) {
      setScore(prev => prev + 100);
    }

    setTimeout(() => {
      if (currentQ < QUESTIONS.length - 1) {
        setCurrentQ(prev => prev + 1);
        setSelectedAnswer(null);
        setTimeLeft(30);
      } else {
        setShowResult(true);
        const finalScore = score + (isCorrect ? 100 : 0);
        submitArenaScore(finalScore);
        
        if (finalScore > 150) {
          const winAmount = Math.floor(finalScore * 10);
          addWinnings(winAmount, 'arena_win', `Arena Win: ${finalScore} points`);
          addActivity(`Won ₦${winAmount.toLocaleString()} in Arena!`, 'arena');
        }
      }
    }, 1500);
  };

  if (showResult) {
    const finalScore = score;
    const rank = finalScore >= 300 ? 5 : finalScore >= 200 ? 15 : 35;
    const winAmount = finalScore > 150 ? Math.floor(finalScore * 10) : 0;

    return (
      <div className="min-h-screen bg-background pb-24 flex flex-col">
        <div className="p-4 flex-1 flex flex-col items-center justify-center text-center">
          <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center mb-6 animate-bounce-in glow-primary">
            <span className="text-4xl">🎯</span>
          </div>
          
          <h1 className="text-3xl font-bold text-foreground mb-2 animate-slide-up">
            Challenge Complete!
          </h1>
          
          <div className="space-y-4 mb-8 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <div className="bg-card rounded-2xl p-6 border border-border">
              <p className="text-sm text-muted-foreground mb-2">Your Score</p>
              <p className="text-5xl font-bold text-money mb-4">{finalScore}</p>
              <p className="text-lg text-muted-foreground">Rank #{rank} of 847</p>
            </div>
            
            {winAmount > 0 && (
              <div className="bg-primary/10 rounded-2xl p-4 border border-primary/30">
                <p className="text-sm text-muted-foreground mb-1">You Won!</p>
                <p className="text-2xl font-bold text-money">₦{winAmount.toLocaleString()}</p>
              </div>
            )}
          </div>
          
          <div className="w-full space-y-3 animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <button
              onClick={() => navigate('/arena/leaderboard')}
              className="w-full btn-outline"
            >
              View Leaderboard
            </button>
            <button
              onClick={() => navigate('/home')}
              className="w-full btn-primary"
            >
              Back to Home
            </button>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  const question = QUESTIONS[currentQ];

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pt-2">
          <button 
            onClick={() => navigate('/arena')}
            className="w-10 h-10 rounded-xl bg-card flex items-center justify-center"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Question {currentQ + 1}/{QUESTIONS.length}</p>
            <p className="font-bold text-primary">Score: {score}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-secondary/20 flex items-center justify-center">
            <span className="font-bold text-secondary">{timeLeft}s</span>
          </div>
        </div>

        {/* Progress */}
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${((currentQ + 1) / QUESTIONS.length) * 100}%` }}
          />
        </div>

        {/* Question */}
        <div className="card-game">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <Target className="w-5 h-5 text-primary" />
            </div>
            <span className="text-sm text-muted-foreground">Quick Math</span>
          </div>
          
          <h2 className="text-xl font-bold text-foreground mb-6">
            {question.question}
          </h2>

          <div className="space-y-3">
            {question.options.map((option, index) => {
              const isSelected = selectedAnswer === index;
              const isCorrect = index === question.correct;
              const showAnswer = selectedAnswer !== null;
              
              return (
                <button
                  key={index}
                  onClick={() => handleAnswer(index)}
                  disabled={selectedAnswer !== null}
                  className={`w-full p-4 rounded-xl border-2 text-left font-medium transition-all ${
                    showAnswer
                      ? isCorrect
                        ? 'border-primary bg-primary/20 text-primary'
                        : isSelected
                          ? 'border-destructive bg-destructive/20 text-destructive'
                          : 'border-border bg-card text-muted-foreground'
                      : 'border-border bg-card hover:border-primary/50 text-foreground'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{option}</span>
                    {showAnswer && isCorrect && (
                      <Check className="w-5 h-5 text-primary" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
      
      <BottomNav />
    </div>
  );
};
