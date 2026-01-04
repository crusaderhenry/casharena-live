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
    <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-xl border-t border-border/30 z-50">
      <div className="flex items-center justify-around px-1 py-2 pb-safe max-w-lg mx-auto">
        {navItems.map(({ icon: Icon, label, path }) => {
          const isActive = location.pathname.startsWith(path);
          return (
            <button
              key={path}
              onClick={() => handleNav(path)}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-2xl transition-all duration-200 min-w-[60px] ${
                isActive 
                  ? 'text-primary' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className={`relative ${isActive ? 'glow-primary rounded-xl p-2' : 'p-2'}`}>
                <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className={`text-[10px] font-bold ${isActive ? 'text-primary' : ''}`}>{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
