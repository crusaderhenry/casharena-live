import { useState, useEffect } from 'react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { ShieldCheck, ShieldX, Search, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';

interface UserKycData {
  id: string;
  username: string;
  email: string;
  avatar: string | null;
  kyc_verified: boolean;
  kyc_type: string | null;
  kyc_first_name: string | null;
  kyc_last_name: string | null;
  kyc_verified_at: string | null;
  created_at: string;
}

export const AdminKyc = () => {
  const [users, setUsers] = useState<UserKycData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'verified' | 'unverified'>('all');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, email, avatar, kyc_verified, kyc_type, kyc_first_name, kyc_last_name, kyc_verified_at, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = users.filter((user) => {
    const matchesSearch = 
      user.username.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase()) ||
      (user.kyc_first_name?.toLowerCase().includes(search.toLowerCase())) ||
      (user.kyc_last_name?.toLowerCase().includes(search.toLowerCase()));

    const matchesFilter = 
      filter === 'all' ||
      (filter === 'verified' && user.kyc_verified) ||
      (filter === 'unverified' && !user.kyc_verified);

    return matchesSearch && matchesFilter;
  });

  const stats = {
    total: users.length,
    verified: users.filter(u => u.kyc_verified).length,
    unverified: users.filter(u => !u.kyc_verified).length,
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-NG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar />
      
      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">KYC Verification</h1>
              <p className="text-muted-foreground">View all users' identity verification status</p>
            </div>
            <button
              onClick={fetchUsers}
              className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="card-panel">
              <p className="text-sm text-muted-foreground">Total Users</p>
              <p className="text-2xl font-bold text-foreground">{stats.total}</p>
            </div>
            <div className="card-panel border-primary/30">
              <p className="text-sm text-muted-foreground">Verified</p>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-primary" />
                <p className="text-2xl font-bold text-primary">{stats.verified}</p>
              </div>
            </div>
            <div className="card-panel border-yellow-500/30">
              <p className="text-sm text-muted-foreground">Unverified</p>
              <div className="flex items-center gap-2">
                <ShieldX className="w-5 h-5 text-yellow-500" />
                <p className="text-2xl font-bold text-yellow-500">{stats.unverified}</p>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by username, email, or KYC name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              {(['all', 'verified', 'unverified'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filter === f
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Users Table */}
          <div className="card-panel overflow-hidden">
            {loading ? (
              <div className="py-12 text-center">
                <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-3" />
                <p className="text-muted-foreground">Loading users...</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-muted-foreground">No users found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">User</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">KYC Status</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Verified Name</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Type</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Verified Date</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-lg">
                              {user.avatar || '🎮'}
                            </div>
                            <div>
                              <p className="font-medium text-foreground">{user.username}</p>
                              <p className="text-xs text-muted-foreground">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {user.kyc_verified ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/20 text-primary text-sm font-medium">
                              <ShieldCheck className="w-4 h-4" />
                              Verified
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-yellow-500/20 text-yellow-500 text-sm font-medium">
                              <ShieldX className="w-4 h-4" />
                              Unverified
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {user.kyc_first_name && user.kyc_last_name ? (
                            <span className="text-foreground">
                              {user.kyc_first_name} {user.kyc_last_name}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {user.kyc_type ? (
                            <span className="px-2 py-1 rounded bg-muted text-foreground text-xs font-medium uppercase">
                              {user.kyc_type}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">
                          {formatDate(user.kyc_verified_at)}
                        </td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">
                          {formatDate(user.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
