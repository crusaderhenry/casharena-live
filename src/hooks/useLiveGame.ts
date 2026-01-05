import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { RealtimeChannel } from '@supabase/supabase-js';

interface Game {
  id: string;
  name: string;
  status: 'scheduled' | 'live' | 'ended' | 'open';
  entry_fee: number;
  pool_value: number;
  effective_prize_pool: number;
  participant_count: number;
  countdown: number;
  comment_timer: number;
  start_time: string | null;
  end_time: string | null;
  max_duration: number;
  payout_type: 'winner_takes_all' | 'top3' | 'top5' | 'top10';
  payout_distribution: number[];
  min_participants: number;
  min_participants_action: 'reset' | 'cancel' | 'start_anyway';
  created_at: string;
  is_sponsored?: boolean;
  sponsored_amount?: number;
  entry_cutoff_minutes?: number;
  entry_wait_seconds?: number;
  platform_cut_percentage?: number;
  // Music settings
  music_type?: 'generated' | 'uploaded';
  lobby_music_url?: string | null;
  arena_music_url?: string | null;
  tense_music_url?: string | null;
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
      .in('status', ['scheduled', 'live', 'open'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching game:', error);
      return null;
    }
    
    if (data) {
      const isSponsored = (data as any).is_sponsored || false;
      const sponsoredAmount = (data as any).sponsored_amount || 0;
      const poolValue = data.pool_value || 0;
      return {
        ...data,
        name: (data as any).name || 'Fastest Finger',
        comment_timer: (data as any).comment_timer || 60,
        payout_type: (data as any).payout_type || 'top3',
        payout_distribution: (data as any).payout_distribution || [0.5, 0.3, 0.2],
        min_participants: (data as any).min_participants || 3,
        min_participants_action: (data as any).min_participants_action || 'reset',
        is_sponsored: isSponsored,
        sponsored_amount: sponsoredAmount,
        entry_cutoff_minutes: (data as any).entry_cutoff_minutes || 10,
        entry_wait_seconds: (data as any).entry_wait_seconds || 60,
        platform_cut_percentage: (data as any).platform_cut_percentage || 10,
        effective_prize_pool: poolValue + (isSponsored ? sponsoredAmount : 0),
        // Music settings
        music_type: (data as any).music_type || 'generated',
        lobby_music_url: (data as any).lobby_music_url || null,
        arena_music_url: (data as any).arena_music_url || null,
        tense_music_url: (data as any).tense_music_url || null,
      } as Game;
    }
    return null;
  }, []);

  // Fetch all active games (for game selection)
  const fetchAllActiveGames = useCallback(async () => {
    const { data, error } = await supabase
      .from('fastest_finger_games')
      .select('*')
      .in('status', ['scheduled', 'live', 'open'])
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching games:', error);
      return [];
    }
    
    return (data || []).map(g => {
      const isSponsored = (g as any).is_sponsored || false;
      const sponsoredAmount = (g as any).sponsored_amount || 0;
      const poolValue = g.pool_value || 0;
      return {
        ...g,
        name: (g as any).name || 'Fastest Finger',
        comment_timer: (g as any).comment_timer || 60,
        payout_type: (g as any).payout_type || 'top3',
        payout_distribution: (g as any).payout_distribution || [0.5, 0.3, 0.2],
        min_participants: (g as any).min_participants || 3,
        min_participants_action: (g as any).min_participants_action || 'reset',
        is_sponsored: isSponsored,
        sponsored_amount: sponsoredAmount,
        entry_cutoff_minutes: (g as any).entry_cutoff_minutes || 10,
        entry_wait_seconds: (g as any).entry_wait_seconds || 60,
        platform_cut_percentage: (g as any).platform_cut_percentage || 10,
        effective_prize_pool: poolValue + (isSponsored ? sponsoredAmount : 0),
        // Music settings
        music_type: (g as any).music_type || 'generated',
        lobby_music_url: (g as any).lobby_music_url || null,
        arena_music_url: (g as any).arena_music_url || null,
        tense_music_url: (g as any).tense_music_url || null,
      };
    }) as Game[];
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
    
    const isSponsored = (data as any).is_sponsored || false;
    const sponsoredAmount = (data as any).sponsored_amount || 0;
    const poolValue = data.pool_value || 0;
    return {
      ...data,
      name: (data as any).name || 'Fastest Finger',
      comment_timer: (data as any).comment_timer || 60,
      payout_type: (data as any).payout_type || 'top3',
      payout_distribution: (data as any).payout_distribution || [0.5, 0.3, 0.2],
      min_participants: (data as any).min_participants || 3,
      min_participants_action: (data as any).min_participants_action || 'reset',
      is_sponsored: isSponsored,
      sponsored_amount: sponsoredAmount,
      entry_cutoff_minutes: (data as any).entry_cutoff_minutes || 10,
      entry_wait_seconds: (data as any).entry_wait_seconds || 60,
      platform_cut_percentage: (data as any).platform_cut_percentage || 10,
      effective_prize_pool: poolValue + (isSponsored ? sponsoredAmount : 0),
      // Music settings
      music_type: (data as any).music_type || 'generated',
      lobby_music_url: (data as any).lobby_music_url || null,
      arena_music_url: (data as any).arena_music_url || null,
      tense_music_url: (data as any).tense_music_url || null,
    } as Game;
  }, []);

  // Fetch comments for a game
  const fetchComments = useCallback(async (id: string) => {
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('game_id', id)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error fetching comments:', error);
      return [];
    }

    // Fetch profiles
    const userIds = [...new Set((data || []).map(c => c.user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, avatar')
      .in('id', userIds);

    const profileMap = new Map(profiles?.map(p => [p.id, { username: p.username, avatar: p.avatar }]) || []);

    return (data || []).map(c => ({
      ...c,
      profile: profileMap.get(c.user_id),
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

    // Fetch profiles
    const userIds = [...new Set((data || []).map(p => p.user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, avatar')
      .in('id', userIds);

    const profileMap = new Map(profiles?.map(p => [p.id, { username: p.username, avatar: p.avatar }]) || []);

    return (data || []).map(p => ({
      ...p,
      profile: profileMap.get(p.user_id),
    }));
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
  const joinGame = useCallback(async (targetGameId?: string) => {
    const gameToJoin = targetGameId || game?.id;
    if (!gameToJoin || !user) {
      setError('Not logged in or no game available');
      return false;
    }

    const extractInvokeError = (invokeError: any, invokeData: any) => {
      // Prefer explicit JSON error returned by the function
      const dataError = invokeData && typeof invokeData === 'object' ? (invokeData as any).error : null;
      if (typeof dataError === 'string' && dataError.trim()) return dataError;

      const msg = typeof invokeError?.message === 'string' ? invokeError.message : '';
      if (!msg) return 'Failed to join game';

      // supabase-js often embeds the JSON payload in the message, e.g.
      // "Edge function returned 400: Error, {\"error\":\"...\"}"
      const jsonMatch = msg.match(/\{.*\}$/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          if (typeof parsed?.error === 'string') return parsed.error;
        } catch {
          // ignore
        }
      }

      return msg;
    };

    try {
      setError(null);
      const { data, error: invokeError } = await supabase.functions.invoke('game-manager', {
        body: { action: 'join', gameId: gameToJoin, userId: user.id },
      });

      if (invokeError || (data as any)?.error) {
        setError(extractInvokeError(invokeError, data));
        return false;
      }

      setHasJoined(true);
      await refreshProfile();
      return true;
    } catch (err: any) {
      // Catch any unexpected client/runtime errors without crashing the UI
      setError(err?.message || 'Failed to join game');
      return false;
    }
  }, [game, user, refreshProfile]);

  // Send comment with sanitization - REQUIRES being a participant
  const sendComment = useCallback(async (content: string) => {
    if (!game || !user) return false;

    // CRITICAL: Verify user is a participant before allowing comment
    if (!hasJoined) {
      console.error('[sendComment] User is not a participant, cannot comment');
      return false;
    }

    // Validate length
    if (!content || content.length === 0 || content.length > 200) {
      return false;
    }

    // Sanitize: remove HTML tags and control characters
    const sanitized = content
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control chars
      .trim();

    if (!sanitized) return false;

    const { error } = await supabase
      .from('comments')
      .insert({
        game_id: game.id,
        user_id: user.id,
        content: sanitized,
      });

    if (error) {
      console.error('Error sending comment:', error);
      return false;
    }

    return true;
  }, [game, user, hasJoined]);

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
            const userIds = [...new Set((winnersData || []).map(w => w.user_id))];
            const { data: profiles } = await supabase
              .from('profiles')
              .select('id, username, avatar')
              .in('id', userIds);

            const profileMap = new Map(profiles?.map(p => [p.id, { username: p.username, avatar: p.avatar }]) || []);

            setWinners((winnersData || []).map(w => ({
              ...w,
              profile: profileMap.get(w.user_id),
            })));
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
            const updated = payload.new as any;
            setGame({
              ...updated,
              name: updated.name || 'Fastest Finger',
              comment_timer: updated.comment_timer || 60,
              payout_type: updated.payout_type || 'top3',
              payout_distribution: updated.payout_distribution || [0.5, 0.3, 0.2],
              min_participants: updated.min_participants || 3,
            });
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

  // Calculate if entries are still open for a game
  const canJoinGame = useCallback((targetGame: Game | null): { canJoin: boolean; reason: string | null; timeRemaining: number | null } => {
    if (!targetGame) {
      return { canJoin: false, reason: 'No game available', timeRemaining: null };
    }

    if (targetGame.status === 'open') {
      return { canJoin: true, reason: null, timeRemaining: null };
    }

    if (targetGame.status === 'live' && targetGame.start_time) {
      const startTime = new Date(targetGame.start_time).getTime();
      const endTime = startTime + (targetGame.max_duration * 60 * 1000);
      const now = Date.now();
      const timeRemainingMs = endTime - now;
      const cutoffMs = (targetGame.entry_cutoff_minutes || 10) * 60 * 1000;
      
      if (timeRemainingMs <= cutoffMs) {
        const cutoffMins = targetGame.entry_cutoff_minutes || 10;
        return { 
          canJoin: false, 
          reason: `Less than ${cutoffMins} minutes remaining, entries closed`,
          timeRemaining: Math.max(0, Math.floor(timeRemainingMs / 1000))
        };
      }
      
      return { 
        canJoin: true, 
        reason: null, 
        timeRemaining: Math.floor(timeRemainingMs / 1000)
      };
    }

    if (targetGame.status === 'scheduled') {
      return { canJoin: false, reason: 'Game not yet open', timeRemaining: null };
    }

    return { canJoin: false, reason: 'Game is not accepting participants', timeRemaining: null };
  }, []);

  // Current game join eligibility
  const gameJoinStatus = canJoinGame(game);

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
    fetchAllActiveGames,
    canJoinGame,
    gameJoinStatus,
  };
};