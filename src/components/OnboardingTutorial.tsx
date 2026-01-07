import { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';

interface OnboardingTutorialProps {
  onComplete: () => void;
}

// Animated SVG illustrations for each step
const ZapIllustration = () => (
  <svg viewBox="0 0 120 120" className="w-full h-full animate-pulse">
    <defs>
      <linearGradient id="zapGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#0FB9B1" stopOpacity="1" />
        <stop offset="100%" stopColor="#0FB9B1" stopOpacity="0.5" />
      </linearGradient>
    </defs>
    <circle cx="60" cy="60" r="50" fill="url(#zapGrad)" opacity="0.2">
      <animate attributeName="r" values="45;55;45" dur="2s" repeatCount="indefinite" />
    </circle>
    <circle cx="60" cy="60" r="35" fill="url(#zapGrad)" opacity="0.3">
      <animate attributeName="r" values="30;40;30" dur="2s" repeatCount="indefinite" />
    </circle>
    <path d="M65 30 L45 60 L55 60 L50 90 L75 55 L62 55 Z" fill="#0FB9B1">
      <animate attributeName="opacity" values="1;0.7;1" dur="1s" repeatCount="indefinite" />
    </path>
  </svg>
);

const ChatIllustration = () => (
  <svg viewBox="0 0 120 120" className="w-full h-full">
    <defs>
      <linearGradient id="chatGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#0FB9B1" />
        <stop offset="100%" stopColor="#0A3F3C" />
      </linearGradient>
    </defs>
    <rect x="20" y="30" width="80" height="50" rx="10" fill="url(#chatGrad)" opacity="0.3" />
    <rect x="30" y="45" width="35" height="6" rx="3" fill="#0FB9B1" opacity="0.7">
      <animate attributeName="width" values="35;50;35" dur="1.5s" repeatCount="indefinite" />
    </rect>
    <rect x="30" y="55" width="25" height="6" rx="3" fill="#0FB9B1" opacity="0.5">
      <animate attributeName="width" values="25;40;25" dur="1.8s" repeatCount="indefinite" />
    </rect>
    <circle cx="85" cy="55" r="12" fill="#0FB9B1" opacity="0.6">
      <animate attributeName="r" values="10;14;10" dur="1s" repeatCount="indefinite" />
    </circle>
    <text x="85" y="60" textAnchor="middle" fill="#fff" fontSize="14">💬</text>
  </svg>
);

const TimerIllustration = () => (
  <svg viewBox="0 0 120 120" className="w-full h-full">
    <circle cx="60" cy="60" r="45" fill="none" stroke="#0FB9B1" strokeWidth="3" opacity="0.2" />
    <circle cx="60" cy="60" r="45" fill="none" stroke="#0FB9B1" strokeWidth="4" strokeLinecap="round"
      strokeDasharray="283" strokeDashoffset="70">
      <animate attributeName="stroke-dashoffset" values="283;70;283" dur="3s" repeatCount="indefinite" />
    </circle>
    <text x="60" y="55" textAnchor="middle" fill="#0FB9B1" fontSize="24" fontWeight="bold">60</text>
    <text x="60" y="72" textAnchor="middle" fill="#EAFDFC" fontSize="10" opacity="0.7">SECONDS</text>
    <circle cx="60" cy="25" r="4" fill="#0FB9B1">
      <animate attributeName="opacity" values="1;0.3;1" dur="1s" repeatCount="indefinite" />
    </circle>
  </svg>
);

const TrophyIllustration = () => (
  <svg viewBox="0 0 120 120" className="w-full h-full">
    <defs>
      <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#E6C87A" />
        <stop offset="100%" stopColor="#B8860B" />
      </linearGradient>
    </defs>
    <ellipse cx="60" cy="95" rx="25" ry="5" fill="#E6C87A" opacity="0.3">
      <animate attributeName="rx" values="20;30;20" dur="2s" repeatCount="indefinite" />
    </ellipse>
    <path d="M45 40 L45 25 L75 25 L75 40 C75 55 67 65 60 70 C53 65 45 55 45 40Z" fill="url(#goldGrad)">
      <animate attributeName="opacity" values="1;0.8;1" dur="1.5s" repeatCount="indefinite" />
    </path>
    <rect x="55" y="70" width="10" height="15" fill="#B8860B" />
    <rect x="45" y="85" width="30" height="8" rx="2" fill="#E6C87A" />
    <path d="M30 30 C25 30 25 45 35 45 L45 45 L45 35 C40 35 35 35 30 30Z" fill="#E6C87A" opacity="0.7" />
    <path d="M90 30 C95 30 95 45 85 45 L75 45 L75 35 C80 35 85 35 90 30Z" fill="#E6C87A" opacity="0.7" />
    <text x="60" y="55" textAnchor="middle" fill="#050A0E" fontSize="16">★</text>
  </svg>
);

const steps = [
  {
    illustration: ZapIllustration,
    title: "Welcome to Royal Rumble!",
    description: "A live social cash showdown where the last active players win.",
    highlight: "primary",
  },
  {
    illustration: ChatIllustration,
    title: "How It Works",
    description: "Join a live game, send comments to stay active. Every comment resets a 60-second timer.",
    highlight: "primary",
  },
  {
    illustration: TimerIllustration,
    title: "The Timer Is Key",
    description: "If no one comments for 60 seconds, the game ends. The last 3 people to comment WIN!",
    highlight: "primary",
  },
  {
    illustration: TrophyIllustration,
    title: "Win Big Prizes",
    description: "1st place gets 50%, 2nd gets 30%, 3rd gets 20% of the prize pool. Entry is just ₦700!",
    highlight: "gold",
  },
];

export const OnboardingTutorial = ({ onComplete }: OnboardingTutorialProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    setIsVisible(false);
    localStorage.setItem('fortuneshq_onboarding_complete', 'true');
    onComplete();
  };

  const handleSkip = () => {
    handleComplete();
  };

  if (!isVisible) return null;

  const step = steps[currentStep];
  const Illustration = step.illustration;

  return (
    <div className="fixed inset-0 z-[200] bg-background/95 backdrop-blur-md flex items-center justify-center p-6">
      {/* Close/Skip button */}
      <button
        onClick={handleSkip}
        className="absolute top-6 right-6 p-2 text-muted-foreground hover:text-foreground transition-colors"
      >
        <X className="w-6 h-6" />
      </button>

      <div className="w-full max-w-sm">
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentStep
                  ? 'w-8 bg-primary'
                  : index < currentStep
                  ? 'w-2 bg-primary/50'
                  : 'w-2 bg-muted'
              }`}
            />
          ))}
        </div>

        {/* Animated Illustration */}
        <div className="flex justify-center mb-6">
          <div
            className={`w-32 h-32 rounded-3xl flex items-center justify-center ${
              step.highlight === 'gold'
                ? 'bg-gold/10'
                : 'bg-primary/10'
            }`}
          >
            <Illustration />
          </div>
        </div>

        {/* Content */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-black text-foreground mb-3">{step.title}</h2>
          <p className="text-muted-foreground leading-relaxed">{step.description}</p>
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-3">
          {currentStep > 0 && (
            <button
              onClick={handlePrev}
              className="flex-1 btn-outline flex items-center justify-center gap-2"
            >
              <ChevronLeft className="w-5 h-5" />
              Back
            </button>
          )}
          <button
            onClick={handleNext}
            className={`flex-1 btn-primary flex items-center justify-center gap-2 ${
              currentStep === 0 ? 'w-full' : ''
            }`}
          >
            {currentStep === steps.length - 1 ? "Let's Go!" : 'Next'}
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Skip hint */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          {currentStep < steps.length - 1 && (
            <button onClick={handleSkip} className="hover:text-foreground transition-colors">
              Skip tutorial
            </button>
          )}
        </p>
      </div>
    </div>
  );
};

// Hook to check if onboarding should be shown
export const useOnboarding = () => {
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const completed = localStorage.getItem('fortuneshq_onboarding_complete');
    if (!completed) {
      // Small delay for smooth initial load
      const timer = setTimeout(() => setShowOnboarding(true), 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const completeOnboarding = () => {
    setShowOnboarding(false);
  };

  const resetOnboarding = () => {
    localStorage.removeItem('fortuneshq_onboarding_complete');
    setShowOnboarding(true);
  };

  return { showOnboarding, completeOnboarding, resetOnboarding };
};
