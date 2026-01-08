import { AuthModal } from './AuthModal';

interface AuthPromptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action?: 'wallet' | 'game' | 'profile' | 'rank';
  onSuccess?: () => void;
}

export const AuthPromptModal = ({ open, onOpenChange, action = 'game', onSuccess }: AuthPromptModalProps) => {
  return (
    <AuthModal 
      open={open} 
      onOpenChange={onOpenChange} 
      action={action}
      onSuccess={onSuccess}
    />
  );
};
