import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RefreshCw, Search, Filter, Calendar, User, Shield } from 'lucide-react';
import { format } from 'date-fns';

interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  details: unknown;
  ip_address: string | null;
  created_at: string;
  profile?: {
    username: string;
    avatar: string;
  };
}

const actionColors: Record<string, string> = {
  create_game: 'bg-green-500/20 text-green-400 border-green-500/30',
  start_game: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  end_game: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  reset_weekly_ranks: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  update_user: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  delete_user: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const actionLabels: Record<string, string> = {
  create_game: 'Game Created',
  start_game: 'Game Started',
  end_game: 'Game Ended',
  reset_weekly_ranks: 'Ranks Reset',
  update_user: 'User Updated',
  delete_user: 'User Deleted',
};

export const AdminAuditLogs = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (actionFilter !== 'all') {
        query = query.eq('action', actionFilter);
      }

      if (startDate) {
        query = query.gte('created_at', new Date(startDate).toISOString());
      }

      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        query = query.lte('created_at', endDateTime.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching audit logs:', error);
        return;
      }

      // Fetch profiles for user_ids
      const userIds = [...new Set((data || []).map(l => l.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, avatar')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, { username: p.username, avatar: p.avatar }]) || []);

      const logsWithProfiles = (data || []).map(log => ({
        ...log,
        profile: profileMap.get(log.user_id),
      }));

      // Apply search filter client-side
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        setLogs(logsWithProfiles.filter(log => 
          log.profile?.username.toLowerCase().includes(query) ||
          log.action.toLowerCase().includes(query) ||
          log.resource_type.toLowerCase().includes(query) ||
          log.ip_address?.includes(query)
        ));
      } else {
        setLogs(logsWithProfiles);
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter, startDate, endDate]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchLogs();
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  const uniqueActions = ['all', ...new Set(logs.map(l => l.action))];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            Audit Logs
          </h1>
          <p className="text-muted-foreground">Track all admin actions for security compliance</p>
        </div>
        <Button onClick={fetchLogs} variant="outline" size="sm" disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by user, action..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Action Filter */}
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="create_game">Game Created</SelectItem>
                <SelectItem value="start_game">Game Started</SelectItem>
                <SelectItem value="end_game">Game Ended</SelectItem>
                <SelectItem value="reset_weekly_ranks">Ranks Reset</SelectItem>
              </SelectContent>
            </Select>

            {/* Start Date */}
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="pl-9"
                placeholder="Start Date"
              />
            </div>

            {/* End Date */}
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="pl-9"
                placeholder="End Date"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardContent className="p-0">
          <ScrollArea className="h-[600px]">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
              </div>
            ) : logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Shield className="w-12 h-12 mb-4 opacity-50" />
                <p>No audit logs found</p>
                <p className="text-sm">Admin actions will appear here</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {logs.map((log) => (
                  <div key={log.id} className="p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        {/* Avatar */}
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-lg shrink-0">
                          {log.profile?.avatar || '👤'}
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-foreground">
                              {log.profile?.username || 'Unknown User'}
                            </span>
                            <Badge 
                              variant="outline" 
                              className={actionColors[log.action] || 'bg-muted text-muted-foreground'}
                            >
                              {actionLabels[log.action] || log.action}
                            </Badge>
                          </div>
                          
                          <div className="text-sm text-muted-foreground mt-1">
                            <span className="capitalize">{log.resource_type}</span>
                            {log.resource_id && (
                              <span className="text-xs ml-2 font-mono bg-muted px-1.5 py-0.5 rounded">
                                {log.resource_id.slice(0, 8)}...
                              </span>
                            )}
                          </div>

                          {/* Details */}
                          {log.details && typeof log.details === 'object' && Object.keys(log.details as object).length > 0 && (
                            <div className="mt-2 text-xs bg-muted/50 rounded-lg p-2 font-mono">
                              {Object.entries(log.details as Record<string, unknown>).map(([key, value]) => (
                                <div key={key} className="flex gap-2">
                                  <span className="text-muted-foreground">{key}:</span>
                                  <span className="text-foreground">
                                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Timestamp & IP */}
                      <div className="text-right shrink-0">
                        <div className="text-sm text-foreground">
                          {format(new Date(log.created_at), 'MMM d, yyyy')}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(log.created_at), 'h:mm:ss a')}
                        </div>
                        {log.ip_address && (
                          <div className="text-xs text-muted-foreground mt-1 font-mono">
                            {log.ip_address}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-foreground">{logs.length}</div>
            <div className="text-xs text-muted-foreground">Total Logs</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-400">
              {logs.filter(l => l.action === 'create_game').length}
            </div>
            <div className="text-xs text-muted-foreground">Games Created</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-400">
              {logs.filter(l => l.action === 'end_game').length}
            </div>
            <div className="text-xs text-muted-foreground">Games Ended</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-400">
              {new Set(logs.map(l => l.user_id)).size}
            </div>
            <div className="text-xs text-muted-foreground">Active Admins</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};