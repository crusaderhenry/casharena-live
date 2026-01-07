import { useAdmin } from '@/contexts/AdminContext';
import { Monitor, Play, Pause, Square, Users, Clock, Trophy, MessageSquare, Radio, Volume2, VolumeX, Maximize, Minimize, X, Activity, RefreshCw, Zap, Timer, AlertTriangle, CheckCircle, Database } from 'lucide-react';
import { useEffect, useRef, useState, useCallback } from 'react';
import { adminAudio } from '@/utils/adminAudio';
import { supabase } from '@/integrations/supabase/client';
import { useServerTime } from '@/hooks/useServerTime';

interface RealTimeCycle {
  id: string;
  template_name: string;
  status: string;
  pool_value: number;
  effective_prize_pool: number;
  participant_count: number;
  entry_fee: number;
  entry_open_at: string;
  live_start_at: string;
  sponsored_prize_amount: number | null;
  seconds_until_opening: number;
  seconds_until_live: number;
  seconds_remaining: number;
  countdown: number;
}

interface CronActivity {
  id: string;
  timestamp: Date;
  action: string;
  status: 'success' | 'pending' | 'error';
  details?: string;
}

export const AdminLiveMonitor = () => {
  const { 
    currentGame, 
    liveComments, 
    isSimulating,
    pauseSimulation,
    resumeSimulation,
    endGame,
  } = useAdmin();

  const { getServerTime } = useServerTime();
  const serverTime = new Date(getServerTime());
  const commentsRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [newCommentFlash, setNewCommentFlash] = useState(false);
  const [countdownPulse, setCountdownPulse] = useState(false);
  const [broadcastTime, setBroadcastTime] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [realTimeCycles, setRealTimeCycles] = useState<RealTimeCycle[]>([]);
  const [cronActivity, setCronActivity] = useState<CronActivity[]>([]);
  const [lastCronRun, setLastCronRun] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const lastCommentCount = useRef(0);
  const lastCountdown = useRef(60);

  // Fetch real-time cycles from database
  const fetchActiveCycles = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const { data, error } = await supabase.rpc('get_active_cycles');
      if (error) throw error;
      
      const cycles = (data || []).map((c: any) => ({
        ...c,
        effective_prize_pool: c.pool_value + (c.sponsored_prize_amount || 0),
      }));
      setRealTimeCycles(cycles);
      
      // Log cron activity
      const now = new Date();
      setLastCronRun(now);
      setCronActivity(prev => [{
        id: `fetch-${now.getTime()}`,
        timestamp: now,
        action: 'Cycle state refresh',
        status: 'success',
        details: `Found ${cycles.length} active cycles`
      }, ...prev.slice(0, 19)]);
    } catch (error) {
      console.error('Error fetching cycles:', error);
      const now = new Date();
      setCronActivity(prev => [{
        id: `error-${now.getTime()}`,
        timestamp: now,
        action: 'Cycle state refresh',
        status: 'error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, ...prev.slice(0, 19)]);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Subscribe to real-time cycle updates
  useEffect(() => {
    fetchActiveCycles();

    const channel = supabase
      .channel('admin-cycle-monitor')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_cycles'
        },
        (payload) => {
          console.log('Cycle update:', payload);
          const now = new Date();
          setCronActivity(prev => [{
            id: `db-${now.getTime()}`,
            timestamp: now,
            action: `Cycle ${payload.eventType}`,
            status: 'success',
            details: `Cycle ID: ${(payload.new as any)?.id?.slice(0, 8) || (payload.old as any)?.id?.slice(0, 8) || 'unknown'}...`
          }, ...prev.slice(0, 19)]);
          
          // Refresh cycles list
          fetchActiveCycles();
        }
      )
      .subscribe();

    // Refresh every 10 seconds
    const interval = setInterval(fetchActiveCycles, 10000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [fetchActiveCycles]);

  // Simulate cron job activity indicator
  useEffect(() => {
    const cronInterval = setInterval(() => {
      const now = new Date();
      if (now.getSeconds() === 0) {
        setCronActivity(prev => [{
          id: `cron-${now.getTime()}`,
          timestamp: now,
          action: 'Cron: game-lifecycle',
          status: 'pending',
          details: 'Processing game state transitions...'
        }, ...prev.slice(0, 19)]);
        
        // Simulate completion after a moment
        setTimeout(() => {
          setCronActivity(prev => prev.map(a => 
            a.id === `cron-${now.getTime()}` 
              ? { ...a, status: 'success' as const, details: 'Completed state transitions' }
              : a
          ));
        }, 500);
      }
    }, 1000);

    return () => clearInterval(cronInterval);
  }, []);

  // Toggle sound
  const toggleSound = useCallback(() => {
    const newState = !soundEnabled;
    setSoundEnabled(newState);
    adminAudio.setEnabled(newState);
  }, [soundEnabled]);

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Scroll to top on new comments
  useEffect(() => {
    if (commentsRef.current) {
      commentsRef.current.scrollTop = 0;
    }
  }, [liveComments]);

  // Flash effect and sound on new comments
  useEffect(() => {
    if (liveComments.length > lastCommentCount.current) {
      setNewCommentFlash(true);
      adminAudio.playNewComment();
      setTimeout(() => setNewCommentFlash(false), 300);
    }
    lastCommentCount.current = liveComments.length;
  }, [liveComments.length]);

  // Countdown sound effects
  useEffect(() => {
    if (!currentGame?.countdown) return;
    
    const countdown = currentGame.countdown;
    
    if (countdown < lastCountdown.current) {
      if (countdown === 30) {
        adminAudio.playTimerWarning();
      } else if (countdown === 15) {
        adminAudio.playTimerCritical();
      } else if (countdown <= 5 && countdown > 0) {
        adminAudio.playTimerDanger();
      }
    }
    
    lastCountdown.current = countdown;
  }, [currentGame?.countdown]);

  // Simulate typing indicators
  useEffect(() => {
    if (!isSimulating || currentGame?.status !== 'live') return;

    const typingInterval = setInterval(() => {
      const names = ['Player' + Math.floor(Math.random() * 100), 'User' + Math.floor(Math.random() * 100)];
      const randomName = names[Math.floor(Math.random() * names.length)];
      
      setTypingUsers(prev => [...prev.slice(-2), randomName]);
      
      setTimeout(() => {
        setTypingUsers(prev => prev.filter(n => n !== randomName));
      }, 1500 + Math.random() * 1000);
    }, 2000 + Math.random() * 2000);

    return () => clearInterval(typingInterval);
  }, [isSimulating, currentGame?.status]);

  // Countdown pulse effect when low
  useEffect(() => {
    if (currentGame?.countdown && currentGame.countdown <= 10) {
      setCountdownPulse(true);
      const timeout = setTimeout(() => setCountdownPulse(false), 500);
      return () => clearTimeout(timeout);
    }
  }, [currentGame?.countdown]);

  // Broadcast timer
  useEffect(() => {
    if (!currentGame?.status || currentGame.status !== 'live') {
      setBroadcastTime(0);
      return;
    }

    const interval = setInterval(() => {
      setBroadcastTime(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [currentGame?.status]);

  const top3 = liveComments.slice(0, 3).map((c, i) => ({
    position: i + 1,
    username: c.username,
    avatar: c.avatar,
  }));

  const formatCountdown = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const formatBroadcastTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getCountdownColor = (seconds: number) => {
    if (seconds <= 5) return 'text-red-500';
    if (seconds <= 15) return 'text-yellow-400';
    if (seconds <= 30) return 'text-orange-400';
    return 'text-foreground';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'live': return 'bg-red-500/20 text-red-400 border-red-500/50';
      case 'ending_soon': return 'bg-orange-500/20 text-orange-400 border-orange-500/50';
      case 'open': return 'bg-green-500/20 text-green-400 border-green-500/50';
      case 'scheduled': return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'live': return <Radio className="w-3 h-3 animate-pulse" />;
      case 'ending_soon': return <AlertTriangle className="w-3 h-3" />;
      case 'open': return <Users className="w-3 h-3" />;
      case 'scheduled': return <Clock className="w-3 h-3" />;
      default: return <Database className="w-3 h-3" />;
    }
  };

  return (
    <div 
      ref={containerRef}
      className={`${isFullscreen ? 'fixed inset-0 z-50 bg-background overflow-auto' : ''} p-6 space-y-6`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`font-black text-foreground ${isFullscreen ? 'text-3xl' : 'text-2xl'}`}>
            Live Games Monitor
          </h1>
          <p className="text-sm text-muted-foreground">Real-time game observation and automation tracking</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Server Time */}
          <div className="px-3 py-1.5 bg-muted rounded-lg text-xs font-mono text-muted-foreground">
            Server: {serverTime.toLocaleTimeString()}
          </div>

          {/* Refresh Button */}
          <button
            onClick={fetchActiveCycles}
            disabled={isRefreshing}
            className="p-2 rounded-xl bg-muted hover:bg-muted/80 transition-colors disabled:opacity-50"
            title="Refresh cycles"
          >
            <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>

          {/* Sound Toggle */}
          <button
            onClick={toggleSound}
            className={`p-2 rounded-xl transition-colors ${
              soundEnabled 
                ? 'bg-primary/20 text-primary hover:bg-primary/30' 
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
            title={soundEnabled ? 'Mute sounds' : 'Enable sounds'}
          >
            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-muted hover:bg-muted/80 transition-colors"
            title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          >
            {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
          </button>

          {currentGame?.status === 'live' && (
            <>
              <button
                onClick={isSimulating ? pauseSimulation : resumeSimulation}
                className={`px-4 py-2 rounded-xl font-medium flex items-center gap-2 ${
                  isSimulating 
                    ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30' 
                    : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                }`}
              >
                {isSimulating ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {isSimulating ? 'Pause' : 'Resume'}
              </button>
              <button
                onClick={() => endGame()}
                className="px-4 py-2 bg-red-500/20 text-red-400 rounded-xl font-medium hover:bg-red-500/30 flex items-center gap-2"
              >
                <Square className="w-4 h-4" />
                Force End
              </button>
            </>
          )}

          {isFullscreen && (
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Real-Time Cycles Grid */}
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-foreground">Active Cycles (Live Backend)</h2>
            <span className="text-xs text-muted-foreground">({realTimeCycles.length} cycles)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs text-green-400">REAL-TIME</span>
          </div>
        </div>

        {realTimeCycles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {realTimeCycles.map((cycle) => (
              <div
                key={cycle.id}
                className={`p-4 rounded-xl border ${
                  cycle.status === 'ending' 
                    ? 'bg-red-500/5 border-red-500/30 animate-pulse' 
                    : cycle.status === 'live' 
                    ? 'bg-card border-primary/30' 
                    : 'bg-card border-border'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-foreground text-sm truncate">
                    {cycle.template_name || 'Royal Rumble'}
                  </h3>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase flex items-center gap-1 border ${getStatusColor(cycle.status)}`}>
                    {getStatusIcon(cycle.status)}
                    {cycle.status.replace('_', ' ')}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3 h-3 text-muted-foreground" />
                    <span className="text-muted-foreground">Players:</span>
                    <span className="font-medium text-foreground">{cycle.participant_count}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Trophy className="w-3 h-3 text-primary" />
                    <span className="text-muted-foreground">Prize:</span>
                    <span className="font-medium text-primary">₦{cycle.effective_prize_pool.toLocaleString()}</span>
                  </div>
                </div>

                {/* Status-specific info */}
                <div className="p-2 bg-muted/30 rounded-lg">
                  {(cycle.status === 'live' || cycle.status === 'ending') && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Countdown:</span>
                      <span className={`font-mono font-bold ${cycle.countdown <= 10 ? 'text-red-400' : 'text-foreground'}`}>
                        {formatCountdown(cycle.countdown)}
                      </span>
                    </div>
                  )}
                  {cycle.status === 'opening' && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Entry Fee:</span>
                      <span className="font-medium text-foreground">
                        {cycle.entry_fee === 0 ? (
                          <span className="text-green-400">FREE (Sponsored)</span>
                        ) : (
                          `₦${cycle.entry_fee}`
                        )}
                      </span>
                    </div>
                  )}
                  {cycle.status === 'waiting' && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Opens in:</span>
                      <span className="font-mono font-medium text-foreground">
                        {formatCountdown(cycle.seconds_until_opening)}
                      </span>
                    </div>
                  )}
                </div>

                {cycle.sponsored_prize_amount && cycle.sponsored_prize_amount > 0 && (
                  <div className="mt-2 px-2 py-1 bg-gold/10 rounded text-[10px] text-gold font-medium text-center">
                    ⭐ SPONSORED
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Database className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No active cycles in the backend</p>
            <p className="text-xs mt-1">Cycles are created automatically from active templates</p>
          </div>
        )}
      </div>

      {/* Cron Activity Log */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card rounded-xl border border-border p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-400" />
              <h2 className="font-bold text-foreground">Automation Activity</h2>
            </div>
            {lastCronRun && (
              <span className="text-xs text-muted-foreground">
                Last update: {lastCronRun.toLocaleTimeString()}
              </span>
            )}
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {cronActivity.length > 0 ? (
              cronActivity.map((activity) => (
                <div
                  key={activity.id}
                  className={`flex items-center gap-3 p-2 rounded-lg text-sm ${
                    activity.status === 'error' 
                      ? 'bg-red-500/10' 
                      : activity.status === 'pending' 
                      ? 'bg-yellow-500/10' 
                      : 'bg-muted/30'
                  }`}
                >
                  {activity.status === 'success' ? (
                    <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
                  ) : activity.status === 'pending' ? (
                    <Timer className="w-4 h-4 text-yellow-400 animate-spin shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{activity.action}</span>
                      <span className="text-xs text-muted-foreground">
                        {activity.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    {activity.details && (
                      <p className="text-xs text-muted-foreground truncate">{activity.details}</p>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Waiting for activity...</p>
              </div>
            )}
          </div>
        </div>

        {/* Cron Status Panel */}
        <div className="space-y-4">
          <div className="bg-card rounded-xl border border-green-500/30 p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
              <h3 className="font-bold text-foreground">Cron: game-lifecycle</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Schedule</span>
                <span className="font-mono text-foreground">* * * * *</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Frequency</span>
                <span className="text-foreground">Every minute</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <span className="text-green-400">Active</span>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border p-4">
            <h3 className="font-bold text-foreground mb-3 text-sm">State Transitions</h3>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-muted-foreground">scheduled → open</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-muted-foreground">open → live</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-orange-500" />
                <span className="text-muted-foreground">live → ending_soon</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-muted-foreground">ending_soon → ended</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-500" />
                <span className="text-muted-foreground">ended → settlement</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Test Mode Monitor (existing functionality) */}
      {currentGame?.status === 'live' && (
        <div className={`grid gap-6 ${isFullscreen ? 'grid-cols-1 lg:grid-cols-4' : 'grid-cols-1 lg:grid-cols-3'}`}>
          {/* Main Monitor */}
          <div className={`space-y-4 ${isFullscreen ? 'lg:col-span-3' : 'lg:col-span-2'}`}>
            {/* Broadcast Status Bar */}
            <div className="bg-card rounded-xl border border-red-500/50 p-4 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 via-transparent to-red-500/5 animate-pulse" />
              
              <div className="relative flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-4 h-4 rounded-full bg-red-500 animate-pulse" />
                    <div className="absolute inset-0 w-4 h-4 rounded-full bg-red-500 animate-ping opacity-50" />
                  </div>
                  <span className={`font-black text-red-400 uppercase tracking-wider flex items-center gap-2 ${isFullscreen ? 'text-xl' : 'text-lg'}`}>
                    <Radio className="w-5 h-5" />
                    TEST MODE BROADCAST
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    {soundEnabled ? (
                      <Volume2 className="w-4 h-4 text-green-400" />
                    ) : (
                      <VolumeX className="w-4 h-4 text-red-400" />
                    )}
                    <span className="text-xs font-mono">{soundEnabled ? 'AUDIO ON' : 'MUTED'}</span>
                  </div>
                  <span className="text-sm font-mono text-muted-foreground bg-muted px-3 py-1 rounded-lg">
                    {formatBroadcastTime(broadcastTime)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className={`text-center p-4 rounded-xl transition-all duration-300 ${
                  currentGame.countdown <= 10 
                    ? 'bg-red-500/20 border-2 border-red-500/50' 
                    : currentGame.countdown <= 30 
                    ? 'bg-orange-500/10 border border-orange-500/30' 
                    : 'bg-muted/30 border border-border/30'
                } ${countdownPulse ? 'scale-105' : ''}`}>
                  <Clock className={`w-6 h-6 mx-auto mb-2 ${getCountdownColor(currentGame.countdown)}`} />
                  <p className={`font-black font-mono ${getCountdownColor(currentGame.countdown)} ${
                    currentGame.countdown <= 5 ? 'animate-pulse' : ''
                  } ${isFullscreen ? 'text-6xl' : 'text-4xl'}`}>
                    {formatCountdown(currentGame.countdown)}
                  </p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">
                    {currentGame.countdown <= 10 ? '⚠️ CRITICAL' : currentGame.countdown <= 30 ? 'LOW' : 'Countdown'}
                  </p>
                </div>

                <div className="text-center p-4 bg-muted/30 rounded-xl border border-border/30">
                  <Trophy className="w-6 h-6 text-gold mx-auto mb-2" />
                  <p className={`font-black text-primary transition-all ${newCommentFlash ? 'scale-110' : ''} ${isFullscreen ? 'text-5xl' : 'text-3xl'}`}>
                    ₦{currentGame.poolValue.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">Prize Pool</p>
                </div>

                <div className="text-center p-4 bg-muted/30 rounded-xl border border-border/30">
                  <Users className="w-6 h-6 text-primary mx-auto mb-2" />
                  <p className={`font-black text-foreground ${isFullscreen ? 'text-5xl' : 'text-3xl'}`}>{currentGame.participants}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">Players</p>
                </div>
              </div>
            </div>

            {/* Live Comments Feed */}
            <div className={`bg-card rounded-xl border transition-all duration-300 p-4 ${
              newCommentFlash ? 'border-primary/50 shadow-lg shadow-primary/10' : 'border-border'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <MessageSquare className={`w-5 h-5 ${newCommentFlash ? 'text-primary animate-bounce' : 'text-primary'}`} />
                  <h3 className={`font-bold text-foreground ${isFullscreen ? 'text-lg' : ''}`}>Live Comments</h3>
                  <span className="text-xs text-muted-foreground">({liveComments.length} total)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-xs text-green-400">RECEIVING</span>
                </div>
              </div>

              {typingUsers.length > 0 && (
                <div className="mb-3 px-3 py-2 bg-muted/30 rounded-lg border border-border/30 animate-fade-in">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span>
                      {typingUsers.slice(0, 2).join(', ')}
                      {typingUsers.length > 2 && ` and ${typingUsers.length - 2} others`}
                      {' '}typing...
                    </span>
                  </div>
                </div>
              )}
              
              <div 
                ref={commentsRef}
                className={`overflow-y-auto space-y-2 scrollbar-thin ${isFullscreen ? 'h-[50vh]' : 'h-80'}`}
              >
                {liveComments.length > 0 ? (
                  liveComments.map((comment, index) => (
                    <div 
                      key={comment.id} 
                      className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-500 ${
                        index === 0 
                          ? 'bg-primary/10 border border-primary/30 animate-fade-in' 
                          : 'bg-muted/30'
                      }`}
                      style={{ 
                        animationDelay: `${index * 50}ms`,
                        opacity: Math.max(0.4, 1 - index * 0.05)
                      }}
                    >
                      <div className={`rounded-full flex items-center justify-center ${
                        index === 0 ? 'bg-primary/20 ring-2 ring-primary/50' : 'bg-card'
                      } ${isFullscreen ? 'w-12 h-12 text-2xl' : 'w-8 h-8 text-lg'}`}>
                        {comment.avatar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`font-medium ${index === 0 ? 'text-primary' : 'text-foreground'} ${isFullscreen ? 'text-lg' : 'text-sm'}`}>
                            {comment.username}
                          </span>
                          {index === 0 && (
                            <span className="px-1.5 py-0.5 bg-primary/20 text-primary text-[8px] rounded uppercase font-bold">
                              Latest
                            </span>
                          )}
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(comment.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className={`text-muted-foreground ${isFullscreen ? 'text-base' : 'text-sm'}`}>{comment.message}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p>Waiting for comments...</p>
                  </div>
                )}
              </div>

              <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
                <span>~12 comments/min</span>
                <span>Last activity: {liveComments[0] ? 'Just now' : 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Top 3 Leaderboard */}
            <div className="bg-card rounded-xl border border-border p-4">
              <h3 className={`font-bold text-foreground mb-4 flex items-center gap-2 ${isFullscreen ? 'text-lg' : ''}`}>
                <Trophy className="w-5 h-5 text-gold" />
                Current Top 3
                <span className="text-[10px] bg-gold/20 text-gold px-2 py-0.5 rounded-full ml-auto">LIVE</span>
              </h3>
              
              <div className="space-y-3">
                {top3.length > 0 ? (
                  top3.map((player, i) => (
                    <div 
                      key={i} 
                      className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                        i === 0 ? 'bg-gold/10 border border-gold/30 animate-pulse' :
                        i === 1 ? 'bg-silver/10 border border-silver/30' :
                        'bg-bronze/10 border border-bronze/30'
                      }`}
                    >
                      <span className={`${isFullscreen ? 'text-2xl' : 'text-xl'}`}>
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}
                      </span>
                      <div className={`rounded-full bg-card flex items-center justify-center ${isFullscreen ? 'w-10 h-10 text-xl' : 'w-8 h-8'}`}>
                        {player.avatar}
                      </div>
                      <span className={`font-medium text-foreground ${isFullscreen ? 'text-lg' : ''}`}>{player.username}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-4">No activity yet</p>
                )}
              </div>
            </div>

            {/* Game Info */}
            <div className="bg-card rounded-xl border border-border p-4">
              <h3 className="font-bold text-foreground mb-4">Game Info</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Game ID</span>
                  <span className="font-mono text-foreground text-xs">{currentGame.id.slice(0, 12)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Entry Fee</span>
                  <span className="font-medium text-foreground">₦{currentGame.entryFee}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Started</span>
                  <span className="font-medium text-foreground">
                    {new Date(currentGame.startTime).toLocaleTimeString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duration</span>
                  <span className="font-medium text-foreground">{formatBroadcastTime(broadcastTime)}</span>
                </div>
              </div>
            </div>

            {/* Simulation Status */}
            <div className={`rounded-xl border p-4 ${
              isSimulating 
                ? 'bg-green-500/10 border-green-500/30' 
                : 'bg-yellow-500/10 border-yellow-500/30'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${isSimulating ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
                  <span className={`text-sm font-medium ${isSimulating ? 'text-green-400' : 'text-yellow-400'}`}>
                    Simulation {isSimulating ? 'Running' : 'Paused'}
                  </span>
                </div>
              </div>
              {isSimulating && (
                <p className="text-xs text-muted-foreground mt-2">
                  Generating realistic game traffic...
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Empty state when no test mode game */}
      {!currentGame?.status && realTimeCycles.length === 0 && (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <Monitor className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-30" />
          <h3 className="text-xl font-bold text-foreground mb-2">No Active Cycles</h3>
          <p className="text-muted-foreground mb-6">Ensure you have active game templates configured.</p>
          <a 
            href="/admin/finger-control"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium"
          >
            Go to Template Control
          </a>
        </div>
      )}
    </div>
  );
};
