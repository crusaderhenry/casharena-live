import { useState, useEffect, useCallback } from 'react';
import { Bell, X, Trophy, Zap, Clock, Flag, Wallet, Users, CheckCircle, XCircle, Gift, Trash2 } from 'lucide-react';
import { useSounds } from '@/hooks/useSounds';
import { useHaptics } from '@/hooks/useHaptics';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export interface Notification {
  id: string;
  type: 'win' | 'game_start' | 'game_end' | 'reminder' | 'deposit' | 'withdrawal' | 'join' | 'bonus' | 'refund';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

const getIcon = (type: Notification['type']) => {
  switch (type) {
    case 'win':
      return <Trophy className="w-5 h-5 text-gold" />;
    case 'game_start':
      return <Zap className="w-5 h-5 text-primary" />;
    case 'game_end':
      return <Flag className="w-5 h-5 text-secondary" />;
    case 'deposit':
      return <Wallet className="w-5 h-5 text-green-500" />;
    case 'withdrawal':
      return <Wallet className="w-5 h-5 text-orange-500" />;
    case 'join':
      return <Users className="w-5 h-5 text-primary" />;
    case 'bonus':
      return <Gift className="w-5 h-5 text-gold" />;
    case 'refund':
      return <CheckCircle className="w-5 h-5 text-blue-500" />;
    case 'reminder':
    default:
      return <Clock className="w-5 h-5 text-muted-foreground" />;
  }
};

const formatTimeAgo = (date: Date) => {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
};

const getPositionText = (position: number) => {
  if (position === 1) return '1st';
  if (position === 2) return '2nd';
  if (position === 3) return '3rd';
  return `${position}th`;
};

const STORAGE_KEY_READ = 'notification_read_ids';
const STORAGE_KEY_CLEARED = 'notification_cleared_ids';

const loadFromStorage = (key: string): Set<string> => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
};

const saveToStorage = (key: string, ids: Set<string>) => {
  try {
    localStorage.setItem(key, JSON.stringify([...ids]));
  } catch {}
};

export const NotificationCenter = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(() => loadFromStorage(STORAGE_KEY_READ));
  const [clearedIds, setClearedIds] = useState<Set<string>>(() => loadFromStorage(STORAGE_KEY_CLEARED));
  const { play } = useSounds();
  const { buttonClick } = useHaptics();
  const { user } = useAuth();

  // Fetch user's recent activity from wallet_transactions and game participations
  const fetchUserNotifications = useCallback(async () => {
    if (!user) return;

    const notifications: Notification[] = [];

    // Fetch wallet transactions (deposits, withdrawals, wins, refunds, bonus)
    const { data: transactions } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (transactions) {
      transactions.forEach((tx) => {
        let type: Notification['type'] = 'reminder';
        let title = '';
        let message = '';

        if (tx.type === 'deposit' && tx.status === 'completed') {
          type = 'deposit';
          title = '💰 Deposit Successful';
          message = `₦${Math.abs(tx.amount).toLocaleString()} added to wallet`;
        } else if (tx.type === 'withdrawal' && tx.status === 'completed') {
          type = 'withdrawal';
          title = '💸 Withdrawal Complete';
          message = `₦${Math.abs(tx.amount).toLocaleString()} sent to bank`;
        } else if (tx.type === 'withdrawal' && tx.status === 'processing') {
          type = 'withdrawal';
          title = '⏳ Withdrawal Processing';
          message = `₦${Math.abs(tx.amount).toLocaleString()} being processed`;
        } else if (tx.type === 'withdrawal' && tx.status === 'failed') {
          type = 'refund';
          title = '❌ Withdrawal Failed';
          message = `₦${Math.abs(tx.amount).toLocaleString()} refunded`;
        } else if (tx.type === 'win') {
          type = 'win';
          title = '🏆 You Won!';
          message = `₦${Math.abs(tx.amount).toLocaleString()} prize won`;
        } else if (tx.type === 'bonus') {
          type = 'bonus';
          title = '🎁 Bonus Received';
          message = `₦${Math.abs(tx.amount).toLocaleString()} bonus credited`;
        } else if (tx.type === 'refund') {
          type = 'refund';
          title = '🔄 Refund Received';
          message = `₦${Math.abs(tx.amount).toLocaleString()} refunded`;
        } else if (tx.type === 'entry') {
          type = 'join';
          title = '🎮 Joined Game';
          message = `Entry fee: ₦${Math.abs(tx.amount).toLocaleString()}`;
        } else {
          return; // Skip unknown types
        }

        // Skip if cleared
        if (!clearedIds.has(tx.id)) {
          notifications.push({
            id: tx.id,
            type,
            title,
            message,
            timestamp: new Date(tx.created_at),
            read: readIds.has(tx.id),
          });
        }
      });
    }

    // Fetch recent cycle winners (global activity)
    const { data: recentWinners } = await supabase
      .from('cycle_winners')
      .select('id, prize_amount, position, created_at, user_id')
      .neq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);

    if (recentWinners) {
      // Get profiles for winners
      const userIds = recentWinners.map(w => w.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p.username]) || []);

      recentWinners.forEach((winner) => {
        const id = `winner_${winner.id}`;
        if (!clearedIds.has(id)) {
          notifications.push({
            id,
            type: 'win',
            title: `🏆 ${profileMap.get(winner.user_id) || 'Player'} Won!`,
            message: `${getPositionText(winner.position)} place - ₦${winner.prize_amount.toLocaleString()}`,
            timestamp: new Date(winner.created_at),
            read: readIds.has(id),
          });
        }
      });
    }

    // Fetch game status changes (games going live)
    const { data: liveCycles } = await supabase
      .from('game_cycles')
      .select('id, status, pool_value, live_start_at, template_id')
      .eq('status', 'live')
      .order('live_start_at', { ascending: false })
      .limit(3);

    if (liveCycles) {
      // Get template names
      const templateIds = liveCycles.map(c => c.template_id);
      const { data: templates } = await supabase
        .from('game_templates')
        .select('id, name')
        .in('id', templateIds);

      const templateMap = new Map(templates?.map(t => [t.id, t.name]) || []);

      liveCycles.forEach((cycle) => {
        if (cycle.live_start_at) {
          const id = `live_${cycle.id}`;
          if (!clearedIds.has(id)) {
            notifications.push({
              id,
              type: 'game_start',
              title: `⚡ ${templateMap.get(cycle.template_id) || 'Royal Rumble'} is LIVE!`,
              message: `Pool: ₦${cycle.pool_value.toLocaleString()} - Join now!`,
              timestamp: new Date(cycle.live_start_at),
              read: readIds.has(id),
            });
          }
        }
      });
    }

    // Sort by timestamp and dedupe
    notifications.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    setNotifications(notifications);
  }, [user, readIds, clearedIds]);

  // Initial fetch and periodic refresh
  useEffect(() => {
    fetchUserNotifications();
    const interval = setInterval(fetchUserNotifications, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [fetchUserNotifications]);

  // Realtime subscription for wallet transactions
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('user-wallet-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'wallet_transactions',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchUserNotifications();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'wallet_transactions',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchUserNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchUserNotifications]);

  // Subscribe to global winners
  useEffect(() => {
    const channel = supabase
      .channel('global-winners-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'cycle_winners',
        },
        () => {
          fetchUserNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchUserNotifications]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = useCallback(() => {
    const allIds = new Set(notifications.map(n => n.id));
    setReadIds(allIds);
    saveToStorage(STORAGE_KEY_READ, allIds);
    play('click');
    buttonClick();
  }, [notifications, play, buttonClick]);

  const markAsRead = useCallback((id: string) => {
    setReadIds(prev => {
      const newSet = new Set([...prev, id]);
      saveToStorage(STORAGE_KEY_READ, newSet);
      return newSet;
    });
  }, []);

  const clearAllNotifications = useCallback(() => {
    const allIds = new Set([...clearedIds, ...notifications.map(n => n.id)]);
    setClearedIds(allIds);
    saveToStorage(STORAGE_KEY_CLEARED, allIds);
    setNotifications([]);
    play('click');
    buttonClick();
  }, [notifications, clearedIds, play, buttonClick]);

  const toggleOpen = () => {
    setIsOpen(!isOpen);
    play('click');
    buttonClick();
  };

  return (
    <div className="relative">
      <button
        onClick={toggleOpen}
        className="relative w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center transition-all hover:border-primary/50"
      >
        <Bell className="w-5 h-5 text-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center animate-bounce-in">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-12 w-80 max-h-96 bg-card border border-border rounded-2xl shadow-xl z-50 overflow-hidden animate-scale-in">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-bold text-foreground">Notifications</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-xs text-primary font-medium hover:underline"
                  >
                    Mark all read
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    onClick={clearAllNotifications}
                    className="text-xs text-destructive font-medium hover:underline flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    Clear all
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-y-auto max-h-72">
              {!user ? (
                <div className="p-4 text-center text-muted-foreground">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Sign in to see your notifications</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  No notifications yet
                </div>
              ) : (
                notifications.map(notification => (
                  <div
                    key={notification.id}
                    onClick={() => markAsRead(notification.id)}
                    className={`p-3 border-b border-border/50 flex gap-3 cursor-pointer transition-colors hover:bg-muted/30 ${
                      !notification.read ? 'bg-primary/5' : ''
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center shrink-0">
                      {getIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm font-medium ${!notification.read ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {notification.title}
                        </p>
                        {!notification.read && (
                          <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{notification.message}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">{formatTimeAgo(notification.timestamp)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
