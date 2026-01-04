import { useNavigate } from 'react-router-dom';
import { Swords, Flame, Sparkles, Zap } from 'lucide-react';

const gameCards = [
  {
    icon: <Swords className="w-6 h-6" />,
    title: 'Daily Cash Arena',
    description: 'Skill-based daily challenge',
    color: 'from-emerald-500 to-primary',
  },
  {
    icon: <Flame className="w-6 h-6" />,
    title: 'Streak to Win',
    description: 'Daily consistency wins',
    color: 'from-orange-500 to-amber-400',
  },
  {
    icon: <Sparkles className="w-6 h-6" />,
    title: 'Smart Lucky Pool',
    description: 'Luck with smart odds',
    color: 'from-violet-500 to-purple-400',
  },
  {
    icon: <Zap className="w-6 h-6" />,
    title: 'Fastest Finger',
    description: 'Last comment wins',
    color: 'from-yellow-500 to-secondary',
  },
];

export const HowItWorks = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col p-6">
      <div className="flex-1">
        <h1 className="text-3xl font-bold text-foreground mb-2 animate-slide-up">
          How CashArena Works
        </h1>
        <p className="text-muted-foreground mb-8 animate-slide-up" style={{ animationDelay: '0.05s' }}>
          Four exciting ways to win
        </p>
        
        <div className="space-y-4">
          {gameCards.map((card, index) => (
            <div
              key={card.title}
              className="card-game animate-slide-up"
              style={{ animationDelay: `${0.1 + index * 0.08}s` }}
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center text-white`}>
                  {card.icon}
                </div>
                <div>
                  <h3 className="font-bold text-foreground">{card.title}</h3>
                  <p className="text-sm text-muted-foreground">{card.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <button
        onClick={() => navigate('/onboarding/play-style')}
        className="btn-primary w-full text-lg py-4 mt-8 animate-fade-in"
        style={{ animationDelay: '0.5s' }}
      >
        Continue
      </button>
    </div>
  );
};
