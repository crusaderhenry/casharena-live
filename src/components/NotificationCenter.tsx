import { useState, useEffect, useCallback } from 'react';
import { Bell, X, Trophy, Zap, Clock, Flag } from 'lucide-react';
import { useSounds } from '@/hooks/useSounds';
import { useHaptics } from '@/hooks/useHaptics';
import { useRealtimeActivity } from '@/hooks/useRealtimeActivity';

export interface Notification {
  id: string;
  type: 'win' | 'game_start' | 'game_end' | 'reminder';
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
    case 'reminder':
      return <Clock className="w-5 h-5 text-muted-foreground" />;
    default:
      return <Bell className="w-5 h-5 text-muted-foreground" />;
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

export const NotificationCenter = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const { activities } = useRealtimeActivity(10);
  const { play } = useSounds();
  const { buttonClick } = useHaptics();

  // Transform activities to notifications
  const notifications: Notification[] = activities.map(activity => {
    let title = '';
    let message = '';
    let type: Notification['type'] = 'reminder';

    if (activity.type === 'finger_win') {
      type = 'win';
      title = `🏆 ${activity.playerName} Won!`;
      message = `${getPositionText(activity.position || 1)} place - ₦${(activity.amount || 0).toLocaleString()}`;
    } else if (activity.type === 'game_start') {
      type = 'game_start';
      title = `⚡ ${activity.gameName || 'Royal Rumble'} is LIVE!`;
      message = `Pool: ₦${(activity.amount || 0).toLocaleString()} - Join now!`;
    } else if (activity.type === 'game_end') {
      type = 'game_end';
      title = `🏁 ${activity.gameName || 'Royal Rumble'} Ended`;
      message = 'Check the results!';
    }

    return {
      id: activity.id,
      type,
      title,
      message,
      timestamp: activity.timestamp,
      read: readIds.has(activity.id),
    };
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = useCallback(() => {
    setReadIds(new Set(notifications.map(n => n.id)));
    play('click');
    buttonClick();
  }, [notifications, play, buttonClick]);

  const markAsRead = useCallback((id: string) => {
    setReadIds(prev => new Set([...prev, id]));
  }, []);

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
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-12 w-80 max-h-96 bg-card border border-border rounded-2xl shadow-xl z-50 overflow-hidden animate-scale-in">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-bold text-foreground">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-primary font-medium hover:underline"
                >
                  Mark all read
                </button>
              )}
            </div>

            <div className="overflow-y-auto max-h-72">
              {notifications.length === 0 ? (
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
