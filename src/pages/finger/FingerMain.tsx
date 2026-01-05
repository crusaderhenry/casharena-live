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
import { ArrowLeft, Zap, Users, Clock, Trophy, MessageSquare, ChevronRight } from 'lucide-react';

export const FingerMain = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { isTestMode, resetFingerGame } = useGame();
  const { game, participants, loading, hasJoined, joinGame, error } = useLiveGame();
  const { play } = useSounds();
  const { buttonClick, success } = useHaptics();
  
  const [countdown, setCountdown] = useState(300);
  const [joining, setJoining] = useState(false);

  // Calculate countdown to game start
  useEffect(() => {
    if (!game || game.status !== 'scheduled') return;
    
    // Use server countdown directly
    setCountdown(game.countdown || 60);
  }, [game]);

  // Local countdown until next server update
  useEffect(() => {
    if (!game || game.status !== 'scheduled') return;
    
    const timer = setInterval(() => {
      setCountdown(prev => prev > 0 ? prev - 1 : 0);
    }, 1000);
    return () => clearInterval(timer);
  }, [game]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleJoin = async () => {
    if (!profile || joining) return;
    
    if (profile.wallet_balance < 700) {
      play('error');
      return;
    }

    setJoining(true);
    const success_result = await joinGame();
    
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

  const poolValue = game?.pool_value || 0;
  const playerCount = participants.length || game?.participant_count || 0;
  const entryFee = game?.entry_fee || 700;
  const balance = profile?.wallet_balance || 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading game...</p>
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

        {/* Hero Card */}
        <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-card via-card to-primary/10">
          {/* Background effects */}
          <div className="absolute top-0 right-0 w-40 h-40 bg-primary/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl" />
          
          <div className="relative z-10 p-5">
            {/* Live badge */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/20 rounded-full border border-red-500/30">
                <span className="live-dot" />
                <span className="text-xs font-bold text-red-400 uppercase tracking-wider">
                  {game?.status === 'live' ? 'Live Now' : 'Upcoming'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Users className="w-4 h-4" />
                <span className="text-sm font-medium">{playerCount} {game?.status === 'live' ? 'playing' : 'waiting'}</span>
              </div>
            </div>

            {/* Title */}
            <div className="flex items-center gap-4 mb-5">
              <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center glow-primary">
                <Zap className="w-9 h-9 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-black text-foreground">Live Comment Battle</h2>
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
                  {game?.status === 'live' ? 'Game Timer' : 'Starts In'}
                </p>
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  <p className="text-2xl font-black text-foreground">{formatTime(countdown)}</p>
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
                <p className="font-bold text-foreground">{game?.max_duration || 20} min</p>
              </div>
            </div>

            {/* CTA */}
            {hasJoined ? (
              <button
                onClick={() => navigate(game?.status === 'live' ? '/finger/arena' : '/finger/lobby')}
                className="w-full btn-primary flex items-center justify-center gap-2 text-lg"
              >
                {game?.status === 'live' ? 'Enter Arena' : 'Go to Lobby'}
                <ChevronRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={handleJoin}
                disabled={balance < entryFee || joining || !game}
                className="w-full btn-primary flex items-center justify-center gap-2 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Zap className="w-5 h-5" />
                {joining ? 'Joining...' : balance < entryFee ? 'Insufficient Balance' : `Join Lobby — ₦${entryFee}`}
              </button>
            )}
          </div>
        </div>

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
              <span>Max game time: {game?.max_duration || 20} minutes — then it auto-ends</span>
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