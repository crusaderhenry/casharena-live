import { useState, useEffect, forwardRef } from 'react';
import { Users, Eye, Trophy, Clock, Sparkles } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { supabase } from '@/integrations/supabase/client';

interface Participant {
  id: string;
  user_id: string;
  joined_at: string;
  profile?: {
    username: string;
    avatar: string;
  };
}

interface PoolParticipantsSheetProps {
  gameId: string;
  gameName?: string;
  participantCount: number;
  poolValue: number;
  entryFee?: number;
  isTestMode?: boolean;
  children?: React.ReactNode;
}

// Mock participants for test mode
const mockParticipants = [
  { id: '1', user_id: 'u1', joined_at: new Date().toISOString(), profile: { username: 'CryptoKing', avatar: '👑' } },
  { id: '2', user_id: 'u2', joined_at: new Date().toISOString(), profile: { username: 'LuckyAce', avatar: '🎰' } },
  { id: '3', user_id: 'u3', joined_at: new Date().toISOString(), profile: { username: 'FastHands', avatar: '⚡' } },
  { id: '4', user_id: 'u4', joined_at: new Date().toISOString(), profile: { username: 'GamerPro', avatar: '🎮' } },
  { id: '5', user_id: 'u5', joined_at: new Date().toISOString(), profile: { username: 'WinStreak', avatar: '🔥' } },
  { id: '6', user_id: 'u6', joined_at: new Date().toISOString(), profile: { username: 'SpeedDemon', avatar: '💨' } },
  { id: '7', user_id: 'u7', joined_at: new Date().toISOString(), profile: { username: 'QuickDraw', avatar: '🎯' } },
  { id: '8', user_id: 'u8', joined_at: new Date().toISOString(), profile: { username: 'NightOwl', avatar: '🦉' } },
];

// Trigger component that properly forwards refs
const SheetTriggerButton = forwardRef<HTMLButtonElement, { children: React.ReactNode; onClick?: () => void }>(
  ({ children, onClick, ...props }, ref) => (
    <button
      ref={ref}
      onClick={onClick}
      className="flex items-center gap-2 text-xs text-primary font-medium hover:underline transition-colors"
      {...props}
    >
      {children}
    </button>
  )
);
SheetTriggerButton.displayName = 'SheetTriggerButton';

export const PoolParticipantsSheet = ({ 
  gameId, 
  gameName = 'Fastest Finger',
  participantCount: initialCount, 
  poolValue: initialPoolValue,
  entryFee = 700,
  isTestMode = false,
  children
}: PoolParticipantsSheetProps) => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [participantCount, setParticipantCount] = useState(initialCount);
  const [poolValue, setPoolValue] = useState(initialPoolValue);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  // Fetch participants when sheet opens
  useEffect(() => {
    if (!open) return;

    if (isTestMode) {
      setParticipants(mockParticipants.slice(0, Math.min(initialCount, 8)));
      return;
    }

    const fetchParticipants = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('fastest_finger_participants')
        .select('*')
        .eq('game_id', gameId)
        .order('joined_at', { ascending: false });

      if (data) {
        const withProfiles = await Promise.all(
          data.map(async (p) => {
            const { data: profileData } = await supabase.rpc('get_public_profile', { profile_id: p.user_id });
            return { ...p, profile: profileData?.[0] };
          })
        );
        setParticipants(withProfiles);
      }
      setLoading(false);
    };

    fetchParticipants();

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`pool-sheet-${gameId}`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'fastest_finger_participants', filter: `game_id=eq.${gameId}` },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            const newP = payload.new as any;
            const { data: profileData } = await supabase.rpc('get_public_profile', { profile_id: newP.user_id });
            setParticipants(prev => [{ ...newP, profile: profileData?.[0] }, ...prev]);
            setParticipantCount(prev => prev + 1);
            setPoolValue(prev => prev + entryFee);
          } else if (payload.eventType === 'DELETE') {
            setParticipants(prev => prev.filter(p => p.id !== (payload.old as any).id));
            setParticipantCount(prev => Math.max(0, prev - 1));
            setPoolValue(prev => Math.max(0, prev - entryFee));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [open, gameId, isTestMode, initialCount, entryFee]);

  // Sync with prop changes
  useEffect(() => {
    setParticipantCount(initialCount);
    setPoolValue(initialPoolValue);
  }, [initialCount, initialPoolValue]);

  const formatMoney = (amount: number) => `₦${amount.toLocaleString()}`;
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {children ? (
          <SheetTriggerButton>{children}</SheetTriggerButton>
        ) : (
          <SheetTriggerButton>
            <Eye className="w-3.5 h-3.5" />
            View {participantCount} in pool
          </SheetTriggerButton>
        )}
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl bg-background/95 backdrop-blur-xl">
        <SheetHeader className="pb-4 border-b border-border">
          <SheetTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                <Users className="w-4 h-4 text-primary" />
              </div>
              <span>Pool Participants</span>
            </span>
          </SheetTitle>
        </SheetHeader>

        <div className="py-4 space-y-4 overflow-y-auto max-h-[calc(80vh-120px)]">
          {/* Game Info */}
          <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card p-4">
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-2xl" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-primary" />
                <h3 className="font-bold text-foreground">{gameName}</h3>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-2 rounded-lg bg-background/50">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Prize Pool</p>
                  <p className="text-lg font-black text-primary">{formatMoney(poolValue)}</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-background/50">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Players</p>
                  <p className="text-lg font-bold text-foreground">{participantCount}</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-background/50">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Entry</p>
                  <p className="text-lg font-bold text-foreground">₦{entryFee}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Transparency notice */}
          <div className="flex items-center gap-3 bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3">
            <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0">
              <Eye className="w-4 h-4 text-green-400" />
            </div>
            <p className="text-xs text-muted-foreground">
              All participants visible for <span className="text-green-400 font-medium">complete transparency</span>
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-10 h-10 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-2">
              {participants.map((p, index) => (
                <div 
                  key={p.id} 
                  className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/50 hover:border-primary/30 transition-colors"
                >
                  <span className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                    {index + 1}
                  </span>
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary/20 to-card flex items-center justify-center text-xl border border-border/50">
                    {p.profile?.avatar || '🎮'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{p.profile?.username || 'Player'}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Joined {formatTime(p.joined_at)}
                    </p>
                  </div>
                  {index < 3 && (
                    <span className="text-lg">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                    </span>
                  )}
                </div>
              ))}

              {participants.length === 0 && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                    <Users className="w-8 h-8 text-muted-foreground/50" />
                  </div>
                  <p className="text-muted-foreground font-medium">No participants yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Be the first to join!</p>
                </div>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
