import { useState, useEffect, useCallback } from 'react';
import { 
  Award, Plus, Edit2, Trash2, Eye, EyeOff, 
  RefreshCw, Trophy, Star, Medal, Crown, Flame, Zap, Gamepad2, Target,
  Save, X, GripVertical
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LucideIcon } from 'lucide-react';

interface BadgeConfig {
  id: string;
  name: string;
  description: string;
  requirement_type: 'wins' | 'games' | 'earnings';
  requirement_value: number;
  color: string;
  bg_color: string;
  icon_name: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

const ICON_MAP: Record<string, LucideIcon> = {
  Trophy, Star, Medal, Crown, Flame, Zap, Gamepad2, Target,
};

const ICON_OPTIONS = Object.keys(ICON_MAP);

const COLOR_OPTIONS = [
  { value: 'text-green-400', label: 'Green', bgValue: 'bg-green-500/20' },
  { value: 'text-blue-400', label: 'Blue', bgValue: 'bg-blue-500/20' },
  { value: 'text-purple-400', label: 'Purple', bgValue: 'bg-purple-500/20' },
  { value: 'text-yellow-400', label: 'Yellow', bgValue: 'bg-yellow-500/20' },
  { value: 'text-orange-400', label: 'Orange', bgValue: 'bg-orange-500/20' },
  { value: 'text-red-400', label: 'Red', bgValue: 'bg-red-500/20' },
  { value: 'text-cyan-400', label: 'Cyan', bgValue: 'bg-cyan-500/20' },
  { value: 'text-pink-400', label: 'Pink', bgValue: 'bg-pink-500/20' },
  { value: 'text-indigo-400', label: 'Indigo', bgValue: 'bg-indigo-500/20' },
  { value: 'text-slate-400', label: 'Slate', bgValue: 'bg-slate-500/20' },
];

export const AdminBadges = () => {
  const [badges, setBadges] = useState<BadgeConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingBadge, setEditingBadge] = useState<BadgeConfig | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state for new/edit badge
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    description: '',
    requirement_type: 'wins' as 'wins' | 'games' | 'earnings',
    requirement_value: 1,
    color: 'text-green-400',
    bg_color: 'bg-green-500/20',
    icon_name: 'Trophy',
    sort_order: 0,
    is_active: true,
  });

  const fetchBadges = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('badges')
        .select('*')
        .order('sort_order');

      if (error) throw error;
      // Cast requirement_type to proper type
      const typedData = (data || []).map(b => ({
        ...b,
        requirement_type: b.requirement_type as 'wins' | 'games' | 'earnings',
      }));
      setBadges(typedData);
    } catch (err) {
      console.error('Failed to fetch badges:', err);
      toast.error('Failed to load badges');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBadges();
  }, [fetchBadges]);

  const handleToggleActive = async (badge: BadgeConfig) => {
    try {
      const { error } = await supabase
        .from('badges')
        .update({ is_active: !badge.is_active })
        .eq('id', badge.id);

      if (error) throw error;
      
      setBadges(prev => prev.map(b => 
        b.id === badge.id ? { ...b, is_active: !b.is_active } : b
      ));
      toast.success(`Badge ${!badge.is_active ? 'activated' : 'deactivated'}`);
    } catch (err) {
      toast.error('Failed to update badge');
    }
  };

  const handleOpenEdit = (badge: BadgeConfig) => {
    setEditingBadge(badge);
    setFormData({
      id: badge.id,
      name: badge.name,
      description: badge.description,
      requirement_type: badge.requirement_type,
      requirement_value: badge.requirement_value,
      color: badge.color,
      bg_color: badge.bg_color,
      icon_name: badge.icon_name,
      sort_order: badge.sort_order,
      is_active: badge.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleOpenCreate = () => {
    setEditingBadge(null);
    const nextOrder = badges.length > 0 ? Math.max(...badges.map(b => b.sort_order)) + 1 : 1;
    setFormData({
      id: '',
      name: '',
      description: '',
      requirement_type: 'wins',
      requirement_value: 1,
      color: 'text-green-400',
      bg_color: 'bg-green-500/20',
      icon_name: 'Trophy',
      sort_order: nextOrder,
      is_active: true,
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.description || !formData.id) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      if (editingBadge) {
        // Update
        const { error } = await supabase
          .from('badges')
          .update({
            name: formData.name,
            description: formData.description,
            requirement_type: formData.requirement_type,
            requirement_value: formData.requirement_value,
            color: formData.color,
            bg_color: formData.bg_color,
            icon_name: formData.icon_name,
            sort_order: formData.sort_order,
            is_active: formData.is_active,
          })
          .eq('id', editingBadge.id);

        if (error) throw error;
        toast.success('Badge updated');
      } else {
        // Create
        const { error } = await supabase
          .from('badges')
          .insert({
            id: formData.id,
            name: formData.name,
            description: formData.description,
            requirement_type: formData.requirement_type,
            requirement_value: formData.requirement_value,
            color: formData.color,
            bg_color: formData.bg_color,
            icon_name: formData.icon_name,
            sort_order: formData.sort_order,
            is_active: formData.is_active,
          });

        if (error) throw error;
        toast.success('Badge created');
      }

      setIsDialogOpen(false);
      fetchBadges();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save badge');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (badge: BadgeConfig) => {
    if (!confirm(`Delete badge "${badge.name}"? This cannot be undone.`)) return;

    try {
      const { error } = await supabase
        .from('badges')
        .delete()
        .eq('id', badge.id);

      if (error) throw error;
      
      setBadges(prev => prev.filter(b => b.id !== badge.id));
      toast.success('Badge deleted');
    } catch (err) {
      toast.error('Failed to delete badge');
    }
  };

  const renderIcon = (iconName: string, className?: string) => {
    const IconComponent = ICON_MAP[iconName] || Trophy;
    return <IconComponent className={className || 'w-5 h-5'} />;
  };

  // Stats
  const activeBadges = badges.filter(b => b.is_active).length;
  const winBadges = badges.filter(b => b.requirement_type === 'wins').length;
  const gameBadges = badges.filter(b => b.requirement_type === 'games').length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-foreground">Badges Management</h1>
          <p className="text-sm text-muted-foreground">Create and manage achievement badges</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchBadges}
            disabled={loading}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <RefreshCw className={`w-5 h-5 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90"
          >
            <Plus className="w-4 h-4" />
            New Badge
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Award className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{badges.length}</p>
              <p className="text-xs text-muted-foreground">Total Badges</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <Eye className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{activeBadges}</p>
              <p className="text-xs text-muted-foreground">Active</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gold/20 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-gold" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{winBadges}/{gameBadges}</p>
              <p className="text-xs text-muted-foreground">Win/Game Badges</p>
            </div>
          </div>
        </div>
      </div>

      {/* Badges List */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="font-bold text-foreground flex items-center gap-2">
            <Award className="w-5 h-5 text-primary" />
            All Badges
          </h3>
        </div>

        <div className="divide-y divide-border/50">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Loading badges...</div>
          ) : badges.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No badges created yet</div>
          ) : (
            badges.map((badge) => (
              <div 
                key={badge.id}
                className={`flex items-center gap-4 p-4 ${!badge.is_active ? 'opacity-50' : ''}`}
              >
                {/* Drag Handle */}
                <div className="text-muted-foreground cursor-grab">
                  <GripVertical className="w-4 h-4" />
                </div>

                {/* Icon + Badge Preview */}
                <div className={`w-12 h-12 rounded-xl ${badge.bg_color} flex items-center justify-center`}>
                  <span className={badge.color}>
                    {renderIcon(badge.icon_name)}
                  </span>
                </div>

                {/* Badge Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground">{badge.name}</p>
                    {!badge.is_active && (
                      <Badge variant="outline" className="text-[10px]">Hidden</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{badge.description}</p>
                </div>

                {/* Requirement */}
                <div className="text-right">
                  <p className="text-sm font-medium text-foreground">
                    {badge.requirement_value} {badge.requirement_type}
                  </p>
                  <p className="text-[10px] text-muted-foreground uppercase">Requirement</p>
                </div>

                {/* Order */}
                <div className="w-12 text-center">
                  <p className="text-sm font-medium text-muted-foreground">#{badge.sort_order}</p>
                </div>

                {/* Active Toggle */}
                <Switch
                  checked={badge.is_active}
                  onCheckedChange={() => handleToggleActive(badge)}
                />

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEdit(badge)}
                    className="p-2 hover:bg-muted rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4 text-muted-foreground" />
                  </button>
                  <button
                    onClick={() => handleDelete(badge)}
                    className="p-2 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingBadge ? 'Edit Badge' : 'Create New Badge'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Badge ID (only for create) */}
            {!editingBadge && (
              <div>
                <label className="text-sm font-medium text-foreground">Badge ID</label>
                <Input
                  value={formData.id}
                  onChange={(e) => setFormData(prev => ({ ...prev, id: e.target.value.toLowerCase().replace(/\s+/g, '_') }))}
                  placeholder="e.g., winner_50"
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">Unique identifier (lowercase, underscores)</p>
              </div>
            )}

            {/* Name */}
            <div>
              <label className="text-sm font-medium text-foreground">Name</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Champion"
                className="mt-1"
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-sm font-medium text-foreground">Description</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="e.g., Win 25 games"
                className="mt-1"
                rows={2}
              />
            </div>

            {/* Requirement Type & Value */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground">Requirement Type</label>
                <Select
                  value={formData.requirement_type}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, requirement_type: v as any }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="wins">Wins</SelectItem>
                    <SelectItem value="games">Games Played</SelectItem>
                    <SelectItem value="earnings">Total Earnings</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Value</label>
                <Input
                  type="number"
                  min={1}
                  value={formData.requirement_value}
                  onChange={(e) => setFormData(prev => ({ ...prev, requirement_value: parseInt(e.target.value) || 1 }))}
                  className="mt-1"
                />
              </div>
            </div>

            {/* Icon & Color */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground">Icon</label>
                <Select
                  value={formData.icon_name}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, icon_name: v }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ICON_OPTIONS.map(icon => (
                      <SelectItem key={icon} value={icon}>
                        <span className="flex items-center gap-2">
                          {renderIcon(icon, 'w-4 h-4')} {icon}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Color</label>
                <Select
                  value={formData.color}
                  onValueChange={(v) => {
                    const colorOpt = COLOR_OPTIONS.find(c => c.value === v);
                    setFormData(prev => ({ 
                      ...prev, 
                      color: v, 
                      bg_color: colorOpt?.bgValue || 'bg-green-500/20' 
                    }));
                  }}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COLOR_OPTIONS.map(color => (
                      <SelectItem key={color.value} value={color.value}>
                        <span className="flex items-center gap-2">
                          <span className={`w-3 h-3 rounded-full ${color.bgValue}`} />
                          {color.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Sort Order */}
            <div>
              <label className="text-sm font-medium text-foreground">Sort Order</label>
              <Input
                type="number"
                min={0}
                value={formData.sort_order}
                onChange={(e) => setFormData(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
                className="mt-1"
              />
            </div>

            {/* Preview */}
            <div className="p-4 bg-muted/30 rounded-xl">
              <p className="text-xs text-muted-foreground mb-2">Preview</p>
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl ${formData.bg_color} flex items-center justify-center`}>
                  <span className={formData.color}>
                    {renderIcon(formData.icon_name)}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-foreground">{formData.name || 'Badge Name'}</p>
                  <p className="text-sm text-muted-foreground">{formData.description || 'Badge description'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setIsDialogOpen(false)}
              className="px-4 py-2 text-muted-foreground hover:bg-muted rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {editingBadge ? 'Update' : 'Create'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminBadges;
