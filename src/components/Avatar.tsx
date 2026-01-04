interface AvatarProps {
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  isWinner?: boolean;
  position?: number;
  speaking?: boolean;
}

const AVATAR_GRADIENTS = [
  'from-emerald-500 to-teal-400',
  'from-amber-500 to-orange-400',
  'from-violet-500 to-purple-400',
  'from-rose-500 to-pink-400',
  'from-cyan-500 to-blue-400',
  'from-fuchsia-500 to-pink-400',
  'from-lime-500 to-green-400',
  'from-indigo-500 to-blue-400',
];

export const Avatar = ({ name, size = 'md', isWinner = false, position, speaking = false }: AvatarProps) => {
  const initials = name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const colorIndex = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % AVATAR_GRADIENTS.length;

  const sizeClasses = {
    xs: 'w-6 h-6 text-2xs',
    sm: 'w-9 h-9 text-xs',
    md: 'w-11 h-11 text-sm',
    lg: 'w-14 h-14 text-base',
    xl: 'w-20 h-20 text-xl',
  };

  const positionRingClasses = {
    1: 'avatar-ring-gold',
    2: 'avatar-ring-silver',
    3: 'avatar-ring-bronze',
  };

  return (
    <div className={`relative ${speaking ? 'voice-indicator' : ''}`}>
      <div
        className={`
          ${sizeClasses[size]} 
          rounded-full 
          bg-gradient-to-br ${AVATAR_GRADIENTS[colorIndex]} 
          flex items-center justify-center 
          font-bold text-white
          transition-all duration-300
          ${position && position <= 3 ? positionRingClasses[position as 1 | 2 | 3] : ''}
          ${isWinner ? 'animate-glow-pulse' : ''}
        `}
      >
        {initials}
      </div>
      
      {position && position <= 3 && (
        <div className={`
          absolute -bottom-0.5 -right-0.5 
          w-5 h-5 rounded-full 
          flex items-center justify-center 
          text-2xs font-bold
          shadow-lg
          ${position === 1 ? 'bg-gold text-black' :
            position === 2 ? 'bg-silver text-black' :
            'bg-bronze text-white'}
        `}>
          {position}
        </div>
      )}
    </div>
  );
};
