import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription 
} from '@/components/ui/dialog';
import { 
  RefreshCw, 
  Search, 
  Shield, 
  ShieldCheck, 
  ShieldAlert, 
  User, 
  Plus, 
  Trash2,
  Crown
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

type AppRole = 'admin' | 'moderator' | 'user';

interface UserWithRoles {
  id: string;
  username: string;
  email: string;
  avatar: string;
  roles: AppRole[];
}

const roleConfig: Record<AppRole, { icon: React.ElementType; color: string; label: string }> = {
  admin: { icon: Crown, color: 'bg-red-500/20 text-red-400 border-red-500/30', label: 'Admin' },
  moderator: { icon: ShieldCheck, color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', label: 'Moderator' },
  user: { icon: User, color: 'bg-gray-500/20 text-gray-400 border-gray-500/30', label: 'User' },
};

export const AdminRoleManagement = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [addRoleDialog, setAddRoleDialog] = useState<{ open: boolean; user: UserWithRoles | null }>({ 
    open: false, 
    user: null 
  });
  const [selectedRole, setSelectedRole] = useState<AppRole>('moderator');
  const [saving, setSaving] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, email, avatar')
        .order('username');

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        return;
      }

      // Fetch all user roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) {
        console.error('Error fetching roles:', rolesError);
        return;
      }

      // Build role map
      const roleMap = new Map<string, AppRole[]>();
      roles?.forEach(r => {
        const existing = roleMap.get(r.user_id) || [];
        existing.push(r.role as AppRole);
        roleMap.set(r.user_id, existing);
      });

      // Combine profiles with roles
      const usersWithRoles: UserWithRoles[] = (profiles || []).map(p => ({
        id: p.id,
        username: p.username,
        email: p.email,
        avatar: p.avatar || '👤',
        roles: roleMap.get(p.id) || [],
      }));

      setUsers(usersWithRoles);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const addRole = async (userId: string, role: AppRole) => {
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('role-manager', {
        body: { action: 'add_role', targetUserId: userId, role },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(`Added ${role} role successfully`);
      setAddRoleDialog({ open: false, user: null });
      fetchUsers();
    } catch (err: any) {
      console.error('Error adding role:', err);
      toast.error(err.message || 'Failed to add role');
    } finally {
      setSaving(false);
    }
  };

  const removeRole = async (userId: string, role: AppRole) => {
    // Prevent removing your own admin role
    if (userId === currentUser?.id && role === 'admin') {
      toast.error("You cannot remove your own admin role");
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('role-manager', {
        body: { action: 'remove_role', targetUserId: userId, role },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(`Removed ${role} role successfully`);
      fetchUsers();
    } catch (err: any) {
      console.error('Error removing role:', err);
      toast.error(err.message || 'Failed to remove role');
    } finally {
      setSaving(false);
    }
  };

  // Filter users
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || user.roles.includes(roleFilter as AppRole);
    
    return matchesSearch && matchesRole;
  });

  // Stats
  const adminCount = users.filter(u => u.roles.includes('admin')).length;
  const modCount = users.filter(u => u.roles.includes('moderator')).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-primary" />
            Role Management
          </h1>
          <p className="text-muted-foreground">Assign admin and moderator roles to users</p>
        </div>
        <Button onClick={fetchUsers} variant="outline" size="sm" disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-foreground">{users.length}</div>
            <div className="text-xs text-muted-foreground">Total Users</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-400">{adminCount}</div>
            <div className="text-xs text-muted-foreground">Admins</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-400">{modCount}</div>
            <div className="text-xs text-muted-foreground">Moderators</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-gray-400">
              {users.length - adminCount - modCount + users.filter(u => u.roles.includes('admin') && u.roles.includes('moderator')).length}
            </div>
            <div className="text-xs text-muted-foreground">Regular Users</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by username or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                <SelectItem value="admin">Admins Only</SelectItem>
                <SelectItem value="moderator">Moderators Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">
            {filteredUsers.length} users found
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <User className="w-12 h-12 mb-4 opacity-50" />
                <p>No users found</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredUsers.map((user) => (
                  <div key={user.id} className="p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {/* Avatar */}
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-lg shrink-0">
                          {user.avatar}
                        </div>
                        
                        {/* User Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground truncate">
                              {user.username}
                            </span>
                            {user.id === currentUser?.id && (
                              <Badge variant="outline" className="text-xs">You</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                        </div>
                      </div>

                      {/* Roles */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {user.roles.length === 0 ? (
                          <Badge variant="outline" className={roleConfig.user.color}>
                            <User className="w-3 h-3 mr-1" />
                            User
                          </Badge>
                        ) : (
                          user.roles.map((role) => {
                            const config = roleConfig[role];
                            const Icon = config.icon;
                            return (
                              <Badge 
                                key={role} 
                                variant="outline" 
                                className={`${config.color} cursor-pointer group`}
                                onClick={() => removeRole(user.id, role)}
                                title={`Click to remove ${role} role`}
                              >
                                <Icon className="w-3 h-3 mr-1" />
                                {config.label}
                                <Trash2 className="w-3 h-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </Badge>
                            );
                          })
                        )}
                        
                        {/* Add Role Button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => setAddRoleDialog({ open: true, user })}
                          title="Add role"
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Add Role Dialog */}
      <Dialog open={addRoleDialog.open} onOpenChange={(open) => setAddRoleDialog({ open, user: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Add Role to {addRoleDialog.user?.username}
            </DialogTitle>
            <DialogDescription>
              Select a role to assign to this user. Roles grant different levels of access.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as AppRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">
                  <div className="flex items-center gap-2">
                    <Crown className="w-4 h-4 text-red-400" />
                    <span>Admin</span>
                    <span className="text-xs text-muted-foreground">- Full access to all admin features</span>
                  </div>
                </SelectItem>
                <SelectItem value="moderator">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-blue-400" />
                    <span>Moderator</span>
                    <span className="text-xs text-muted-foreground">- Can moderate users and content</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>

            {/* Role Description */}
            <div className="mt-4 p-3 bg-muted/50 rounded-lg text-sm">
              {selectedRole === 'admin' && (
                <div className="space-y-1">
                  <p className="font-medium text-red-400">Admin Role</p>
                  <ul className="text-muted-foreground text-xs space-y-1">
                    <li>• Full access to admin dashboard</li>
                    <li>• Can create, start, and end games</li>
                    <li>• Can manage user roles</li>
                    <li>• Can view audit logs</li>
                    <li>• Can reset weekly rankings</li>
                  </ul>
                </div>
              )}
              {selectedRole === 'moderator' && (
                <div className="space-y-1">
                  <p className="font-medium text-blue-400">Moderator Role</p>
                  <ul className="text-muted-foreground text-xs space-y-1">
                    <li>• Can view user profiles</li>
                    <li>• Can flag or suspend users</li>
                    <li>• Can moderate chat and comments</li>
                    <li>• Limited admin dashboard access</li>
                  </ul>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddRoleDialog({ open: false, user: null })}>
              Cancel
            </Button>
            <Button 
              onClick={() => addRoleDialog.user && addRole(addRoleDialog.user.id, selectedRole)}
              disabled={saving}
            >
              {saving ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Role
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};