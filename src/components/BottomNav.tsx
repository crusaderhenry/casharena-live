import { Home, Zap, Sparkles, Trophy, Wallet } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSounds } from '@/hooks/useSounds';
import { useHaptics } from '@/hooks/useHaptics';

const navItems = [
  { icon: Home, label: 'Home', path: '/home' },
  { icon: Zap, label: 'Finger', path: '/finger' },
  { icon: Sparkles, label: 'Pool', path: '/pool' },
  { icon: Trophy, label: 'Rank', path: '/rank' },
  { icon: Wallet, label: 'Wallet', path: '/wallet' },
];

export const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { play } = useSounds();
  const { buttonClick } = useHaptics();

  const handleNav = (path: string) => {
    play('click');
    buttonClick();
    navigate(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50">
      {/* Blur background */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-xl border-t border-border/30" />
      
      <div className="relative flex items-center justify-around px-2 py-3 pb-safe max-w-lg mx-auto">
        {navItems.map(({ icon: Icon, label, path }) => {
          const isActive = location.pathname.startsWith(path);
          
          return (
            <button
              key={path}
              onClick={() => handleNav(path)}
              className="group flex flex-col items-center gap-1 min-w-[56px] py-1 transition-all duration-300"
            >
              <div className={`relative p-2.5 rounded-2xl transition-all duration-300 ${
                isActive 
                  ? 'bg-primary/15' 
                  : 'group-hover:bg-muted/50'
              }`}>
                {isActive && (
                  <div className="absolute inset-0 rounded-2xl bg-primary/20 blur-lg" />
                )}
                <Icon 
                  className={`relative w-5 h-5 transition-all duration-300 ${
                    isActive 
                      ? 'text-primary' 
                      : 'text-muted-foreground group-hover:text-foreground'
                  }`} 
                  strokeWidth={isActive ? 2.5 : 2} 
                />
              </div>
              <span className={`text-2xs font-semibold transition-colors duration-300 ${
                isActive ? 'text-primary' : 'text-muted-foreground'
              }`}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
