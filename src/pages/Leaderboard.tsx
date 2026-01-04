import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BottomNav } from '@/components/BottomNav';
import { Avatar } from '@/components/Avatar';
import { ChevronLeft, Trophy, Flame, Sparkles, Zap, Crown, Medal, TrendingUp, TrendingDown } from 'lucide-react';
import { useSounds } from '@/hooks/useSounds';
import { useHaptics } from '@/hooks/useHaptics';

type GameMode = 'all' | 'arena' | 'streak' | 'pool' | 'finger';
type TimePeriod = 'weekly' | 'monthly';

interface Player {
  rank: number;
  name: string;
  avatar: string;
  earnings: number;
  wins: number;
  trend: 'up' | 'down' | 'same';
  trendValue: number;
  badges: string[];
}

const MOCK_PLAYERS: Player[] = [
  { rank: 1, name: 'ChampKing99', avatar: '👑', earnings: 847500, wins: 156, trend: 'same', trendValue: 0, badges: ['🏆', '🔥', '⚡'] },
  { rank: 2, name: 'LuckyAde', avatar: '🍀', earnings: 623400, wins: 98, trend: 'up', trendValue: 2, badges: ['🎯', '💎'] },
  { rank: 3, name: 'SpeedQueen', avatar: '⚡', earnings: 512800, wins: 87, trend: 'down', trendValue: 1, badges: ['⚡', '🌟'] },
  { rank: 4, name: 'BlazeRunner', avatar: '🔥', earnings: 445200, wins: 72, trend: 'up', trendValue: 3, badges: ['🔥'] },
  { rank: 5, name: 'MoneyMoves', avatar: '💰', earnings: 398700, wins: 65, trend: 'up', trendValue: 1, badges: ['💎', '🎯'] },
  { rank: 6, name: 'StreakMaster', avatar: '🎯', earnings: 356400, wins: 58, trend: 'down', trendValue: 2, badges: ['🔥', '🏆'] },
  { rank: 7, name: 'GoldenTouch', avatar: '✨', earnings: 312500, wins: 52, trend: 'same', trendValue: 0, badges: ['✨'] },
  { rank: 8, name: 'FastFingers', avatar: '👆', earnings: 287300, wins: 45, trend: 'up', trendValue: 4, badges: ['⚡'] },
  { rank: 9, name: 'WinnerVibes', avatar: '🌟', earnings: 256800, wins: 41, trend: 'down', trendValue: 1, badges: [] },
  { rank: 10, name: 'CashFlow', avatar: '💸', earnings: 234500, wins: 38, trend: 'up', trendValue: 2, badges: ['💎'] },
  { rank: 11, name: 'LegendX', avatar: '🦁', earnings: 198700, wins: 34, trend: 'up', trendValue: 5, badges: [] },
  { rank: 12, name: 'ProPlayer', avatar: '🎮', earnings: 176400, wins: 29, trend: 'same', trendValue: 0, badges: [] },
  { rank: 45, name: 'You', avatar: '😎', earnings: 12500, wins: 2, trend: 'up', trendValue: 12, badges: ['🌱'] },
];

const gameModes = [
  { id: 'all' as GameMode, label: 'All Games', icon: Trophy },
  { id: 'arena' as GameMode, label: 'Arena', icon: Trophy },
  { id: 'streak' as GameMode, label: 'Streak', icon: Flame },
  { id: 'pool' as GameMode, label: 'Pool', icon: Sparkles },
  { id: 'finger' as GameMode, label: 'Finger', icon: Zap },
];

export const Leaderboard = () => {
  const navigate = useNavigate();
  const [gameMode, setGameMode] = useState<GameMode>('all');
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('weekly');
  const { play } = useSounds();
  const { buttonClick } = useHaptics();

  const handleModeChange = (mode: GameMode) => {
    setGameMode(mode);
    play('click');
    buttonClick();
  };

  const handlePeriodChange = (period: TimePeriod) => {
    setTimePeriod(period);
    play('click');
    buttonClick();
  };

  // Find "You" player
  const currentPlayer = MOCK_PLAYERS.find(p => p.name === 'You');
  const topPlayers = MOCK_PLAYERS.filter(p => p.name !== 'You').slice(0, 3);
  const otherPlayers = MOCK_PLAYERS.filter(p => p.name !== 'You').slice(3);

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-4 pt-2">
          <button 
            onClick={() => navigate('/home')}
            className="w-10 h-10 rounded-xl bg-card flex items-center justify-center"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-foreground">Global Leaderboard</h1>
            <p className="text-sm text-muted-foreground">Top players across CashArena</p>
          </div>
        </div>

        {/* Time Period Toggle */}
        <div className="flex gap-2 p-1 bg-muted/30 rounded-xl">
          {(['weekly', 'monthly'] as TimePeriod[]).map(period => (
            <button
              key={period}
              onClick={() => handlePeriodChange(period)}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                timePeriod === period
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {period === 'weekly' ? 'This Week' : 'This Month'}
            </button>
          ))}
        </div>

        {/* Game Mode Filter */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          {gameModes.map(mode => {
            const Icon = mode.icon;
            return (
              <button
                key={mode.id}
                onClick={() => handleModeChange(mode.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                  gameMode === mode.id
                    ? 'bg-primary/20 text-primary border border-primary'
                    : 'bg-card border border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="w-4 h-4" />
                {mode.label}
              </button>
            );
          })}
        </div>

        {/* Your Rank Card */}
        {currentPlayer && (
          <div className="card-game bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Avatar name={currentPlayer.name} size="lg" />
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-background border-2 border-primary text-xs font-bold flex items-center justify-center text-primary">
                    #{currentPlayer.rank}
                  </div>
                </div>
                <div>
                  <p className="font-bold text-foreground flex items-center gap-2">
                    {currentPlayer.name}
                    {currentPlayer.badges.map((badge, i) => (
                      <span key={i} className="text-sm">{badge}</span>
                    ))}
                  </p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{currentPlayer.wins} wins</span>
                    <span className="flex items-center gap-1 text-primary">
                      <TrendingUp className="w-3 h-3" />
                      +{currentPlayer.trendValue}
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-money">₦{currentPlayer.earnings.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Total Earnings</p>
              </div>
            </div>
          </div>
        )}

        {/* Top 3 Podium */}
        <div className="grid grid-cols-3 gap-2 mt-4">
          {/* 2nd Place */}
          <div className="flex flex-col items-center pt-6">
            <div className="relative">
              <Avatar name={topPlayers[1]?.name || ''} size="lg" />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-silver text-white text-xs font-bold flex items-center justify-center">
                2
              </div>
            </div>
            <p className="text-sm font-medium text-foreground mt-2 text-center truncate w-full">{topPlayers[1]?.name}</p>
            <p className="text-xs text-money">₦{topPlayers[1]?.earnings.toLocaleString()}</p>
            <div className="w-full h-16 bg-gradient-to-t from-silver/20 to-transparent rounded-t-xl mt-2" />
          </div>
          
          {/* 1st Place */}
          <div className="flex flex-col items-center">
            <Crown className="w-6 h-6 text-gold mb-1 animate-float" />
            <div className="relative">
              <div className="absolute -inset-2 bg-gold/20 rounded-full animate-pulse" />
              <Avatar name={topPlayers[0]?.name || ''} size="xl" isWinner />
              <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-gold text-black text-xs font-bold flex items-center justify-center">
                1
              </div>
            </div>
            <p className="text-sm font-bold text-foreground mt-2 text-center truncate w-full">{topPlayers[0]?.name}</p>
            <p className="text-xs text-money font-bold">₦{topPlayers[0]?.earnings.toLocaleString()}</p>
            <div className="w-full h-24 bg-gradient-to-t from-gold/20 to-transparent rounded-t-xl mt-2" />
          </div>
          
          {/* 3rd Place */}
          <div className="flex flex-col items-center pt-8">
            <div className="relative">
              <Avatar name={topPlayers[2]?.name || ''} size="lg" />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-bronze text-white text-xs font-bold flex items-center justify-center">
                3
              </div>
            </div>
            <p className="text-sm font-medium text-foreground mt-2 text-center truncate w-full">{topPlayers[2]?.name}</p>
            <p className="text-xs text-money">₦{topPlayers[2]?.earnings.toLocaleString()}</p>
            <div className="w-full h-12 bg-gradient-to-t from-bronze/20 to-transparent rounded-t-xl mt-2" />
          </div>
        </div>

        {/* Rest of Leaderboard */}
        <div className="space-y-2">
          {otherPlayers.map((player, index) => (
            <div
              key={player.rank}
              className="card-game flex items-center gap-3 py-3 animate-slide-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="w-8 text-center">
                <span className="text-sm font-bold text-muted-foreground">#{player.rank}</span>
              </div>
              <Avatar name={player.name} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate flex items-center gap-1">
                  {player.name}
                  {player.badges.map((badge, i) => (
                    <span key={i} className="text-xs">{badge}</span>
                  ))}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{player.wins} wins</span>
                  <span className={`flex items-center gap-0.5 ${
                    player.trend === 'up' ? 'text-primary' : player.trend === 'down' ? 'text-destructive' : 'text-muted-foreground'
                  }`}>
                    {player.trend === 'up' && <TrendingUp className="w-3 h-3" />}
                    {player.trend === 'down' && <TrendingDown className="w-3 h-3" />}
                    {player.trend !== 'same' && (player.trend === 'up' ? '+' : '-')}{player.trendValue}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-money text-sm">₦{player.earnings.toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <BottomNav />
    </div>
  );
};
