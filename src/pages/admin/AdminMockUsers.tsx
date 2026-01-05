import { useState, useEffect } from 'react';
import { 
  Bot, 
  Power, 
  Users, 
  MessageSquare, 
  Percent, 
  Activity,
  Plus,
  Trash2,
  Edit,
  Save,
  X,
  Eye,
  EyeOff,
  Zap,
  Trophy,
  RefreshCw,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';

interface MockUserSettings {
  id: string;
  enabled: boolean;
  max_mock_users_per_game: number;
  activity_level: 'low' | 'medium' | 'high';
  join_probability: number;
  comment_frequency: number;
  exclude_from_rewards: boolean;
}

interface MockUser {
  id: string;
  username: string;
  avatar: string;
  personality: 'aggressive' | 'passive' | 'neutral' | 'random';
  is_active: boolean;
  virtual_wins: number;
  virtual_rank_points: number;
  created_at: string;
}

const ACTIVITY_DESCRIPTIONS = {
  low: 'Mock users join occasionally and comment sparingly',
  medium: 'Mock users join regularly and participate actively',
  high: 'Mock users are very active, creating a competitive feel',
};

const PERSONALITY_EMOJIS = {
  aggressive: '⚡',
  passive: '🧘',
  neutral: '😐',
  random: '🎲',
};

export const AdminMockUsers = () => {
  const [settings, setSettings] = useState<MockUserSettings | null>(null);
  const [mockUsers, setMockUsers] = useState<MockUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<MockUser | null>(null);
  
  const [newUser, setNewUser] = useState({
    username: '',
    avatar: '🎮',
    personality: 'neutral' as MockUser['personality'],
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('mock_user_settings')
        .select('*')
        .single();
      
      if (settingsError) throw settingsError;
      setSettings(settingsData as unknown as MockUserSettings);

      // Fetch mock users
      const { data: usersData, error: usersError } = await supabase
        .from('mock_users')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (usersError) throw usersError;
      setMockUsers(usersData as unknown as MockUser[]);
    } catch (error: any) {
      console.error('Error fetching mock user data:', error);
      toast.error('Failed to load mock user settings');
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (updates: Partial<MockUserSettings>) => {
    if (!settings) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('mock_user_settings')
        .update(updates)
        .eq('id', settings.id);
      
      if (error) throw error;
      
      setSettings({ ...settings, ...updates });
      toast.success('Settings updated');
    } catch (error: any) {
      console.error('Error updating settings:', error);
      toast.error('Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const toggleEnabled = async () => {
    if (!settings) return;
    await updateSettings({ enabled: !settings.enabled });
  };

  const addMockUser = async () => {
    if (!newUser.username.trim()) {
      toast.error('Username is required');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('mock_users')
        .insert({
          username: newUser.username,
          avatar: newUser.avatar,
          personality: newUser.personality,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      setMockUsers([data as unknown as MockUser, ...mockUsers]);
      setShowAddDialog(false);
      setNewUser({ username: '', avatar: '🎮', personality: 'neutral' });
      toast.success('Mock user added');
    } catch (error: any) {
      console.error('Error adding mock user:', error);
      toast.error(error.message || 'Failed to add mock user');
    }
  };

  const updateMockUser = async (id: string, updates: Partial<MockUser>) => {
    try {
      const { error } = await supabase
        .from('mock_users')
        .update(updates)
        .eq('id', id);
      
      if (error) throw error;
      
      setMockUsers(mockUsers.map(u => u.id === id ? { ...u, ...updates } : u));
      setEditingUser(null);
      toast.success('Mock user updated');
    } catch (error: any) {
      console.error('Error updating mock user:', error);
      toast.error('Failed to update mock user');
    }
  };

  const deleteMockUser = async (id: string) => {
    if (!confirm('Delete this mock user?')) return;

    try {
      const { error } = await supabase
        .from('mock_users')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setMockUsers(mockUsers.filter(u => u.id !== id));
      toast.success('Mock user deleted');
    } catch (error: any) {
      console.error('Error deleting mock user:', error);
      toast.error('Failed to delete mock user');
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-foreground flex items-center gap-3">
            <Bot className="w-7 h-7 text-primary" />
            Mock Users
          </h1>
          <p className="text-sm text-muted-foreground">
            Simulate early-stage activity to encourage real participation
          </p>
        </div>
        <button
          onClick={fetchData}
          className="p-2 hover:bg-muted rounded-lg transition-colors"
        >
          <RefreshCw className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      {/* Master Toggle */}
      <div className={`rounded-xl border-2 p-6 transition-colors ${
        settings?.enabled 
          ? 'bg-primary/10 border-primary/50' 
          : 'bg-muted/50 border-border'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
              settings?.enabled ? 'bg-primary/20' : 'bg-muted'
            }`}>
              <Power className={`w-7 h-7 ${settings?.enabled ? 'text-primary' : 'text-muted-foreground'}`} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">
                Mock Users {settings?.enabled ? 'Active' : 'Disabled'}
              </h2>
              <p className={`text-sm ${settings?.enabled ? 'text-primary' : 'text-muted-foreground'}`}>
                {settings?.enabled 
                  ? 'Mock users will participate in games' 
                  : 'Mock users are completely disabled'}
              </p>
            </div>
          </div>
          <button
            onClick={toggleEnabled}
            disabled={saving}
            className={`relative w-20 h-10 rounded-full transition-colors ${
              settings?.enabled ? 'bg-primary' : 'bg-muted-foreground/30'
            }`}
          >
            <div className={`absolute top-1 w-8 h-8 rounded-full bg-white shadow transition-transform ${
              settings?.enabled ? 'translate-x-10' : 'translate-x-1'
            }`} />
          </button>
        </div>

        {settings?.enabled && (
          <div className="mt-4 p-3 bg-primary/10 rounded-lg border border-primary/30">
            <p className="text-sm text-primary flex items-center gap-2">
              <Activity className="w-4 h-4" />
              {mockUsers.filter(u => u.is_active).length} mock users available for games
            </p>
          </div>
        )}
      </div>

      {/* Settings Grid */}
      {settings && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Max Mock Users Per Game */}
          <div className="bg-card rounded-xl border border-border p-4">
            <Label className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-muted-foreground" />
              Max Mock Users Per Game
            </Label>
            <Input
              type="number"
              value={settings.max_mock_users_per_game}
              onChange={(e) => updateSettings({ max_mock_users_per_game: parseInt(e.target.value) || 0 })}
              min={0}
              max={50}
              className="mb-2"
            />
            <p className="text-xs text-muted-foreground">
              Maximum mock users that can join a single game
            </p>
          </div>

          {/* Activity Level */}
          <div className="bg-card rounded-xl border border-border p-4">
            <Label className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-muted-foreground" />
              Activity Level
            </Label>
            <Select
              value={settings.activity_level}
              onValueChange={(value: 'low' | 'medium' | 'high') => updateSettings({ activity_level: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-2">
              {ACTIVITY_DESCRIPTIONS[settings.activity_level]}
            </p>
          </div>

          {/* Join Probability */}
          <div className="bg-card rounded-xl border border-border p-4">
            <Label className="flex items-center gap-2 mb-3">
              <Percent className="w-4 h-4 text-muted-foreground" />
              Join Probability: {settings.join_probability}%
            </Label>
            <input
              type="range"
              value={settings.join_probability}
              onChange={(e) => updateSettings({ join_probability: parseInt(e.target.value) })}
              min={0}
              max={100}
              className="w-full accent-primary"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Chance a mock user joins when triggered
            </p>
          </div>

          {/* Comment Frequency */}
          <div className="bg-card rounded-xl border border-border p-4">
            <Label className="flex items-center gap-2 mb-3">
              <MessageSquare className="w-4 h-4 text-muted-foreground" />
              Comment Frequency: {settings.comment_frequency}%
            </Label>
            <input
              type="range"
              value={settings.comment_frequency}
              onChange={(e) => updateSettings({ comment_frequency: parseInt(e.target.value) })}
              min={0}
              max={100}
              className="w-full accent-primary"
            />
            <p className="text-xs text-muted-foreground mt-2">
              How often mock users comment during games
            </p>
          </div>

          {/* Exclude from Rewards */}
          <div className="bg-card rounded-xl border border-border p-4">
            <Label className="flex items-center gap-2 mb-3">
              <Trophy className="w-4 h-4 text-muted-foreground" />
              Exclude from Rewards
            </Label>
            <div className="flex items-center gap-3">
              <Switch
                checked={settings.exclude_from_rewards}
                onCheckedChange={(checked) => updateSettings({ exclude_from_rewards: checked })}
              />
              <span className="text-sm text-muted-foreground">
                {settings.exclude_from_rewards ? 'Yes (recommended)' : 'No'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Mock users won't receive weekly rank rewards
            </p>
          </div>
        </div>
      )}

      {/* Mock Users List */}
      <div className="bg-card rounded-xl border border-border">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">
            Mock User Roster ({mockUsers.length})
          </h2>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <button className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
                <Plus className="w-4 h-4" />
                Add Mock User
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Mock User</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label>Username</Label>
                  <Input
                    value={newUser.username}
                    onChange={(e) => setNewUser(prev => ({ ...prev, username: e.target.value }))}
                    placeholder="e.g., SpeedDemon"
                  />
                </div>
                <div>
                  <Label>Avatar (emoji)</Label>
                  <Input
                    value={newUser.avatar}
                    onChange={(e) => setNewUser(prev => ({ ...prev, avatar: e.target.value }))}
                    placeholder="🎮"
                    maxLength={4}
                  />
                </div>
                <div>
                  <Label>Personality</Label>
                  <Select
                    value={newUser.personality}
                    onValueChange={(value: MockUser['personality']) => setNewUser(prev => ({ ...prev, personality: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aggressive">⚡ Aggressive - Comments frequently</SelectItem>
                      <SelectItem value="passive">🧘 Passive - Comments rarely</SelectItem>
                      <SelectItem value="neutral">😐 Neutral - Balanced</SelectItem>
                      <SelectItem value="random">🎲 Random - Unpredictable</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <button
                  onClick={() => setShowAddDialog(false)}
                  className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={addMockUser}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
                >
                  Add User
                </button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="divide-y divide-border">
          {mockUsers.map((user) => (
            <div key={user.id} className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-3xl">{user.avatar}</div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">{user.username}</span>
                    <span className="text-sm">{PERSONALITY_EMOJIS[user.personality]}</span>
                    {!user.is_active && (
                      <span className="text-xs px-2 py-0.5 bg-muted rounded-full text-muted-foreground">
                        Inactive
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-3">
                    <span>🏆 {user.virtual_wins} wins</span>
                    <span>⭐ {user.virtual_rank_points} pts</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateMockUser(user.id, { is_active: !user.is_active })}
                  className={`p-2 rounded-lg transition-colors ${
                    user.is_active 
                      ? 'bg-primary/10 text-primary hover:bg-primary/20' 
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                  title={user.is_active ? 'Deactivate' : 'Activate'}
                >
                  {user.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => deleteMockUser(user.id)}
                  className="p-2 hover:bg-destructive/10 text-destructive rounded-lg transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          {mockUsers.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              No mock users created yet
            </div>
          )}
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
        <h3 className="font-semibold text-blue-400 mb-2">ℹ️ How Mock Users Work</h3>
        <ul className="text-sm text-blue-300/80 space-y-1 list-disc list-inside">
          <li>Mock users simulate activity but never receive real money</li>
          <li>Prize pools displayed include mock contributions visually</li>
          <li>Real settlements only use real user contributions</li>
          <li>If a mock user wins, the next real user gets the prize</li>
          <li>Mock users are completely invisible to regular players</li>
        </ul>
      </div>
    </div>
  );
};
