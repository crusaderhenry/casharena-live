import { useAdmin } from '@/contexts/AdminContext';
import { Users, Search, MoreVertical, Eye, Ban, Flag, CheckCircle } from 'lucide-react';
import { useState } from 'react';

export const AdminUsers = () => {
  const { users, suspendUser, flagUser, activateUser } = useAdmin();
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [showProfile, setShowProfile] = useState(false);

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(search.toLowerCase())
  );

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
          <p className="text-sm text-muted-foreground">{users.length} registered users</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search users..."
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
                <th className="text-left p-4 text-[10px] text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="text-left p-4 text-[10px] text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id} className="border-b border-border/50 hover:bg-muted/20">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-xl">
                        {user.avatar}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{user.username}</p>
                        <p className="text-[10px] text-muted-foreground">{user.id}</p>
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
                    {getStatusBadge(user.status)}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => { setSelectedUser(user.id); setShowProfile(true); }}
                        className="p-2 hover:bg-muted rounded-lg transition-colors"
                        title="View Profile"
                      >
                        <Eye className="w-4 h-4 text-muted-foreground" />
                      </button>
                      {user.status === 'active' && (
                        <>
                          <button
                            onClick={() => flagUser(user.id)}
                            className="p-2 hover:bg-yellow-500/20 rounded-lg transition-colors"
                            title="Flag User"
                          >
                            <Flag className="w-4 h-4 text-yellow-400" />
                          </button>
                          <button
                            onClick={() => suspendUser(user.id)}
                            className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                            title="Suspend User"
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
                        >
                          <CheckCircle className="w-4 h-4 text-green-400" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
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
                {selectedUserData.avatar}
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">{selectedUserData.username}</h3>
                <p className="text-sm text-muted-foreground">{selectedUserData.id}</p>
                {getStatusBadge(selectedUserData.status)}
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

            <div className="text-sm text-muted-foreground">
              <p>Joined: {new Date(selectedUserData.joinedAt).toLocaleDateString()}</p>
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
