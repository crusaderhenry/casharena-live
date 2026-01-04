import { BottomNav } from '@/components/BottomNav';
import { useGame } from '@/contexts/GameContext';
import { ArrowLeft, Edit2, Trophy, Gamepad2, Coins } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

const avatarOptions = ['🎮', '👑', '💎', '🚀', '⚡', '🔥', '🌟', '🎯'];

export const ProfileScreen = () => {
  const navigate = useNavigate();
  const { userProfile, updateProfile } = useGame();
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState(userProfile.username);

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(amount);
  };

  const handleSave = () => {
    updateProfile({ username: newName });
    setIsEditing(false);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="p-4 space-y-6">
        <div className="flex items-center gap-3 pt-2">
          <button onClick={() => navigate('/home')} className="p-2 -ml-2">
            <ArrowLeft className="w-6 h-6 text-foreground" />
          </button>
          <h1 className="text-2xl font-black text-foreground">Profile</h1>
        </div>

        <div className="card-panel text-center">
          <div className="w-20 h-20 rounded-full bg-card-elevated flex items-center justify-center text-4xl mx-auto mb-4 border-2 border-primary">
            {userProfile.avatar}
          </div>
          <div className="flex flex-wrap justify-center gap-2 mb-4">
            {avatarOptions.map((emoji) => (
              <button key={emoji} onClick={() => updateProfile({ avatar: emoji })} className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${userProfile.avatar === emoji ? 'bg-primary/20 border-2 border-primary' : 'bg-card-elevated'}`}>
                {emoji}
              </button>
            ))}
          </div>
          {isEditing ? (
            <div className="flex gap-2">
              <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} className="flex-1 bg-background border border-border rounded-xl px-4 py-2 text-foreground" />
              <button onClick={handleSave} className="btn-primary px-4">Save</button>
            </div>
          ) : (
            <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 mx-auto text-primary">
              <span className="text-xl font-bold text-foreground">{userProfile.username}</span>
              <Edit2 className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="card-panel text-center">
            <Trophy className="w-6 h-6 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">#{userProfile.rank}</p>
            <p className="text-xs text-muted-foreground">Rank</p>
          </div>
          <div className="card-panel text-center">
            <Gamepad2 className="w-6 h-6 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">{userProfile.gamesPlayed}</p>
            <p className="text-xs text-muted-foreground">Games</p>
          </div>
          <div className="card-panel text-center">
            <Coins className="w-6 h-6 text-gold mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">{userProfile.wins}</p>
            <p className="text-xs text-muted-foreground">Wins</p>
          </div>
        </div>

        <div className="card-panel">
          <p className="text-sm text-muted-foreground mb-1">Total Earnings</p>
          <p className="money-display text-3xl">{formatMoney(userProfile.totalEarnings)}</p>
        </div>
      </div>
      <BottomNav />
    </div>
  );
};
