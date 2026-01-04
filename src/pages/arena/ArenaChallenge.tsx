import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BottomNav } from '@/components/BottomNav';
import { TestControls, useTestMode } from '@/components/TestModeToggle';
import { useWallet } from '@/contexts/WalletContext';
import { useGame } from '@/contexts/GameContext';
import { ChevronLeft, Target, Check, X, Shield, Brain, Calculator, Eye, Lightbulb } from 'lucide-react';
import { useSounds } from '@/hooks/useSounds';
import { useHaptics } from '@/hooks/useHaptics';

const CHALLENGE_TYPES = [
  { id: 'math', name: 'Math Logic', icon: Calculator },
  { id: 'pattern', name: 'Pattern Recognition', icon: Eye },
  { id: 'memory', name: 'Memory Test', icon: Brain },
  { id: 'reasoning', name: 'Logical Reasoning', icon: Lightbulb },
];

const QUESTIONS = {
  math: [
    { question: "What is 15% of 240?", options: ["32", "36", "38", "40"], correct: 1 },
    { question: "If ₦10,000 grows by 20%, what's the total?", options: ["₦11,000", "₦12,000", "₦10,200", "₦12,500"], correct: 1 },
    { question: "25% discount on ₦5,000 =?", options: ["₦3,500", "₦3,750", "₦4,000", "₦4,250"], correct: 1 },
  ],
  pattern: [
    { question: "What comes next: 2, 6, 12, 20, ?", options: ["28", "30", "32", "24"], correct: 1 },
    { question: "Complete: A, C, F, J, ?", options: ["N", "O", "M", "P"], correct: 1 },
    { question: "Next: 1, 1, 2, 3, 5, ?", options: ["7", "8", "9", "6"], correct: 1 },
  ],
  memory: [
    { question: "If RED=1, BLUE=2, GREEN=3, what is BLUE+GREEN?", options: ["4", "5", "6", "3"], correct: 1 },
    { question: "NGN has 3 letters. USD has 3 letters. How many total?", options: ["5", "6", "7", "8"], correct: 1 },
    { question: "First letter of ARENA + last letter of CASH = ?", options: ["AH", "AC", "AS", "AE"], correct: 0 },
  ],
  reasoning: [
    { question: "All winners are players. All players pay. Therefore:", options: ["Winners don't pay", "All winners pay", "Some pay", "None pay"], correct: 1 },
    { question: "If A>B and B>C, then:", options: ["C>A", "A>C", "A=C", "B>A"], correct: 1 },
    { question: "Which doesn't belong: Pool, Arena, Finger, Table?", options: ["Pool", "Arena", "Finger", "Table"], correct: 3 },
  ],
};

export const ArenaChallenge = () => {
  const navigate = useNavigate();
  const { addWinnings } = useWallet();
  const { submitArenaScore, resetArena, addActivity } = useGame();
  const { isTestMode } = useTestMode();
  const { play } = useSounds();
  const { buttonClick, success, warning } = useHaptics();
  
  const [challengeType] = useState(() => {
    const types = Object.keys(QUESTIONS);
    return types[Math.floor(Math.random() * types.length)] as keyof typeof QUESTIONS;
  });
  const [questions] = useState(() => QUESTIONS[challengeType]);
  const [currentQ, setCurrentQ] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const [isTestStarted, setIsTestStarted] = useState(false);

  const challengeInfo = CHALLENGE_TYPES.find(c => c.id === challengeType);
  const ChallengeIcon = challengeInfo?.icon || Target;

  useEffect(() => {
    if (showResult) return;
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 5 && prev > 0) {
          play('countdown');
          warning();
        }
        if (prev <= 1) {
          handleAnswer(-1); // Time out
          return 30;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [currentQ, showResult]);

  const handleAnswer = (index: number) => {
    if (selectedAnswer !== null) return;
    
    setSelectedAnswer(index);
    const isCorrect = index === questions[currentQ].correct;
    
    if (isCorrect) {
      setScore(prev => prev + 100);
      play('success');
      success();
    } else {
      play('click');
      buttonClick();
    }

    setTimeout(() => {
      if (currentQ < questions.length - 1) {
        setCurrentQ(prev => prev + 1);
        setSelectedAnswer(null);
        setTimeLeft(30);
      } else {
        finishChallenge(isCorrect);
      }
    }, 1200);
  };

  const finishChallenge = (lastCorrect: boolean) => {
    setShowResult(true);
    const finalScore = score + (lastCorrect ? 100 : 0);
    submitArenaScore(finalScore);
    
    if (finalScore > 150) {
      const winAmount = Math.floor(finalScore * 10);
      addWinnings(winAmount, 'arena_win', `Arena Win: ${finalScore} points`);
      addActivity(`Won ₦${winAmount.toLocaleString()} in Arena!`, 'arena');
      play('win');
      success();
    }
  };

  const handleTestEnd = () => {
    finishChallenge(true);
  };

  const handleTestReset = () => {
    setIsTestStarted(false);
    setCurrentQ(0);
    setScore(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setTimeLeft(30);
    resetArena();
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
          
          <h1 className="text-3xl font-black text-foreground mb-2 animate-slide-up">
            Challenge Complete!
          </h1>
          
          <div className="space-y-4 mb-8 w-full max-w-sm">
            <div className="card-premium animate-fade-in">
              <p className="text-sm text-muted-foreground mb-2">Your Score</p>
              <p className="text-5xl font-black text-money mb-4">{finalScore}</p>
              <p className="text-lg text-muted-foreground">Rank #{rank} of 847</p>
            </div>
            
            {winAmount > 0 && (
              <div className="card-premium border-primary/50 glow-primary animate-scale-in">
                <p className="text-sm text-muted-foreground mb-1">You Won!</p>
                <p className="text-3xl font-black text-money">₦{winAmount.toLocaleString()}</p>
              </div>
            )}
          </div>
          
          <div className="w-full max-w-sm space-y-3">
            <button onClick={() => navigate('/arena/leaderboard')} className="w-full btn-outline">
              View Leaderboard
            </button>
            <button onClick={() => navigate('/home')} className="w-full btn-primary">
              Back to Home
            </button>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  const question = questions[currentQ];

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="p-4 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pt-2">
          <button 
            onClick={() => navigate('/arena')}
            className="w-10 h-10 rounded-xl bg-card flex items-center justify-center border border-border/50"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Question {currentQ + 1}/{questions.length}</p>
            <p className="font-bold text-primary">Score: {score}</p>
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg ${
            timeLeft <= 10 ? 'bg-destructive/20 text-destructive animate-pulse' : 'bg-secondary/20 text-secondary'
          }`}>
            {timeLeft}
          </div>
        </div>

        {/* Fairness Notice */}
        <div className="fairness-badge text-xs">
          <Shield className="w-3.5 h-3.5" />
          <span>This challenge is the same for all 847 players</span>
        </div>

        {/* Test Controls */}
        <TestControls
          onStart={() => setIsTestStarted(true)}
          onEnd={handleTestEnd}
          onReset={handleTestReset}
          isStarted={true}
          endLabel="Complete Challenge"
        />

        {/* Progress */}
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-300"
            style={{ width: `${((currentQ + 1) / questions.length) * 100}%` }}
          />
        </div>

        {/* Challenge Type Badge */}
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <ChallengeIcon className="w-4 h-4 text-primary" />
          <span>{challengeInfo?.name}</span>
        </div>

        {/* Question */}
        <div className="card-premium">
          <h2 className="text-xl font-bold text-foreground mb-6 text-center">
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
                  className={`w-full p-4 rounded-xl border-2 text-left font-medium transition-all flex items-center justify-between ${
                    showAnswer
                      ? isCorrect
                        ? 'border-primary bg-primary/20 text-primary'
                        : isSelected
                          ? 'border-destructive bg-destructive/20 text-destructive'
                          : 'border-border/50 bg-card text-muted-foreground'
                      : 'border-border/50 bg-card hover:border-primary/50 text-foreground'
                  }`}
                >
                  <span>{option}</span>
                  {showAnswer && isCorrect && <Check className="w-5 h-5 text-primary" />}
                  {showAnswer && isSelected && !isCorrect && <X className="w-5 h-5 text-destructive" />}
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
