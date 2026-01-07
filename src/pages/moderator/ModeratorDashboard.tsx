import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, MessageSquare, Flag, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface Stats {
  totalUsers: number;
  flaggedUsers: number;
  recentComments: number;
  activeGames: number;
}

export const ModeratorDashboard = () => {
  const { profile } = useAuth();
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    flaggedUsers: 0,
    recentComments: 0,
    activeGames: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Get total users count
        const { count: usersCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });

        // Get recent comments (last 24h)
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const { count: commentsCount } = await supabase
          .from('comments')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', yesterday.toISOString());

        // Get active cycles
        const { count: gamesCount } = await supabase
          .from('game_cycles')
          .select('*', { count: 'exact', head: true })
          .in('status', ['waiting', 'opening', 'live']);

        setStats({
          totalUsers: usersCount || 0,
          flaggedUsers: 0, // This would require a flagged_users table
          recentComments: commentsCount || 0,
          activeGames: gamesCount || 0,
        });
      } catch (err) {
        console.error('Error fetching stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="p-6 space-y-6">
      {/* Welcome Header */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center text-3xl">
          🛡️
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-blue-400" />
            Welcome, Moderator
          </h1>
          <p className="text-muted-foreground">
            {profile?.username || 'Loading...'} • Moderator Panel
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="w-4 h-4" />
              Total Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {loading ? '...' : stats.totalUsers.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Registered users</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Flag className="w-4 h-4 text-yellow-400" />
              Flagged Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-400">
              {loading ? '...' : stats.flaggedUsers}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Require attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-blue-400" />
              Recent Comments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-400">
              {loading ? '...' : stats.recentComments}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Last 24 hours</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-green-400" />
              Active Games
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-400">
              {loading ? '...' : stats.activeGames}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Live or scheduled</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a 
              href="/moderator/users" 
              className="p-4 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors flex items-center gap-3"
            >
              <Users className="w-8 h-8 text-blue-400" />
              <div>
                <p className="font-medium text-foreground">Manage Users</p>
                <p className="text-sm text-muted-foreground">View and moderate users</p>
              </div>
            </a>

            <a 
              href="/moderator/flagged" 
              className="p-4 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors flex items-center gap-3"
            >
              <Flag className="w-8 h-8 text-yellow-400" />
              <div>
                <p className="font-medium text-foreground">Flagged Content</p>
                <p className="text-sm text-muted-foreground">Review flagged items</p>
              </div>
            </a>

            <a 
              href="/moderator/comments" 
              className="p-4 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors flex items-center gap-3"
            >
              <MessageSquare className="w-8 h-8 text-green-400" />
              <div>
                <p className="font-medium text-foreground">Moderate Comments</p>
                <p className="text-sm text-muted-foreground">Review user comments</p>
              </div>
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Access Notice */}
      <Card className="border-blue-500/30 bg-blue-500/5">
        <CardContent className="p-4 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-blue-400 mt-0.5" />
          <div>
            <p className="font-medium text-foreground">Moderator Access</p>
            <p className="text-sm text-muted-foreground">
              You have limited access to moderation features. For full admin access including 
              game management, analytics, and role management, contact an administrator.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};