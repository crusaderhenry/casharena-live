import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { RealtimeChannel } from '@supabase/supabase-js';

interface Game {
  id: string;
  status: 'scheduled' | 'live' | 'ended';
  entry_fee: number;
  pool_value: number;
  participant_count: number;
  countdown: number;
  start_time: string | null;
  end_time: string | null;
  max_duration: number;
  created_at: string;
}

interface Comment {
  id: string;
  game_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profile?: {
    username: string;
    avatar: string;
  };
}

interface Winner {
  id: string;
  game_id: string;
  user_id: string;
  position: number;
  amount_won: number;
  profile?: {
    username: string;
    avatar: string;
  };
}

interface Participant {
  id: string;
  user_id: string;
  joined_at: string;
  profile?: {
    username: string;
    avatar: string;
  };
}

export const useLiveGame = (gameId?: string) => {
  const { user, refreshProfile } = useAuth();
  const [game, setGame] = useState<Game | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [winners, setWinners] = useState<Winner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasJoined, setHasJoined] = useState(false);

  // Fetch current live or scheduled game
  const fetchCurrentGame = useCallback(async () => {
    const { data, error } = await supabase
      .from('fastest_finger_games')
      .select('*')
      .in('status', ['scheduled', 'live'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching game:', error);
      return null;
    }
    return data as Game | null;
  }, []);

  // Fetch specific game
  const fetchGame = useCallback(async (id: string) => {
    const { data, error } = await supabase
      .from('fastest_finger_games')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching game:', error);
      return null;
    }
    return data as Game;
  }, []);

  // Fetch comments for a game
  const fetchComments = useCallback(async (id: string) => {
    const { data, error } = await supabase
      .from('comments')
      .select(`
        *,
        profile:profiles!user_id(username, avatar)
      `)
      .eq('game_id', id)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error fetching comments:', error);
      return [];
    }

    return (data || []).map((c: any) => ({
      ...c,
      profile: c.profile,
    }));
  }, []);

  // Fetch participants
  const fetchParticipants = useCallback(async (id: string) => {
    const { data, error } = await supabase
      .from('fastest_finger_participants')
      .select('*')
      .eq('game_id', id);

    if (error) {
      console.error('Error fetching participants:', error);
      return [];
    }

    // Fetch profiles separately
    const participantsWithProfiles = await Promise.all(
      (data || []).map(async (p: any) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username, avatar')
          .eq('id', p.user_id)
          .single();
        return { ...p, profile };
      })
    );

    return participantsWithProfiles;
  }, []);

  // Check if user has joined
  const checkJoinStatus = useCallback(async (id: string, userId: string) => {
    const { data } = await supabase
      .from('fastest_finger_participants')
      .select('id')
      .eq('game_id', id)
      .eq('user_id', userId)
      .maybeSingle();

    return !!data;
  }, []);

  // Join game
  const joinGame = useCallback(async () => {
    if (!game || !user) {
      setError('Not logged in or no game available');
      return false;
    }

    try {
      const response = await supabase.functions.invoke('game-manager', {
        body: { action: 'join', gameId: game.id, userId: user.id },
      });

      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);

      setHasJoined(true);
      await refreshProfile();
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    }
  }, [game, user, refreshProfile]);

  // Send comment
  const sendComment = useCallback(async (content: string) => {
    if (!game || !user) return false;

    const { error } = await supabase
      .from('comments')
      .insert({
        game_id: game.id,
        user_id: user.id,
        content,
      });

    if (error) {
      console.error('Error sending comment:', error);
      return false;
    }

    return true;
  }, [game, user]);

  // Initial load
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        let currentGame: Game | null = null;

        if (gameId) {
          currentGame = await fetchGame(gameId);
        } else {
          currentGame = await fetchCurrentGame();
        }

        if (currentGame) {
          setGame(currentGame);

          const [commentsData, participantsData] = await Promise.all([
            fetchComments(currentGame.id),
            fetchParticipants(currentGame.id),
          ]);

          setComments(commentsData);
          setParticipants(participantsData);

          if (user) {
            const joined = await checkJoinStatus(currentGame.id, user.id);
            setHasJoined(joined);
          }

          if (currentGame.status === 'ended') {
            const { data: winnersData } = await supabase
              .from('winners')
              .select('*')
              .eq('game_id', currentGame.id)
              .order('position');

            // Fetch profiles for winners
            const winnersWithProfiles = await Promise.all(
              (winnersData || []).map(async (w: any) => {
                const { data: profile } = await supabase
                  .from('profiles')
                  .select('username, avatar')
                  .eq('id', w.user_id)
                  .single();
                return { ...w, profile };
              })
            );

            setWinners(winnersWithProfiles);
          }
        }
      } catch (err) {
        console.error('Error loading game:', err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [gameId, user, fetchCurrentGame, fetchGame, fetchComments, fetchParticipants, checkJoinStatus]);

  // Real-time subscriptions
  useEffect(() => {
    if (!game) return;

    const channels: RealtimeChannel[] = [];

    // Subscribe to game updates
    const gameChannel = supabase
      .channel(`game-${game.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'fastest_finger_games',
          filter: `id=eq.${game.id}`,
        },
        (payload) => {
          console.log('Game update:', payload);
          if (payload.new) {
            setGame(payload.new as Game);
          }
        }
      )
      .subscribe();

    channels.push(gameChannel);

    // Subscribe to comments
    const commentsChannel = supabase
      .channel(`comments-${game.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'comments',
          filter: `game_id=eq.${game.id}`,
        },
        async (payload) => {
          console.log('New comment:', payload);
          if (payload.new) {
            // Fetch profile for the new comment
            const { data: profile } = await supabase
              .from('profiles')
              .select('username, avatar')
              .eq('id', (payload.new as any).user_id)
              .single();

            const newComment = {
              ...(payload.new as Comment),
              profile,
            };

            setComments((prev) => [newComment, ...prev].slice(0, 100));
          }
        }
      )
      .subscribe();

    channels.push(commentsChannel);

    // Subscribe to participants
    const participantsChannel = supabase
      .channel(`participants-${game.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'fastest_finger_participants',
          filter: `game_id=eq.${game.id}`,
        },
        async (payload) => {
          console.log('New participant:', payload);
          if (payload.new) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('username, avatar')
              .eq('id', (payload.new as any).user_id)
              .single();

            setParticipants((prev) => [...prev, { ...(payload.new as Participant), profile }]);
          }
        }
      )
      .subscribe();

    channels.push(participantsChannel);

    // Subscribe to winners
    const winnersChannel = supabase
      .channel(`winners-${game.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'winners',
          filter: `game_id=eq.${game.id}`,
        },
        async (payload) => {
          console.log('New winner:', payload);
          if (payload.new) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('username, avatar')
              .eq('id', (payload.new as any).user_id)
              .single();

            setWinners((prev) => [...prev, { ...(payload.new as Winner), profile }]);
          }
        }
      )
      .subscribe();

    channels.push(winnersChannel);

    return () => {
      channels.forEach((channel) => {
        supabase.removeChannel(channel);
      });
    };
  }, [game?.id]);

  return {
    game,
    comments,
    participants,
    winners,
    loading,
    error,
    hasJoined,
    joinGame,
    sendComment,
    refreshGame: fetchCurrentGame,
  };
};
