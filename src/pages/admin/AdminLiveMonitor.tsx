import { useAdmin } from '@/contexts/AdminContext';
import { Monitor, Play, Pause, Square, Users, Clock, Trophy, MessageSquare, Radio, Volume2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export const AdminLiveMonitor = () => {
  const { 
    currentGame, 
    liveComments, 
    isSimulating,
    pauseSimulation,
    resumeSimulation,
    endGame,
  } = useAdmin();

  const commentsRef = useRef<HTMLDivElement>(null);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [newCommentFlash, setNewCommentFlash] = useState(false);
  const [countdownPulse, setCountdownPulse] = useState(false);
  const [broadcastTime, setBroadcastTime] = useState(0);
  const lastCommentCount = useRef(0);

  // Scroll to top on new comments
  useEffect(() => {
    if (commentsRef.current) {
      commentsRef.current.scrollTop = 0;
    }
  }, [liveComments]);

  // Flash effect on new comments
  useEffect(() => {
    if (liveComments.length > lastCommentCount.current) {
      setNewCommentFlash(true);
      setTimeout(() => setNewCommentFlash(false), 300);
    }
    lastCommentCount.current = liveComments.length;
  }, [liveComments.length]);

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

  // Mock top 3 based on recent comments
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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-foreground">Live Games Monitor</h1>
          <p className="text-sm text-muted-foreground">Real-time game observation and control</p>
        </div>
        <div className="flex items-center gap-2">
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
                onClick={endGame}
                className="px-4 py-2 bg-red-500/20 text-red-400 rounded-xl font-medium hover:bg-red-500/30 flex items-center gap-2"
              >
                <Square className="w-4 h-4" />
                Force End
              </button>
            </>
          )}
        </div>
      </div>

      {currentGame?.status === 'live' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Monitor */}
          <div className="lg:col-span-2 space-y-4">
            {/* Broadcast Status Bar */}
            <div className="bg-card rounded-xl border border-red-500/50 p-4 relative overflow-hidden">
              {/* Animated background */}
              <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 via-transparent to-red-500/5 animate-pulse" />
              
              <div className="relative flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-4 h-4 rounded-full bg-red-500 animate-pulse" />
                    <div className="absolute inset-0 w-4 h-4 rounded-full bg-red-500 animate-ping opacity-50" />
                  </div>
                  <span className="text-lg font-black text-red-400 uppercase tracking-wider flex items-center gap-2">
                    <Radio className="w-5 h-5" />
                    LIVE BROADCAST
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Volume2 className="w-4 h-4" />
                    <span className="text-xs font-mono">AUDIO OK</span>
                  </div>
                  <span className="text-sm font-mono text-muted-foreground bg-muted px-3 py-1 rounded-lg">
                    {formatBroadcastTime(broadcastTime)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {/* Countdown - Most Important */}
                <div className={`text-center p-4 rounded-xl transition-all duration-300 ${
                  currentGame.countdown <= 10 
                    ? 'bg-red-500/20 border-2 border-red-500/50' 
                    : currentGame.countdown <= 30 
                    ? 'bg-orange-500/10 border border-orange-500/30' 
                    : 'bg-muted/30 border border-border/30'
                } ${countdownPulse ? 'scale-105' : ''}`}>
                  <Clock className={`w-6 h-6 mx-auto mb-2 ${getCountdownColor(currentGame.countdown)}`} />
                  <p className={`text-4xl font-black font-mono ${getCountdownColor(currentGame.countdown)} ${
                    currentGame.countdown <= 5 ? 'animate-pulse' : ''
                  }`}>
                    {formatCountdown(currentGame.countdown)}
                  </p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">
                    {currentGame.countdown <= 10 ? '⚠️ CRITICAL' : currentGame.countdown <= 30 ? 'LOW' : 'Countdown'}
                  </p>
                </div>

                {/* Pool Value */}
                <div className="text-center p-4 bg-muted/30 rounded-xl border border-border/30">
                  <Trophy className="w-6 h-6 text-gold mx-auto mb-2" />
                  <p className={`text-3xl font-black text-primary transition-all ${newCommentFlash ? 'scale-110' : ''}`}>
                    ₦{currentGame.poolValue.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">Prize Pool</p>
                </div>

                {/* Participants */}
                <div className="text-center p-4 bg-muted/30 rounded-xl border border-border/30">
                  <Users className="w-6 h-6 text-primary mx-auto mb-2" />
                  <p className="text-3xl font-black text-foreground">{currentGame.participants}</p>
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
                  <h3 className="font-bold text-foreground">Live Comments</h3>
                  <span className="text-xs text-muted-foreground">({liveComments.length} total)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-xs text-green-400">RECEIVING</span>
                </div>
              </div>

              {/* Typing Indicators */}
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
                className="h-80 overflow-y-auto space-y-2 scrollbar-thin"
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
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-lg ${
                        index === 0 ? 'bg-primary/20 ring-2 ring-primary/50' : 'bg-card'
                      }`}>
                        {comment.avatar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium ${index === 0 ? 'text-primary' : 'text-foreground'}`}>
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
                        <p className="text-sm text-muted-foreground">{comment.message}</p>
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

              {/* Comments per minute indicator */}
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
              <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
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
                      <span className="text-xl">
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}
                      </span>
                      <div className="w-8 h-8 rounded-full bg-card flex items-center justify-center">
                        {player.avatar}
                      </div>
                      <span className="font-medium text-foreground">{player.username}</span>
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

            {/* Activity Stats */}
            <div className="bg-card rounded-xl border border-border p-4">
              <h3 className="font-bold text-foreground mb-3 text-sm">Session Stats</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-2 bg-muted/30 rounded-lg text-center">
                  <p className="text-lg font-bold text-primary">{liveComments.length}</p>
                  <p className="text-[10px] text-muted-foreground">Comments</p>
                </div>
                <div className="p-2 bg-muted/30 rounded-lg text-center">
                  <p className="text-lg font-bold text-gold">{top3.length}</p>
                  <p className="text-[10px] text-muted-foreground">Top Players</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <Monitor className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-30" />
          <h3 className="text-xl font-bold text-foreground mb-2">No Live Game</h3>
          <p className="text-muted-foreground mb-6">Start a game from the Finger Control panel to monitor it here.</p>
          <a 
            href="/admin/finger-control"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium"
          >
            Go to Finger Control
          </a>
        </div>
      )}
    </div>
  );
};
