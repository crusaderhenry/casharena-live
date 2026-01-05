import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BottomNav } from '@/components/BottomNav';
import { WalletCard } from '@/components/WalletCard';
import { TestControls } from '@/components/TestControls';
import { PrizeDistribution, getPayoutLabel } from '@/components/PrizeDistribution';
import { PoolParticipantsSheet } from '@/components/PoolParticipantsSheet';
import { GameHistory } from '@/components/GameHistory';
import { GameStatusCard } from '@/components/GameStatusCard';

import { useAuth } from '@/contexts/AuthContext';
import { useGame } from '@/contexts/GameContext';
import { useLiveGame } from '@/hooks/useLiveGame';
import { useSounds } from '@/hooks/useSounds';
import { useHaptics } from '@/hooks/useHaptics';
import { useServerTime } from '@/hooks/useServerTime';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Zap, Users, Clock, Trophy, ChevronRight, Play, Calendar, Swords, Radio, Sparkles, Gift, Eye, Lock } from 'lucide-react';

// Mock games for test mode
const mockGamesForTest = [
  { id: 'mock-1', name: 'Fastest Finger', status: 'live', pool_value: 35000, effective_prize_pool: 35000, participant_count: 23, countdown: 45, entry_fee: 700, max_duration: 20, payout_type: 'top3', payout_distribution: [0.5, 0.3, 0.2], start_time: new Date(Date.now() - 5 * 60 * 1000).toISOString() },
  { id: 'mock-2', name: 'Speed Rush', status: 'live', pool_value: 18500, effective_prize_pool: 18500, participant_count: 15, countdown: 32, entry_fee: 500, max_duration: 15, payout_type: 'winner_takes_all', payout_distribution: [1.0], start_time: new Date(Date.now() - 3 * 60 * 1000).toISOString() },
  { id: 'mock-3', name: 'Quick Draw', status: 'scheduled', pool_value: 0, effective_prize_pool: 50000, participant_count: 8, countdown: 180, entry_fee: 0, max_duration: 10, payout_type: 'top5', payout_distribution: [0.4, 0.25, 0.15, 0.12, 0.08], is_sponsored: true, sponsored_amount: 50000 },
  { id: 'mock-4', name: 'Lightning Round', status: 'open', pool_value: 8000, effective_prize_pool: 8000, participant_count: 5, countdown: 30, entry_fee: 200, max_duration: 5, payout_type: 'top3', payout_distribution: [0.5, 0.3, 0.2], start_time: new Date(Date.now() + 2 * 60 * 1000).toISOString() },
];
export const FingerMain = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { isTestMode, resetFingerGame } = useGame();
  const { game, participants, loading, hasJoined, joinGame, error, fetchAllActiveGames } = useLiveGame();
  const { play } = useSounds();
  const { buttonClick, success } = useHaptics();
  const { secondsUntil } = useServerTime();
  
  const [joining, setJoining] = useState(false);
  const [allGames, setAllGames] = useState<any[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [entriesClosed, setEntriesClosed] = useState(false);

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

    const gamesChannel = supabase
      .channel('finger-games-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fastest_finger_games' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setAllGames(prev => [payload.new as any, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as any;
            setAllGames(prev => prev.map(g => g.id === updated.id ? { ...g, ...updated } : g).filter(g => ['live', 'scheduled', 'open'].includes(g.status)));
          } else if (payload.eventType === 'DELETE') {
            setAllGames(prev => prev.filter(g => g.id !== (payload.old as any).id));
          }
        }
      )
      .subscribe();

    const participantsChannel = supabase
      .channel('finger-participants-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fastest_finger_participants' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newP = payload.new as any;
            setAllGames(prev => prev.map(g => {
              if (g.id === newP.game_id) {
                return { 
                  ...g, 
                  participant_count: (g.participant_count || 0) + 1,
                  pool_value: (g.pool_value || 0) + (g.entry_fee || 700),
                  effective_prize_pool: (g.effective_prize_pool || 0) + (g.entry_fee || 700)
                };
              }
              return g;
            }));
          } else if (payload.eventType === 'DELETE') {
            const oldP = payload.old as any;
            setAllGames(prev => prev.map(g => {
              if (g.id === oldP.game_id) {
                return { 
                  ...g, 
                  participant_count: Math.max(0, (g.participant_count || 0) - 1),
                  pool_value: Math.max(0, (g.pool_value || 0) - (g.entry_fee || 700)),
                  effective_prize_pool: Math.max(0, (g.effective_prize_pool || 0) - (g.entry_fee || 700))
                };
              }
              return g;
            }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(gamesChannel);
      supabase.removeChannel(participantsChannel);
    };
  }, [isTestMode, fetchAllActiveGames]);

  const liveGames = allGames.filter(g => g.status === 'live');
  const openGames = allGames.filter(g => g.status === 'open');
  const scheduledGames = allGames.filter(g => g.status === 'scheduled');

  const selectedGame = selectedGameId 
    ? allGames.find(g => g.id === selectedGameId) 
    : (game ? allGames.find(g => g.id === game.id) : null);

  const poolValue = selectedGame?.effective_prize_pool || selectedGame?.pool_value || 0;
  const entryFee = selectedGame?.entry_fee || 700;
  const balance = profile?.wallet_balance || 0;
  const hasGames = allGames.length > 0;

  // Check if entries are closed for selected game (live games with < 10 min cutoff)
  useEffect(() => {
    if (!selectedGame) {
      setEntriesClosed(false);
      return;
    }
    
    const checkEntryClosed = () => {
      // Already joined - no need to check
      if (hasJoined) {
        setEntriesClosed(false);
        return;
      }
      
      // Scheduled games aren't open yet
      if (selectedGame.status === 'scheduled') {
        setEntriesClosed(true);
        return;
      }
      
      // Live games - check if cutoff has passed
      if (selectedGame.status === 'live' && selectedGame.start_time) {
        const secsRemaining = secondsUntil(new Date(new Date(selectedGame.start_time).getTime() + (selectedGame.max_duration || 20) * 60 * 1000));
        const cutoffMins = selectedGame.entry_cutoff_minutes ?? 10;
        setEntriesClosed(secsRemaining < cutoffMins * 60);
        return;
      }
      
      // Open games with start_time - check if less than cutoff minutes remaining
      if (selectedGame.status === 'open' && selectedGame.start_time) {
        const secsUntilLive = secondsUntil(selectedGame.start_time);
        const cutoffMins = selectedGame.entry_cutoff_minutes ?? 10;
        setEntriesClosed(secsUntilLive < cutoffMins * 60);
        return;
      }
      
      setEntriesClosed(false);
    };
    
    checkEntryClosed();
    const interval = setInterval(checkEntryClosed, 1000);
    return () => clearInterval(interval);
  }, [selectedGame, hasJoined, secondsUntil]);

  const formatMoney = (amount: number) => {
    if (amount >= 1_000_000) return `₦${(amount / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
    if (amount >= 1_000) return `₦${(amount / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
    return `₦${amount.toLocaleString()}`;
  };

  const handleJoin = async () => {
    if (!profile || joining || !selectedGame) return;
    
    // In test mode with mock games, skip backend join and go directly to lobby
    if (isTestMode && selectedGame.id.startsWith('mock-')) {
      play('success');
      success();
      navigate('/finger/lobby', { state: { gameId: selectedGame.id, isTestMode: true } });
      return;
    }
    
    if (balance < entryFee) {
      play('error');
      return;
    }

    setJoining(true);
    const success_result = await joinGame(selectedGame.id);
    
    if (success_result) {
      play('success');
      success();
      navigate('/finger/lobby', { state: { gameId: selectedGame.id } });
    } else {
      play('error');
    }
    setJoining(false);
  };

  const handleGameSelect = (gameId: string) => {
    play('click');
    buttonClick();
    setSelectedGameId(gameId);
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
    navigate('/finger/lobby', { state: { preferLobby: true } });
  };

  const handleEnterGame = (asSpectator: boolean = false) => {
    if (!selectedGame) return;
    play('click');
    buttonClick();
    
    // Live games can still enter lobby (they'll auto-navigate to arena)
    navigate('/finger/lobby', { state: { gameId: selectedGame.id, isSpectator: asSpectator } });
  };

  const handleWatchAsSpectator = () => {
    handleEnterGame(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-14 h-14 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground font-medium">Loading games...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-48">
      <div className="p-4 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3 pt-2">
          <button 
            onClick={handleBack}
            className="w-11 h-11 rounded-xl bg-card flex items-center justify-center border border-border/50 hover:border-primary/50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                <Swords className="w-4 h-4 text-primary" />
              </div>
              <h1 className="text-xl font-black text-foreground">Crusader's Arena</h1>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {liveGames.length} live • {openGames.length + scheduledGames.length} upcoming
            </p>
          </div>
        </div>

        {/* Wallet */}
        <WalletCard compact />

        {/* Test Controls */}
        <TestControls
          onStart={handleTestStart}
          onReset={resetFingerGame}
          startLabel="Start Test Game"
        />

        {/* Error Message */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 text-center">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* No Games State */}
        {!hasGames && (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4 relative">
              <Swords className="w-8 h-8 text-primary" />
            </div>
            <h3 className="font-bold text-foreground mb-2">No Active Games</h3>
            <p className="text-sm text-muted-foreground mb-4">Check back soon for exciting matches!</p>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
              <Clock className="w-4 h-4 text-primary animate-pulse" />
              <span className="text-sm font-medium text-primary">Waiting for challengers...</span>
            </div>
          </div>
        )}

        {/* Games List with Consistent Cards */}
        {hasGames && (
          <div className="space-y-5">
            {/* Live Games */}
            {liveGames.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-green-500/20 flex items-center justify-center">
                      <Radio className="w-3.5 h-3.5 text-green-400" />
                    </div>
                    Live Now
                    <span className="text-xs font-normal text-muted-foreground">({liveGames.length})</span>
                  </h2>
                </div>
                
                <div className="space-y-3">
                  {liveGames.map((g) => (
                    <div 
                      key={g.id}
                      onClick={() => handleGameSelect(g.id)}
                      className={`transition-all ${selectedGameId === g.id ? 'ring-2 ring-primary ring-offset-2 ring-offset-background rounded-2xl' : ''}`}
                    >
                      <GameStatusCard game={g} isTestMode={isTestMode} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Open Games (Entry Open) */}
            {openGames.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-blue-500/20 flex items-center justify-center">
                      <Play className="w-3.5 h-3.5 text-blue-400" fill="currentColor" />
                    </div>
                    Entry Open
                    <span className="text-xs font-normal text-muted-foreground">({openGames.length})</span>
                  </h2>
                </div>
                
                <div className="space-y-3">
                  {openGames.map((g) => (
                    <div 
                      key={g.id}
                      onClick={() => handleGameSelect(g.id)}
                      className={`transition-all ${selectedGameId === g.id ? 'ring-2 ring-primary ring-offset-2 ring-offset-background rounded-2xl' : ''}`}
                    >
                      <GameStatusCard game={g} isTestMode={isTestMode} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Scheduled Games */}
            {scheduledGames.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                      <Calendar className="w-3.5 h-3.5 text-yellow-400" />
                    </div>
                    Coming Soon
                    <span className="text-xs font-normal text-muted-foreground">({scheduledGames.length})</span>
                  </h2>
                </div>
                
                <div className="space-y-3">
                  {scheduledGames.map((g) => (
                    <div 
                      key={g.id}
                      onClick={() => handleGameSelect(g.id)}
                      className={`transition-all ${selectedGameId === g.id ? 'ring-2 ring-primary ring-offset-2 ring-offset-background rounded-2xl' : ''}`}
                    >
                      <GameStatusCard game={g} isTestMode={isTestMode} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Game History */}
        <GameHistory isTestMode={isTestMode} />

        {/* Prize Distribution */}
        {selectedGame && (
          <PrizeDistribution
            payoutType={selectedGame.payout_type || 'top3'}
            payoutDistribution={selectedGame.payout_distribution || [0.5, 0.3, 0.2]}
            poolValue={poolValue}
          />
        )}
      </div>

      {/* Fixed Action Panel */}
      {hasGames && (
        <div className="fixed bottom-20 left-0 right-0 p-4 bg-gradient-to-t from-background via-background/95 to-transparent">
          <div className="rounded-2xl border border-primary/30 bg-card/95 backdrop-blur-xl p-4 shadow-xl shadow-primary/5">
            {selectedGame ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      selectedGame.status === 'live' ? 'bg-green-500/20' : 
                      selectedGame.status === 'open' ? 'bg-blue-500/20' : 'bg-yellow-500/20'
                    }`}>
                      {selectedGame.status === 'live' ? (
                        <Radio className="w-5 h-5 text-green-400" />
                      ) : selectedGame.status === 'open' ? (
                        <Play className="w-5 h-5 text-blue-400" fill="currentColor" />
                      ) : (
                        <Calendar className="w-5 h-5 text-yellow-400" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground">{selectedGame.name || 'Fastest Finger'}</h3>
                      <p className="text-xs text-muted-foreground">
                        {selectedGame.status === 'live' ? 'Live now' : selectedGame.status === 'open' ? 'Entry open' : 'Coming soon'}
                        {' • '}{getPayoutLabel(selectedGame.payout_type || 'top3')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-black text-primary">{formatMoney(poolValue)}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Prize Pool</p>
                  </div>
                </div>

                {hasJoined ? (
                  <button
                    onClick={() => handleEnterGame(false)}
                    className="w-full bg-gradient-to-r from-primary to-primary/80 text-primary-foreground py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                  >
                    <Sparkles className="w-5 h-5" />
                    {selectedGame.status === 'live' ? 'Enter Arena' : 'Go to Lobby'}
                    <ChevronRight className="w-5 h-5" />
                  </button>
                ) : entriesClosed ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-center gap-2 py-3 bg-destructive/10 border border-destructive/30 rounded-xl text-destructive">
                      <Lock className="w-4 h-4" />
                      <span className="font-bold text-sm">Entries Closed</span>
                    </div>
                    {selectedGame.status === 'live' && (
                      <button
                        onClick={handleWatchAsSpectator}
                        className="w-full bg-gradient-to-r from-orange-500/80 to-orange-600/80 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                      >
                        <Eye className="w-5 h-5" />
                        Watch as Spectator
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={handleJoin}
                    disabled={balance < entryFee || joining || selectedGame.status === 'scheduled'}
                    className="w-full bg-gradient-to-r from-primary to-primary/80 text-primary-foreground py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
                  >
                    {selectedGame.is_sponsored ? (
                      <>
                        <Gift className="w-5 h-5" />
                        Join FREE Game
                      </>
                    ) : (
                      <>
                        <Zap className="w-5 h-5" />
                        {joining ? 'Joining...' : 
                         balance < entryFee ? `Need ₦${(entryFee - balance).toLocaleString()} more` : 
                         selectedGame.status === 'scheduled' ? 'Entry Not Open Yet' :
                         `Join Game — ₦${entryFee.toLocaleString()}`}
                      </>
                    )}
                  </button>
                )}
              </>
            ) : (
              <div className="text-center py-3">
                <p className="text-muted-foreground text-sm flex items-center justify-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Tap a game above to select
                </p>
              </div>
            )}
          </div>
        </div>
      )}
      
      <BottomNav />
    </div>
  );
};
