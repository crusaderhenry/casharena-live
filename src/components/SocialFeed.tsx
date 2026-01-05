import { useState, useEffect } from 'react';
import { Avatar } from '@/components/Avatar';
import { Trophy, Zap, Heart, MessageCircle, Share2 } from 'lucide-react';
import { useSounds } from '@/hooks/useSounds';
import { useHaptics } from '@/hooks/useHaptics';
import { useRealtimeActivity } from '@/hooks/useRealtimeActivity';
import { Skeleton } from '@/components/ui/skeleton';

interface FeedItem {
  id: string;
  user: string;
  avatar: string;
  type: 'win' | 'game_start' | 'game_end';
  content: string;
  amount?: number;
  game?: string;
  timestamp: Date;
  likes: number;
  comments: number;
  liked: boolean;
}

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'win':
      return <Trophy className="w-4 h-4 text-gold" />;
    case 'game_start':
      return <Zap className="w-4 h-4 text-primary" />;
    default:
      return <Trophy className="w-4 h-4 text-primary" />;
  }
};

const formatTimeAgo = (date: Date) => {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
};

const getPositionText = (position: number) => {
  if (position === 1) return '1st';
  if (position === 2) return '2nd';
  if (position === 3) return '3rd';
  return `${position}th`;
};

export const SocialFeed = () => {
  const { activities, loading } = useRealtimeActivity(10);
  const [likedItems, setLikedItems] = useState<Set<string>>(new Set());
  const { play } = useSounds();
  const { buttonClick } = useHaptics();

  // Transform real activities to feed items
  const feed: FeedItem[] = activities.map(activity => {
    let content = '';
    if (activity.type === 'finger_win') {
      content = `won ${getPositionText(activity.position || 1)} place in ${activity.gameName || 'Fastest Finger'}! 🏆`;
    } else if (activity.type === 'game_start') {
      content = `${activity.gameName || 'Fastest Finger'} is now LIVE! ⚡`;
    } else if (activity.type === 'game_end') {
      content = `${activity.gameName || 'Fastest Finger'} has ended 🏁`;
    }

    return {
      id: activity.id,
      user: activity.playerName,
      avatar: activity.playerAvatar,
      type: activity.type === 'finger_win' ? 'win' : activity.type === 'game_start' ? 'game_start' : 'game_end',
      content,
      amount: activity.amount,
      game: 'finger',
      timestamp: activity.timestamp,
      likes: Math.floor(Math.random() * 50) + 5, // Simulated for now
      comments: Math.floor(Math.random() * 10),
      liked: likedItems.has(activity.id),
    };
  });

  const handleLike = (id: string) => {
    const isLiked = likedItems.has(id);
    play(isLiked ? 'click' : 'success');
    buttonClick();
    
    setLikedItems(prev => {
      const next = new Set(prev);
      if (isLiked) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  if (loading) {
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
          {[1, 2, 3].map((i) => (
            <div key={i} className="card-game p-3">
              <div className="flex gap-3">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

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
                  {getTypeIcon(item.type)}
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
