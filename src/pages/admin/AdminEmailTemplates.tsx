import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Mail, Edit, Eye, Check, X, Send, Clock, AlertCircle, RefreshCw } from 'lucide-react';

interface EmailTemplate {
  id: string;
  template_key: string;
  name: string;
  subject: string;
  body: string;
  is_enabled: boolean;
  description: string | null;
  placeholders: string[] | unknown;
  created_at: string;
  updated_at: string;
}

interface EmailLog {
  id: string;
  template_key: string;
  recipient_email: string;
  subject: string;
  status: string;
  error_message: string | null;
  sent_at: string | null;
  created_at: string;
}

export default function AdminEmailTemplates() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [editedSubject, setEditedSubject] = useState('');
  const [editedBody, setEditedBody] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchTemplates();
    fetchLogs();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('email_templates')
      .select('*')
      .order('name');

    if (error) {
      toast.error('Failed to load templates');
      console.error(error);
    } else {
      setTemplates(data || []);
    }
    setLoading(false);
  };

  const fetchLogs = async () => {
    setLogsLoading(true);
    const { data, error } = await supabase
      .from('email_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Failed to load email logs:', error);
    } else {
      setLogs(data || []);
    }
    setLogsLoading(false);
  };

  const toggleTemplate = async (template: EmailTemplate) => {
    const { error } = await supabase
      .from('email_templates')
      .update({ is_enabled: !template.is_enabled })
      .eq('id', template.id);

    if (error) {
      toast.error('Failed to update template');
    } else {
      toast.success(`Template ${template.is_enabled ? 'disabled' : 'enabled'}`);
      fetchTemplates();
    }
  };

  const openEditDialog = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setEditedSubject(template.subject);
    setEditedBody(template.body);
    setEditDialogOpen(true);
  };

  const openPreviewDialog = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setPreviewDialogOpen(true);
  };

  const saveTemplate = async () => {
    if (!selectedTemplate) return;

    setSaving(true);
    const { error } = await supabase
      .from('email_templates')
      .update({
        subject: editedSubject,
        body: editedBody,
      })
      .eq('id', selectedTemplate.id);

    setSaving(false);

    if (error) {
      toast.error('Failed to save template');
    } else {
      toast.success('Template saved successfully');
      setEditDialogOpen(false);
      fetchTemplates();
    }
  };

  const getPreviewHtml = (template: EmailTemplate) => {
    let html = template.body;
    const sampleData: Record<string, string> = {
      username: 'JohnDoe',
      amount: '5,000',
      reference: 'WTH_ABC12345_1234567890',
      bank_name: 'Access Bank',
      account_number: '****1234',
      reason: 'Bank account validation failed',
      game_name: 'Royal Rumble #42',
      first_name: 'John',
      last_name: 'Doe',
      kyc_type: 'BVN',
      app_url: 'https://fortuneshq.com',
    };

    for (const [key, value] of Object.entries(sampleData)) {
      html = html.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    }

    return html;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><Check className="w-3 h-3 mr-1" />Sent</Badge>;
      case 'failed':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30"><X className="w-3 h-3 mr-1" />Failed</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Mail className="w-6 h-6 text-primary" />
            Email Templates
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Manage transactional email templates and view delivery logs</p>
        </div>
        <Button variant="outline" onClick={() => { fetchTemplates(); fetchLogs(); }}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="templates" className="space-y-4">
        <TabsList>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="logs">Delivery Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="templates">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Email Templates</CardTitle>
              <CardDescription>Configure and enable/disable transactional email notifications</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Key</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {templates.map((template) => (
                      <TableRow key={template.id}>
                        <TableCell className="font-medium">{template.name}</TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-2 py-1 rounded">{template.template_key}</code>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm max-w-[300px] truncate">
                          {template.description}
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={template.is_enabled}
                            onCheckedChange={() => toggleTemplate(template)}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openPreviewDialog(template)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(template)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Email Delivery Logs</CardTitle>
              <CardDescription>Recent transactional email delivery history</CardDescription>
            </CardHeader>
            <CardContent>
              {logsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : logs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Send className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No emails sent yet</p>
                </div>
              ) : (
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Template</TableHead>
                        <TableHead>Recipient</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Sent At</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>
                            <code className="text-xs bg-muted px-2 py-1 rounded">{log.template_key}</code>
                          </TableCell>
                          <TableCell className="text-sm">{log.recipient_email}</TableCell>
                          <TableCell className="text-sm max-w-[200px] truncate">{log.subject}</TableCell>
                          <TableCell>
                            {getStatusBadge(log.status)}
                            {log.error_message && (
                              <div className="text-xs text-red-400 mt-1 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                {log.error_message.substring(0, 50)}...
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {log.sent_at ? new Date(log.sent_at).toLocaleString() : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Template: {selectedTemplate?.name}</DialogTitle>
            <DialogDescription>
              Modify the email subject and body. Use placeholders like {'{{username}}'} for dynamic content.
            </DialogDescription>
          </DialogHeader>

          {selectedTemplate && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <span className="text-sm text-muted-foreground">Available placeholders:</span>
                {(Array.isArray(selectedTemplate.placeholders) ? selectedTemplate.placeholders : []).map((p) => (
                  <Badge key={String(p)} variant="outline" className="cursor-pointer" onClick={() => {
                    navigator.clipboard.writeText(`{{${p}}}`);
                    toast.success(`Copied {{${p}}} to clipboard`);
                  }}>
                    {`{{${p}}}`}
                  </Badge>
                ))}
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">Subject Line</Label>
                <Input
                  id="subject"
                  value={editedSubject}
                  onChange={(e) => setEditedSubject(e.target.value)}
                  placeholder="Email subject..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="body">Email Body (HTML)</Label>
                <Textarea
                  id="body"
                  value={editedBody}
                  onChange={(e) => setEditedBody(e.target.value)}
                  className="min-h-[300px] font-mono text-sm"
                  placeholder="HTML email body..."
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveTemplate} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Preview: {selectedTemplate?.name}</DialogTitle>
            <DialogDescription>
              Email preview with sample data
            </DialogDescription>
          </DialogHeader>

          {selectedTemplate && (
            <div className="space-y-4">
              <div className="bg-muted p-3 rounded-lg">
                <Label className="text-xs text-muted-foreground">Subject</Label>
                <p className="font-medium">{selectedTemplate.subject.replace(/\{\{(\w+)\}\}/g, (_, key) => {
                  const samples: Record<string, string> = { username: 'JohnDoe', amount: '5,000' };
                  return samples[key] || `{{${key}}}`;
                })}</p>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <iframe
                  srcDoc={getPreviewHtml(selectedTemplate)}
                  className="w-full h-[500px] bg-white"
                  title="Email Preview"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
