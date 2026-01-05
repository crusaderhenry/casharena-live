import { useAdmin } from '@/contexts/AdminContext';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { Zap, Play, Square, RotateCcw, Clock, Users, Trophy, Settings, Plus, Trash2, Edit, Calendar, Repeat, Gift, Percent, FlaskConical, Timer, Flame, RefreshCw, AlertCircle, XCircle, Music, Upload } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
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
import { useGame } from '@/contexts/GameContext';
import { TestScenarioBuilder } from '@/components/admin/TestScenarioBuilder';

const PAYOUT_PRESETS = {
  winner_takes_all: { label: 'Winner Takes All', distribution: [1] },
  top3: { label: 'Top 3 (50/30/20)', distribution: [0.5, 0.3, 0.2] },
  top5: { label: 'Top 5 (40/25/15/12/8)', distribution: [0.4, 0.25, 0.15, 0.12, 0.08] },
  top10: { label: 'Top 10', distribution: [0.25, 0.18, 0.14, 0.10, 0.08, 0.07, 0.06, 0.05, 0.04, 0.03] },
};

const RECURRENCE_OPTIONS = [
  { value: 'none', label: 'One-time (No repeat)' },
  { value: 'auto_restart', label: 'Auto-restart after ending' },
  { value: 'minutes', label: 'Every X minutes' },
  { value: 'hours', label: 'Every X hours' },
  { value: 'daily', label: 'Daily at fixed time' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

const MIN_PARTICIPANTS_ACTIONS = [
  { value: 'reset', label: 'Reset countdown & wait for more players' },
  { value: 'cancel', label: 'Cancel game & refund players' },
  { value: 'start_anyway', label: 'Start anyway with fewer players' },
];

interface GameFormData {
  name: string;
  description: string;
  entryFee: number;
  maxDuration: number;
  commentTimer: number;
  payoutType: 'winner_takes_all' | 'top3' | 'top5' | 'top10';
  minParticipants: number;
  entryWaitSeconds: number;
  // Scheduling
  goLiveType: 'immediate' | 'scheduled';
  scheduledDate: string;
  scheduledTime: string;
  // Recurrence
  recurrenceType: string;
  recurrenceInterval: number;
  fixedDailyTime: string;
  // Min participants action
  minParticipantsAction: 'reset' | 'cancel' | 'start_anyway';
  // Sponsored game
  isSponsored: boolean;
  sponsoredAmount: number;
  platformCutPercentage: number;
  // Music settings
  musicType: 'generated' | 'uploaded';
  lobbyMusicUrl: string;
  arenaMusicUrl: string;
  tenseMusicUrl: string;
}

export const AdminFingerControl = () => {
  const { 
    currentGame, 
    games,
    settings, 
    createGameWithConfig, 
    startGame, 
    endGame, 
    cancelGame,
    deleteGame,
    resetGame,
    refreshData,
  } = useAdmin();

  const {
    defaultEntryFee,
    defaultMaxDuration,
    defaultCommentTimer,
    platformCut,
    updateSettings: updatePlatformSettings,
  } = usePlatformSettings();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [cancelGameId, setCancelGameId] = useState<string | null>(null);
  const [deleteGameId, setDeleteGameId] = useState<string | null>(null);
  const [cancelReasonType, setCancelReasonType] = useState('');
  const [cancelReasonCustom, setCancelReasonCustom] = useState('');

  const CANCEL_REASONS = [
    { value: 'not_enough_players', label: 'Not enough players' },
    { value: 'technical_issues', label: 'Technical issues' },
    { value: 'scheduling_conflict', label: 'Scheduling conflict' },
    { value: 'duplicate_game', label: 'Duplicate game created' },
    { value: 'testing', label: 'Test game - cleanup' },
    { value: 'other', label: 'Other (specify below)' },
  ];
  
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
    entryFee: defaultEntryFee,
    maxDuration: defaultMaxDuration,
    commentTimer: defaultCommentTimer,
    payoutType: 'top3',
    minParticipants: 3,
    entryWaitSeconds: 60,
    goLiveType: 'immediate',
    scheduledDate: getDefaultDateTime().date,
    scheduledTime: getDefaultDateTime().time,
    recurrenceType: 'none',
    recurrenceInterval: 1,
    fixedDailyTime: '20:00',
    minParticipantsAction: 'reset',
    isSponsored: false,
    sponsoredAmount: 0,
    platformCutPercentage: platformCut,
    musicType: 'generated',
    lobbyMusicUrl: '',
    arenaMusicUrl: '',
    tenseMusicUrl: '',
  });

  // Sync form data with platform settings when they load
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      entryFee: defaultEntryFee,
      maxDuration: defaultMaxDuration,
      commentTimer: defaultCommentTimer,
      platformCutPercentage: platformCut,
    }));
    setLocalSettings({
      entryFee: defaultEntryFee,
      maxGameDuration: defaultMaxDuration,
      countdownTimer: defaultCommentTimer,
      platformCut: platformCut,
    });
  }, [defaultEntryFee, defaultMaxDuration, defaultCommentTimer, platformCut]);

  const [localSettings, setLocalSettings] = useState({
    entryFee: defaultEntryFee,
    maxGameDuration: defaultMaxDuration,
    countdownTimer: defaultCommentTimer,
    platformCut: platformCut,
  });

  const handleSettingChange = (key: string, value: number) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  };

  const applySettings = async () => {
    await updatePlatformSettings({
      default_entry_fee: localSettings.entryFee,
      default_max_duration: localSettings.maxGameDuration,
      default_comment_timer: localSettings.countdownTimer,
      platform_cut_percent: localSettings.platformCut,
    });
  };

  const handleCreateGame = async () => {
    // Build scheduled_at if scheduled
    let scheduledAt: string | null = null;
    if (formData.goLiveType === 'scheduled') {
      scheduledAt = new Date(`${formData.scheduledDate}T${formData.scheduledTime}`).toISOString();
    }

    // Determine if auto_restart based on recurrence type selection
    const isAutoRestart = formData.recurrenceType === 'auto_restart';
    const actualRecurrenceType = isAutoRestart ? null : (formData.recurrenceType === 'none' ? null : formData.recurrenceType);

    await createGameWithConfig({
      name: formData.name,
      entry_fee: formData.isSponsored ? 0 : formData.entryFee,
      max_duration: formData.maxDuration,
      comment_timer: formData.commentTimer,
      payout_type: formData.payoutType,
      payout_distribution: PAYOUT_PRESETS[formData.payoutType].distribution,
      min_participants: formData.minParticipants,
      countdown: formData.entryWaitSeconds,
      go_live_type: formData.goLiveType,
      scheduled_at: scheduledAt,
      recurrence_type: actualRecurrenceType,
      recurrence_interval: formData.recurrenceType === 'none' || isAutoRestart ? null : formData.recurrenceInterval,
      is_sponsored: formData.isSponsored,
      sponsored_amount: formData.isSponsored ? formData.sponsoredAmount : null,
      platform_cut_percentage: formData.platformCutPercentage,
      description: formData.description || null,
      // New fields
      auto_restart: isAutoRestart,
      fixed_daily_time: formData.recurrenceType === 'daily' ? formData.fixedDailyTime : null,
      entry_wait_seconds: formData.entryWaitSeconds,
      min_participants_action: formData.minParticipantsAction,
      // Music settings
      music_type: formData.musicType,
      lobby_music_url: formData.musicType === 'uploaded' ? formData.lobbyMusicUrl || null : null,
      arena_music_url: formData.musicType === 'uploaded' ? formData.arenaMusicUrl || null : null,
      tense_music_url: formData.musicType === 'uploaded' ? formData.tenseMusicUrl || null : null,
    });
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
      entryWaitSeconds: 60,
      goLiveType: 'immediate',
      scheduledDate: defaults.date,
      scheduledTime: defaults.time,
      recurrenceType: 'none',
      recurrenceInterval: 1,
      fixedDailyTime: '20:00',
      minParticipantsAction: 'reset',
      isSponsored: false,
      sponsoredAmount: 0,
      platformCutPercentage: 10,
      musicType: 'generated',
      lobbyMusicUrl: '',
      arenaMusicUrl: '',
      tenseMusicUrl: '',
    });
  };

  // Get active games
  const activeGames = games.filter(g => g.status === 'live' || g.status === 'scheduled' || g.status === 'open');
  const cancelledGames = games.filter(g => g.status === 'cancelled');
  const recentEndedGames = games.filter(g => g.status === 'ended' || g.status === 'cancelled').slice(0, 5);

  // Handle cancel game
  const handleOpenCancelDialog = (gameId: string) => {
    setCancelGameId(gameId);
    setCancelReasonType('');
    setCancelReasonCustom('');
    setShowCancelDialog(true);
  };

  const getCancelReason = () => {
    if (cancelReasonType === 'other') {
      return cancelReasonCustom.trim();
    }
    return CANCEL_REASONS.find(r => r.value === cancelReasonType)?.label || '';
  };

  const handleCancelGame = async () => {
    const reason = getCancelReason();
    if (!cancelGameId || !reason) return;
    await cancelGame(cancelGameId, reason);
    setShowCancelDialog(false);
    setCancelGameId(null);
    setCancelReasonType('');
    setCancelReasonCustom('');
  };

  // Handle delete game
  const handleOpenDeleteDialog = (gameId: string) => {
    setDeleteGameId(gameId);
    setShowDeleteDialog(true);
  };

  const handleDeleteGame = async () => {
    if (!deleteGameId) return;
    await deleteGame(deleteGameId);
    setShowDeleteDialog(false);
    setDeleteGameId(null);
  };

  // Helper to format recurrence description
  const getRecurrenceDescription = () => {
    switch (formData.recurrenceType) {
      case 'auto_restart':
        return 'Game will immediately reopen for entries after each round ends';
      case 'minutes':
        return `New game every ${formData.recurrenceInterval} minute(s)`;
      case 'hours':
        return `New game every ${formData.recurrenceInterval} hour(s)`;
      case 'daily':
        return `Daily at ${formData.fixedDailyTime}`;
      case 'weekly':
        return 'Same time every week';
      case 'monthly':
        return 'Same day/time every month';
      default:
        return null;
    }
  };

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
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Game</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
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
                <Label htmlFor="description">Description (optional)</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Last comment wins the prize!"
                />
              </div>

              {/* Sponsored Game Toggle */}
              <div className="space-y-3 p-3 bg-primary/5 rounded-lg border border-primary/20">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="flex items-center gap-2">
                      <Gift className="w-4 h-4 text-primary" />
                      Sponsored Game
                    </Label>
                    <p className="text-xs text-muted-foreground">Free entry with sponsored prize pool</p>
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
                      placeholder="50000"
                    />
                  </div>
                )}
              </div>
              
              {/* Entry Fee - only show if not sponsored */}
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
              
              {/* Max Duration & Comment Timer */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="maxDuration">Game Duration (min)</Label>
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

              {/* Entry Wait Period */}
              <div className="space-y-2 p-3 bg-blue-500/5 rounded-lg border border-blue-500/20">
                <Label htmlFor="entryWaitSeconds" className="flex items-center gap-2">
                  <Timer className="w-4 h-4 text-blue-400" />
                  Entry/Lobby Period (seconds)
                </Label>
                <Input
                  id="entryWaitSeconds"
                  type="number"
                  value={formData.entryWaitSeconds}
                  onChange={(e) => setFormData(prev => ({ ...prev, entryWaitSeconds: parseInt(e.target.value) || 60 }))}
                  min={10}
                />
                <p className="text-xs text-muted-foreground">
                  How long players have to join before the game goes live
                </p>
              </div>
              
              {/* Min Participants & Action */}
              <div className="space-y-3 p-3 bg-yellow-500/5 rounded-lg border border-yellow-500/20">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="minParticipants" className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-yellow-400" />
                      Min Players
                    </Label>
                    <Input
                      id="minParticipants"
                      type="number"
                      value={formData.minParticipants}
                      onChange={(e) => setFormData(prev => ({ ...prev, minParticipants: parseInt(e.target.value) || 3 }))}
                      min={1}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>If Not Met</Label>
                    <Select
                      value={formData.minParticipantsAction}
                      onValueChange={(value: 'reset' | 'cancel' | 'start_anyway') => setFormData(prev => ({ ...prev, minParticipantsAction: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MIN_PARTICIPANTS_ACTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {formData.minParticipantsAction === 'reset' && '⏳ Countdown will reset until minimum players join'}
                  {formData.minParticipantsAction === 'cancel' && '❌ Game will be cancelled and all players refunded'}
                  {formData.minParticipantsAction === 'start_anyway' && '▶️ Game will start even with fewer players'}
                </p>
              </div>

              {/* Go Live Type */}
              <div className="space-y-3 pt-4 border-t border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Go Live</Label>
                    <p className="text-xs text-muted-foreground">When should this game start accepting entries?</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm ${formData.goLiveType === 'immediate' ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                      Now
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
                  <RefreshCw className="w-4 h-4 text-muted-foreground" />
                  <Label>Game Recurrence / Auto-Restart</Label>
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

                {formData.recurrenceType === 'daily' && (
                  <div className="space-y-2">
                    <Label htmlFor="fixedDailyTime">Daily Time</Label>
                    <Input
                      id="fixedDailyTime"
                      type="time"
                      value={formData.fixedDailyTime}
                      onChange={(e) => setFormData(prev => ({ ...prev, fixedDailyTime: e.target.value }))}
                    />
                    <p className="text-xs text-muted-foreground">
                      Game will go live at this time every day
                    </p>
                  </div>
                )}

                {getRecurrenceDescription() && (
                  <p className="text-xs text-muted-foreground bg-primary/10 p-2 rounded flex items-start gap-2">
                    <Repeat className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                    {getRecurrenceDescription()}
                  </p>
                )}
              </div>

              {/* Music Settings */}
              <div className="space-y-3 pt-4 border-t border-border">
                <Label className="flex items-center gap-2">
                  <Music className="w-4 h-4 text-muted-foreground" />
                  Background Music
                </Label>
                
                <Select
                  value={formData.musicType}
                  onValueChange={(value: 'generated' | 'uploaded') => setFormData(prev => ({ ...prev, musicType: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select music type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="generated">
                      <div className="flex items-center gap-2">
                        <span>🎵</span> Generated (Web Audio)
                      </div>
                    </SelectItem>
                    <SelectItem value="uploaded">
                      <div className="flex items-center gap-2">
                        <Upload className="w-4 h-4" /> Custom Music Files
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                
                {formData.musicType === 'uploaded' && (
                  <div className="space-y-3 p-3 bg-muted/30 rounded-lg border border-border">
                    <div>
                      <Label htmlFor="lobbyMusic" className="text-xs">Lobby Music URL</Label>
                      <Input
                        id="lobbyMusic"
                        type="url"
                        placeholder="https://..."
                        value={formData.lobbyMusicUrl}
                        onChange={(e) => setFormData(prev => ({ ...prev, lobbyMusicUrl: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="arenaMusic" className="text-xs">Arena Music URL</Label>
                      <Input
                        id="arenaMusic"
                        type="url"
                        placeholder="https://..."
                        value={formData.arenaMusicUrl}
                        onChange={(e) => setFormData(prev => ({ ...prev, arenaMusicUrl: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="tenseMusic" className="text-xs">Tense Music URL</Label>
                      <Input
                        id="tenseMusic"
                        type="url"
                        placeholder="https://..."
                        value={formData.tenseMusicUrl}
                        onChange={(e) => setFormData(prev => ({ ...prev, tenseMusicUrl: e.target.value }))}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Upload MP3 files to storage and paste URLs here, or leave empty to use generated audio.
                    </p>
                  </div>
                )}
              </div>

              {/* Platform Cut */}
              <div className="space-y-2 pt-4 border-t border-border">
                <Label htmlFor="platformCut" className="flex items-center gap-2">
                  <Percent className="w-4 h-4 text-muted-foreground" />
                  Platform Cut (%)
                </Label>
                <Input
                  id="platformCut"
                  type="number"
                  min={0}
                  max={50}
                  value={formData.platformCutPercentage}
                  onChange={(e) => setFormData(prev => ({ ...prev, platformCutPercentage: parseInt(e.target.value) || 10 }))}
                />
                <p className="text-xs text-muted-foreground">
                  Platform receives {formData.platformCutPercentage}% of the prize pool
                </p>
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

        {/* Cancel Game Dialog */}
        <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <XCircle className="w-5 h-5" />
                Cancel Game
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">
                This will cancel the game and refund all participants. Please provide a reason that will be shown to affected users.
              </p>
              
              <div className="space-y-3">
                <Label>Cancellation Reason</Label>
                <Select
                  value={cancelReasonType}
                  onValueChange={setCancelReasonType}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a reason..." />
                  </SelectTrigger>
                  <SelectContent>
                    {CANCEL_REASONS.map(r => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {cancelReasonType === 'other' && (
                  <Textarea
                    value={cancelReasonCustom}
                    onChange={(e) => setCancelReasonCustom(e.target.value)}
                    placeholder="Enter custom reason..."
                    rows={2}
                  />
                )}
              </div>

              <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <p className="text-xs text-yellow-600 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  All participants will be notified and their entry fees will be refunded.
                </p>
              </div>
            </div>
            
            <DialogFooter>
              <button
                onClick={() => setShowCancelDialog(false)}
                className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                Keep Game
              </button>
              <button
                onClick={handleCancelGame}
                disabled={!cancelReasonType || (cancelReasonType === 'other' && !cancelReasonCustom.trim())}
                className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg font-medium hover:bg-destructive/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel Game
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Game Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <Trash2 className="w-5 h-5" />
                Delete Game
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">
                Are you sure you want to permanently delete this game? This action cannot be undone.
              </p>

              <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
                <p className="text-xs text-destructive flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  This will permanently remove the game and all associated data.
                </p>
              </div>
            </div>
            
            <DialogFooter>
              <button
                onClick={() => setShowDeleteDialog(false)}
                className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteGame}
                className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg font-medium hover:bg-destructive/90 transition-colors"
              >
                Delete Permanently
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
                    {game.status}
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
                  {(game.status === 'scheduled' || game.status === 'open') && (
                    <>
                      <button
                        onClick={() => startGame(game.id)}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-500/20 text-green-400 rounded-lg font-medium hover:bg-green-500/30 transition-colors"
                      >
                        <Play className="w-4 h-4" />
                        Start Now
                      </button>
                      <button
                        onClick={() => handleOpenCancelDialog(game.id)}
                        className="flex items-center justify-center gap-2 px-3 py-2 bg-destructive/20 text-destructive rounded-lg font-medium hover:bg-destructive/30 transition-colors"
                        title="Cancel Game"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  {game.status === 'live' && (
                    <>
                      <button
                        onClick={() => endGame(game.id)}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-500/20 text-red-400 rounded-lg font-medium hover:bg-red-500/30 transition-colors"
                      >
                        <Square className="w-4 h-4" />
                        End Game
                      </button>
                      <button
                        disabled
                        className="flex items-center justify-center gap-2 px-3 py-2 bg-muted text-muted-foreground rounded-lg font-medium cursor-not-allowed opacity-50"
                        title="Cannot cancel live game"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cancelled Games (Delete) */}
      {cancelledGames.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <XCircle className="w-5 h-5 text-destructive" />
            Cancelled Games ({cancelledGames.length})
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {cancelledGames.map((game) => (
              <div key={game.id} className="bg-card rounded-xl border border-destructive/20 p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-foreground">{game.name || 'Fastest Finger'}</h3>
                    <p className="text-xs text-muted-foreground">ID: {game.id.slice(0, 8)}...</p>
                  </div>
                  <div className="px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-destructive/20 text-destructive border border-destructive/30">
                    cancelled
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

                <button
                  onClick={() => handleOpenDeleteDialog(game.id)}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-destructive text-destructive-foreground rounded-lg font-medium hover:bg-destructive/90 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Permanently
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

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
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Actions</th>
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
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        game.status === 'cancelled' 
                          ? 'bg-destructive/20 text-destructive' 
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {game.status === 'cancelled' ? 'Cancelled' : 'Ended'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleOpenDeleteDialog(game.id)}
                        className="p-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                        title="Delete game"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Test Scenario Builder */}
      <TestScenarioBuilder />

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