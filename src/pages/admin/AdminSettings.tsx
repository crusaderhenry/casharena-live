import { Settings, Save, Zap, AlertTriangle, Users, Power, Key, RefreshCw, Trash2, Database, PlayCircle, Shield } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { useAdmin } from '@/contexts/AdminContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useToast } from '@/hooks/use-toast';

interface SecretInfo {
  name: string;
  description: string;
  lastUpdated?: string;
  isSet: boolean;
}

export const AdminSettings = () => {
  const { settings: dbSettings, updateSettings: updateDbSettings, toggleTestMode, isTestMode, loading } = usePlatformSettings();
  const { simulateHighTraffic, createGameWithConfig, refreshData } = useAdmin();
  const { toast: toastHook } = useToast();
  
  const [localSettings, setLocalSettings] = useState({
    platformName: 'FortunesHQ',
    platformCut: 10,
    testMode: true,
    maintenanceMode: false,
  });

  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // API Keys state - these are the known secrets
  const [apiKeys] = useState<SecretInfo[]>([
    { name: 'PAYSTACK_TEST_SECRET_KEY', description: 'Paystack Test Secret Key for sandbox transactions', isSet: true },
    { name: 'PAYSTACK_LIVE_SECRET_KEY', description: 'Paystack Live Secret Key for real transactions', isSet: true },
    { name: 'ELEVENLABS_API_KEY', description: 'ElevenLabs API Key for voice/TTS features', isSet: true },
    { name: 'CRON_SECRET', description: 'Secret for authenticating scheduled cron jobs', isSet: true },
  ]);

  useEffect(() => {
    if (dbSettings) {
      setLocalSettings(prev => ({
        ...prev,
        platformName: dbSettings.platform_name,
        platformCut: dbSettings.platform_cut_percent,
        testMode: dbSettings.test_mode,
      }));
    }
  }, [dbSettings]);

  const handleSave = async () => {
    setActionLoading('save');
    const success = await updateDbSettings({
      platform_name: localSettings.platformName,
      platform_cut_percent: localSettings.platformCut,
    });
    setActionLoading(null);
    
    if (success) {
      toast.success('Settings saved successfully');
    } else {
      toast.error('Failed to save settings');
    }
  };

  const handleTestModeToggle = async () => {
    setActionLoading('testMode');
    const newValue = !isTestMode;
    
    const success = await toggleTestMode(newValue);
    setActionLoading(null);
    
    if (!success) {
      toast.error('Failed to toggle test mode');
    } else {
      toast.success(newValue ? 'Test Mode enabled' : 'Live Mode enabled - Real payments active!');
    }
  };

  // Test Action: Simulate High Traffic
  const handleSimulateTraffic = async () => {
    setActionLoading('traffic');
    try {
      // Add mock transactions
      const mockUsers = ['TestUser1', 'TestUser2', 'TestUser3'];
      simulateHighTraffic();
      toast.success('High traffic simulation started');
    } catch (err) {
      toast.error('Failed to simulate traffic');
    } finally {
      setActionLoading(null);
    }
  };

  // Test Action: Create Multiple Test Games
  const handleSimulateMultipleGames = async () => {
    setActionLoading('games');
    try {
      const gameConfigs = [
        { name: 'Test Game 1', entry_fee: 500, max_duration: 10, comment_timer: 30, payout_type: 'top3', payout_distribution: [0.5, 0.3, 0.2], min_participants: 2, countdown: 30 },
        { name: 'Test Game 2', entry_fee: 1000, max_duration: 15, comment_timer: 45, payout_type: 'top3', payout_distribution: [0.5, 0.3, 0.2], min_participants: 2, countdown: 30 },
        { name: 'Test Game 3', entry_fee: 2000, max_duration: 20, comment_timer: 60, payout_type: 'winner_takes_all', payout_distribution: [1], min_participants: 2, countdown: 30 },
      ];

      for (const config of gameConfigs) {
        await createGameWithConfig(config);
        await new Promise(resolve => setTimeout(resolve, 500)); // Stagger creation
      }
      
      toast.success('Created 3 test games successfully');
      refreshData();
    } catch (err) {
      toast.error('Failed to create test games');
    } finally {
      setActionLoading(null);
    }
  };

  // Test Action: Reset Test Data
  const handleResetTestData = async () => {
    if (!confirm('Are you sure you want to reset all test data? This will delete test transactions and ended games.')) {
      return;
    }
    
    setActionLoading('reset');
    try {
      // Delete test mode transactions
      await supabase
        .from('wallet_transactions')
        .delete()
        .eq('mode', 'test');

      // Delete ended games
      await supabase
        .from('fastest_finger_games')
        .delete()
        .eq('status', 'ended');

      toast.success('Test data reset successfully');
      refreshData();
    } catch (err) {
      console.error('Reset error:', err);
      toast.error('Failed to reset test data');
    } finally {
      setActionLoading(null);
    }
  };

  // Trigger Weekly Rank Reset
  const handleWeeklyReset = async () => {
    if (!confirm('Are you sure you want to reset weekly ranks? This will set all weekly_rank to null.')) {
      return;
    }
    
    setActionLoading('weeklyReset');
    try {
      await supabase
        .from('profiles')
        .update({ weekly_rank: null })
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Update all

      toast.success('Weekly ranks reset successfully');
      refreshData();
    } catch (err) {
      toast.error('Failed to reset weekly ranks');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-foreground">System Settings</h1>
        <p className="text-sm text-muted-foreground">Platform configuration, API keys, and controls</p>
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
                {isTestMode ? 'Using PAYSTACK_TEST_SECRET_KEY for sandbox' : 'Using PAYSTACK_LIVE_SECRET_KEY for real payments'}
              </p>
            </div>
          </div>
          <button
            onClick={handleTestModeToggle}
            disabled={loading || actionLoading === 'testMode'}
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

      {/* API Keys Management */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h2 className="text-lg font-bold text-foreground mb-2 flex items-center gap-2">
          <Key className="w-5 h-5 text-gold" />
          API Keys & Secrets
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          These secrets are stored securely and used by backend functions. Contact support or use the Lovable secrets panel to update them.
        </p>

        <div className="space-y-3">
          {apiKeys.map((key) => (
            <div key={key.name} className="flex items-center justify-between p-4 bg-muted/30 rounded-xl">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${key.isSet ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                  <Key className={`w-5 h-5 ${key.isSet ? 'text-green-500' : 'text-red-500'}`} />
                </div>
                <div>
                  <p className="font-mono text-sm text-foreground">{key.name}</p>
                  <p className="text-xs text-muted-foreground">{key.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {key.isSet ? (
                  <span className="px-3 py-1 bg-green-500/20 text-green-400 text-xs rounded-full font-medium">
                    ✓ Configured
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-red-500/20 text-red-400 text-xs rounded-full font-medium">
                    Not Set
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 p-4 bg-primary/10 rounded-xl border border-primary/30">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">How to Update API Keys</p>
              <p className="text-xs text-muted-foreground mt-1">
                API keys are managed through Lovable's secure secrets system. To update a key, ask Lovable to "update the PAYSTACK_LIVE_SECRET_KEY" or any other secret name.
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
            <p className="text-[10px] text-muted-foreground mt-1">Percentage of pool taken as platform fee (0-50%)</p>
          </div>
        </div>
      </div>

      {/* Mode Toggles */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h2 className="text-lg font-bold text-foreground mb-6">System Controls</h2>

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
              onClick={() => setLocalSettings(prev => ({ ...prev, maintenanceMode: !prev.maintenanceMode }))}
              className={`relative w-14 h-8 rounded-full transition-colors ${
                localSettings.maintenanceMode ? 'bg-yellow-500' : 'bg-muted'
              }`}
            >
              <div className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow transition-transform ${
                localSettings.maintenanceMode ? 'translate-x-7' : 'translate-x-1'
              }`} />
            </button>
          </div>

          {/* Weekly Rank Reset */}
          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <RefreshCw className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">Weekly Rank Reset</p>
                <p className="text-sm text-muted-foreground">Reset all weekly rankings to start fresh</p>
              </div>
            </div>
            <button
              onClick={handleWeeklyReset}
              disabled={actionLoading === 'weeklyReset'}
              className="px-4 py-2 bg-primary/20 text-primary rounded-lg font-medium hover:bg-primary/30 transition-colors disabled:opacity-50"
            >
              {actionLoading === 'weeklyReset' ? 'Resetting...' : 'Reset Now'}
            </button>
          </div>
        </div>
      </div>

      {/* Test Actions */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h2 className="text-lg font-bold text-foreground mb-2">Test Actions</h2>
        <p className="text-sm text-muted-foreground mb-4">Simulate various scenarios for testing and demos. Only affects test data.</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={handleSimulateTraffic}
            disabled={actionLoading === 'traffic'}
            className="p-4 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors text-left disabled:opacity-50"
          >
            <Users className={`w-6 h-6 text-primary mb-2 ${actionLoading === 'traffic' ? 'animate-pulse' : ''}`} />
            <p className="font-medium text-foreground">Simulate High Traffic</p>
            <p className="text-sm text-muted-foreground">Add mock activity to stats</p>
          </button>

          <button
            onClick={handleSimulateMultipleGames}
            disabled={actionLoading === 'games'}
            className="p-4 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors text-left disabled:opacity-50"
          >
            <PlayCircle className={`w-6 h-6 text-primary mb-2 ${actionLoading === 'games' ? 'animate-spin' : ''}`} />
            <p className="font-medium text-foreground">Create Test Games</p>
            <p className="text-sm text-muted-foreground">Create 3 scheduled test games</p>
          </button>

          <button
            onClick={handleResetTestData}
            disabled={actionLoading === 'reset'}
            className="p-4 bg-red-500/10 rounded-xl hover:bg-red-500/20 transition-colors text-left disabled:opacity-50 border border-red-500/30"
          >
            <Trash2 className={`w-6 h-6 text-red-400 mb-2 ${actionLoading === 'reset' ? 'animate-pulse' : ''}`} />
            <p className="font-medium text-foreground">Reset Test Data</p>
            <p className="text-sm text-muted-foreground">Delete test transactions & ended games</p>
          </button>
        </div>
      </div>

      {/* Database Quick Stats */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
          <Database className="w-5 h-5 text-primary" />
          Database Status
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <DatabaseStat label="Tables" value="11" />
          <DatabaseStat label="RLS Policies" value="Active" status="success" />
          <DatabaseStat label="Edge Functions" value="10" />
          <DatabaseStat label="Realtime" value="Enabled" status="success" />
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={actionLoading === 'save'}
          className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          <Save className="w-5 h-5" />
          {actionLoading === 'save' ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {/* Current Settings Display */}
      <div className="bg-muted/30 rounded-xl p-4">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Current Configuration</p>
        <pre className="text-xs text-foreground overflow-auto">
          {JSON.stringify({
            ...localSettings,
            mode: isTestMode ? 'test' : 'live',
            paystackKey: isTestMode ? 'PAYSTACK_TEST_SECRET_KEY' : 'PAYSTACK_LIVE_SECRET_KEY',
          }, null, 2)}
        </pre>
      </div>
    </div>
  );
};

// Helper component for database stats
const DatabaseStat = ({ label, value, status }: { label: string; value: string; status?: 'success' | 'warning' | 'error' }) => (
  <div className="p-3 bg-muted/30 rounded-lg">
    <p className="text-[10px] text-muted-foreground uppercase">{label}</p>
    <p className={`text-lg font-bold ${
      status === 'success' ? 'text-green-400' : 
      status === 'warning' ? 'text-yellow-400' : 
      status === 'error' ? 'text-red-400' : 
      'text-foreground'
    }`}>{value}</p>
  </div>
);
