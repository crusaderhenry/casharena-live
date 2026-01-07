import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AdminStats {
  activeGames: number;
  totalEntriesToday: number;
  totalPayoutsToday: number;
  platformRevenueToday: number;
  totalPlatformBalance: number;
  totalUserBalances: number;
  pendingPayouts: number;
  completedPayouts: number;
  dau: number;
  mau: number;
  totalUsers: number;
  newUsersToday: number;
  gamesPlayedToday: number;
  avgGameDuration: number;
}

export interface DailyStats {
  date: string;
  games: number;
  revenue: number;
  users: number;
  entries: number;
}

export const useAdminStats = () => {
  const [stats, setStats] = useState<AdminStats>({
    activeGames: 0,
    totalEntriesToday: 0,
    totalPayoutsToday: 0,
    platformRevenueToday: 0,
    totalPlatformBalance: 0,
    totalUserBalances: 0,
    pendingPayouts: 0,
    completedPayouts: 0,
    dau: 0,
    mau: 0,
    totalUsers: 0,
    newUsersToday: 0,
    gamesPlayedToday: 0,
    avgGameDuration: 0,
  });
  const [weeklyStats, setWeeklyStats] = useState<DailyStats[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayISO = todayStart.toISOString();

      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const monthISO = monthStart.toISOString();

      // Fetch all profiles for totals
      const { data: profiles, count: totalUsers } = await supabase
        .from('profiles')
        .select('wallet_balance, created_at, last_active_at', { count: 'exact' });

      const totalUserBalances = profiles?.reduce((sum, p) => sum + p.wallet_balance, 0) || 0;
      const newUsersToday = profiles?.filter(p => new Date(p.created_at) >= todayStart).length || 0;
      
      // DAU - users active today (approximate using last_active_at or just use created_at as proxy)
      const dau = profiles?.filter(p => p.last_active_at && new Date(p.last_active_at) >= todayStart).length || 0;
      
      // MAU - users active this month
      const mau = profiles?.filter(p => p.last_active_at && new Date(p.last_active_at) >= monthStart).length || totalUsers || 0;

      // Fetch active cycles
      const { data: cycles } = await supabase
        .from('game_cycles')
        .select('status, pool_value, live_start_at, actual_end_at')
        .in('status', ['live', 'waiting', 'opening']);

      const activeGames = cycles?.length || 0;
      const totalPlatformBalance = cycles?.reduce((sum, c) => sum + c.pool_value, 0) || 0;

      // Fetch today's transactions
      const { data: todayTx } = await supabase
        .from('wallet_transactions')
        .select('type, amount, status')
        .gte('created_at', todayISO);

      const totalEntriesToday = todayTx?.filter(t => t.type === 'entry').length || 0;
      const totalPayoutsToday = todayTx?.filter(t => t.type === 'win').reduce((sum, t) => sum + t.amount, 0) || 0;
      const platformRevenueToday = todayTx?.filter(t => t.type === 'platform_cut').reduce((sum, t) => sum + t.amount, 0) || 0;
      const pendingPayouts = todayTx?.filter(t => t.type === 'withdrawal' && t.status === 'pending').length || 0;
      const completedPayouts = todayTx?.filter(t => t.type === 'withdrawal' && t.status === 'completed').length || 0;

      // Fetch cycles played today
      const { data: todayCycles } = await supabase
        .from('game_cycles')
        .select('id, live_start_at, actual_end_at')
        .gte('created_at', todayISO);

      const gamesPlayedToday = todayCycles?.length || 0;

      // Calculate avg duration from settled cycles
      const endedCycles = todayCycles?.filter(c => c.live_start_at && c.actual_end_at) || [];
      const avgGameDuration = endedCycles.length > 0
        ? Math.round(endedCycles.reduce((sum, c) => {
            const duration = (new Date(c.actual_end_at!).getTime() - new Date(c.live_start_at!).getTime()) / 60000;
            return sum + duration;
          }, 0) / endedCycles.length)
        : 0;

      setStats({
        activeGames,
        totalEntriesToday,
        totalPayoutsToday,
        platformRevenueToday,
        totalPlatformBalance,
        totalUserBalances,
        pendingPayouts,
        completedPayouts,
        dau,
        mau,
        totalUsers: totalUsers || 0,
        newUsersToday,
        gamesPlayedToday,
        avgGameDuration,
      });

      // Fetch weekly stats for charts
      const weeklyData: DailyStats[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);

        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });

        // Get cycles for this day
        const { data: dayCycles } = await supabase
          .from('game_cycles')
          .select('pool_value')
          .gte('created_at', date.toISOString())
          .lt('created_at', nextDate.toISOString());

        // Get entries for this day
        const { data: dayEntries } = await supabase
          .from('wallet_transactions')
          .select('amount')
          .eq('type', 'entry')
          .gte('created_at', date.toISOString())
          .lt('created_at', nextDate.toISOString());

        // Get platform cut for this day
        const { data: dayRevenue } = await supabase
          .from('wallet_transactions')
          .select('amount')
          .eq('type', 'platform_cut')
          .gte('created_at', date.toISOString())
          .lt('created_at', nextDate.toISOString());

        weeklyData.push({
          date: dayName,
          games: dayCycles?.length || 0,
          revenue: dayRevenue?.reduce((sum, t) => sum + t.amount, 0) || 0,
          users: 0,
          entries: dayEntries?.length || 0,
        });
      }
      setWeeklyStats(weeklyData);

    } catch (error) {
      console.error('Error fetching admin stats:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();

    // Refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  return { stats, weeklyStats, loading, refresh: fetchStats };
};
