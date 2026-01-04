import { Share2, MessageCircle } from 'lucide-react';

interface ShareCardProps {
  username: string;
  avatar: string;
  position: number;
  amount: number;
  gameType: 'finger' | 'pool';
}

export const ShareCard = ({ username, avatar, position, amount, gameType }: ShareCardProps) => {
  const formatMoney = (value: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getPositionText = () => {
    if (gameType === 'pool') return 'Winner';
    switch (position) {
      case 1: return '1st Place';
      case 2: return '2nd Place';
      case 3: return '3rd Place';
      default: return `${position}th Place`;
    }
  };

  const handleShare = (platform: 'whatsapp' | 'twitter' | 'instagram') => {
    const message = `🎉 I just won ${formatMoney(amount)} on FortunesHQ! ${getPositionText()} in ${gameType === 'finger' ? 'Fastest Finger' : 'Lucky Pool'}! 🚀`;
    
    // Simulate share (UI only)
    console.log(`Sharing to ${platform}:`, message);
    alert(`Sharing to ${platform}! (Demo mode)`);
  };

  return (
    <div className="space-y-4">
      {/* Share Preview Card */}
      <div className="share-card">
        <div className="w-16 h-16 rounded-full bg-card-elevated flex items-center justify-center text-3xl mx-auto mb-3 avatar-gold animate-winner-glow">
          {avatar}
        </div>
        <h3 className="text-xl font-bold text-foreground">{username}</h3>
        <p className="text-gold font-semibold">{getPositionText()}</p>
        <p className="money-gold text-4xl my-3">{formatMoney(amount)}</p>
        <div className="flex items-center justify-center gap-2 text-primary text-sm">
          <span className="text-2xl">🎯</span>
          <span className="font-bold">FortunesHQ</span>
        </div>
      </div>

      {/* Share Buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => handleShare('whatsapp')}
          className="flex-1 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold flex items-center justify-center gap-2 transition-all"
        >
          <MessageCircle className="w-5 h-5" />
          WhatsApp
        </button>
        <button
          onClick={() => handleShare('twitter')}
          className="flex-1 py-3 rounded-xl bg-black hover:bg-gray-900 text-white font-semibold flex items-center justify-center gap-2 transition-all border border-gray-700"
        >
          𝕏
        </button>
        <button
          onClick={() => handleShare('instagram')}
          className="flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold flex items-center justify-center gap-2 transition-all"
        >
          <Share2 className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
