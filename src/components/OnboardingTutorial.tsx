import { useState, useEffect } from 'react';
import { Zap, MessageSquare, Trophy, Clock, X, ChevronRight, ChevronLeft } from 'lucide-react';

interface OnboardingTutorialProps {
  onComplete: () => void;
}

const steps = [
  {
    icon: Zap,
    title: "Welcome to Fastest Finger!",
    description: "The live comment battle where the last commenters standing win cash prizes.",
    highlight: "primary",
  },
  {
    icon: MessageSquare,
    title: "How It Works",
    description: "Join a live game, send comments to stay active. Every comment resets a 60-second timer.",
    highlight: "primary",
  },
  {
    icon: Clock,
    title: "The Timer Is Key",
    description: "If no one comments for 60 seconds, the game ends. The last 3 people to comment WIN!",
    highlight: "primary",
  },
  {
    icon: Trophy,
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
  const Icon = step.icon;

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

        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div
            className={`w-24 h-24 rounded-3xl flex items-center justify-center ${
              step.highlight === 'gold'
                ? 'bg-gold/20 glow-gold'
                : 'bg-primary/20 glow-primary'
            }`}
          >
            <Icon
              className={`w-12 h-12 ${
                step.highlight === 'gold' ? 'text-gold' : 'text-primary'
              }`}
            />
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
