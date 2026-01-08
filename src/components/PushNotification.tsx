import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { useSounds } from '@/hooks/useSounds';
import { useHaptics } from '@/hooks/useHaptics';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';
import { Trophy, Zap, Bell, X, Flag } from 'lucide-react';

interface PushNotification {
  id: string;
  type: 'game_reminder' | 'win' | 'game_starting' | 'game_ended';
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
    case 'game_starting':
      return <Bell className="w-5 h-5 text-primary" />;
    case 'game_ended':
      return <Flag className="w-5 h-5 text-secondary" />;
    default:
      return <Bell className="w-5 h-5 text-primary" />;
  }
};

export const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
  const [notifications, setNotifications] = useState<PushNotification[]>([]);
  const { play } = useSounds();
  const { vibrate, prizeWin, gameStart, notification: hapticNotification } = useHaptics();
  const { user } = useAuth();
  const { preferences } = useNotificationPreferences();

  const showNotification = useCallback((notification: Omit<PushNotification, 'id'>) => {
    const id = `notif_${Date.now()}`;
    const newNotification = { ...notification, id };
    
    setNotifications(prev => [newNotification, ...prev]);
    
    if (notification.type === 'win') {
      play('prizeWin');
      prizeWin();
    } else if (notification.type === 'game_starting') {
      play('gameStart');
      gameStart();
    } else {
      play('notification');
      hapticNotification();
    }

    // Auto dismiss after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  }, [play, prizeWin, gameStart, hapticNotification]);

  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const scheduleGameReminder = useCallback(() => {
    // This is now handled by real-time subscriptions
  }, []);

  const announceWin = useCallback((amount: number, position: number) => {
    const positionText = position === 1 ? '1st' : position === 2 ? '2nd' : position === 3 ? '3rd' : `${position}th`;
    showNotification({
      type: 'win',
      title: '🏆 Congratulations!',
      message: `You won ₦${amount.toLocaleString()} - ${positionText} Place!`,
    });
  }, [showNotification]);

  // Listen for service worker push notification messages
  useEffect(() => {
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type === 'NOTIFICATION_RECEIVED') {
        const notificationType = event.data.notificationType;
        
        // Play sound/haptic for push notifications received while app is open
        switch (notificationType) {
          case 'prize_win':
            play('prizeWin');
            prizeWin();
            break;
          case 'game_start':
            play('gameStart');
            gameStart();
            break;
          default:
            play('notification');
            hapticNotification();
        }
      }
    };

    navigator.serviceWorker?.addEventListener('message', handleServiceWorkerMessage);

    return () => {
      navigator.serviceWorker?.removeEventListener('message', handleServiceWorkerMessage);
    };
  }, [play, prizeWin, gameStart, hapticNotification]);

  // Subscribe to real-time cycle events
  useEffect(() => {
    const cyclesChannel = supabase
      .channel('notification-cycles')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'game_cycles',
        },
        async (payload) => {
          const cycle = payload.new as {
            id: string;
            template_id: string;
            status: string;
            pool_value: number;
          };
          const oldCycle = payload.old as { status: string };

          // Fetch template name
          const { data: template } = await supabase
            .from('game_templates')
            .select('name')
            .eq('id', cycle.template_id)
            .single();

          const gameName = template?.name || 'Royal Rumble';

          // Show in-app notification only if enabled
          if (preferences.inAppGameStatus) {
            // Game just went live
            if (cycle.status === 'live' && oldCycle.status !== 'live') {
              showNotification({
                type: 'game_starting',
                title: '🎮 Game is LIVE!',
                message: `${gameName} is now live! Pool: ₦${cycle.pool_value.toLocaleString()}`,
              });
            }

            // Game ended (settled)
            if (cycle.status === 'settled' && oldCycle.status === 'live') {
              showNotification({
                type: 'game_ended',
                title: '🏁 Game Ended',
                message: `${gameName} has ended. Check results!`,
              });
            }
          }
        }
      )
      .subscribe();

    // Subscribe to winners if user is logged in
    let winnersChannel: ReturnType<typeof supabase.channel> | null = null;
    
    if (user) {
      winnersChannel = supabase
        .channel('notification-winners')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'winners',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const winner = payload.new as {
              amount_won: number;
              position: number;
            };
            announceWin(winner.amount_won, winner.position);
          }
        )
        .subscribe();
    }

    return () => {
      supabase.removeChannel(cyclesChannel);
      if (winnersChannel) {
        supabase.removeChannel(winnersChannel);
      }
    };
  }, [user, showNotification, announceWin, preferences.inAppGameStatus]);

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
