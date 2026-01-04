import { useState, useEffect } from 'react';
import { Avatar } from '@/components/Avatar';
import { Trophy, Flame, Zap, Sparkles, Heart, MessageCircle, Share2 } from 'lucide-react';
import { useSounds } from '@/hooks/useSounds';
import { useHaptics } from '@/hooks/useHaptics';

interface FeedItem {
  id: string;
  user: string;
  avatar: string;
  type: 'win' | 'streak' | 'join' | 'achievement';
  content: string;
  amount?: number;
  game?: string;
  timestamp: Date;
  likes: number;
  comments: number;
  liked: boolean;
}

const MOCK_FEED: FeedItem[] = [
  {
    id: '1',
    user: 'ChampKing99',
    avatar: '👑',
    type: 'win',
    content: 'just won big in Daily Arena! 🔥',
    amount: 15000,
    game: 'arena',
    timestamp: new Date(Date.now() - 1000 * 60 * 2),
    likes: 24,
    comments: 5,
    liked: false,
  },
  {
    id: '2',
    user: 'StreakMaster',
    avatar: '🎯',
    type: 'streak',
    content: 'completed a 7-day streak! 🔥🔥🔥',
    amount: 5000,
    game: 'streak',
    timestamp: new Date(Date.now() - 1000 * 60 * 15),
    likes: 45,
    comments: 12,
    liked: true,
  },
  {
    id: '3',
    user: 'FastFingers',
    avatar: '👆',
    type: 'win',
    content: 'claimed 1st place in Fastest Finger! ⚡',
    amount: 8500,
    game: 'finger',
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
    likes: 67,
    comments: 8,
    liked: false,
  },
  {
    id: '4',
    user: 'LuckyAde',
    avatar: '🍀',
    type: 'win',
    content: 'won the Smart Lucky Pool! 🎰',
    amount: 25000,
    game: 'pool',
    timestamp: new Date(Date.now() - 1000 * 60 * 60),
    likes: 128,
    comments: 34,
    liked: false,
  },
  {
    id: '5',
    user: 'NewPlayer',
    avatar: '🌟',
    type: 'join',
    content: 'just joined CashArena! Welcome! 👋',
    timestamp: new Date(Date.now() - 1000 * 60 * 90),
    likes: 15,
    comments: 3,
    liked: false,
  },
];

const getGameIcon = (game?: string) => {
  switch (game) {
    case 'arena':
      return <Trophy className="w-4 h-4 text-primary" />;
    case 'streak':
      return <Flame className="w-4 h-4 text-secondary" />;
    case 'finger':
      return <Zap className="w-4 h-4 text-secondary" />;
    case 'pool':
      return <Sparkles className="w-4 h-4 text-primary" />;
    default:
      return null;
  }
};

const formatTimeAgo = (date: Date) => {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
};

export const SocialFeed = () => {
  const [feed, setFeed] = useState<FeedItem[]>(MOCK_FEED);
  const { play } = useSounds();
  const { buttonClick } = useHaptics();

  const handleLike = (id: string) => {
    setFeed(prev => prev.map(item => {
      if (item.id === id) {
        const newLiked = !item.liked;
        play(newLiked ? 'success' : 'click');
        buttonClick();
        return {
          ...item,
          liked: newLiked,
          likes: newLiked ? item.likes + 1 : item.likes - 1,
        };
      }
      return item;
    }));
  };

  // Simulate new feed items
  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.6) {
        const newItem: FeedItem = {
          id: `feed_${Date.now()}`,
          user: ['GoldenTouch', 'WinnerVibes', 'CashFlow', 'ProPlayer'][Math.floor(Math.random() * 4)],
          avatar: ['✨', '🌟', '💸', '🎮'][Math.floor(Math.random() * 4)],
          type: 'win',
          content: [
            'just won in Daily Arena! 🔥',
            'completed today\'s streak task! ✅',
            'joined Fastest Finger! ⚡',
            'is on a winning streak! 🚀',
          ][Math.floor(Math.random() * 4)],
          amount: Math.floor(Math.random() * 10000) + 500,
          game: ['arena', 'streak', 'finger', 'pool'][Math.floor(Math.random() * 4)],
          timestamp: new Date(),
          likes: Math.floor(Math.random() * 20),
          comments: Math.floor(Math.random() * 5),
          liked: false,
        };
        setFeed(prev => [newItem, ...prev.slice(0, 9)]);
      }
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
        </span>
        Live Activity
      </h3>
      
      <div className="space-y-3">
        {feed.map((item, index) => (
          <div
            key={item.id}
            className="card-game p-3 animate-slide-up"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="flex gap-3">
              <Avatar name={item.user} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-foreground">{item.user}</span>
                  {item.game && getGameIcon(item.game)}
                  <span className="text-xs text-muted-foreground">{formatTimeAgo(item.timestamp)}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">{item.content}</p>
                {item.amount && (
                  <p className="text-lg font-bold text-money mt-1">₦{item.amount.toLocaleString()}</p>
                )}
                
                {/* Social Actions */}
                <div className="flex items-center gap-4 mt-2">
                  <button
                    onClick={() => handleLike(item.id)}
                    className={`flex items-center gap-1 text-xs transition-colors ${
                      item.liked ? 'text-destructive' : 'text-muted-foreground hover:text-destructive'
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${item.liked ? 'fill-current' : ''}`} />
                    {item.likes}
                  </button>
                  <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                    <MessageCircle className="w-4 h-4" />
                    {item.comments}
                  </button>
                  <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
