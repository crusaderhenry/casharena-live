import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { useSounds } from '@/hooks/useSounds';
import { useHaptics } from '@/hooks/useHaptics';
import { Trophy, Zap, Bell, Sparkles, X } from 'lucide-react';

interface PushNotification {
  id: string;
  type: 'game_reminder' | 'win' | 'pool_reminder' | 'game_starting';
  title: string;
  message: string;
  icon?: React.ReactNode;
}

interface NotificationContextType {
  showNotification: (notification: Omit<PushNotification, 'id'>) => void;
  scheduleGameReminder: () => void;
  announceWin: (amount: number, position: number) => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};

const getIcon = (type: PushNotification['type']) => {
  switch (type) {
    case 'game_reminder':
      return <Zap className="w-5 h-5 text-primary" />;
    case 'win':
      return <Trophy className="w-5 h-5 text-gold" />;
    case 'pool_reminder':
      return <Sparkles className="w-5 h-5 text-primary" />;
    case 'game_starting':
      return <Bell className="w-5 h-5 text-primary" />;
    default:
      return <Bell className="w-5 h-5 text-primary" />;
  }
};

export const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
  const [notifications, setNotifications] = useState<PushNotification[]>([]);
  const { play } = useSounds();
  const { vibrate } = useHaptics();

  const showNotification = useCallback((notification: Omit<PushNotification, 'id'>) => {
    const id = `notif_${Date.now()}`;
    const newNotification = { ...notification, id };
    
    setNotifications(prev => [newNotification, ...prev]);
    
    if (notification.type === 'win') {
      play('win');
      vibrate('success');
    } else {
      play('notification');
      vibrate('medium');
    }

    // Auto dismiss after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  }, [play, vibrate]);

  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const scheduleGameReminder = useCallback(() => {
    // Simulate a push notification after a random delay
    const delay = 10000 + Math.random() * 20000; // 10-30 seconds
    setTimeout(() => {
      showNotification({
        type: 'game_starting',
        title: '⚡ Fastest Finger Starting!',
        message: 'A new game starts in 2 minutes. Join now!',
      });
    }, delay);
  }, [showNotification]);

  const announceWin = useCallback((amount: number, position: number) => {
    const positionText = position === 1 ? '1st' : position === 2 ? '2nd' : '3rd';
    showNotification({
      type: 'win',
      title: '🏆 Congratulations!',
      message: `You won ₦${amount.toLocaleString()} - ${positionText} Place!`,
    });
  }, [showNotification]);

  // Simulate periodic game reminders
  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.7) {
        const types = [
          {
            type: 'game_reminder' as const,
            title: '⚡ Game Starting Soon!',
            message: 'Fastest Finger starts in 5 minutes',
          },
          {
            type: 'pool_reminder' as const,
            title: '🎰 Lucky Pool Update',
            message: 'Pool is now at ₦145,000! Join before the draw',
          },
        ];
        const randomType = types[Math.floor(Math.random() * types.length)];
        showNotification(randomType);
      }
    }, 45000); // Every 45 seconds

    return () => clearInterval(interval);
  }, [showNotification]);

  return (
    <NotificationContext.Provider value={{ showNotification, scheduleGameReminder, announceWin }}>
      {children}
      
      {/* Push Notification Toast */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-full max-w-sm px-4 space-y-2">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className="bg-card border border-border rounded-xl shadow-2xl p-4 animate-slide-down flex items-start gap-3"
            style={{
              animation: 'slideDown 0.3s ease-out',
            }}
          >
            <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center shrink-0">
              {notification.icon || getIcon(notification.type)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-foreground text-sm">{notification.title}</p>
              <p className="text-xs text-muted-foreground">{notification.message}</p>
            </div>
            <button
              onClick={() => dismissNotification(notification.id)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
};
