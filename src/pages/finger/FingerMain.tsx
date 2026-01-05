import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BottomNav } from '@/components/BottomNav';
import { WalletCard } from '@/components/WalletCard';
import { TestControls } from '@/components/TestControls';
import { useAuth } from '@/contexts/AuthContext';
import { useGame } from '@/contexts/GameContext';
import { useLiveGame } from '@/hooks/useLiveGame';
import { useSounds } from '@/hooks/useSounds';
import { useHaptics } from '@/hooks/useHaptics';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Zap, Users, Clock, Trophy, MessageSquare, ChevronRight } from 'lucide-react';

// Mock games for test mode
const mockGamesForTest = [
  { id: 'mock-1', name: 'Fastest Finger', status: 'live', pool_value: 35000, participant_count: 23, countdown: 45, entry_fee: 700, max_duration: 20 },
  { id: 'mock-2', name: 'Speed Rush', status: 'live', pool_value: 18500, participant_count: 15, countdown: 32, entry_fee: 500, max_duration: 15 },
  { id: 'mock-3', name: 'Quick Draw', status: 'scheduled', pool_value: 12000, participant_count: 8, countdown: 60, entry_fee: 300, max_duration: 10 },
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
        {!hasGames && !isTestMode && (
          <div className="card-panel text-center py-8">
            <Zap className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-bold text-foreground mb-2">No Games Available</h3>
            <p className="text-sm text-muted-foreground">Check back soon for upcoming games!</p>
          </div>
        )}

        {/* Game Selector (when multiple games available) */}
        {hasGames && allGames.length > 1 && (
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Available Games ({liveGames.length} live, {scheduledGames.length} upcoming)
            </h3>
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
              {allGames.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setSelectedGameId(g.id)}
                  className={`flex-shrink-0 px-4 py-3 rounded-xl border transition-all ${
                    selectedGame?.id === g.id
                      ? 'bg-primary/20 border-primary text-foreground'
                      : 'bg-card border-border/50 text-muted-foreground hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${g.status === 'live' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                    <span className="font-medium text-sm">{(g as any).name || 'Game'}</span>
                  </div>
                  <p className="text-xs mt-1">₦{g.pool_value?.toLocaleString() || 0}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Hero Card */}
        {hasGames && selectedGame && (
          <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-card via-card to-primary/10">
            {/* Background effects */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-primary/20 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl" />
            
            <div className="relative z-10 p-5">
              {/* Live badge */}
              <div className="flex items-center justify-between mb-4">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${
                  selectedGame.status === 'live'
                    ? 'bg-green-500/20 border-green-500/30'
                    : 'bg-yellow-500/20 border-yellow-500/30'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${selectedGame.status === 'live' ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
                  <span className={`text-xs font-bold uppercase tracking-wider ${
                    selectedGame.status === 'live' ? 'text-green-400' : 'text-yellow-400'
                  }`}>
                    {selectedGame.status === 'live' ? 'Live Now' : 'Upcoming'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Users className="w-4 h-4" />
                  <span className="text-sm font-medium">{playerCount} {selectedGame.status === 'live' ? 'playing' : 'waiting'}</span>
                </div>
              </div>

              {/* Title */}
              <div className="flex items-center gap-4 mb-5">
                <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center glow-primary">
                  <Zap className="w-9 h-9 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-foreground">
                    {(selectedGame as any).name || 'Live Comment Battle'}
                  </h2>
                  <p className="text-sm text-muted-foreground">Be the last commenter standing!</p>
                </div>
              </div>

              {/* Pool & Countdown */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="bg-background/60 backdrop-blur-sm rounded-xl p-4 border border-border/30">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Prize Pool</p>
                  <p className="text-2xl font-black text-primary">₦{poolValue.toLocaleString()}</p>
                </div>
                <div className="bg-background/60 backdrop-blur-sm rounded-xl p-4 border border-border/30">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                    {selectedGame.status === 'live' ? 'Game Timer' : 'Starts In'}
                  </p>
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-primary" />
                    <p className="text-2xl font-black text-foreground">
                      {selectedGame.status === 'live' ? `${selectedGame.countdown}s` : formatTime(countdown)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Entry & Winners */}
              <div className="flex items-center justify-between px-4 py-3 bg-muted/30 rounded-xl border border-border/30 mb-5">
                <div className="text-center">
                  <p className="text-[10px] text-muted-foreground uppercase">Entry</p>
                  <p className="font-bold text-primary">₦{entryFee}</p>
                </div>
                <div className="w-px h-8 bg-border/50" />
                <div className="text-center">
                  <p className="text-[10px] text-muted-foreground uppercase">Winners</p>
                  <p className="font-bold text-foreground flex items-center gap-1">
                    <Trophy className="w-4 h-4 text-gold" /> Top 3
                  </p>
                </div>
                <div className="w-px h-8 bg-border/50" />
                <div className="text-center">
                  <p className="text-[10px] text-muted-foreground uppercase">Game Time</p>
                  <p className="font-bold text-foreground">{selectedGame.max_duration || 20} min</p>
                </div>
              </div>

              {/* CTA */}
              {hasJoined ? (
                <button
                  onClick={() => navigate(selectedGame.status === 'live' ? '/finger/arena' : '/finger/lobby')}
                  className="w-full btn-primary flex items-center justify-center gap-2 text-lg"
                >
                  {selectedGame.status === 'live' ? 'Enter Arena' : 'Go to Lobby'}
                  <ChevronRight className="w-5 h-5" />
                </button>
              ) : (
                <button
                  onClick={handleJoin}
                  disabled={balance < entryFee || joining || !selectedGame}
                  className="w-full btn-primary flex items-center justify-center gap-2 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Zap className="w-5 h-5" />
                  {joining ? 'Joining...' : balance < entryFee ? 'Insufficient Balance' : `Join Lobby — ₦${entryFee}`}
                </button>
              )}
            </div>
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
              <span>If no one comments for 60 seconds, last 3 commenters win!</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0">4</span>
              <span>Max game time: {selectedGame?.max_duration || 20} minutes — then it auto-ends</span>
            </li>
          </ul>
        </div>

        {/* Prize Distribution */}
        <div className="card-panel">
          <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-gold" />
            Prize Distribution
          </h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 rounded-xl podium-1">
              <span className="flex items-center gap-2 font-medium">
                <span className="text-lg">🥇</span> 1st Place
              </span>
              <span className="font-bold text-gold">50% of pool</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl podium-2">
              <span className="flex items-center gap-2 font-medium">
                <span className="text-lg">🥈</span> 2nd Place
              </span>
              <span className="font-bold text-silver">30% of pool</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl podium-3">
              <span className="flex items-center gap-2 font-medium">
                <span className="text-lg">🥉</span> 3rd Place
              </span>
              <span className="font-bold text-bronze">20% of pool</span>
            </div>
            <p className="text-xs text-muted-foreground text-center mt-3">
              * 10% platform fee deducted from winnings
            </p>
          </div>
        </div>
      </div>
      
      <BottomNav />
    </div>
  );
};