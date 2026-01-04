import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '@/contexts/GameContext';
import { Target, Flame, Sparkles, Zap } from 'lucide-react';

const styles = [
  { id: 'skill', label: 'Skill', icon: Target, color: 'primary' },
  { id: 'consistency', label: 'Consistency', icon: Flame, color: 'secondary' },
  { id: 'luck', label: 'Luck', icon: Sparkles, color: 'primary' },
  { id: 'speed', label: 'Speed', icon: Zap, color: 'secondary' },
];

export const PlayStyle = () => {
  const navigate = useNavigate();
  const { setPlayStyle } = useGame();
  const [selected, setSelected] = useState<string | null>(null);

  const handleContinue = () => {
    if (selected) {
      setPlayStyle(selected);
    }
    navigate('/onboarding/funding');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col p-6">
      <div className="flex-1">
        <h1 className="text-3xl font-bold text-foreground mb-2 animate-slide-up">
          Choose Your Play Style
        </h1>
        <p className="text-muted-foreground mb-8 animate-slide-up" style={{ animationDelay: '0.05s' }}>
          This helps us personalize your experience
        </p>
        
        <div className="grid grid-cols-2 gap-4">
          {styles.map((style, index) => {
            const Icon = style.icon;
            const isSelected = selected === style.id;
            return (
              <button
                key={style.id}
                onClick={() => setSelected(style.id)}
                className={`card-game flex flex-col items-center justify-center py-8 transition-all duration-300 animate-scale-in ${
                  isSelected 
                    ? 'border-primary glow-primary' 
                    : 'hover:border-primary/30'
                }`}
                style={{ animationDelay: `${0.1 + index * 0.08}s` }}
              >
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-3 ${
                  style.color === 'primary' ? 'bg-primary/20' : 'bg-secondary/20'
                }`}>
                  <Icon className={`w-7 h-7 ${
                    style.color === 'primary' ? 'text-primary' : 'text-secondary'
                  }`} />
                </div>
                <span className="font-bold text-foreground">{style.label}</span>
              </button>
            );
          })}
        </div>
      </div>
      
      <button
        onClick={handleContinue}
        className="btn-primary w-full text-lg py-4 mt-8 animate-fade-in"
        style={{ animationDelay: '0.4s' }}
      >
        Continue
      </button>
    </div>
  );
};
