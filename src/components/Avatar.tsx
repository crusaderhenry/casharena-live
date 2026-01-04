interface AvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isWinner?: boolean;
  position?: number;
}

const AVATAR_COLORS = [
  'from-primary to-emerald-400',
  'from-secondary to-amber-400',
  'from-violet-500 to-purple-400',
  'from-rose-500 to-pink-400',
  'from-cyan-500 to-blue-400',
  'from-orange-500 to-red-400',
];

export const Avatar = ({ name, size = 'md', isWinner = false, position }: AvatarProps) => {
  const initials = name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const colorIndex = name.charCodeAt(0) % AVATAR_COLORS.length;

  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg',
  };

  const positionColors = {
    1: 'ring-gold',
    2: 'ring-silver',
    3: 'ring-bronze',
  };

  return (
    <div className={`relative ${isWinner ? 'winner-glow' : ''}`}>
      <div
        className={`${sizeClasses[size]} rounded-full bg-gradient-to-br ${AVATAR_COLORS[colorIndex]} flex items-center justify-center font-bold text-white ${
          position && position <= 3 
            ? `ring-2 ${positionColors[position as 1 | 2 | 3]} ring-offset-2 ring-offset-background` 
            : ''
        }`}
      >
        {initials}
      </div>
      {position && position <= 3 && (
        <div className={`absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
          position === 1 ? 'bg-gold text-black' :
          position === 2 ? 'bg-silver text-black' :
          'bg-bronze text-white'
        }`}>
          {position}
        </div>
      )}
    </div>
  );
};
