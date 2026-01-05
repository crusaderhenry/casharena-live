import { useState, useEffect } from 'react';
import { Users, Eye, X, Trophy, Clock } from 'lucide-react';
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
        {children || (
          <button className="flex items-center gap-2 text-xs text-primary font-medium hover:underline">
            <Eye className="w-3.5 h-3.5" />
            View {participantCount} in pool
          </button>
        )}
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl">
        <SheetHeader className="pb-4 border-b border-border">
          <SheetTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Pool Participants
            </span>
          </SheetTitle>
        </SheetHeader>

        <div className="py-4 space-y-4 overflow-y-auto max-h-[calc(80vh-120px)]">
          {/* Game Info */}
          <div className="bg-gradient-to-r from-primary/10 to-transparent rounded-xl p-4 border border-primary/20">
            <h3 className="font-bold text-foreground mb-2">{gameName}</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Prize Pool</p>
                <p className="text-lg font-black text-primary">{formatMoney(poolValue)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Players</p>
                <p className="text-lg font-bold text-foreground">{participantCount}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Entry Fee</p>
                <p className="text-lg font-bold text-foreground">₦{entryFee}</p>
              </div>
            </div>
          </div>

          {/* Transparency notice */}
          <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">
            <Eye className="w-4 h-4 text-green-400 flex-shrink-0" />
            <p className="text-xs text-muted-foreground">
              All participants visible for complete transparency
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-2">
              {participants.map((p, index) => (
                <div 
                  key={p.id} 
                  className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/50"
                >
                  <span className="w-6 text-center text-xs font-bold text-muted-foreground">
                    #{index + 1}
                  </span>
                  <div className="w-10 h-10 rounded-full bg-card-elevated flex items-center justify-center text-lg border border-border/50">
                    {p.profile?.avatar || '🎮'}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{p.profile?.username || 'Player'}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Joined {formatTime(p.joined_at)}
                    </p>
                  </div>
                </div>
              ))}

              {participants.length === 0 && (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                  <p className="text-muted-foreground">No participants yet</p>
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
