import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BottomNav } from '@/components/BottomNav';
import { WalletCard } from '@/components/WalletCard';
import { TestControls } from '@/components/TestControls';
import { GameListCard, NoGamesCard } from '@/components/GameListCard';
import { PrizeDistribution, getPayoutLabel } from '@/components/PrizeDistribution';
import { useAuth } from '@/contexts/AuthContext';
import { useGame } from '@/contexts/GameContext';
import { useLiveGame } from '@/hooks/useLiveGame';
import { useSounds } from '@/hooks/useSounds';
import { useHaptics } from '@/hooks/useHaptics';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Zap, Users, Clock, Trophy, MessageSquare, ChevronRight } from 'lucide-react';

// Mock games for test mode
const mockGamesForTest = [
  { id: 'mock-1', name: 'Fastest Finger', status: 'live', pool_value: 35000, participant_count: 23, countdown: 45, entry_fee: 700, max_duration: 20, payout_type: 'top3', payout_distribution: [0.5, 0.3, 0.2] },
  { id: 'mock-2', name: 'Speed Rush', status: 'live', pool_value: 18500, participant_count: 15, countdown: 32, entry_fee: 500, max_duration: 15, payout_type: 'winner_takes_all', payout_distribution: [1.0] },
  { id: 'mock-3', name: 'Quick Draw', status: 'scheduled', pool_value: 12000, participant_count: 8, countdown: 60, entry_fee: 300, max_duration: 10, payout_type: 'top5', payout_distribution: [0.4, 0.25, 0.15, 0.12, 0.08] },
];

export const FingerMain = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { isTestMode, resetFingerGame } = useGame();
  const { game, participants, loading, hasJoined, joinGame, error, fetchAllActiveGames } = useLiveGame();
  const { play } = useSounds();
  const { buttonClick, success } = useHaptics();
  
  const [countdown, setCountdown] = useState(300);
  const [joining, setJoining] = useState(false);
  const [allGames, setAllGames] = useState<any[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);

  // Fetch all active games
  useEffect(() => {
    if (isTestMode) {
      setAllGames(mockGamesForTest);
      return;
    }

    const loadGames = async () => {
      const games = await fetchAllActiveGames();
      setAllGames(games);
    };
    loadGames();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('finger-games-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'fastest_finger_games',
        },
        (payload) => {
          console.log('[FingerMain] Game update:', payload.eventType);
          if (payload.eventType === 'INSERT') {
            setAllGames(prev => [payload.new as any, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as any;
            setAllGames(prev => 
              prev.map(g => g.id === updated.id ? { ...g, ...updated } : g)
                .filter(g => g.status === 'live' || g.status === 'scheduled')
            );
          } else if (payload.eventType === 'DELETE') {
            setAllGames(prev => prev.filter(g => g.id !== (payload.old as any).id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isTestMode, fetchAllActiveGames]);

  // Get the selected game or the first available
  const liveGames = allGames.filter(g => g.status === 'live');
  const scheduledGames = allGames.filter(g => g.status === 'scheduled');
  const selectedGame = selectedGameId 
    ? allGames.find(g => g.id === selectedGameId) 
    : (game || liveGames[0] || scheduledGames[0]);

  // Calculate countdown to game start
  useEffect(() => {
    if (!selectedGame || selectedGame.status !== 'scheduled') return;
    setCountdown(selectedGame.countdown || 60);
  }, [selectedGame]);

  // Local countdown until next server update
  useEffect(() => {
    if (!selectedGame || selectedGame.status !== 'scheduled') return;
    
    const timer = setInterval(() => {
      setCountdown(prev => prev > 0 ? prev - 1 : 0);
    }, 1000);
    return () => clearInterval(timer);
  }, [selectedGame]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleJoin = async () => {
    if (!profile || joining) return;
    
    const entryFee = selectedGame?.entry_fee || 700;
    if (profile.wallet_balance < entryFee) {
      play('error');
      return;
    }

    setJoining(true);
    const success_result = await joinGame(selectedGame?.id);
    
    if (success_result) {
      play('success');
      success();
      navigate('/finger/lobby');
    } else {
      play('error');
    }
    setJoining(false);
  };

  const handleBack = () => {
    play('click');
    buttonClick();
    navigate('/home');
  };

  const handleTestStart = async () => {
    if (!hasJoined && profile) {
      await joinGame();
    }
    navigate('/finger/arena');
  };

  const handleTestReset = () => {
    resetFingerGame();
  };

  const poolValue = selectedGame?.pool_value || 0;
  const playerCount = participants.length || selectedGame?.participant_count || 0;
  const entryFee = selectedGame?.entry_fee || 700;
  const balance = profile?.wallet_balance || 0;
  const hasGames = allGames.length > 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading games...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="p-4 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3 pt-2">
          <button 
            onClick={handleBack}
            className="w-10 h-10 rounded-xl bg-card flex items-center justify-center border border-border/50"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div>
            <h1 className="text-xl font-black text-foreground">Fastest Finger</h1>
            <p className="text-sm text-muted-foreground">Last comment standing wins</p>
          </div>
        </div>

        <WalletCard compact />

        {/* Test Controls */}
        <TestControls
          onStart={handleTestStart}
          onReset={handleTestReset}
          startLabel="Start Live Game"
        />

        {/* Error Message */}
        {error && (
          <div className="bg-destructive/20 border border-destructive/50 rounded-xl p-4 text-center">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* No Games Available */}
        {!hasGames && <NoGamesCard />}

        {/* All Games List */}
        {hasGames && (
          <div className="space-y-3">
            {/* Live Games */}
            {liveGames.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  Live Games ({liveGames.length})
                </h3>
                {liveGames.map((g) => (
                  <div key={g.id} onClick={() => setSelectedGameId(g.id)}>
                    <GameListCard game={g} />
                  </div>
                ))}
              </div>
            )}

            {/* Scheduled Games */}
            {scheduledGames.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mt-4">
                  <span className="w-2 h-2 rounded-full bg-yellow-500" />
                  Coming Soon ({scheduledGames.length})
                </h3>
                {scheduledGames.map((g) => (
                  <div key={g.id} onClick={() => setSelectedGameId(g.id)}>
                    <GameListCard game={g} variant="compact" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Selected Game Join Section */}
        {hasGames && selectedGame && (
          <div className="card-panel border-primary/30">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-foreground">{(selectedGame as any).name || 'Fastest Finger'}</h3>
                <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                  <span className="flex items-center gap-1">
                    <Trophy className="w-4 h-4 text-gold" /> 
                    {getPayoutLabel((selectedGame as any).payout_type || 'top3')}
                  </span>
                  <span>•</span>
                  <span>{selectedGame.max_duration || 20} min max</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Entry Fee</p>
                <p className="font-bold text-primary">₦{entryFee}</p>
              </div>
            </div>

            {/* CTA */}
            {hasJoined ? (
              <button
                onClick={() => navigate(selectedGame.status === 'live' ? '/finger/arena' : '/finger/lobby')}
                className="w-full btn-primary flex items-center justify-center gap-2"
              >
                {selectedGame.status === 'live' ? 'Enter Arena' : 'Go to Lobby'}
                <ChevronRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={handleJoin}
                disabled={balance < entryFee || joining || !selectedGame}
                className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Zap className="w-5 h-5" />
                {joining ? 'Joining...' : balance < entryFee ? 'Insufficient Balance' : `Join Game — ₦${entryFee}`}
              </button>
            )}
          </div>
        )}

        {/* How to Play */}
        <div className="card-panel">
          <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            How to Win
          </h3>
          <ul className="text-sm text-muted-foreground space-y-3">
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0">1</span>
              <span>Join the lobby and wait for the live game to start</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0">2</span>
              <span>Send comments — each comment resets the 60s timer</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0">3</span>
              <span>If no one comments for 60 seconds, {getPayoutLabel((selectedGame as any)?.payout_type || 'top3').toLowerCase()}!</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0">4</span>
              <span>Max game time: {selectedGame?.max_duration || 20} minutes — then it auto-ends</span>
            </li>
          </ul>
        </div>

        {/* Prize Distribution - Dynamic based on game settings */}
        <PrizeDistribution
          payoutType={(selectedGame as any)?.payout_type || 'top3'}
          payoutDistribution={(selectedGame as any)?.payout_distribution || [0.5, 0.3, 0.2]}
          poolValue={selectedGame?.pool_value}
        />
      </div>
      
      <BottomNav />
    </div>
  );
};