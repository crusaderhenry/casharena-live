import { useState, useEffect, useCallback } from 'react';
import { Users, Search, Eye, Ban, Flag, CheckCircle, RefreshCw, UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

interface AdminUser {
  id: string;
  username: string;
  email: string;
  avatar: string | null;
  balance: number;
  gamesPlayed: number;
  wins: number;
  rank: number;
  rankPoints: number;
  status: 'active' | 'suspended' | 'flagged';
  joinedAt: string;
  kycVerified: boolean;
}

export const AdminUsers = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .order('rank_points', { ascending: false });

      if (error) throw error;

      const mappedUsers: AdminUser[] = (profiles || []).map((p, index) => ({
        id: p.id,
        username: p.username,
        email: p.email,
        avatar: p.avatar,
        balance: p.wallet_balance,
        gamesPlayed: p.games_played,
        wins: p.total_wins,
        rank: index + 1,
        rankPoints: p.rank_points,
        status: ((p as any).status || 'active') as 'active' | 'suspended' | 'flagged',
        joinedAt: p.created_at,
        kycVerified: p.kyc_verified,
      }));
      setUsers(mappedUsers);
    } catch (err) {
      console.error('Error fetching users:', err);
      toast({ title: 'Error', description: 'Failed to fetch users', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const updateUserStatus = async (userId: string, status: 'active' | 'suspended' | 'flagged') => {
    setActionLoading(userId);
    try {
      const updates: any = { status };
      if (status === 'suspended') {
        updates.suspended_at = new Date().toISOString();
      } else if (status === 'active') {
        updates.suspended_at = null;
        updates.suspended_reason = null;
      }

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId);

      if (error) throw error;

      setUsers(prev => prev.map(u => u.id === userId ? { ...u, status } : u));
      toast({ 
        title: status === 'active' ? 'User Activated' : status === 'suspended' ? 'User Suspended' : 'User Flagged',
        description: `User status updated to ${status}`
      });
    } catch (err) {
      console.error('Error updating user:', err);
      toast({ title: 'Error', description: 'Failed to update user status', variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const suspendUser = (userId: string) => updateUserStatus(userId, 'suspended');
  const flagUser = (userId: string) => updateUserStatus(userId, 'flagged');
  const activateUser = (userId: string) => updateUserStatus(userId, 'active');

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  const selectedUserData = users.find(u => u.id === selectedUser);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-[10px] rounded-full uppercase">Active</span>;
      case 'suspended':
        return <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-[10px] rounded-full uppercase">Suspended</span>;
      case 'flagged':
        return <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-[10px] rounded-full uppercase">Flagged</span>;
      default:
        return null;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-foreground">Users Management</h1>
          <p className="text-sm text-muted-foreground">
            {users.length} registered users
          </p>
        </div>
        <button
          onClick={fetchUsers}
          className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by username or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-card border border-border rounded-xl focus:border-primary focus:outline-none text-foreground"
        />
      </div>

      {/* Users Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left p-4 text-[10px] text-muted-foreground uppercase tracking-wider">User</th>
                <th className="text-left p-4 text-[10px] text-muted-foreground uppercase tracking-wider">Balance</th>
                <th className="text-left p-4 text-[10px] text-muted-foreground uppercase tracking-wider">Games</th>
                <th className="text-left p-4 text-[10px] text-muted-foreground uppercase tracking-wider">Wins</th>
                <th className="text-left p-4 text-[10px] text-muted-foreground uppercase tracking-wider">Rank</th>
                <th className="text-left p-4 text-[10px] text-muted-foreground uppercase tracking-wider">KYC</th>
                <th className="text-left p-4 text-[10px] text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="text-left p-4 text-[10px] text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="p-4"><Skeleton className="h-10 w-32" /></td>
                    <td className="p-4"><Skeleton className="h-4 w-20" /></td>
                    <td className="p-4"><Skeleton className="h-4 w-12" /></td>
                    <td className="p-4"><Skeleton className="h-4 w-12" /></td>
                    <td className="p-4"><Skeleton className="h-4 w-12" /></td>
                    <td className="p-4"><Skeleton className="h-4 w-16" /></td>
                    <td className="p-4"><Skeleton className="h-4 w-16" /></td>
                    <td className="p-4"><Skeleton className="h-8 w-24" /></td>
                  </tr>
                ))
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-muted-foreground">
                    No users found
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b border-border/50 hover:bg-muted/20">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-xl">
                          {user.avatar || '🎮'}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{user.username}</p>
                          <p className="text-[10px] text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="font-medium text-foreground">₦{user.balance.toLocaleString()}</span>
                    </td>
                    <td className="p-4">
                      <span className="text-foreground">{user.gamesPlayed}</span>
                    </td>
                    <td className="p-4">
                      <span className="text-gold font-medium">{user.wins}</span>
                    </td>
                    <td className="p-4">
                      <span className="text-primary font-medium">#{user.rank}</span>
                    </td>
                    <td className="p-4">
                      {user.kycVerified ? (
                        <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-[10px] rounded-full uppercase">Verified</span>
                      ) : (
                        <span className="px-2 py-0.5 bg-muted text-muted-foreground text-[10px] rounded-full uppercase">Pending</span>
                      )}
                    </td>
                    <td className="p-4">
                      {getStatusBadge(user.status)}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => { setSelectedUser(user.id); setShowProfile(true); }}
                          className="p-2 hover:bg-muted rounded-lg transition-colors"
                          title="View Profile"
                          disabled={actionLoading === user.id}
                        >
                          <Eye className="w-4 h-4 text-muted-foreground" />
                        </button>
                        {user.status === 'active' && (
                          <>
                            <button
                              onClick={() => flagUser(user.id)}
                              className="p-2 hover:bg-yellow-500/20 rounded-lg transition-colors"
                              title="Flag User"
                              disabled={actionLoading === user.id}
                            >
                              <Flag className="w-4 h-4 text-yellow-400" />
                            </button>
                            <button
                              onClick={() => suspendUser(user.id)}
                              className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                              title="Suspend User"
                              disabled={actionLoading === user.id}
                            >
                              <Ban className="w-4 h-4 text-red-400" />
                            </button>
                          </>
                        )}
                        {(user.status === 'suspended' || user.status === 'flagged') && (
                          <button
                            onClick={() => activateUser(user.id)}
                            className="p-2 hover:bg-green-500/20 rounded-lg transition-colors"
                            title="Activate User"
                            disabled={actionLoading === user.id}
                          >
                            <CheckCircle className="w-4 h-4 text-green-400" />
                          </button>
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

      {/* User Profile Modal */}
      {showProfile && selectedUserData && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="w-full max-w-lg bg-card rounded-2xl border border-border p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-foreground">User Profile</h2>
              <button 
                onClick={() => setShowProfile(false)}
                className="p-2 hover:bg-muted rounded-lg"
              >
                ×
              </button>
            </div>

            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-3xl">
                {selectedUserData.avatar || '🎮'}
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">{selectedUserData.username}</h3>
                <p className="text-sm text-muted-foreground">{selectedUserData.email}</p>
                <div className="flex items-center gap-2 mt-1">
                  {getStatusBadge(selectedUserData.status)}
                  {selectedUserData.kycVerified && (
                    <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-[10px] rounded-full uppercase">KYC ✓</span>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-4 bg-muted/30 rounded-xl">
                <p className="text-[10px] text-muted-foreground uppercase mb-1">Wallet Balance</p>
                <p className="text-xl font-black text-foreground">₦{selectedUserData.balance.toLocaleString()}</p>
              </div>
              <div className="p-4 bg-muted/30 rounded-xl">
                <p className="text-[10px] text-muted-foreground uppercase mb-1">Rank Points</p>
                <p className="text-xl font-black text-primary">{selectedUserData.rankPoints}</p>
              </div>
              <div className="p-4 bg-muted/30 rounded-xl">
                <p className="text-[10px] text-muted-foreground uppercase mb-1">Games Played</p>
                <p className="text-xl font-black text-foreground">{selectedUserData.gamesPlayed}</p>
              </div>
              <div className="p-4 bg-muted/30 rounded-xl">
                <p className="text-[10px] text-muted-foreground uppercase mb-1">Total Wins</p>
                <p className="text-xl font-black text-gold">{selectedUserData.wins}</p>
              </div>
            </div>

            <div className="text-sm text-muted-foreground space-y-1">
              <p>Joined: {new Date(selectedUserData.joinedAt).toLocaleDateString()}</p>
              <p className="font-mono text-xs">ID: {selectedUserData.id}</p>
            </div>

            <div className="flex gap-3 mt-6">
              {selectedUserData.status === 'active' ? (
                <>
                  <button
                    onClick={() => { flagUser(selectedUserData.id); setShowProfile(false); }}
                    className="flex-1 py-3 bg-yellow-500/20 text-yellow-400 rounded-xl font-medium"
                  >
                    Flag User
                  </button>
                  <button
                    onClick={() => { suspendUser(selectedUserData.id); setShowProfile(false); }}
                    className="flex-1 py-3 bg-red-500/20 text-red-400 rounded-xl font-medium"
                  >
                    Suspend
                  </button>
                </>
              ) : (
                <button
                  onClick={() => { activateUser(selectedUserData.id); setShowProfile(false); }}
                  className="flex-1 py-3 bg-green-500/20 text-green-400 rounded-xl font-medium"
                >
                  Activate User
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
