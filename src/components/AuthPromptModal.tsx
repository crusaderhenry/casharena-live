import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { LogIn, UserPlus, Wallet, Gamepad2, Crown } from 'lucide-react';

interface AuthPromptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action?: 'wallet' | 'game' | 'profile' | 'rank';
}

export const AuthPromptModal = ({ open, onOpenChange, action = 'game' }: AuthPromptModalProps) => {
  const navigate = useNavigate();

  const getContent = () => {
    switch (action) {
      case 'wallet':
        return {
          icon: <Wallet className="w-8 h-8 text-primary" />,
          title: 'Access Your Wallet',
          description: 'Sign in to view your balance, make deposits, and withdraw winnings.',
        };
      case 'profile':
        return {
          icon: <Crown className="w-8 h-8 text-primary" />,
          title: 'View Your Profile',
          description: 'Sign in to see your stats, badges, and game history.',
        };
      case 'rank':
        return {
          icon: <Crown className="w-8 h-8 text-gold" />,
          title: 'View Your Rank',
          description: 'Sign in to see your position on the leaderboard.',
        };
      case 'game':
      default:
        return {
          icon: <Gamepad2 className="w-8 h-8 text-primary" />,
          title: 'Join the Game',
          description: 'Sign in to enter games, compete with others, and win prizes!',
        };
    }
  };

  const content = getContent();

  const handleSignIn = () => {
    onOpenChange(false);
    navigate('/auth');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-border bg-card">
        <div className="flex flex-col items-center text-center py-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            {content.icon}
          </div>
          
          <h2 className="text-xl font-bold text-foreground mb-2">
            {content.title}
          </h2>
          
          <p className="text-sm text-muted-foreground mb-6 max-w-xs">
            {content.description}
          </p>
          
          <div className="flex flex-col gap-3 w-full">
            <Button
              onClick={handleSignIn}
              className="w-full gap-2"
            >
              <LogIn className="w-4 h-4" />
              Sign In
            </Button>
            
            <Button
              variant="outline"
              onClick={handleSignIn}
              className="w-full gap-2"
            >
              <UserPlus className="w-4 h-4" />
              Create Account
            </Button>
          </div>
          
          <p className="text-xs text-muted-foreground mt-4">
            It only takes a minute to get started!
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
