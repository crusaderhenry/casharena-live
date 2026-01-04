import { useState, useEffect, useCallback } from 'react';
import { Bell, X, Flame, Trophy, Zap, Sparkles, Clock, Gift } from 'lucide-react';
import { useSounds } from '@/hooks/useSounds';
import { useHaptics } from '@/hooks/useHaptics';

export interface Notification {
  id: string;
  type: 'streak' | 'win' | 'game' | 'reminder' | 'gift';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    type: 'streak',
    title: '🔥 Streak Warning!',
    message: 'Complete your daily task in 2 hours or lose your streak!',
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
    read: false,
  },
  {
    id: '2',
    type: 'win',
    title: '🎉 Congratulations!',
    message: 'You won ₦2,500 in yesterday\'s Arena!',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
    read: false,
  },
  {
    id: '3',
    type: 'game',
    title: '⚡ Fastest Finger Starting!',
    message: 'A new game starts in 5 minutes. Join now!',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3),
    read: true,
  },
  {
    id: '4',
    type: 'reminder',
    title: '🏆 Daily Arena Open',
    message: 'Today\'s challenge is live! 847 players competing.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5),
    read: true,
  },
  {
    id: '5',
    type: 'gift',
    title: '🎁 Welcome Bonus!',
    message: 'Claim your ₦500 welcome bonus now!',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
    read: true,
  },
];

const getIcon = (type: Notification['type']) => {
  switch (type) {
    case 'streak':
      return <Flame className="w-5 h-5 text-secondary" />;
    case 'win':
      return <Trophy className="w-5 h-5 text-primary" />;
    case 'game':
      return <Zap className="w-5 h-5 text-secondary" />;
    case 'reminder':
      return <Clock className="w-5 h-5 text-muted-foreground" />;
    case 'gift':
      return <Gift className="w-5 h-5 text-primary" />;
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

export const NotificationCenter = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);
  const { play } = useSounds();
  const { buttonClick } = useHaptics();

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    play('click');
    buttonClick();
  }, [play, buttonClick]);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const toggleOpen = () => {
    setIsOpen(!isOpen);
    play('click');
    buttonClick();
  };

  // Simulate push notification
  useEffect(() => {
    const interval = setInterval(() => {
      const random = Math.random();
      if (random > 0.7 && notifications.filter(n => !n.read).length < 5) {
        const newNotification: Notification = {
          id: `notif_${Date.now()}`,
          type: ['streak', 'win', 'game', 'reminder'][Math.floor(Math.random() * 4)] as Notification['type'],
          title: ['🔥 Don\'t lose your streak!', '🎉 Someone just won big!', '⚡ New game starting!', '🏆 Your rank updated!'][Math.floor(Math.random() * 4)],
          message: 'Tap to view details',
          timestamp: new Date(),
          read: false,
        };
        setNotifications(prev => [newNotification, ...prev.slice(0, 9)]);
        play('notification');
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [notifications, play]);

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
