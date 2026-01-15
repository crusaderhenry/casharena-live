import { useState, useEffect } from 'react';

const ONBOARDING_COMPLETE_KEY = 'fortuneshq_onboarding_complete';
const ONBOARDING_REMINDED_KEY = 'fortuneshq_onboarding_reminded';

export const useOnboarding = () => {
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const completed = localStorage.getItem(ONBOARDING_COMPLETE_KEY);
    const reminded = sessionStorage.getItem(ONBOARDING_REMINDED_KEY);
    
    if (!completed && !reminded) {
      // Small delay for smooth initial load
      const timer = setTimeout(() => setShowOnboarding(true), 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const completeOnboarding = () => {
    localStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
    sessionStorage.removeItem(ONBOARDING_REMINDED_KEY);
    setShowOnboarding(false);
  };

  const remindLater = () => {
    sessionStorage.setItem(ONBOARDING_REMINDED_KEY, 'true');
    setShowOnboarding(false);
  };

  const resetOnboarding = () => {
    localStorage.removeItem(ONBOARDING_COMPLETE_KEY);
    sessionStorage.removeItem(ONBOARDING_REMINDED_KEY);
    setShowOnboarding(true);
  };

  return { showOnboarding, completeOnboarding, remindLater, resetOnboarding };
};
