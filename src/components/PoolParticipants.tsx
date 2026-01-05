import { useState, useEffect } from 'react';
import { Users, Eye, ChevronDown, ChevronUp } from 'lucide-react';
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

interface PoolParticipantsProps {
  gameId: string;
  participantCount: number;
  poolValue: number;
  isTestMode?: boolean;
  compact?: boolean;
}

// Mock participants for test mode
const mockParticipants = [
  { id: '1', user_id: 'u1', joined_at: new Date().toISOString(), profile: { username: 'CryptoKing', avatar: '👑' } },
  { id: '2', user_id: 'u2', joined_at: new Date().toISOString(), profile: { username: 'LuckyAce', avatar: '🎰' } },
  { id: '3', user_id: 'u3', joined_at: new Date().toISOString(), profile: { username: 'FastHands', avatar: '⚡' } },
  { id: '4', user_id: 'u4', joined_at: new Date().toISOString(), profile: { username: 'GamerPro', avatar: '🎮' } },
  { id: '5', user_id: 'u5', joined_at: new Date().toISOString(), profile: { username: 'WinStreak', avatar: '🔥' } },
  { id: '6', user_id: 'u6', joined_at: new Date().toISOString(), profile: { username: 'SpeedDemon', avatar: '💨' } },
];

export const PoolParticipants = ({ 
  gameId, 
  participantCount: initialCount, 
  poolValue: initialPoolValue,
  isTestMode = false,
  compact = false
}: PoolParticipantsProps) => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [participantCount, setParticipantCount] = useState(initialCount);
  const [poolValue, setPoolValue] = useState(initialPoolValue);
  const [loading, setLoading] = useState(!isTestMode);
  const [expanded, setExpanded] = useState(false);

  // Fetch participants and subscribe to real-time updates
  useEffect(() => {
    if (isTestMode) {
      setParticipants(mockParticipants.slice(0, initialCount > 6 ? 6 : initialCount));
      setLoading(false);
      return;
    }

    const fetchParticipants = async () => {
      const { data } = await supabase
        .from('fastest_finger_participants')
        .select('*')
        .eq('game_id', gameId)
        .order('joined_at', { ascending: false })
        .limit(20);

      if (data) {
        // Fetch profiles for participants
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

    // Subscribe to participant changes
    const participantsChannel = supabase
      .channel(`pool-participants-${gameId}`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'fastest_finger_participants', filter: `game_id=eq.${gameId}` },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            const newParticipant = payload.new as any;
            const { data: profileData } = await supabase.rpc('get_public_profile', { profile_id: newParticipant.user_id });
            setParticipants(prev => [{ ...newParticipant, profile: profileData?.[0] }, ...prev].slice(0, 20));
            setParticipantCount(prev => prev + 1);
          } else if (payload.eventType === 'DELETE') {
            setParticipants(prev => prev.filter(p => p.id !== (payload.old as any).id));
            setParticipantCount(prev => Math.max(0, prev - 1));
          }
        }
      )
      .subscribe();

    // Subscribe to game updates for pool value
    const gameChannel = supabase
      .channel(`pool-game-${gameId}`)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'fastest_finger_games', filter: `id=eq.${gameId}` },
        (payload) => {
          const updated = payload.new as any;
          setPoolValue(updated.pool_value);
          setParticipantCount(updated.participant_count);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(participantsChannel);
      supabase.removeChannel(gameChannel);
    };
  }, [gameId, isTestMode, initialCount]);

  // Sync with prop changes
  useEffect(() => {
    setParticipantCount(initialCount);
    setPoolValue(initialPoolValue);
  }, [initialCount, initialPoolValue]);

  const formatMoney = (amount: number) => `₦${amount.toLocaleString()}`;
  const displayParticipants = participants.slice(0, expanded ? 20 : 6);

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {/* Stacked avatars */}
        <div className="flex -space-x-2">
          {displayParticipants.slice(0, 4).map((p, i) => (
            <div
              key={p.id}
              className="w-7 h-7 rounded-full bg-card-elevated border-2 border-background flex items-center justify-center text-sm"
              style={{ zIndex: 4 - i }}
            >
              {p.profile?.avatar || '🎮'}
            </div>
          ))}
          {participantCount > 4 && (
            <div className="w-7 h-7 rounded-full bg-primary/20 border-2 border-background flex items-center justify-center text-[10px] font-bold text-primary">
              +{participantCount - 4}
            </div>
          )}
        </div>
        <span className="text-xs text-muted-foreground">{participantCount} playing</span>
      </div>
    );
  }

  return (
    <div className="card-panel">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-foreground flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          Pool Participants
          <span className="text-sm font-normal text-muted-foreground">({participantCount})</span>
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-primary">{formatMoney(poolValue)}</span>
          <span className="text-xs text-muted-foreground">pool</span>
        </div>
      </div>

      {/* Pool transparency info */}
      <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-lg px-3 py-2 mb-3">
        <Eye className="w-4 h-4 text-primary flex-shrink-0" />
        <p className="text-xs text-muted-foreground">
          Live pool updates • All participants visible for transparency
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-4">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Participants grid */}
          <div className="grid grid-cols-3 gap-2 mb-2">
            {displayParticipants.map((p) => (
              <div key={p.id} className="flex items-center gap-2 p-2 rounded-lg bg-background/50">
                <div className="w-8 h-8 rounded-full bg-card-elevated flex items-center justify-center text-sm border border-border/50">
                  {p.profile?.avatar || '🎮'}
                </div>
                <span className="text-xs font-medium text-foreground truncate">
                  {p.profile?.username || 'Player'}
                </span>
              </div>
            ))}
          </div>

          {/* Show more/less button */}
          {participants.length > 6 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="w-full flex items-center justify-center gap-1 py-2 text-xs text-primary font-medium hover:bg-primary/5 rounded-lg transition-colors"
            >
              {expanded ? (
                <>Show Less <ChevronUp className="w-4 h-4" /></>
              ) : (
                <>Show All {participantCount} <ChevronDown className="w-4 h-4" /></>
              )}
            </button>
          )}

          {participants.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-4">
              No participants yet. Be the first to join!
            </p>
          )}
        </>
      )}
    </div>
  );
};
