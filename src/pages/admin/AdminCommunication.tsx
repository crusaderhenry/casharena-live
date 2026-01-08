import { useState, useEffect } from 'react';
import { Mail, Send, Users, Clock, CheckCircle, AlertCircle, Plus, Trash2, Eye, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

interface Campaign {
  id: string;
  name: string;
  subject: string;
  body: string;
  target_audience: string;
  status: string;
  scheduled_at: string | null;
  sent_at: string | null;
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  created_at: string;
}

const AUDIENCE_OPTIONS = [
  { value: 'all', label: 'All Users', description: 'Send to all registered users' },
  { value: 'active', label: 'Active Users', description: 'Users active in the last 7 days' },
  { value: 'inactive', label: 'Inactive Users', description: 'Users inactive for 30+ days' },
  { value: 'kyc_verified', label: 'KYC Verified', description: 'Users with verified identity' },
  { value: 'high_value', label: 'High Value', description: 'Users with 5+ games played' },
  { value: 'new_users', label: 'New Users', description: 'Users joined in last 7 days' },
];

export const AdminCommunication = () => {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [sending, setSending] = useState(false);
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    body: '',
    target_audience: 'all',
  });

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('email_campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCampaigns(data || []);
    } catch (err) {
      console.error('Error fetching campaigns:', err);
      toast.error('Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  // Fetch recipient count when audience changes
  useEffect(() => {
    const fetchRecipientCount = async () => {
      try {
        let query = supabase.from('profiles').select('id', { count: 'exact', head: true });
        
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

        switch (formData.target_audience) {
          case 'active':
            query = query.gte('last_active_at', sevenDaysAgo);
            break;
          case 'inactive':
            query = query.lt('last_active_at', thirtyDaysAgo);
            break;
          case 'kyc_verified':
            query = query.eq('kyc_verified', true);
            break;
          case 'high_value':
            query = query.gte('games_played', 5);
            break;
          case 'new_users':
            query = query.gte('created_at', sevenDaysAgo);
            break;
        }

        const { count } = await query;
        setRecipientCount(count);
      } catch (err) {
        console.error('Error fetching recipient count:', err);
      }
    };

    if (showCreateDialog) {
      fetchRecipientCount();
    }
  }, [formData.target_audience, showCreateDialog]);

  const handleCreate = async () => {
    if (!formData.name || !formData.subject || !formData.body) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      const { error } = await supabase.from('email_campaigns').insert({
        name: formData.name,
        subject: formData.subject,
        body: formData.body,
        target_audience: formData.target_audience,
        created_by: user?.id,
        total_recipients: recipientCount || 0,
      });

      if (error) throw error;

      toast.success('Campaign created');
      setShowCreateDialog(false);
      setFormData({ name: '', subject: '', body: '', target_audience: 'all' });
      fetchCampaigns();
    } catch (err) {
      console.error('Error creating campaign:', err);
      toast.error('Failed to create campaign');
    }
  };

  const handleSendCampaign = async (campaign: Campaign) => {
    if (!confirm(`Send this email to ${campaign.total_recipients} recipients?`)) return;

    setSending(true);
    try {
      const { error } = await supabase.functions.invoke('send-campaign', {
        body: { campaignId: campaign.id }
      });

      if (error) throw error;

      toast.success('Campaign is being sent');
      fetchCampaigns();
    } catch (err) {
      console.error('Error sending campaign:', err);
      toast.error('Failed to send campaign');
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this campaign?')) return;

    try {
      const { error } = await supabase.from('email_campaigns').delete().eq('id', id);
      if (error) throw error;
      toast.success('Campaign deleted');
      fetchCampaigns();
    } catch (err) {
      console.error('Error deleting campaign:', err);
      toast.error('Failed to delete campaign');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-[10px] rounded-full uppercase">Sent</span>;
      case 'sending':
        return <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-[10px] rounded-full uppercase">Sending</span>;
      case 'scheduled':
        return <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-[10px] rounded-full uppercase">Scheduled</span>;
      default:
        return <span className="px-2 py-0.5 bg-muted text-muted-foreground text-[10px] rounded-full uppercase">Draft</span>;
    }
  };

  const getAudienceLabel = (value: string) => {
    return AUDIENCE_OPTIONS.find(o => o.value === value)?.label || value;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-foreground">Email Communication</h1>
          <p className="text-sm text-muted-foreground">Send emails to users in different categories</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchCampaigns}
            className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg hover:bg-muted/80"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowCreateDialog(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium"
          >
            <Plus className="w-4 h-4" />
            New Campaign
          </button>
        </div>
      </div>

      {/* Campaigns List */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left p-4 text-[10px] text-muted-foreground uppercase tracking-wider">Campaign</th>
                <th className="text-left p-4 text-[10px] text-muted-foreground uppercase tracking-wider">Audience</th>
                <th className="text-left p-4 text-[10px] text-muted-foreground uppercase tracking-wider">Recipients</th>
                <th className="text-left p-4 text-[10px] text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="text-left p-4 text-[10px] text-muted-foreground uppercase tracking-wider">Created</th>
                <th className="text-left p-4 text-[10px] text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="p-4"><Skeleton className="h-4 w-32" /></td>
                    <td className="p-4"><Skeleton className="h-4 w-20" /></td>
                    <td className="p-4"><Skeleton className="h-4 w-12" /></td>
                    <td className="p-4"><Skeleton className="h-4 w-16" /></td>
                    <td className="p-4"><Skeleton className="h-4 w-24" /></td>
                    <td className="p-4"><Skeleton className="h-8 w-24" /></td>
                  </tr>
                ))
              ) : campaigns.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    <Mail className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    No campaigns yet
                  </td>
                </tr>
              ) : (
                campaigns.map((campaign) => (
                  <tr key={campaign.id} className="border-b border-border/50 hover:bg-muted/20">
                    <td className="p-4">
                      <div>
                        <p className="font-medium text-foreground">{campaign.name}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">{campaign.subject}</p>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-sm text-foreground">{getAudienceLabel(campaign.target_audience)}</span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3 text-muted-foreground" />
                        <span className="text-sm">{campaign.total_recipients}</span>
                        {campaign.status === 'sent' && (
                          <span className="text-xs text-green-400 ml-1">
                            ({campaign.sent_count} sent)
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      {getStatusBadge(campaign.status)}
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {new Date(campaign.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedCampaign(campaign);
                            setShowPreviewDialog(true);
                          }}
                          className="p-2 hover:bg-muted rounded-lg"
                          title="Preview"
                        >
                          <Eye className="w-4 h-4 text-muted-foreground" />
                        </button>
                        {campaign.status === 'draft' && (
                          <>
                            <button
                              onClick={() => handleSendCampaign(campaign)}
                              disabled={sending}
                              className="p-2 hover:bg-primary/20 rounded-lg"
                              title="Send"
                            >
                              <Send className="w-4 h-4 text-primary" />
                            </button>
                            <button
                              onClick={() => handleDelete(campaign.id)}
                              className="p-2 hover:bg-red-500/20 rounded-lg"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4 text-red-400" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Campaign Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Email Campaign</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Campaign Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. Welcome Back Promotion"
              />
            </div>
            <div>
              <Label>Target Audience</Label>
              <Select
                value={formData.target_audience}
                onValueChange={(v) => setFormData(prev => ({ ...prev, target_audience: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AUDIENCE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div>
                        <p>{opt.label}</p>
                        <p className="text-xs text-muted-foreground">{opt.description}</p>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {recipientCount !== null && (
                <p className="text-xs text-muted-foreground mt-1">
                  <Users className="w-3 h-3 inline mr-1" />
                  {recipientCount} recipients
                </p>
              )}
            </div>
            <div>
              <Label>Email Subject</Label>
              <Input
                value={formData.subject}
                onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                placeholder="e.g. We miss you! Come back and play"
              />
            </div>
            <div>
              <Label>Email Body (HTML supported)</Label>
              <Textarea
                value={formData.body}
                onChange={(e) => setFormData(prev => ({ ...prev, body: e.target.value }))}
                placeholder="Write your email content here..."
                rows={6}
              />
            </div>
          </div>
          <DialogFooter>
            <button
              onClick={() => setShowCreateDialog(false)}
              className="px-4 py-2 bg-muted rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium"
            >
              Create Campaign
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Campaign Preview</DialogTitle>
          </DialogHeader>
          {selectedCampaign && (
            <div className="space-y-4 py-4">
              <div className="p-4 bg-muted/30 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Subject</p>
                <p className="font-medium text-foreground">{selectedCampaign.subject}</p>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg">
                <p className="text-xs text-muted-foreground mb-2">Body</p>
                <div 
                  className="prose prose-sm dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: selectedCampaign.body }}
                />
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span><Users className="w-4 h-4 inline mr-1" /> {selectedCampaign.total_recipients} recipients</span>
                <span>Audience: {getAudienceLabel(selectedCampaign.target_audience)}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
