import { useAdmin } from '@/contexts/AdminContext';
import { Zap, Play, Square, RotateCcw, Clock, Users, Trophy, Settings } from 'lucide-react';
import { useState } from 'react';

export const AdminFingerControl = () => {
  const { 
    currentGame, 
    settings, 
    createGame, 
    startGame, 
    endGame, 
    resetGame,
    updateSettings 
  } = useAdmin();

  const [localSettings, setLocalSettings] = useState({
    entryFee: settings.entryFee,
    maxGameDuration: settings.maxGameDuration,
    countdownTimer: settings.countdownTimer,
    platformCut: settings.platformCut,
  });

  const handleSettingChange = (key: string, value: number) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  };

  const applySettings = () => {
    updateSettings(localSettings);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-foreground">Fastest Finger Control</h1>
        <p className="text-sm text-muted-foreground">Manage game lifecycle and settings</p>
      </div>

      {/* Current Game Status */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-foreground">Current Game Status</h2>
          <div className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${
            currentGame?.status === 'live' 
              ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
              : currentGame?.status === 'scheduled'
              ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
              : 'bg-muted text-muted-foreground border border-border'
          }`}>
            {currentGame?.status || 'No Game'}
          </div>
        </div>

        {currentGame ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="p-4 bg-muted/30 rounded-xl">
              <p className="text-[10px] text-muted-foreground uppercase mb-1">Game ID</p>
              <p className="text-sm font-bold text-foreground">{currentGame.id.slice(0, 12)}...</p>
            </div>
            <div className="p-4 bg-muted/30 rounded-xl">
              <p className="text-[10px] text-muted-foreground uppercase mb-1">Pool Value</p>
              <p className="text-lg font-black text-primary">₦{currentGame.poolValue.toLocaleString()}</p>
            </div>
            <div className="p-4 bg-muted/30 rounded-xl">
              <p className="text-[10px] text-muted-foreground uppercase mb-1">Participants</p>
              <p className="text-lg font-black text-foreground">{currentGame.participants}</p>
            </div>
            <div className="p-4 bg-muted/30 rounded-xl">
              <p className="text-[10px] text-muted-foreground uppercase mb-1">Countdown</p>
              <p className="text-lg font-black text-foreground">{currentGame.countdown}s</p>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Zap className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No active game. Create a new game to get started.</p>
          </div>
        )}

        {/* Game Controls */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button
            onClick={createGame}
            disabled={!!currentGame}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-primary/20 text-primary rounded-xl font-medium hover:bg-primary/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Zap className="w-4 h-4" />
            Create Game
          </button>
          <button
            onClick={startGame}
            disabled={!currentGame || currentGame.status === 'live'}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-green-500/20 text-green-400 rounded-xl font-medium hover:bg-green-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play className="w-4 h-4" />
            Start Game
          </button>
          <button
            onClick={endGame}
            disabled={!currentGame || currentGame.status !== 'live'}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-red-500/20 text-red-400 rounded-xl font-medium hover:bg-red-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Square className="w-4 h-4" />
            Force End
          </button>
          <button
            onClick={resetGame}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-muted text-foreground rounded-xl font-medium hover:bg-muted/80 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
        </div>
      </div>

      {/* Game Settings */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center gap-2 mb-6">
          <Settings className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">Game Settings</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Entry Fee */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Entry Fee (₦)</label>
            <input
              type="number"
              value={localSettings.entryFee}
              onChange={(e) => handleSettingChange('entryFee', parseInt(e.target.value) || 0)}
              className="w-full px-4 py-3 bg-muted rounded-xl border border-border focus:border-primary focus:outline-none text-foreground"
            />
            <p className="text-[10px] text-muted-foreground mt-1">Current: ₦{settings.entryFee}</p>
          </div>

          {/* Max Game Duration */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Max Game Duration (minutes)</label>
            <input
              type="number"
              value={localSettings.maxGameDuration}
              onChange={(e) => handleSettingChange('maxGameDuration', parseInt(e.target.value) || 0)}
              className="w-full px-4 py-3 bg-muted rounded-xl border border-border focus:border-primary focus:outline-none text-foreground"
            />
            <p className="text-[10px] text-muted-foreground mt-1">Current: {settings.maxGameDuration} min</p>
          </div>

          {/* Countdown Timer */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Countdown Timer (seconds)</label>
            <input
              type="number"
              value={localSettings.countdownTimer}
              onChange={(e) => handleSettingChange('countdownTimer', parseInt(e.target.value) || 0)}
              className="w-full px-4 py-3 bg-muted rounded-xl border border-border focus:border-primary focus:outline-none text-foreground"
            />
            <p className="text-[10px] text-muted-foreground mt-1">Current: {settings.countdownTimer}s</p>
          </div>

          {/* Platform Cut */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Platform Cut (%)</label>
            <input
              type="number"
              value={localSettings.platformCut}
              onChange={(e) => handleSettingChange('platformCut', parseInt(e.target.value) || 0)}
              className="w-full px-4 py-3 bg-muted rounded-xl border border-border focus:border-primary focus:outline-none text-foreground"
            />
            <p className="text-[10px] text-muted-foreground mt-1">Current: {settings.platformCut}%</p>
          </div>
        </div>

        <button
          onClick={applySettings}
          className="mt-6 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
        >
          Apply Settings
        </button>
      </div>

      {/* Quick Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card rounded-xl border border-border p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
            <Clock className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase">Game Duration</p>
            <p className="text-lg font-bold text-foreground">{settings.maxGameDuration} min max</p>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gold/20 flex items-center justify-center">
            <Trophy className="w-6 h-6 text-gold" />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase">Winners</p>
            <p className="text-lg font-bold text-foreground">Top 3 Players</p>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
            <Users className="w-6 h-6 text-muted-foreground" />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase">Prize Split</p>
            <p className="text-lg font-bold text-foreground">50 / 30 / 20</p>
          </div>
        </div>
      </div>
    </div>
  );
};
