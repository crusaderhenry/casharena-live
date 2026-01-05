import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BottomNav } from '@/components/BottomNav';
import { WalletCard } from '@/components/WalletCard';
import { TestControls } from '@/components/TestControls';
import { PrizeDistribution, getPayoutLabel, getWinnerCount } from '@/components/PrizeDistribution';
import { PoolParticipantsSheet } from '@/components/PoolParticipantsSheet';
import { GameHistory } from '@/components/GameHistory';
import { AllTimeLeaderboard } from '@/components/AllTimeLeaderboard';
import { useAuth } from '@/contexts/AuthContext';
import { useGame } from '@/contexts/GameContext';
import { useLiveGame } from '@/hooks/useLiveGame';
import { useSounds } from '@/hooks/useSounds';
import { useHaptics } from '@/hooks/useHaptics';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Zap, Users, Clock, Trophy, MessageSquare, ChevronRight, Play, Calendar, Timer, Coins, Eye, Swords } from 'lucide-react';

// Mock games for test mode
const mockGamesForTest = [
  { id: 'mock-1', name: 'Fastest Finger', status: 'live', pool_value: 35000, participant_count: 23, countdown: 45, entry_fee: 700, max_duration: 20, payout_type: 'top3', payout_distribution: [0.5, 0.3, 0.2] },
  { id: 'mock-2', name: 'Speed Rush', status: 'live', pool_value: 18500, participant_count: 15, countdown: 32, entry_fee: 500, max_duration: 15, payout_type: 'winner_takes_all', payout_distribution: [1.0] },
  { id: 'mock-3', name: 'Quick Draw', status: 'scheduled', pool_value: 12000, participant_count: 8, countdown: 180, entry_fee: 300, max_duration: 10, payout_type: 'top5', payout_distribution: [0.4, 0.25, 0.15, 0.12, 0.08] },
];

export const FingerMain = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { isTestMode, resetFingerGame } = useGame();
  const { game, participants, loading, hasJoined, joinGame, error, fetchAllActiveGames } = useLiveGame();
  const { play } = useSounds();
  const { buttonClick, success } = useHaptics();
  
  const [joining, setJoining] = useState(false);
  const [allGames, setAllGames] = useState<any[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [showPrizeInfo, setShowPrizeInfo] = useState(false);

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

    // Subscribe to game updates (pool value, participant count, status)
    const gamesChannel = supabase
      .channel('finger-games-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fastest_finger_games' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setAllGames(prev => [payload.new as any, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as any;
            setAllGames(prev => prev.map(g => g.id === updated.id ? { ...g, ...updated } : g).filter(g => g.status === 'live' || g.status === 'scheduled'));
          } else if (payload.eventType === 'DELETE') {
            setAllGames(prev => prev.filter(g => g.id !== (payload.old as any).id));
          }
        }
      )
      .subscribe();

    // Subscribe to participant changes for live pool updates
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
                  pool_value: (g.pool_value || 0) + (g.entry_fee || 700)
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
                  pool_value: Math.max(0, (g.pool_value || 0) - (g.entry_fee || 700))
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
  const scheduledGames = allGames.filter(g => g.status === 'scheduled');
  
  // Find next scheduled game for countdown
  const nextScheduledGame = scheduledGames
    .filter(g => g.start_time)
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())[0];

  // Real-time countdown to next game
  const [timeToNext, setTimeToNext] = useState<string | null>(null);
  
  useEffect(() => {
    if (!nextScheduledGame?.start_time) {
      setTimeToNext(null);
      return;
    }

    const updateCountdown = () => {
      const now = new Date().getTime();
      const target = new Date(nextScheduledGame.start_time).getTime();
      const diff = target - now;

      if (diff <= 0) {
        setTimeToNext('Starting now!');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);

      if (hours > 0) {
        setTimeToNext(`${hours}h ${mins}m ${secs}s`);
      } else if (mins > 0) {
        setTimeToNext(`${mins}m ${secs}s`);
      } else {
        setTimeToNext(`${secs}s`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [nextScheduledGame?.start_time]);
  
  // Only auto-select if user came from a specific game context, otherwise require manual selection
  const selectedGame = selectedGameId 
    ? allGames.find(g => g.id === selectedGameId) 
    : (game ? allGames.find(g => g.id === game.id) : null);

  const poolValue = selectedGame?.pool_value || 0;
  const entryFee = selectedGame?.entry_fee || 700;
  const balance = profile?.wallet_balance || 0;
  const hasGames = allGames.length > 0;

  const formatMoney = (amount: number) => `₦${amount.toLocaleString()}`;

  const handleJoin = async () => {
    if (!profile || joining) return;
    
    if (balance < entryFee) {
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
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3 pt-2">
          <button 
            onClick={handleBack}
            className="w-10 h-10 rounded-xl bg-card flex items-center justify-center border border-border/50 hover:border-primary/50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Swords className="w-5 h-5 text-primary" />
              <h1 className="text-xl font-black text-foreground">Crusader's Arena</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              {liveGames.length} live • {scheduledGames.length} upcoming
            </p>
          </div>
        </div>

        {/* Wallet */}
        <WalletCard compact />

        {/* Test Controls */}
        <TestControls
          onStart={handleTestStart}
          onReset={resetFingerGame}
          startLabel="Start Live Game"
        />

        {/* Error Message */}
        {error && (
          <div className="bg-destructive/20 border border-destructive/50 rounded-xl p-4 text-center">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* No Games State */}
        {!hasGames && (
          <div className="card-panel text-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4 relative">
              <Swords className="w-8 h-8 text-primary animate-pulse" />
              <div className="absolute inset-0 bg-primary/20 rounded-2xl animate-ping opacity-30" />
            </div>
            <h3 className="font-bold text-foreground mb-2">Crusader's Arena is Quiet</h3>
            <p className="text-sm text-muted-foreground mb-4">No battles right now. New matches coming soon!</p>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
              <Clock className="w-4 h-4 text-primary animate-pulse" />
              <span className="text-sm font-medium text-primary">
                {timeToNext ? `Next battle in ${timeToNext}` : 'Waiting for challengers...'}
              </span>
            </div>
          </div>
        )}

        {/* Games List */}
        {hasGames && (
          <div className="space-y-4">
            {/* Live Games */}
            {liveGames.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Play className="w-4 h-4 text-green-400" fill="currentColor" />
                  Live Games
                </h2>
                
                {liveGames.map((g) => {
                  const isSelected = selectedGame?.id === g.id;
                  return (
                    <button
                      key={g.id}
                      onClick={() => setSelectedGameId(g.id)}
                      className={`w-full relative overflow-hidden rounded-2xl p-4 text-left transition-all active:scale-[0.98] ${
                        isSelected 
                          ? 'bg-gradient-to-br from-green-500/20 via-card to-card border-2 border-green-500/50' 
                          : 'bg-card border border-border/50 hover:border-green-500/30'
                      }`}
                    >
                      {isSelected && <div className="absolute top-0 right-0 w-40 h-40 bg-green-500/10 rounded-full blur-3xl" />}
                      
                      <div className="relative z-10">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${isSelected ? 'bg-green-500/30' : 'bg-green-500/15'}`}>
                              <Zap className="w-5 h-5 text-green-400" />
                            </div>
                            <div>
                              <h3 className="font-bold text-foreground">{g.name || 'Fastest Finger'}</h3>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                <Trophy className="w-3 h-3 text-gold" />
                                <span>{getPayoutLabel(g.payout_type || 'top3')}</span>
                              </div>
                            </div>
                          </div>
                          <span className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-500/20 text-xs font-bold text-green-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                            LIVE
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-4 gap-2 mb-3">
                          <div className="bg-background/50 rounded-lg p-2 text-center">
                            <Coins className="w-4 h-4 text-primary mx-auto mb-1" />
                            <p className="text-xs text-muted-foreground">Pool</p>
                            <p className="font-bold text-primary text-sm">{formatMoney(g.pool_value)}</p>
                          </div>
                          <div className="bg-background/50 rounded-lg p-2 text-center">
                            <Users className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
                            <p className="text-xs text-muted-foreground">Players</p>
                            <p className="font-bold text-foreground text-sm">{g.participant_count}</p>
                          </div>
                          <div className="bg-background/50 rounded-lg p-2 text-center">
                            <Timer className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
                            <p className="text-xs text-muted-foreground">Timer</p>
                            <p className="font-bold text-foreground text-sm">{g.countdown}s</p>
                          </div>
                          <div className="bg-background/50 rounded-lg p-2 text-center">
                            <Trophy className="w-4 h-4 text-gold mx-auto mb-1" />
                            <p className="text-xs text-muted-foreground">Entry</p>
                            <p className="font-bold text-foreground text-sm">₦{g.entry_fee}</p>
                          </div>
                        </div>

                        {/* View Pool CTA */}
                        <div className="flex items-center justify-between pt-2 border-t border-border/30">
                          <div className="flex items-center gap-2">
                            <Users className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">{g.participant_count} in pool</span>
                          </div>
                          <PoolParticipantsSheet
                            gameId={g.id}
                            gameName={g.name || 'Fastest Finger'}
                            participantCount={g.participant_count}
                            poolValue={g.pool_value}
                            entryFee={g.entry_fee}
                            isTestMode={isTestMode}
                          >
                            <span className="flex items-center gap-1 text-xs text-primary font-medium" onClick={(e) => e.stopPropagation()}>
                              <Eye className="w-3 h-3" /> View pool
                            </span>
                          </PoolParticipantsSheet>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Scheduled Games */}
            {scheduledGames.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-yellow-400" />
                  Coming Soon
                </h2>
                
                {scheduledGames.map((g) => {
                  const isSelected = selectedGame?.id === g.id;
                  return (
                    <button
                      key={g.id}
                      onClick={() => setSelectedGameId(g.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all active:scale-[0.98] ${
                        isSelected 
                          ? 'bg-yellow-500/10 border-2 border-yellow-500/40' 
                          : 'bg-card border border-border/50 hover:border-yellow-500/30'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isSelected ? 'bg-yellow-500/25' : 'bg-yellow-500/15'}`}>
                        <Zap className="w-5 h-5 text-yellow-400" />
                      </div>
                      <div className="flex-1 text-left">
                        <h4 className="font-semibold text-foreground text-sm">{g.name || 'Fastest Finger'}</h4>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <span>{g.participant_count} joined</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Trophy className="w-3 h-3 text-gold" />
                            {getPayoutLabel(g.payout_type || 'top3')}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-primary text-sm">{formatMoney(g.pool_value)}</p>
                        <PoolParticipantsSheet
                          gameId={g.id}
                          gameName={g.name || 'Fastest Finger'}
                          participantCount={g.participant_count}
                          poolValue={g.pool_value}
                          entryFee={g.entry_fee}
                          isTestMode={isTestMode}
                        >
                          <span className="flex items-center gap-1 text-xs text-primary font-medium" onClick={(e) => e.stopPropagation()}>
                            <Eye className="w-3 h-3" /> View pool
                          </span>
                        </PoolParticipantsSheet>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Selected Game Action Panel */}
        {hasGames && (
          <div className="fixed bottom-20 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent">
            <div className="card-panel border-primary/30 bg-card/95 backdrop-blur-sm">
              {selectedGame ? (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-foreground">{(selectedGame as any).name || 'Fastest Finger'}</h3>
                      <p className="text-xs text-muted-foreground">
                        {selectedGame.status === 'live' ? 'Game in progress' : 'Waiting to start'} • {getPayoutLabel((selectedGame as any).payout_type || 'top3')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black text-primary">{formatMoney(poolValue)}</p>
                      <p className="text-xs text-muted-foreground">prize pool</p>
                    </div>
                  </div>

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
                      disabled={balance < entryFee || joining}
                      className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Zap className="w-5 h-5" />
                      {joining ? 'Joining...' : balance < entryFee ? `Need ₦${entryFee - balance} more` : `Join Game — ₦${entryFee}`}
                    </button>
                  )}
                </>
              ) : (
                <div className="text-center py-2">
                  <p className="text-muted-foreground text-sm">👆 Select a game above to join</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* How to Play - Collapsible */}
        <details className="card-panel group">
          <summary className="font-bold text-foreground flex items-center justify-between cursor-pointer list-none">
            <span className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              How to Win
            </span>
            <ChevronRight className="w-5 h-5 text-muted-foreground transition-transform group-open:rotate-90" />
          </summary>
          <ul className="text-sm text-muted-foreground space-y-3 mt-4">
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0">1</span>
              <span>Pay the entry fee to join the game lobby</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0">2</span>
              <span>When live, send comments to reset the 60s countdown timer</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0">3</span>
              <span>If no one comments for 60 seconds, the last commenter(s) win!</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0">4</span>
              <span>Game auto-ends after max duration ({selectedGame?.max_duration || 20} min)</span>
            </li>
          </ul>
        </details>

        {/* Game History */}
        <GameHistory isTestMode={isTestMode} />

        {/* All-Time Leaderboard */}
        <AllTimeLeaderboard isTestMode={isTestMode} />

        {/* Prize Distribution - Only show if game selected */}
        {selectedGame && (
          <PrizeDistribution
            payoutType={(selectedGame as any)?.payout_type || 'top3'}
            payoutDistribution={(selectedGame as any)?.payout_distribution || [0.5, 0.3, 0.2]}
            poolValue={poolValue}
          />
        )}

        {/* Extra padding for fixed action panel */}
        {hasGames && selectedGame && <div className="h-24" />}
      </div>
      
      <BottomNav />
    </div>
  );
};