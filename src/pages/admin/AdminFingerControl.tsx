import { useAdmin } from '@/contexts/AdminContext';
import { Zap, Play, Square, RotateCcw, Clock, Users, Trophy, Settings, Plus, Trash2, Edit, Calendar, Repeat } from 'lucide-react';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

const PAYOUT_PRESETS = {
  winner_takes_all: { label: 'Winner Takes All', distribution: [1] },
  top3: { label: 'Top 3 (50/30/20)', distribution: [0.5, 0.3, 0.2] },
  top5: { label: 'Top 5 (40/25/15/12/8)', distribution: [0.4, 0.25, 0.15, 0.12, 0.08] },
  top10: { label: 'Top 10', distribution: [0.25, 0.18, 0.14, 0.10, 0.08, 0.07, 0.06, 0.05, 0.04, 0.03] },
};

const RECURRENCE_OPTIONS = [
  { value: 'none', label: 'One-time (No repeat)' },
  { value: 'minutes', label: 'Every X minutes' },
  { value: 'hours', label: 'Every X hours' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

interface GameFormData {
  name: string;
  description: string;
  entryFee: number;
  maxDuration: number;
  commentTimer: number;
  payoutType: 'winner_takes_all' | 'top3' | 'top5' | 'top10';
  minParticipants: number;
  countdownToStart: number;
  // Scheduling
  goLiveType: 'immediate' | 'scheduled';
  scheduledDate: string;
  scheduledTime: string;
  // Recurrence
  recurrenceType: string;
  recurrenceInterval: number;
  // Sponsored
  isSponsored: boolean;
  sponsoredAmount: number;
  // Visibility
  visibility: 'public' | 'private';
  // Entry cutoff
  entryCutoffMinutes: number;
}

export const AdminFingerControl = () => {
  const { 
    currentGame, 
    games,
    settings, 
    createGameWithConfig, 
    openGame,
    startGame, 
    endGame, 
    deleteGame,
    resetGame,
    updateSettings,
    refreshData,
  } = useAdmin();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  
  // Get default date/time for scheduling
  const getDefaultDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 30);
    return {
      date: now.toISOString().split('T')[0],
      time: now.toTimeString().slice(0, 5),
    };
  };

  const [formData, setFormData] = useState<GameFormData>({
    name: 'Fastest Finger',
    description: '',
    entryFee: 700,
    maxDuration: 20,
    commentTimer: 60,
    payoutType: 'top3',
    minParticipants: 3,
    countdownToStart: 60,
    goLiveType: 'immediate',
    scheduledDate: getDefaultDateTime().date,
    scheduledTime: getDefaultDateTime().time,
    recurrenceType: 'none',
    recurrenceInterval: 1,
    isSponsored: false,
    sponsoredAmount: 0,
    visibility: 'public',
    entryCutoffMinutes: 10,
  });

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

  const handleCreateGame = async () => {
    // Build scheduled_at if scheduled
    let scheduledAt: string | null = null;
    if (formData.goLiveType === 'scheduled') {
      scheduledAt = new Date(`${formData.scheduledDate}T${formData.scheduledTime}`).toISOString();
    }

    await createGameWithConfig({
      name: formData.name,
      description: formData.description || null,
      entry_fee: formData.isSponsored ? 0 : formData.entryFee,
      max_duration: formData.maxDuration,
      comment_timer: formData.commentTimer,
      payout_type: formData.payoutType,
      payout_distribution: PAYOUT_PRESETS[formData.payoutType].distribution,
      min_participants: formData.minParticipants,
      countdown: formData.countdownToStart,
      go_live_type: formData.goLiveType,
      scheduled_at: scheduledAt,
      recurrence_type: formData.recurrenceType === 'none' ? null : formData.recurrenceType,
      recurrence_interval: formData.recurrenceType === 'none' ? null : formData.recurrenceInterval,
      is_sponsored: formData.isSponsored,
      sponsored_amount: formData.isSponsored ? formData.sponsoredAmount : 0,
      visibility: formData.visibility,
      entry_cutoff_minutes: formData.entryCutoffMinutes,
    } as any);
    setShowCreateDialog(false);
    
    // Reset form
    const defaults = getDefaultDateTime();
    setFormData({
      name: 'Fastest Finger',
      description: '',
      entryFee: 700,
      maxDuration: 20,
      commentTimer: 60,
      payoutType: 'top3',
      minParticipants: 3,
      countdownToStart: 60,
      goLiveType: 'immediate',
      scheduledDate: defaults.date,
      scheduledTime: defaults.time,
      recurrenceType: 'none',
      recurrenceInterval: 1,
      isSponsored: false,
      sponsoredAmount: 0,
      visibility: 'public',
      entryCutoffMinutes: 10,
    });
  };

  // Get active games by status
  const scheduledGames = games.filter(g => g.status === 'scheduled');
  const openGames = games.filter(g => g.status === 'open');
  const liveGames = games.filter(g => g.status === 'live');
  const activeGames = [...scheduledGames, ...openGames, ...liveGames];
  const recentEndedGames = games.filter(g => g.status === 'ended').slice(0, 5);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-foreground">Fastest Finger Control</h1>
          <p className="text-sm text-muted-foreground">Manage game lifecycle and settings</p>
        </div>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors">
              <Plus className="w-4 h-4" />
              Create New Game
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Game</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto">
              {/* Game Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Game Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., High Rollers, Beginner's Arena"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of this game"
                />
              </div>

              {/* Sponsored Game Toggle */}
              <div className="space-y-3 p-3 bg-gold/5 border border-gold/20 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-gold">🎁 Sponsored Game</Label>
                    <p className="text-xs text-muted-foreground">Free entry with admin-funded prize</p>
                  </div>
                  <Switch
                    checked={formData.isSponsored}
                    onCheckedChange={(checked) => setFormData(prev => ({ 
                      ...prev, 
                      isSponsored: checked,
                      entryFee: checked ? 0 : 700,
                    }))}
                  />
                </div>
                
                {formData.isSponsored && (
                  <div className="space-y-2">
                    <Label htmlFor="sponsoredAmount">Sponsored Prize (₦)</Label>
                    <Input
                      id="sponsoredAmount"
                      type="number"
                      value={formData.sponsoredAmount}
                      onChange={(e) => setFormData(prev => ({ ...prev, sponsoredAmount: parseInt(e.target.value) || 0 }))}
                      placeholder="e.g., 50000"
                    />
                    <p className="text-xs text-gold">This amount will be added to the prize pool</p>
                  </div>
                )}
              </div>
              
              {/* Entry Fee - Only show if not sponsored */}
              {!formData.isSponsored && (
                <div className="space-y-2">
                  <Label htmlFor="entryFee">Entry Fee (₦)</Label>
                  <Input
                    id="entryFee"
                    type="number"
                    value={formData.entryFee}
                    onChange={(e) => setFormData(prev => ({ ...prev, entryFee: parseInt(e.target.value) || 0 }))}
                  />
                </div>
              )}
              
              {/* Payout Type */}
              <div className="space-y-2">
                <Label>Payout Structure</Label>
                <Select
                  value={formData.payoutType}
                  onValueChange={(value: GameFormData['payoutType']) => setFormData(prev => ({ ...prev, payoutType: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="winner_takes_all">Winner Takes All (100%)</SelectItem>
                    <SelectItem value="top3">Top 3 (50/30/20)</SelectItem>
                    <SelectItem value="top5">Top 5 (40/25/15/12/8)</SelectItem>
                    <SelectItem value="top10">Top 10 (Distributed)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Max Duration */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="maxDuration">Max Duration (min)</Label>
                  <Input
                    id="maxDuration"
                    type="number"
                    value={formData.maxDuration}
                    onChange={(e) => setFormData(prev => ({ ...prev, maxDuration: parseInt(e.target.value) || 20 }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="commentTimer">Comment Timer (sec)</Label>
                  <Input
                    id="commentTimer"
                    type="number"
                    value={formData.commentTimer}
                    onChange={(e) => setFormData(prev => ({ ...prev, commentTimer: parseInt(e.target.value) || 60 }))}
                  />
                </div>
              </div>
              
              {/* Min Participants & Countdown */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="minParticipants">Min Participants</Label>
                  <Input
                    id="minParticipants"
                    type="number"
                    value={formData.minParticipants}
                    onChange={(e) => setFormData(prev => ({ ...prev, minParticipants: parseInt(e.target.value) || 3 }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="countdownToStart">Lobby Timer (sec)</Label>
                  <Input
                    id="countdownToStart"
                    type="number"
                    value={formData.countdownToStart}
                    onChange={(e) => setFormData(prev => ({ ...prev, countdownToStart: parseInt(e.target.value) || 60 }))}
                  />
                </div>
              </div>

              {/* Go Live Type */}
              <div className="space-y-3 pt-4 border-t border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Go Live</Label>
                    <p className="text-xs text-muted-foreground">When should this game start?</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm ${formData.goLiveType === 'immediate' ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                      Immediately
                    </span>
                    <Switch
                      checked={formData.goLiveType === 'scheduled'}
                      onCheckedChange={(checked) => setFormData(prev => ({ 
                        ...prev, 
                        goLiveType: checked ? 'scheduled' : 'immediate' 
                      }))}
                    />
                    <span className={`text-sm ${formData.goLiveType === 'scheduled' ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                      Scheduled
                    </span>
                  </div>
                </div>

                {formData.goLiveType === 'scheduled' && (
                  <div className="grid grid-cols-2 gap-3 p-3 bg-muted/30 rounded-lg">
                    <div className="space-y-2">
                      <Label htmlFor="scheduledDate">Date</Label>
                      <Input
                        id="scheduledDate"
                        type="date"
                        value={formData.scheduledDate}
                        onChange={(e) => setFormData(prev => ({ ...prev, scheduledDate: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="scheduledTime">Time</Label>
                      <Input
                        id="scheduledTime"
                        type="time"
                        value={formData.scheduledTime}
                        onChange={(e) => setFormData(prev => ({ ...prev, scheduledTime: e.target.value }))}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Recurrence */}
              <div className="space-y-3 pt-4 border-t border-border">
                <div className="flex items-center gap-2">
                  <Repeat className="w-4 h-4 text-muted-foreground" />
                  <Label>Recurrence</Label>
                </div>
                
                <Select
                  value={formData.recurrenceType}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, recurrenceType: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select recurrence" />
                  </SelectTrigger>
                  <SelectContent>
                    {RECURRENCE_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {['minutes', 'hours'].includes(formData.recurrenceType) && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Every</span>
                    <Input
                      type="number"
                      value={formData.recurrenceInterval}
                      onChange={(e) => setFormData(prev => ({ ...prev, recurrenceInterval: parseInt(e.target.value) || 1 }))}
                      className="w-20"
                      min={1}
                    />
                    <span className="text-sm text-muted-foreground">{formData.recurrenceType}</span>
                  </div>
                )}

                {formData.recurrenceType !== 'none' && (
                  <p className="text-xs text-muted-foreground bg-primary/10 p-2 rounded">
                    ℹ️ Recurring games will automatically create new instances when the previous one ends
                  </p>
                )}
              </div>

              {/* Entry Cutoff */}
              <div className="space-y-2 pt-4 border-t border-border">
                <Label htmlFor="entryCutoff">Entry Cutoff (minutes before end)</Label>
                <Input
                  id="entryCutoff"
                  type="number"
                  value={formData.entryCutoffMinutes}
                  onChange={(e) => setFormData(prev => ({ ...prev, entryCutoffMinutes: parseInt(e.target.value) || 10 }))}
                  min={0}
                  max={30}
                />
                <p className="text-xs text-muted-foreground">Players cannot join within this time before game ends</p>
              </div>

              {/* Visibility */}
              <div className="space-y-2">
                <Label>Visibility</Label>
                <Select
                  value={formData.visibility}
                  onValueChange={(value: 'public' | 'private') => setFormData(prev => ({ ...prev, visibility: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">🌍 Public (visible to all)</SelectItem>
                    <SelectItem value="private">🔒 Private (invite only)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <DialogFooter>
              <button
                onClick={() => setShowCreateDialog(false)}
                className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateGame}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
              >
                Create Game
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Active Games Grid */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary" />
          Active Games ({activeGames.length})
        </h2>
        
        {activeGames.length === 0 ? (
          <div className="bg-card rounded-xl border border-border p-8 text-center">
            <Zap className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-30" />
            <p className="text-muted-foreground">No active games. Create a new game to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {activeGames.map(game => (
              <div key={game.id} className="bg-card rounded-xl border border-border p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-foreground">{game.name || 'Fastest Finger'}</h3>
                    <p className="text-xs text-muted-foreground">ID: {game.id.slice(0, 8)}...</p>
                  </div>
                  <div className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                    game.status === 'live' 
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                      : game.status === 'open'
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                  }`}>
                    {game.status === 'scheduled' ? 'Coming Soon' : game.status === 'open' ? 'Accepting Entries' : game.status}
                  </div>
                </div>
                
                <div className="grid grid-cols-4 gap-3 mb-4">
                  <div className="p-3 bg-muted/30 rounded-lg text-center">
                    <p className="text-[10px] text-muted-foreground uppercase">Entry</p>
                    <p className="font-bold text-primary">₦{game.entryFee}</p>
                  </div>
                  <div className="p-3 bg-muted/30 rounded-lg text-center">
                    <p className="text-[10px] text-muted-foreground uppercase">Pool</p>
                    <p className="font-bold text-foreground">₦{game.poolValue.toLocaleString()}</p>
                  </div>
                  <div className="p-3 bg-muted/30 rounded-lg text-center">
                    <p className="text-[10px] text-muted-foreground uppercase">Players</p>
                    <p className="font-bold text-foreground">{game.participants}</p>
                  </div>
                  <div className="p-3 bg-muted/30 rounded-lg text-center">
                    <p className="text-[10px] text-muted-foreground uppercase">Timer</p>
                    <p className="font-bold text-foreground">{game.countdown}s</p>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  {/* Scheduled: Can Open Entries or Delete */}
                  {game.status === 'scheduled' && (
                    <>
                      <button
                        onClick={() => openGame(game.id)}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-500/20 text-blue-400 rounded-lg font-medium hover:bg-blue-500/30 transition-colors"
                      >
                        <Users className="w-4 h-4" />
                        Open Entries
                      </button>
                      <button
                        onClick={() => deleteGame(game.id)}
                        className="flex items-center justify-center gap-2 px-3 py-2 bg-red-500/20 text-red-400 rounded-lg font-medium hover:bg-red-500/30 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  {/* Open: Can Start Game */}
                  {game.status === 'open' && (
                    <button
                      onClick={() => startGame(game.id)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-500/20 text-green-400 rounded-lg font-medium hover:bg-green-500/30 transition-colors"
                    >
                      <Play className="w-4 h-4" />
                      Go Live
                    </button>
                  )}
                  {/* Live: Can End Game */}
                  {game.status === 'live' && (
                    <button
                      onClick={() => endGame(game.id)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-500/20 text-red-400 rounded-lg font-medium hover:bg-red-500/30 transition-colors"
                    >
                      <Square className="w-4 h-4" />
                      End Game
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Ended Games */}
      {recentEndedGames.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Trophy className="w-5 h-5 text-gold" />
            Recent Games
          </h2>
          
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted/30">
                <tr>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Game</th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Entry</th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Pool</th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Players</th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentEndedGames.map(game => (
                  <tr key={game.id} className="border-t border-border">
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{game.name || 'Fastest Finger'}</p>
                      <p className="text-xs text-muted-foreground">{game.id.slice(0, 12)}...</p>
                    </td>
                    <td className="px-4 py-3 text-foreground">₦{game.entryFee}</td>
                    <td className="px-4 py-3 text-primary font-bold">₦{game.poolValue.toLocaleString()}</td>
                    <td className="px-4 py-3 text-foreground">{game.participants}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 text-xs rounded-full bg-muted text-muted-foreground">
                        Ended
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Game Settings */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center gap-2 mb-6">
          <Settings className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">Default Game Settings</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Entry Fee */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Default Entry Fee (₦)</label>
            <input
              type="number"
              value={localSettings.entryFee}
              onChange={(e) => handleSettingChange('entryFee', parseInt(e.target.value) || 0)}
              className="w-full px-4 py-3 bg-muted rounded-xl border border-border focus:border-primary focus:outline-none text-foreground"
            />
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
          </div>

          {/* Countdown Timer */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Comment Timer (seconds)</label>
            <input
              type="number"
              value={localSettings.countdownTimer}
              onChange={(e) => handleSettingChange('countdownTimer', parseInt(e.target.value) || 0)}
              className="w-full px-4 py-3 bg-muted rounded-xl border border-border focus:border-primary focus:outline-none text-foreground"
            />
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
          </div>
        </div>

        <button
          onClick={applySettings}
          className="mt-6 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
        >
          Apply Default Settings
        </button>
      </div>
    </div>
  );
};