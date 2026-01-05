import { useAdmin } from '@/contexts/AdminContext';
import { Settings, Save, Zap, AlertTriangle, Users } from 'lucide-react';
import { useState } from 'react';

export const AdminSettings = () => {
  const { settings, updateSettings, simulateHighTraffic } = useAdmin();
  const [localSettings, setLocalSettings] = useState(settings);

  const handleSave = () => {
    updateSettings(localSettings);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-foreground">System Settings</h1>
        <p className="text-sm text-muted-foreground">Platform configuration and controls</p>
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
        </div>
      </div>

      {/* Mode Toggles */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h2 className="text-lg font-bold text-foreground mb-6">Mode Controls</h2>

        <div className="space-y-4">
          {/* Test Mode */}
          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <Zap className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">Test Mode</p>
                <p className="text-sm text-muted-foreground">Enable testing features and simulations</p>
              </div>
            </div>
            <button
              onClick={() => setLocalSettings(prev => ({ ...prev, testMode: !prev.testMode }))}
              className={`relative w-14 h-8 rounded-full transition-colors ${
                localSettings.testMode ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <div className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow transition-transform ${
                localSettings.testMode ? 'translate-x-7' : 'translate-x-1'
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
        </div>
      </div>

      {/* Test Actions */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h2 className="text-lg font-bold text-foreground mb-6">Test Actions</h2>
        <p className="text-sm text-muted-foreground mb-4">Simulate various scenarios for testing and demos</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={simulateHighTraffic}
            className="p-4 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors text-left"
          >
            <Users className="w-6 h-6 text-primary mb-2" />
            <p className="font-medium text-foreground">Simulate High Traffic</p>
            <p className="text-sm text-muted-foreground">Add mock users and increase stats</p>
          </button>

          <button className="p-4 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors text-left">
            <Zap className="w-6 h-6 text-primary mb-2" />
            <p className="font-medium text-foreground">Simulate Multiple Games</p>
            <p className="text-sm text-muted-foreground">Create rapid game cycles</p>
          </button>

          <button className="p-4 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors text-left">
            <Settings className="w-6 h-6 text-primary mb-2" />
            <p className="font-medium text-foreground">Reset All Data</p>
            <p className="text-sm text-muted-foreground">Clear all mock data and start fresh</p>
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
          {JSON.stringify(settings, null, 2)}
        </pre>
      </div>
    </div>
  );
};
