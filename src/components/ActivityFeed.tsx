import { useState, useEffect } from 'react';
import { Avatar } from './Avatar';
import { Zap, Sparkles, Trophy, TrendingUp } from 'lucide-react';

interface Activity {
  id: string;
  user: string;
  type: 'finger_win' | 'pool_win' | 'rank_up' | 'finger_join' | 'pool_join';
  amount?: number;
  rank?: number;
  timestamp: Date;
}

const MOCK_USERS = [
  'Adebayo K.', 'Chidinma U.', 'Emeka A.', 'Fatima B.', 'Grace O.',
  'Henry I.', 'Ifeoma C.', 'John D.', 'Kemi L.', 'Ladi M.',
];

export const ActivityFeed = () => {
  const [activities, setActivities] = useState<Activity[]>([]);

  // Generate initial activities
  useEffect(() => {
    const initialActivities: Activity[] = [
      {
        id: '1',
        user: 'Adebayo K.',
        type: 'finger_win',
        amount: 7245,
        timestamp: new Date(Date.now() - 30000),
      },
      {
        id: '2',
        user: 'Chidinma U.',
        type: 'pool_win',
        amount: 140400,
        timestamp: new Date(Date.now() - 60000),
      },
      {
        id: '3',
        user: 'Emeka A.',
        type: 'rank_up',
        rank: 5,
        timestamp: new Date(Date.now() - 90000),
      },
      {
        id: '4',
        user: 'Fatima B.',
        type: 'finger_join',
        timestamp: new Date(Date.now() - 120000),
      },
    ];
    setActivities(initialActivities);
  }, []);

  // Simulate new activities
  useEffect(() => {
    const interval = setInterval(() => {
      const types: Activity['type'][] = ['finger_win', 'pool_win', 'rank_up', 'finger_join', 'pool_join'];
      const randomType = types[Math.floor(Math.random() * types.length)];
      const randomUser = MOCK_USERS[Math.floor(Math.random() * MOCK_USERS.length)];
      
      const newActivity: Activity = {
        id: `activity_${Date.now()}`,
        user: randomUser,
        type: randomType,
        amount: randomType.includes('win') ? Math.floor(Math.random() * 50000) + 5000 : undefined,
        rank: randomType === 'rank_up' ? Math.floor(Math.random() * 10) + 1 : undefined,
        timestamp: new Date(),
      };

      setActivities(prev => [newActivity, ...prev.slice(0, 9)]);
    }, 5000 + Math.random() * 5000);

    return () => clearInterval(interval);
  }, []);

  const getActivityIcon = (type: Activity['type']) => {
    switch (type) {
      case 'finger_win':
        return <Zap className="w-4 h-4 text-primary" />;
      case 'pool_win':
        return <Sparkles className="w-4 h-4 text-secondary" />;
      case 'rank_up':
        return <TrendingUp className="w-4 h-4 text-gold" />;
      case 'finger_join':
        return <Zap className="w-4 h-4 text-muted-foreground" />;
      case 'pool_join':
        return <Sparkles className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getActivityText = (activity: Activity) => {
    switch (activity.type) {
      case 'finger_win':
        return `won ₦${activity.amount?.toLocaleString()} in Fastest Finger 🔥`;
      case 'pool_win':
        return `won ₦${activity.amount?.toLocaleString()} in Lucky Pool! 🎉`;
      case 'rank_up':
        return `reached Rank #${activity.rank} 📈`;
      case 'finger_join':
        return 'joined Fastest Finger lobby';
      case 'pool_join':
        return 'joined Lucky Pool';
    }
  };

  const getTimeAgo = (date: Date) => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          Live Activity
        </h2>
        <div className="flex items-center gap-1 text-xs text-primary">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          Live
        </div>
      </div>
      
      <div className="space-y-2 max-h-[280px] overflow-y-auto">
        {activities.map((activity, index) => (
          <div 
            key={activity.id}
            className="card-game py-3 flex items-center gap-3 animate-slide-up"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <Avatar name={activity.user} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm">
                <span className="font-bold text-foreground">{activity.user.split(' ')[0]}</span>{' '}
                <span className="text-muted-foreground">{getActivityText(activity)}</span>
              </p>
              <p className="text-[10px] text-muted-foreground">{getTimeAgo(activity.timestamp)}</p>
            </div>
            {getActivityIcon(activity.type)}
          </div>
        ))}
      </div>
    </div>
  );
};
