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
  Eye,
  EyeOff,
  Zap,
  Trophy,
  RefreshCw,
  Sparkles,
  CheckSquare,
  Square,
  Loader2,
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

// Nigerian and Crypto-inspired name generators
const NIGERIAN_PREFIXES = [
  'Ade', 'Chidi', 'Emeka', 'Femi', 'Kunle', 'Tunde', 'Segun', 'Bola', 'Kola', 'Chuka',
  'Obinna', 'Nnamdi', 'Ikenna', 'Uche', 'Eze', 'Obi', 'Ngozi', 'Amaka', 'Chioma', 'Nneka',
  'Yemi', 'Tobi', 'Dayo', 'Bisi', 'Funke', 'Shade', 'Lola', 'Titi', 'Bukky', 'Sola',
];

const NIGERIAN_SUFFIXES = [
  'Boy', 'Girl', 'King', 'Queen', 'Boss', 'Chief', 'Don', 'Oga', 'Baller', 'Star',
  'Pro', 'Master', 'Legend', 'Champion', 'Winner', 'Flash', 'Speed', 'Quick', 'Swift', 'Fire',
];

const CRYPTO_PREFIXES = [
  'Crypto', 'Satoshi', 'Hodl', 'Moon', 'Lambo', 'Degen', 'Whale', 'Diamond', 'Paper', 'Web3',
  'DeFi', 'NFT', 'Meta', 'Chain', 'Block', 'Hash', 'Token', 'Coin', 'Bit', 'Eth',
  'Sol', 'Ape', 'Bull', 'Bear', 'Pump', 'Rekt', 'WAGMI', 'NGMI', 'Fren', 'Anon',
];

const CRYPTO_SUFFIXES = [
  'King', 'Queen', 'Lord', 'Whale', 'Maxi', 'Chad', 'Guru', 'Wizard', 'Hunter', 'Slayer',
  'Master', 'Pro', 'Legend', 'Boss', 'Chief', 'Degen', 'Ape', 'Bull', 'Holder', 'Trader',
];

const GAMING_PREFIXES = [
  'Fast', 'Quick', 'Speed', 'Flash', 'Turbo', 'Rapid', 'Swift', 'Blaze', 'Thunder', 'Storm',
  'Shadow', 'Dark', 'Light', 'Fire', 'Ice', 'Dragon', 'Phoenix', 'Ninja', 'Samurai', 'Warrior',
];

const GAMING_SUFFIXES = [
  'Fingers', 'Hands', 'Typer', 'Clicker', 'Tapper', 'Player', 'Gamer', 'Pro', 'King', 'Master',
  'Beast', 'God', 'Legend', 'Elite', 'Ace', 'Champ', 'Winner', 'Slayer', 'Killer', 'Hunter',
];

const AVATARS = [
  '🎮', '🔥', '⚡', '💰', '🚀', '💎', '🏆', '👑', '🦁', '🐺',
  '🦅', '🐉', '🦊', '🐯', '🦈', '💪', '🎯', '⭐', '🌟', '✨',
  '🔱', '⚔️', '🛡️', '🎪', '🎲', '🃏', '🧿', '💫', '🌙', '☀️',
];

const generateRandomUsername = (): string => {
  const rand = Math.random();
  let prefix: string;
  let suffix: string;
  
  if (rand < 0.4) {
    // Nigerian style (40%)
    prefix = NIGERIAN_PREFIXES[Math.floor(Math.random() * NIGERIAN_PREFIXES.length)];
    suffix = NIGERIAN_SUFFIXES[Math.floor(Math.random() * NIGERIAN_SUFFIXES.length)];
  } else if (rand < 0.7) {
    // Crypto style (30%)
    prefix = CRYPTO_PREFIXES[Math.floor(Math.random() * CRYPTO_PREFIXES.length)];
    suffix = CRYPTO_SUFFIXES[Math.floor(Math.random() * CRYPTO_SUFFIXES.length)];
  } else {
    // Gaming style (30%)
    prefix = GAMING_PREFIXES[Math.floor(Math.random() * GAMING_PREFIXES.length)];
    suffix = GAMING_SUFFIXES[Math.floor(Math.random() * GAMING_SUFFIXES.length)];
  }
  
  // Sometimes add numbers
  const addNumber = Math.random() > 0.6;
  const number = addNumber ? Math.floor(Math.random() * 999) + 1 : '';
  
  return `${prefix}${suffix}${number}`;
};

const generateRandomAvatar = (): string => {
  return AVATARS[Math.floor(Math.random() * AVATARS.length)];
};

const generateRandomPersonality = (): MockUser['personality'] => {
  const personalities: MockUser['personality'][] = ['aggressive', 'passive', 'neutral', 'random'];
  return personalities[Math.floor(Math.random() * personalities.length)];
};

export const AdminMockUsers = () => {
  const [settings, setSettings] = useState<MockUserSettings | null>(null);
  const [mockUsers, setMockUsers] = useState<MockUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [bulkCount, setBulkCount] = useState(10);
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  
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
      const { data: settingsData, error: settingsError } = await supabase
        .from('mock_user_settings')
        .select('*')
        .single();
      
      if (settingsError) throw settingsError;
      setSettings(settingsData as unknown as MockUserSettings);

      const { data: usersData, error: usersError } = await supabase
        .from('mock_users')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (usersError) throw usersError;
      setMockUsers(usersData as unknown as MockUser[]);
      setSelectedIds(new Set());
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

  const bulkGenerateUsers = async () => {
    if (bulkCount < 1 || bulkCount > 100) {
      toast.error('Please enter a number between 1 and 100');
      return;
    }

    setBulkGenerating(true);
    try {
      const usersToCreate = [];
      const existingUsernames = new Set(mockUsers.map(u => u.username.toLowerCase()));
      
      for (let i = 0; i < bulkCount; i++) {
        let username = generateRandomUsername();
        let attempts = 0;
        
        // Ensure unique username
        while (existingUsernames.has(username.toLowerCase()) && attempts < 50) {
          username = generateRandomUsername();
          attempts++;
        }
        
        if (attempts < 50) {
          existingUsernames.add(username.toLowerCase());
          usersToCreate.push({
            username,
            avatar: generateRandomAvatar(),
            personality: generateRandomPersonality(),
          });
        }
      }

      if (usersToCreate.length === 0) {
        toast.error('Could not generate unique usernames');
        return;
      }

      const { data, error } = await supabase
        .from('mock_users')
        .insert(usersToCreate)
        .select();
      
      if (error) throw error;
      
      setMockUsers([...(data as unknown as MockUser[]), ...mockUsers]);
      setShowBulkDialog(false);
      toast.success(`Generated ${data?.length || 0} mock users`);
    } catch (error: any) {
      console.error('Error bulk generating users:', error);
      toast.error(error.message || 'Failed to generate mock users');
    } finally {
      setBulkGenerating(false);
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
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      toast.success('Mock user deleted');
    } catch (error: any) {
      console.error('Error deleting mock user:', error);
      toast.error('Failed to delete mock user');
    }
  };

  // Bulk actions
  const toggleSelectAll = () => {
    if (selectedIds.size === mockUsers.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(mockUsers.map(u => u.id)));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const bulkActivate = async () => {
    if (selectedIds.size === 0) return;
    
    setBulkActionLoading(true);
    try {
      const { error } = await supabase
        .from('mock_users')
        .update({ is_active: true })
        .in('id', Array.from(selectedIds));
      
      if (error) throw error;
      
      setMockUsers(mockUsers.map(u => selectedIds.has(u.id) ? { ...u, is_active: true } : u));
      toast.success(`Activated ${selectedIds.size} mock users`);
      setSelectedIds(new Set());
    } catch (error: any) {
      toast.error('Failed to activate mock users');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const bulkDeactivate = async () => {
    if (selectedIds.size === 0) return;
    
    setBulkActionLoading(true);
    try {
      const { error } = await supabase
        .from('mock_users')
        .update({ is_active: false })
        .in('id', Array.from(selectedIds));
      
      if (error) throw error;
      
      setMockUsers(mockUsers.map(u => selectedIds.has(u.id) ? { ...u, is_active: false } : u));
      toast.success(`Deactivated ${selectedIds.size} mock users`);
      setSelectedIds(new Set());
    } catch (error: any) {
      toast.error('Failed to deactivate mock users');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const bulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} mock users? This cannot be undone.`)) return;
    
    setBulkActionLoading(true);
    try {
      const { error } = await supabase
        .from('mock_users')
        .delete()
        .in('id', Array.from(selectedIds));
      
      if (error) throw error;
      
      setMockUsers(mockUsers.filter(u => !selectedIds.has(u.id)));
      toast.success(`Deleted ${selectedIds.size} mock users`);
      setSelectedIds(new Set());
    } catch (error: any) {
      toast.error('Failed to delete mock users');
    } finally {
      setBulkActionLoading(false);
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

  const activeCount = mockUsers.filter(u => u.is_active).length;
  const inactiveCount = mockUsers.length - activeCount;

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
            {activeCount} active • {inactiveCount} inactive • {mockUsers.length} total
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
              {activeCount} mock users available for games
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
        <div className="p-4 border-b border-border flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-lg font-bold text-foreground">
            Mock User Roster ({mockUsers.length})
          </h2>
          <div className="flex items-center gap-2">
            {/* Bulk Generate Button */}
            <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
              <DialogTrigger asChild>
                <button className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
                  <Sparkles className="w-4 h-4" />
                  Generate Bulk
                </button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-500" />
                    Bulk Generate Mock Users
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label>Number of users to generate (1-100)</Label>
                    <Input
                      type="number"
                      value={bulkCount}
                      onChange={(e) => setBulkCount(parseInt(e.target.value) || 10)}
                      min={1}
                      max={100}
                      className="mt-2"
                    />
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      Names will be auto-generated mixing:
                    </p>
                    <ul className="text-xs text-muted-foreground mt-2 space-y-1 list-disc list-inside">
                      <li>🇳🇬 Nigerian names (Ade, Chidi, Emeka...)</li>
                      <li>💰 Crypto culture (Satoshi, Hodl, Moon...)</li>
                      <li>🎮 Gaming terms (Fast, Thunder, Ninja...)</li>
                    </ul>
                  </div>
                </div>
                <DialogFooter>
                  <button
                    onClick={() => setShowBulkDialog(false)}
                    className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={bulkGenerateUsers}
                    disabled={bulkGenerating}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {bulkGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Generate {bulkCount} Users
                      </>
                    )}
                  </button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Add Single User Button */}
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <button className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
                  <Plus className="w-4 h-4" />
                  Add User
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
        </div>

        {/* Bulk Actions Bar */}
        {mockUsers.length > 0 && (
          <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={toggleSelectAll}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {selectedIds.size === mockUsers.length ? (
                  <CheckSquare className="w-4 h-4 text-primary" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
                {selectedIds.size === mockUsers.length ? 'Deselect All' : 'Select All'}
              </button>
              {selectedIds.size > 0 && (
                <span className="text-sm text-primary font-medium">
                  {selectedIds.size} selected
                </span>
              )}
            </div>
            
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={bulkActivate}
                  disabled={bulkActionLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/20 text-green-400 rounded-lg text-sm font-medium hover:bg-green-500/30 transition-colors disabled:opacity-50"
                >
                  <Eye className="w-4 h-4" />
                  Activate
                </button>
                <button
                  onClick={bulkDeactivate}
                  disabled={bulkActionLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/20 text-yellow-400 rounded-lg text-sm font-medium hover:bg-yellow-500/30 transition-colors disabled:opacity-50"
                >
                  <EyeOff className="w-4 h-4" />
                  Deactivate
                </button>
                <button
                  onClick={bulkDelete}
                  disabled={bulkActionLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-sm font-medium hover:bg-red-500/30 transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            )}
          </div>
        )}

        <div className="divide-y divide-border max-h-[500px] overflow-y-auto">
          {mockUsers.map((user) => (
            <div 
              key={user.id} 
              className={`p-4 flex items-center justify-between transition-colors ${
                selectedIds.has(user.id) ? 'bg-primary/5' : ''
              }`}
            >
              <div className="flex items-center gap-4">
                <button
                  onClick={() => toggleSelect(user.id)}
                  className="shrink-0"
                >
                  {selectedIds.has(user.id) ? (
                    <CheckSquare className="w-5 h-5 text-primary" />
                  ) : (
                    <Square className="w-5 h-5 text-muted-foreground" />
                  )}
                </button>
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
              <Bot className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No mock users created yet</p>
              <p className="text-sm mt-1">Use "Generate Bulk" to quickly create mock users</p>
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
