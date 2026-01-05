import { Home, Swords, Trophy, User, Wallet } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSounds } from '@/hooks/useSounds';
import { useHaptics } from '@/hooks/useHaptics';

const navItems = [
  { icon: Home, label: 'Home', path: '/home' },
  { icon: Swords, label: 'Arena', path: '/finger' },
  { icon: Trophy, label: 'Rank', path: '/rank' },
  { icon: Wallet, label: 'Wallet', path: '/wallet' },
  { icon: User, label: 'Profile', path: '/profile' },
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
    <nav className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-xl border-t border-border/30 z-50">
      <div className="flex items-center justify-around px-2 py-2 pb-safe max-w-lg mx-auto">
        {navItems.map(({ icon: Icon, label, path }) => {
          const isActive = location.pathname === path || 
            (path === '/finger' && location.pathname.startsWith('/finger'));
          return (
            <button
              key={path}
              onClick={() => handleNav(path)}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-200 ${
                isActive 
                  ? 'text-primary' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className={`relative p-1.5 rounded-xl transition-all ${isActive ? 'bg-primary/15' : ''}`}>
                <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                {isActive && (
                  <div className="absolute inset-0 rounded-xl bg-primary/20 blur-md -z-10" />
                )}
              </div>
              <span className={`text-[10px] font-semibold tracking-wide ${isActive ? 'text-primary' : ''}`}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
