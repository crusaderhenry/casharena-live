import { Home, Swords, Flame, Sparkles, Zap, Wallet, Trophy } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSounds } from '@/hooks/useSounds';
import { useHaptics } from '@/hooks/useHaptics';

const navItems = [
  { icon: Home, label: 'Home', path: '/home' },
  { icon: Swords, label: 'Arena', path: '/arena' },
  { icon: Trophy, label: 'Ranks', path: '/leaderboard' },
  { icon: Flame, label: 'Streak', path: '/streak' },
  { icon: Zap, label: 'Finger', path: '/finger' },
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
    <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-border z-50">
      <div className="flex items-center justify-around px-1 py-2 pb-safe max-w-lg mx-auto">
        {navItems.map(({ icon: Icon, label, path }) => {
          const isActive = location.pathname.startsWith(path);
          return (
            <button
              key={path}
              onClick={() => handleNav(path)}
              className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all duration-200 ${
                isActive 
                  ? 'text-primary' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className={`relative ${isActive ? 'glow-primary rounded-lg p-1' : ''}`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[9px] font-medium">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
