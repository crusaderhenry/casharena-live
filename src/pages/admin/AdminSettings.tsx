import { Settings, Save, Zap, AlertTriangle, Users, Power, Mic, UserPlus, RotateCcw, Trophy, Clock, Flame, Volume2, MessageCircle, Gift, TrendingUp, Image, Palette, Wallet, Timer, Bell } from 'lucide-react';
import { useState, useEffect } from 'react';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { useAdmin } from '@/contexts/AdminContext';
import { AVAILABLE_HOSTS, getHostById } from '@/hooks/useCrusaderHost';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

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
  
  const [bonusRecipientCount, setBonusRecipientCount] = useState(0);
  const [bonusLoading, setBonusLoading] = useState(true);
  
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
    leaveWindowMinutes: 5,
    googleAuthEnabled: false,
    winnerScreenDuration: 10,
    // Welcome settings
    welcomeMessage: 'Welcome to FortunesHQ! 🎉 Get ready to play and win!',
    welcomeBonusAmount: 5000,
    welcomeBonusLimit: 1000,
    welcomeBonusEnabled: true,
    welcomeBonusMessage: 'Get your welcome bonus! Limited spots available.',
    // Weekly rewards
    weeklyReward1st: 50000,
    weeklyReward2nd: 30000,
    weeklyReward3rd: 20000,
    // Wallet limits
    minDeposit: 100,
    maxDeposit: 1000000,
    minWithdrawal: 100,
    depositQuickAmounts: '1000,2000,5000,10000',
    // Timing settings
    endingSoonThreshold: 300,
    notificationPollInterval: 30000,
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
        leaveWindowMinutes: dbSettings.leave_window_minutes ?? 5,
        googleAuthEnabled: dbSettings.google_auth_enabled ?? false,
        winnerScreenDuration: (dbSettings as any).winner_screen_duration ?? 10,
        // Welcome settings
        welcomeMessage: (dbSettings as any).welcome_message ?? 'Welcome to FortunesHQ! 🎉 Get ready to play and win!',
        welcomeBonusAmount: (dbSettings as any).welcome_bonus_amount ?? 5000,
        welcomeBonusLimit: (dbSettings as any).welcome_bonus_limit ?? 1000,
        welcomeBonusEnabled: (dbSettings as any).welcome_bonus_enabled ?? true,
        welcomeBonusMessage: (dbSettings as any).welcome_bonus_message ?? 'Get your welcome bonus! Limited spots available.',
        // Weekly rewards
        weeklyReward1st: (dbSettings as any).weekly_reward_1st ?? 50000,
        weeklyReward2nd: (dbSettings as any).weekly_reward_2nd ?? 30000,
        weeklyReward3rd: (dbSettings as any).weekly_reward_3rd ?? 20000,
        // Wallet limits
        minDeposit: (dbSettings as any).min_deposit ?? 100,
        maxDeposit: (dbSettings as any).max_deposit ?? 1000000,
        minWithdrawal: (dbSettings as any).min_withdrawal ?? 100,
        depositQuickAmounts: ((dbSettings as any).deposit_quick_amounts ?? [1000, 2000, 5000, 10000]).join(','),
        // Timing
        endingSoonThreshold: (dbSettings as any).ending_soon_threshold_seconds ?? 300,
        notificationPollInterval: (dbSettings as any).notification_poll_interval_ms ?? 30000,
      }));
    }
  }, [dbSettings]);

  // Fetch bonus recipient count
  useEffect(() => {
    const fetchBonusCount = async () => {
      setBonusLoading(true);
      const { count, error } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('received_welcome_bonus', true);
      
      if (!error) {
        setBonusRecipientCount(count || 0);
      }
      setBonusLoading(false);
    };
    
    fetchBonusCount();
  }, []);

  const handleSave = async () => {
    // Parse deposit quick amounts
    const quickAmounts = localSettings.depositQuickAmounts
      .split(',')
      .map(s => parseInt(s.trim()))
      .filter(n => !isNaN(n) && n > 0);

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
      leave_window_minutes: localSettings.leaveWindowMinutes,
      google_auth_enabled: localSettings.googleAuthEnabled,
      winner_screen_duration: localSettings.winnerScreenDuration,
      // Welcome settings
      welcome_message: localSettings.welcomeMessage,
      welcome_bonus_amount: localSettings.welcomeBonusAmount,
      welcome_bonus_limit: localSettings.welcomeBonusLimit,
      welcome_bonus_enabled: localSettings.welcomeBonusEnabled,
      welcome_bonus_message: localSettings.welcomeBonusMessage,
      // Weekly rewards
      weekly_reward_1st: localSettings.weeklyReward1st,
      weekly_reward_2nd: localSettings.weeklyReward2nd,
      weekly_reward_3rd: localSettings.weeklyReward3rd,
      // Wallet limits
      min_deposit: localSettings.minDeposit,
      max_deposit: localSettings.maxDeposit,
      min_withdrawal: localSettings.minWithdrawal,
      deposit_quick_amounts: quickAmounts,
      // Timing
      ending_soon_threshold_seconds: localSettings.endingSoonThreshold,
      notification_poll_interval_ms: localSettings.notificationPollInterval,
    } as any);
    
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

      {/* Branding Settings */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h2 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2">
          <Palette className="w-5 h-5 text-primary" />
          Branding & Assets
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          Manage your platform logo, icons, and social share images
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Logo Preview */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground block">Platform Logo</label>
            <div className="p-6 bg-muted/50 rounded-xl border border-border flex items-center justify-center">
              <div className="flex items-center gap-1">
                <span className="text-2xl font-black tracking-tight">
                  <span className="text-[#4fd1c5]">Fortunes</span>
                  <span className="text-gold"> HQ</span>
                </span>
                <span className="text-gold">✨</span>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Text logo with teal "Fortunes" and gold "HQ" styling
            </p>
          </div>

          {/* App Icon Preview */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground block">App Icon (PWA)</label>
            <div className="p-6 bg-muted/50 rounded-xl border border-border flex items-center justify-center">
              <img 
                src="/pwa-192x192.png" 
                alt="App Icon" 
                className="w-16 h-16 rounded-xl shadow-lg"
              />
            </div>
            <p className="text-[10px] text-muted-foreground">
              192×192 and 512×512 icons for PWA installation
            </p>
          </div>

          {/* Favicon Preview */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground block">Favicon</label>
            <div className="p-6 bg-muted/50 rounded-xl border border-border flex items-center justify-center">
              <img 
                src="/favicon.png" 
                alt="Favicon" 
                className="w-8 h-8"
              />
            </div>
            <p className="text-[10px] text-muted-foreground">
              Browser tab icon
            </p>
          </div>

          {/* Share Image Preview */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground block">Social Share Image (OG)</label>
            <div className="p-4 bg-muted/50 rounded-xl border border-border">
              <img 
                src="/og-image.png" 
                alt="Share Image" 
                className="w-full rounded-lg shadow-lg"
              />
            </div>
            <p className="text-[10px] text-muted-foreground">
              1920×1024 image shown when sharing on social media
            </p>
          </div>
        </div>

        <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
          <div className="flex items-start gap-3">
            <Image className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">Custom Branding</p>
              <p className="text-xs text-muted-foreground mt-1">
                To update logos and icons, replace the image files in the /public folder: 
                pwa-192x192.png, pwa-512x512.png, favicon.png, og-image.png
              </p>
            </div>
          </div>
        </div>
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

          {/* Winner Screen Duration */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block flex items-center gap-2">
              <Trophy className="w-4 h-4 text-gold" />
              Winner Screen Duration (seconds)
            </label>
            <input
              type="number"
              value={localSettings.winnerScreenDuration}
              onChange={(e) => setLocalSettings(prev => ({ ...prev, winnerScreenDuration: parseInt(e.target.value) || 10 }))}
              className="w-full max-w-md px-4 py-3 bg-muted rounded-xl border border-border focus:border-primary focus:outline-none text-foreground"
              min={3}
              max={30}
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              How long to display the "Game Over" winner celebration screen. Default: 10 seconds.
            </p>
          </div>
        </div>
      </div>

      {/* Welcome & Onboarding Settings */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h2 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2">
          <Gift className="w-5 h-5 text-primary" />
          Welcome & Onboarding
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Configure welcome message and bonus for new users
        </p>

        {/* Bonus Stats Card */}
        <div className="mb-6 p-4 bg-gradient-to-r from-primary/10 to-transparent rounded-xl border border-primary/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Bonuses Distributed</p>
                <p className="text-xl font-bold text-foreground">
                  {bonusLoading ? '...' : bonusRecipientCount.toLocaleString()}
                  <span className="text-sm text-muted-foreground font-normal">
                    {' '}/ {localSettings.welcomeBonusLimit.toLocaleString()}
                  </span>
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Remaining</p>
              <p className="text-lg font-bold text-primary">
                {bonusLoading ? '...' : Math.max(0, localSettings.welcomeBonusLimit - bonusRecipientCount).toLocaleString()}
              </p>
            </div>
          </div>
          {!bonusLoading && bonusRecipientCount >= localSettings.welcomeBonusLimit && (
            <div className="mt-3 flex items-center gap-2 text-xs text-orange-400">
              <AlertTriangle className="w-4 h-4" />
              Bonus limit reached - new users won't receive welcome bonus
            </div>
          )}
        </div>

        <div className="space-y-6">
          {/* Welcome Bonus Toggle */}
          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl">
            <div>
              <p className="font-medium text-foreground">Welcome Bonus</p>
              <p className="text-sm text-muted-foreground">Give new users a starting bonus</p>
            </div>
            <button
              onClick={() => setLocalSettings(prev => ({ ...prev, welcomeBonusEnabled: !prev.welcomeBonusEnabled }))}
              className={`relative w-14 h-7 rounded-full transition-colors ${
                localSettings.welcomeBonusEnabled ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                localSettings.welcomeBonusEnabled ? 'translate-x-7' : 'translate-x-1'
              }`} />
            </button>
          </div>

          {localSettings.welcomeBonusEnabled && (
            <>
              {/* Welcome Bonus Amount */}
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Welcome Bonus Amount (₦)
                </label>
                <input
                  type="number"
                  value={localSettings.welcomeBonusAmount}
                  onChange={(e) => setLocalSettings(prev => ({ ...prev, welcomeBonusAmount: parseInt(e.target.value) || 0 }))}
                  className="w-full max-w-md px-4 py-3 bg-muted rounded-xl border border-border focus:border-primary focus:outline-none text-foreground"
                  min={0}
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Amount credited to new user wallets
                </p>
              </div>

              {/* Welcome Bonus Limit */}
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  First N Users to Get Bonus
                </label>
                <input
                  type="number"
                  value={localSettings.welcomeBonusLimit}
                  onChange={(e) => setLocalSettings(prev => ({ ...prev, welcomeBonusLimit: parseInt(e.target.value) || 0 }))}
                  className="w-full max-w-md px-4 py-3 bg-muted rounded-xl border border-border focus:border-primary focus:outline-none text-foreground"
                  min={0}
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Only the first {localSettings.welcomeBonusLimit} users will receive the welcome bonus (0 = unlimited)
                </p>
              </div>

              {/* Welcome Bonus Banner Message */}
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Bonus Banner Message (Auth Page)
                </label>
                <textarea
                  value={localSettings.welcomeBonusMessage}
                  onChange={(e) => setLocalSettings(prev => ({ ...prev, welcomeBonusMessage: e.target.value }))}
                  className="w-full max-w-lg px-4 py-3 bg-muted rounded-xl border border-border focus:border-primary focus:outline-none text-foreground resize-none"
                  rows={2}
                  maxLength={120}
                  placeholder="e.g. Get ₦5,000 Free! Limited spots only"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Banner shown on auth page. Use {'{amount}'} for bonus and {'{spots}'} for remaining slots ({localSettings.welcomeBonusMessage.length}/120)
                </p>
              </div>

              {/* Live Preview */}
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  Live Preview
                </label>
                <div className="max-w-sm p-3 bg-gradient-to-r from-primary/10 to-yellow-500/10 border border-primary/30 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <Gift className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-foreground">
                        {localSettings.welcomeBonusMessage
                          .replace('{amount}', `₦${localSettings.welcomeBonusAmount.toLocaleString()}`)
                          .replace('{spots}', Math.max(0, localSettings.welcomeBonusLimit - bonusRecipientCount).toLocaleString())}
                      </p>
                    </div>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground mt-2">
                  This is how the banner will appear on the auth page
                </p>
              </div>
            </>
          )}

          {/* Welcome Message */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Welcome Toast Message
            </label>
            <textarea
              value={localSettings.welcomeMessage}
              onChange={(e) => setLocalSettings(prev => ({ ...prev, welcomeMessage: e.target.value }))}
              className="w-full max-w-lg px-4 py-3 bg-muted rounded-xl border border-border focus:border-primary focus:outline-none text-foreground resize-none"
              rows={2}
              maxLength={100}
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Message shown to new users after signup ({localSettings.welcomeMessage.length}/100 characters)
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

      {/* Weekly Leaderboard Rewards */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h2 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-gold" />
          Weekly Leaderboard Rewards
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Cash prizes awarded to top 3 players each week based on rank points
        </p>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              🥇 1st Place (₦)
            </label>
            <input
              type="number"
              value={localSettings.weeklyReward1st}
              onChange={(e) => setLocalSettings(prev => ({ ...prev, weeklyReward1st: parseInt(e.target.value) || 0 }))}
              className="w-full px-4 py-3 bg-muted rounded-xl border border-border focus:border-primary focus:outline-none text-foreground"
              min={0}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              🥈 2nd Place (₦)
            </label>
            <input
              type="number"
              value={localSettings.weeklyReward2nd}
              onChange={(e) => setLocalSettings(prev => ({ ...prev, weeklyReward2nd: parseInt(e.target.value) || 0 }))}
              className="w-full px-4 py-3 bg-muted rounded-xl border border-border focus:border-primary focus:outline-none text-foreground"
              min={0}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              🥉 3rd Place (₦)
            </label>
            <input
              type="number"
              value={localSettings.weeklyReward3rd}
              onChange={(e) => setLocalSettings(prev => ({ ...prev, weeklyReward3rd: parseInt(e.target.value) || 0 }))}
              className="w-full px-4 py-3 bg-muted rounded-xl border border-border focus:border-primary focus:outline-none text-foreground"
              min={0}
            />
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground mt-3">
          These rewards are distributed when the weekly rank is reset. Ensure sufficient funds are available.
        </p>
      </div>

      {/* Wallet Limits */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h2 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2">
          <Wallet className="w-5 h-5 text-green-400" />
          Wallet Limits
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Configure deposit and withdrawal constraints
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Min Deposit (₦)
            </label>
            <input
              type="number"
              value={localSettings.minDeposit}
              onChange={(e) => setLocalSettings(prev => ({ ...prev, minDeposit: parseInt(e.target.value) || 100 }))}
              className="w-full px-4 py-3 bg-muted rounded-xl border border-border focus:border-primary focus:outline-none text-foreground"
              min={0}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Max Deposit (₦)
            </label>
            <input
              type="number"
              value={localSettings.maxDeposit}
              onChange={(e) => setLocalSettings(prev => ({ ...prev, maxDeposit: parseInt(e.target.value) || 1000000 }))}
              className="w-full px-4 py-3 bg-muted rounded-xl border border-border focus:border-primary focus:outline-none text-foreground"
              min={0}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Min Withdrawal (₦)
            </label>
            <input
              type="number"
              value={localSettings.minWithdrawal}
              onChange={(e) => setLocalSettings(prev => ({ ...prev, minWithdrawal: parseInt(e.target.value) || 100 }))}
              className="w-full px-4 py-3 bg-muted rounded-xl border border-border focus:border-primary focus:outline-none text-foreground"
              min={0}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Quick Deposit Amounts
            </label>
            <input
              type="text"
              value={localSettings.depositQuickAmounts}
              onChange={(e) => setLocalSettings(prev => ({ ...prev, depositQuickAmounts: e.target.value }))}
              className="w-full px-4 py-3 bg-muted rounded-xl border border-border focus:border-primary focus:outline-none text-foreground"
              placeholder="1000,2000,5000,10000"
            />
            <p className="text-[10px] text-muted-foreground mt-1">Comma-separated values</p>
          </div>
        </div>
      </div>

      {/* Timing Settings */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h2 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2">
          <Timer className="w-5 h-5 text-blue-400" />
          Timing Settings
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Configure time-based behaviors and thresholds
        </p>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-400" />
              "Ending Soon" Threshold (sec)
            </label>
            <input
              type="number"
              value={localSettings.endingSoonThreshold}
              onChange={(e) => setLocalSettings(prev => ({ ...prev, endingSoonThreshold: parseInt(e.target.value) || 300 }))}
              className="w-full px-4 py-3 bg-muted rounded-xl border border-border focus:border-primary focus:outline-none text-foreground"
              min={30}
              max={600}
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Games show "Ending Soon" badge when this much time remains (default: 300 = 5 min)
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" />
              Notification Poll Interval (ms)
            </label>
            <input
              type="number"
              value={localSettings.notificationPollInterval}
              onChange={(e) => setLocalSettings(prev => ({ ...prev, notificationPollInterval: parseInt(e.target.value) || 30000 }))}
              className="w-full px-4 py-3 bg-muted rounded-xl border border-border focus:border-primary focus:outline-none text-foreground"
              min={5000}
              max={60000}
              step={1000}
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              How often the app checks for new notifications (default: 30000 = 30 sec)
            </p>
          </div>
        </div>
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
          <div className="grid grid-cols-3 gap-4">
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
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-400" />
                Leave Window (min)
              </label>
              <input
                type="number"
                value={localSettings.leaveWindowMinutes}
                onChange={(e) => setLocalSettings(prev => ({ ...prev, leaveWindowMinutes: parseInt(e.target.value) || 5 }))}
                className="w-full px-4 py-3 bg-muted rounded-xl border border-border focus:border-primary focus:outline-none text-foreground"
                min={1}
                max={60}
              />
              <p className="text-[10px] text-muted-foreground mt-1">Players can't leave within X min of start</p>
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
          {/* Google Auth Toggle */}
          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-5 h-5">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              </div>
              <div>
                <p className="font-medium text-foreground">Google Sign-In</p>
                <p className="text-sm text-muted-foreground">Allow users to sign in with Google</p>
              </div>
            </div>
            <button
              onClick={() => setLocalSettings(prev => ({ ...prev, googleAuthEnabled: !prev.googleAuthEnabled }))}
              className={`relative w-14 h-8 rounded-full transition-colors ${
                localSettings.googleAuthEnabled ? 'bg-blue-500' : 'bg-muted'
              }`}
            >
              <div className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow transition-transform ${
                localSettings.googleAuthEnabled ? 'translate-x-7' : 'translate-x-1'
              }`} />
            </button>
          </div>

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
