import { useAdmin } from '@/contexts/AdminContext';
import { Monitor, Play, Pause, Square, Users, Clock, Trophy, MessageSquare } from 'lucide-react';
import { useEffect, useRef } from 'react';

export const AdminLiveMonitor = () => {
  const { 
    currentGame, 
    liveComments, 
    isSimulating,
    pauseSimulation,
    resumeSimulation,
    endGame,
    users
  } = useAdmin();

  const commentsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (commentsRef.current) {
      commentsRef.current.scrollTop = 0;
    }
  }, [liveComments]);

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
            {/* Status Bar */}
            <div className="bg-card rounded-xl border border-primary/30 p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-lg font-bold text-foreground">LIVE</span>
                </div>
                <span className="text-sm text-muted-foreground">Game: {currentGame.id.slice(0, 12)}</span>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-muted/30 rounded-xl">
                  <Clock className="w-6 h-6 text-primary mx-auto mb-2" />
                  <p className="text-3xl font-black text-foreground">{formatCountdown(currentGame.countdown)}</p>
                  <p className="text-[10px] text-muted-foreground uppercase">Countdown</p>
                </div>
                <div className="text-center p-4 bg-muted/30 rounded-xl">
                  <Trophy className="w-6 h-6 text-gold mx-auto mb-2" />
                  <p className="text-3xl font-black text-primary">₦{currentGame.poolValue.toLocaleString()}</p>
                  <p className="text-[10px] text-muted-foreground uppercase">Pool Value</p>
                </div>
                <div className="text-center p-4 bg-muted/30 rounded-xl">
                  <Users className="w-6 h-6 text-primary mx-auto mb-2" />
                  <p className="text-3xl font-black text-foreground">{currentGame.participants}</p>
                  <p className="text-[10px] text-muted-foreground uppercase">Players</p>
                </div>
              </div>
            </div>

            {/* Live Comments Feed */}
            <div className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-center gap-2 mb-4">
                <MessageSquare className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-foreground">Live Comments</h3>
                <span className="text-xs text-muted-foreground">({liveComments.length} total)</span>
              </div>
              
              <div 
                ref={commentsRef}
                className="h-80 overflow-y-auto space-y-2 scrollbar-thin"
              >
                {liveComments.length > 0 ? (
                  liveComments.map((comment) => (
                    <div 
                      key={comment.id} 
                      className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg animate-fade-in"
                    >
                      <div className="w-8 h-8 rounded-full bg-card flex items-center justify-center text-lg">
                        {comment.avatar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">{comment.username}</span>
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
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Top 3 Leaderboard */}
            <div className="bg-card rounded-xl border border-border p-4">
              <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-gold" />
                Current Top 3
              </h3>
              
              <div className="space-y-3">
                {top3.length > 0 ? (
                  top3.map((player, i) => (
                    <div 
                      key={i} 
                      className={`flex items-center gap-3 p-3 rounded-xl ${
                        i === 0 ? 'bg-gold/10 border border-gold/30' :
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
                  <span className="text-muted-foreground">Comments/min</span>
                  <span className="font-medium text-foreground">~12</span>
                </div>
              </div>
            </div>

            {/* Simulation Status */}
            <div className={`rounded-xl border p-4 ${
              isSimulating 
                ? 'bg-green-500/10 border-green-500/30' 
                : 'bg-yellow-500/10 border-yellow-500/30'
            }`}>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isSimulating ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
                <span className={`text-sm font-medium ${isSimulating ? 'text-green-400' : 'text-yellow-400'}`}>
                  Simulation {isSimulating ? 'Running' : 'Paused'}
                </span>
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
