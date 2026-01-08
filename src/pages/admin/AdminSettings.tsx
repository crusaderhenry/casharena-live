import { Settings, Save, Zap, AlertTriangle, Users, Power, Mic, UserPlus, RotateCcw, Trophy, Clock, Flame, Volume2, MessageCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { useAdmin } from '@/contexts/AdminContext';
import { AVAILABLE_HOSTS, getHostById } from '@/hooks/useCrusaderHost';
import { toast } from 'sonner';

export const AdminSettings = () => {
  const { 
    settings: dbSettings, 
    updateSettings: updateDbSettings, 
    toggleTestMode, 
    isTestMode, 
    selectedHost, 
    secondaryHost, 
    maintenanceMode: dbMaintenanceMode,
    rankPoints,
    loading 
  } = usePlatformSettings();
  const { simulateHighTraffic, triggerWeeklyReset } = useAdmin();
  
  const [localSettings, setLocalSettings] = useState({
    platformName: 'FortunesHQ',
    platformCut: 10,
    testMode: true,
    maintenanceMode: false,
    selectedHost: 'crusader',
    secondaryHost: null as string | null,
    rankPointsWin1st: 100,
    rankPointsWin2nd: 60,
    rankPointsWin3rd: 30,
    rankPointsParticipation: 5,
    defaultEntryCutoffMinutes: 10,
    hotGameThresholdLive: 10,
    hotGameThresholdOpening: 5,
    enableDramaticSounds: true,
    enableCoHostBanter: true,
  });

  useEffect(() => {
    if (dbSettings) {
      setLocalSettings(prev => ({
        ...prev,
        platformName: dbSettings.platform_name,
        platformCut: dbSettings.platform_cut_percent,
        testMode: dbSettings.test_mode,
        maintenanceMode: dbSettings.maintenance_mode ?? false,
        selectedHost: dbSettings.selected_host || 'crusader',
        secondaryHost: dbSettings.secondary_host || null,
        rankPointsWin1st: dbSettings.rank_points_win_1st ?? 100,
        rankPointsWin2nd: dbSettings.rank_points_win_2nd ?? 60,
        rankPointsWin3rd: dbSettings.rank_points_win_3rd ?? 30,
        rankPointsParticipation: dbSettings.rank_points_participation ?? 5,
        defaultEntryCutoffMinutes: dbSettings.default_entry_cutoff_minutes ?? 10,
        hotGameThresholdLive: dbSettings.hot_game_threshold_live ?? 10,
        hotGameThresholdOpening: dbSettings.hot_game_threshold_opening ?? 5,
        enableDramaticSounds: dbSettings.enable_dramatic_sounds ?? true,
        enableCoHostBanter: dbSettings.enable_cohost_banter ?? true,
      }));
    }
  }, [dbSettings]);

  const handleSave = async () => {
    const success = await updateDbSettings({
      platform_name: localSettings.platformName,
      platform_cut_percent: localSettings.platformCut,
      selected_host: localSettings.selectedHost,
      secondary_host: localSettings.secondaryHost,
      maintenance_mode: localSettings.maintenanceMode,
      rank_points_win_1st: localSettings.rankPointsWin1st,
      rank_points_win_2nd: localSettings.rankPointsWin2nd,
      rank_points_win_3rd: localSettings.rankPointsWin3rd,
      rank_points_participation: localSettings.rankPointsParticipation,
      default_entry_cutoff_minutes: localSettings.defaultEntryCutoffMinutes,
      hot_game_threshold_live: localSettings.hotGameThresholdLive,
      hot_game_threshold_opening: localSettings.hotGameThresholdOpening,
      enable_dramatic_sounds: localSettings.enableDramaticSounds,
      enable_cohost_banter: localSettings.enableCoHostBanter,
    });
    
    if (success) {
      toast.success('Settings saved');
    } else {
      toast.error('Failed to save settings');
    }
  };

  const handleTestModeToggle = async () => {
    const newValue = !isTestMode;
    
    const success = await toggleTestMode(newValue);
    if (!success) {
      toast.error('Failed to toggle test mode');
    } else {
      toast.success(newValue ? 'Test Mode enabled' : 'Live Mode enabled - Real payments active!');
    }
  };

  const handleMaintenanceToggle = async () => {
    const newValue = !localSettings.maintenanceMode;
    setLocalSettings(prev => ({ ...prev, maintenanceMode: newValue }));
    
    const success = await updateDbSettings({ maintenance_mode: newValue });
    if (success) {
      toast.success(newValue ? 'Maintenance mode enabled' : 'Maintenance mode disabled');
    } else {
      toast.error('Failed to toggle maintenance mode');
      setLocalSettings(prev => ({ ...prev, maintenanceMode: !newValue }));
    }
  };

  const handleResetRanks = async () => {
    if (!confirm('Are you sure you want to reset all weekly rank points? This action cannot be undone.')) return;
    await triggerWeeklyReset();
    toast.success('Weekly ranks have been reset');
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-foreground">System Settings</h1>
        <p className="text-sm text-muted-foreground">Platform configuration and controls</p>
      </div>

      {/* Test Mode Toggle - Prominent */}
      <div className={`rounded-xl border-2 p-6 ${isTestMode ? 'bg-yellow-500/10 border-yellow-500/50' : 'bg-green-500/10 border-green-500/50'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${isTestMode ? 'bg-yellow-500/20' : 'bg-green-500/20'}`}>
              <Power className={`w-7 h-7 ${isTestMode ? 'text-yellow-500' : 'text-green-500'}`} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">
                {isTestMode ? 'Test Mode' : 'Live Mode'}
              </h2>
              <p className={`text-sm ${isTestMode ? 'text-yellow-500' : 'text-green-500'}`}>
                {isTestMode ? 'Using mock payments and simulated transactions' : 'Real Paystack payments active'}
              </p>
            </div>
          </div>
          <button
            onClick={handleTestModeToggle}
            disabled={loading}
            className={`relative w-20 h-10 rounded-full transition-colors ${
              isTestMode ? 'bg-yellow-500' : 'bg-green-500'
            }`}
          >
            <div className={`absolute top-1 w-8 h-8 rounded-full bg-white shadow transition-transform ${
              isTestMode ? 'translate-x-1' : 'translate-x-10'
            }`} />
          </button>
        </div>
        
        {!isTestMode && (
          <div className="mt-4 flex items-center gap-2 p-3 bg-red-500/10 rounded-lg border border-red-500/30">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <span className="text-sm text-red-400">
              Live Mode is active! All deposits and withdrawals will use real money via Paystack.
            </span>
          </div>
        )}
      </div>

      {/* General Settings */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h2 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2">
          <Settings className="w-5 h-5 text-primary" />
          General Settings
        </h2>

        <div className="space-y-6">
          {/* Platform Name */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Platform Name</label>
            <input
              type="text"
              value={localSettings.platformName}
              onChange={(e) => setLocalSettings(prev => ({ ...prev, platformName: e.target.value }))}
              className="w-full max-w-md px-4 py-3 bg-muted rounded-xl border border-border focus:border-primary focus:outline-none text-foreground"
            />
          </div>

          {/* Platform Cut */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Platform Cut (%)</label>
            <input
              type="number"
              value={localSettings.platformCut}
              onChange={(e) => setLocalSettings(prev => ({ ...prev, platformCut: parseInt(e.target.value) || 0 }))}
              className="w-full max-w-md px-4 py-3 bg-muted rounded-xl border border-border focus:border-primary focus:outline-none text-foreground"
              min={0}
              max={50}
            />
            <p className="text-[10px] text-muted-foreground mt-1">Percentage of pool taken as platform fee</p>
          </div>

          {/* Entry Cutoff Minutes */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-400" />
              Entry Cutoff (minutes)
            </label>
            <input
              type="number"
              value={localSettings.defaultEntryCutoffMinutes}
              onChange={(e) => setLocalSettings(prev => ({ ...prev, defaultEntryCutoffMinutes: parseInt(e.target.value) || 10 }))}
              className="w-full max-w-md px-4 py-3 bg-muted rounded-xl border border-border focus:border-primary focus:outline-none text-foreground"
              min={1}
              max={60}
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Spectators can join the pool until this many minutes remain. Default: 10 minutes.
            </p>
          </div>
        </div>
      </div>

      {/* Rank Points Configuration */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h2 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-gold" />
          Rank Points System
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Configure points awarded for game participation and wins
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              🥇 1st Place
            </label>
            <input
              type="number"
              value={localSettings.rankPointsWin1st}
              onChange={(e) => setLocalSettings(prev => ({ ...prev, rankPointsWin1st: parseInt(e.target.value) || 0 }))}
              className="w-full px-4 py-3 bg-muted rounded-xl border border-border focus:border-primary focus:outline-none text-foreground"
              min={0}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              🥈 2nd Place
            </label>
            <input
              type="number"
              value={localSettings.rankPointsWin2nd}
              onChange={(e) => setLocalSettings(prev => ({ ...prev, rankPointsWin2nd: parseInt(e.target.value) || 0 }))}
              className="w-full px-4 py-3 bg-muted rounded-xl border border-border focus:border-primary focus:outline-none text-foreground"
              min={0}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              🥉 3rd Place
            </label>
            <input
              type="number"
              value={localSettings.rankPointsWin3rd}
              onChange={(e) => setLocalSettings(prev => ({ ...prev, rankPointsWin3rd: parseInt(e.target.value) || 0 }))}
              className="w-full px-4 py-3 bg-muted rounded-xl border border-border focus:border-primary focus:outline-none text-foreground"
              min={0}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              🎮 Participation
            </label>
            <input
              type="number"
              value={localSettings.rankPointsParticipation}
              onChange={(e) => setLocalSettings(prev => ({ ...prev, rankPointsParticipation: parseInt(e.target.value) || 0 }))}
              className="w-full px-4 py-3 bg-muted rounded-xl border border-border focus:border-primary focus:outline-none text-foreground"
              min={0}
            />
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground mt-3">
          Points awarded after each game. Winners get position points, all participants get participation points.
        </p>
      </div>

      {/* Host Selection */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h2 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2">
          <Mic className="w-5 h-5 text-primary" />
          Game Host Selection
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Choose the AI voice host for live game commentary
        </p>

        {/* Primary Host */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">1</span>
            Primary Host
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {AVAILABLE_HOSTS.map((host) => {
              const isSelected = localSettings.selectedHost === host.id;
              return (
                <button
                  key={host.id}
                  onClick={() => setLocalSettings(prev => ({ 
                    ...prev, 
                    selectedHost: host.id,
                    // Clear secondary if same as new primary
                    secondaryHost: prev.secondaryHost === host.id ? null : prev.secondaryHost
                  }))}
                  className={`p-4 rounded-xl border-2 transition-all text-left ${
                    isSelected
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-muted/30 hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-3xl">{host.emoji}</span>
                    <div>
                      <p className="font-bold text-foreground">{host.name}</p>
                      <p className="text-xs text-muted-foreground">{host.description}</p>
                    </div>
                  </div>
                  {isSelected && (
                    <div className="mt-2 text-xs text-primary font-medium flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                      Primary Host
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Co-Host Selection */}
        <div className="pt-6 border-t border-border">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-secondary-foreground" />
            Co-Host (Optional)
          </h3>
          <p className="text-xs text-muted-foreground mb-4">
            Add a second host for interactive banter and a live show feel
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* No Co-Host Option */}
            <button
              onClick={() => setLocalSettings(prev => ({ ...prev, secondaryHost: null }))}
              className={`p-4 rounded-xl border-2 transition-all text-left ${
                !localSettings.secondaryHost
                  ? 'border-yellow-500 bg-yellow-500/10'
                  : 'border-border bg-muted/30 hover:border-yellow-500/50'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl">🎙️</span>
                <div>
                  <p className="font-bold text-foreground">Solo Host</p>
                  <p className="text-xs text-muted-foreground">Single host mode</p>
                </div>
              </div>
              {!localSettings.secondaryHost && (
                <div className="mt-2 text-xs text-yellow-500 font-medium flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-yellow-500" />
                  Active
                </div>
              )}
            </button>
            
            {/* Available Co-Hosts (excluding primary) */}
            {AVAILABLE_HOSTS
              .filter(host => host.id !== localSettings.selectedHost)
              .map((host) => {
                const isSelected = localSettings.secondaryHost === host.id;
                return (
                  <button
                    key={host.id}
                    onClick={() => setLocalSettings(prev => ({ ...prev, secondaryHost: host.id }))}
                    className={`p-4 rounded-xl border-2 transition-all text-left ${
                      isSelected
                        ? 'border-green-500 bg-green-500/10'
                        : 'border-border bg-muted/30 hover:border-green-500/50'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-3xl">{host.emoji}</span>
                      <div>
                        <p className="font-bold text-foreground">{host.name}</p>
                        <p className="text-xs text-muted-foreground">{host.description}</p>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="mt-2 text-xs text-green-500 font-medium flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        Co-Host
                      </div>
                    )}
                  </button>
                );
              })}
          </div>
          
          {localSettings.secondaryHost && (
            <div className="mt-4 p-3 bg-green-500/10 rounded-lg border border-green-500/30">
              <p className="text-sm text-green-400 flex items-center gap-2">
                <span className="text-lg">{getHostById(localSettings.selectedHost).emoji}</span>
                <span>+</span>
                <span className="text-lg">{getHostById(localSettings.secondaryHost).emoji}</span>
                <span className="font-medium">
                  {getHostById(localSettings.selectedHost).name} & {getHostById(localSettings.secondaryHost).name} will co-host together!
                </span>
              </p>
            </div>
          )}
        </div>
        
        <p className="text-[10px] text-muted-foreground mt-4">
          Primary Voice ID: {getHostById(localSettings.selectedHost).voiceId}
          {localSettings.secondaryHost && ` | Co-Host Voice ID: ${getHostById(localSettings.secondaryHost).voiceId}`}
        </p>
      </div>

      {/* Game Experience Settings */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h2 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2">
          <Flame className="w-5 h-5 text-orange-500" />
          Game Experience Settings
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Configure visual indicators and audio effects for enhanced gameplay
        </p>

        <div className="space-y-6">
          {/* Hot Game Thresholds */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block flex items-center gap-2">
                <Flame className="w-4 h-4 text-red-400" />
                Hot Game (Live)
              </label>
              <input
                type="number"
                value={localSettings.hotGameThresholdLive}
                onChange={(e) => setLocalSettings(prev => ({ ...prev, hotGameThresholdLive: parseInt(e.target.value) || 10 }))}
                className="w-full px-4 py-3 bg-muted rounded-xl border border-border focus:border-primary focus:outline-none text-foreground"
                min={1}
                max={100}
              />
              <p className="text-[10px] text-muted-foreground mt-1">Min players for HOT badge on live games</p>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-400" />
                Hot Game (Opening)
              </label>
              <input
                type="number"
                value={localSettings.hotGameThresholdOpening}
                onChange={(e) => setLocalSettings(prev => ({ ...prev, hotGameThresholdOpening: parseInt(e.target.value) || 5 }))}
                className="w-full px-4 py-3 bg-muted rounded-xl border border-border focus:border-primary focus:outline-none text-foreground"
                min={1}
                max={100}
              />
              <p className="text-[10px] text-muted-foreground mt-1">Min players for HOT badge on opening games</p>
            </div>
          </div>

          {/* Audio Toggles */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Dramatic Sounds Toggle */}
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                  <Volume2 className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Dramatic Sounds</p>
                  <p className="text-xs text-muted-foreground">Game end fanfare, drums, cheers</p>
                </div>
              </div>
              <button
                onClick={() => setLocalSettings(prev => ({ ...prev, enableDramaticSounds: !prev.enableDramaticSounds }))}
                className={`relative w-14 h-8 rounded-full transition-colors ${
                  localSettings.enableDramaticSounds ? 'bg-purple-500' : 'bg-muted'
                }`}
              >
                <div className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow transition-transform ${
                  localSettings.enableDramaticSounds ? 'translate-x-7' : 'translate-x-1'
                }`} />
              </button>
            </div>

            {/* Co-Host Banter Toggle */}
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Co-Host Banter</p>
                  <p className="text-xs text-muted-foreground">Natural reactions between hosts</p>
                </div>
              </div>
              <button
                onClick={() => setLocalSettings(prev => ({ ...prev, enableCoHostBanter: !prev.enableCoHostBanter }))}
                disabled={!localSettings.secondaryHost}
                className={`relative w-14 h-8 rounded-full transition-colors ${
                  localSettings.enableCoHostBanter && localSettings.secondaryHost ? 'bg-green-500' : 'bg-muted'
                } ${!localSettings.secondaryHost ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow transition-transform ${
                  localSettings.enableCoHostBanter && localSettings.secondaryHost ? 'translate-x-7' : 'translate-x-1'
                }`} />
              </button>
            </div>
          </div>
          
          {!localSettings.secondaryHost && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <MessageCircle className="w-3 h-3" />
              Enable a co-host above to unlock banter feature
            </p>
          )}
        </div>
      </div>

      {/* Mode Toggles */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h2 className="text-lg font-bold text-foreground mb-6">Other Controls</h2>

        <div className="space-y-4">
          {/* Maintenance Mode */}
          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <p className="font-medium text-foreground">Maintenance Mode</p>
                <p className="text-sm text-muted-foreground">Temporarily disable user access</p>
              </div>
            </div>
            <button
              onClick={handleMaintenanceToggle}
              disabled={loading}
              className={`relative w-14 h-8 rounded-full transition-colors ${
                localSettings.maintenanceMode ? 'bg-yellow-500' : 'bg-muted'
              }`}
            >
              <div className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow transition-transform ${
                localSettings.maintenanceMode ? 'translate-x-7' : 'translate-x-1'
              }`} />
            </button>
          </div>
        </div>
      </div>

      {/* Test Actions */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h2 className="text-lg font-bold text-foreground mb-6">Admin Actions</h2>
        <p className="text-sm text-muted-foreground mb-4">Administrative controls and test scenarios</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={simulateHighTraffic}
            className="p-4 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors text-left"
          >
            <Users className="w-6 h-6 text-primary mb-2" />
            <p className="font-medium text-foreground">Simulate High Traffic</p>
            <p className="text-sm text-muted-foreground">Add mock users and increase stats</p>
          </button>

          <button 
            onClick={handleResetRanks}
            className="p-4 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors text-left"
          >
            <RotateCcw className="w-6 h-6 text-primary mb-2" />
            <p className="font-medium text-foreground">Reset Weekly Ranks</p>
            <p className="text-sm text-muted-foreground">Reset all users' weekly rank points to zero</p>
          </button>

          <button 
            onClick={() => toast.info('This feature is for future development')}
            className="p-4 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors text-left opacity-50"
          >
            <Settings className="w-6 h-6 text-muted-foreground mb-2" />
            <p className="font-medium text-foreground">Reset Test Data</p>
            <p className="text-sm text-muted-foreground">Coming soon</p>
          </button>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
        >
          <Save className="w-5 h-5" />
          Save Settings
        </button>
      </div>

      {/* Current Settings Display */}
      <div className="bg-muted/30 rounded-xl p-4">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Current Configuration</p>
        <pre className="text-xs text-foreground overflow-auto">
          {JSON.stringify({
            ...localSettings,
            mode: isTestMode ? 'test' : 'live',
          }, null, 2)}
        </pre>
      </div>
    </div>
  );
};
