import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { User, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';

const usernameSchema = z.string().min(3, 'Username must be at least 3 characters').max(20, 'Username too long');

interface UsernamePromptModalProps {
  open: boolean;
  userId: string;
  onComplete: () => void;
}

export const UsernamePromptModal = ({ open, userId, onComplete }: UsernamePromptModalProps) => {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      usernameSchema.parse(username);
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(err.errors[0].message);
      }
      return;
    }

    setLoading(true);

    try {
      // Update the profile with the chosen username
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          username,
          avatar: ['🎮', '🎯', '⚡', '🔥', '💎', '🚀'][Math.floor(Math.random() * 6)]
        })
        .eq('id', userId);

      if (updateError) {
        if (updateError.message.includes('duplicate') || updateError.message.includes('unique')) {
          setError('This username is already taken. Please choose another.');
        } else {
          setError(updateError.message);
        }
        return;
      }

      // Mark that username has been set
      localStorage.setItem(`username_set_${userId}`, 'true');
      onComplete();
    } catch (err) {
      setError('Failed to save username. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center glow-primary">
              <Zap className="w-8 h-8 text-primary" />
            </div>
          </div>
          <DialogTitle className="text-center text-xl">Welcome to FortunesHQ!</DialogTitle>
          <DialogDescription className="text-center">
            Choose a username that other players will see in the arena
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Choose your username"
              className="pl-12"
              disabled={loading}
              autoFocus
            />
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <Button
            type="submit"
            disabled={loading || !username.trim()}
            className="w-full"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            ) : (
              'Continue to Arena'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
