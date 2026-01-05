import { BottomNav } from '@/components/BottomNav';
import { ProfileBadges } from '@/components/ProfileBadges';
import { KycVerificationModal } from '@/components/wallet/KycVerificationModal';
import { useGame } from '@/contexts/GameContext';
import { useAuth } from '@/contexts/AuthContext';
import { useAudio } from '@/contexts/AudioContext';
import { useSounds } from '@/hooks/useSounds';
import { useHaptics } from '@/hooks/useHaptics';
import { ArrowLeft, Trophy, Zap, Coins, Volume2, VolumeX, Music, Mic, LogOut, Shield, Award, ShieldCheck, ShieldX } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useUserRole } from '@/hooks/useUserRole';

const avatarOptions = ['🎮', '👑', '💎', '🚀', '⚡', '🔥', '🌟', '🎯'];

interface KycStatus {
  verified: boolean;
  type: 'nin' | 'bvn' | null;
  firstName: string;
  lastName: string;
}

export const ProfileScreen = () => {
  const navigate = useNavigate();
  const { userProfile, updateProfile, isTestMode } = useGame();
  const { user, profile, signOut, refreshProfile } = useAuth();
  const { isAdmin, isModerator } = useUserRole();
  const { settings, toggleMusic, toggleSfx, toggleCommentary, setVolume } = useAudio();
  const { play } = useSounds();
  const { buttonClick } = useHaptics();
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [kycStatus, setKycStatus] = useState<KycStatus>({ 
    verified: false, 
    type: null, 
    firstName: '', 
    lastName: '' 
  });
  const [showKycModal, setShowKycModal] = useState(false);

  const handleKycVerified = (firstName: string, lastName: string) => {
    setKycStatus({
      verified: true,
      type: 'nin', // Will be updated from DB
      firstName,
      lastName,
    });
    setShowKycModal(false);
    toast.success('Identity verified successfully!');
  };

  // Use real profile data if available
  const displayProfile = {
    username: profile?.username || userProfile.username,
    avatar: profile?.avatar || userProfile.avatar,
    gamesPlayed: profile?.games_played || userProfile.gamesPlayed,
    wins: profile?.total_wins || userProfile.wins,
    rank: profile?.weekly_rank || userProfile.rank,
    rankPoints: profile?.rank_points || 0,
  };

  // Set initial name when profile loads
  useEffect(() => {
    if (profile?.username) {
      setNewName(profile.username);
    }
  }, [profile?.username]);

  // Fetch KYC status
  useEffect(() => {
    const fetchKycStatus = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from('profiles')
        .select('kyc_verified, kyc_type, kyc_first_name, kyc_last_name')
        .eq('id', user.id)
        .single();

      if (data) {
        setKycStatus({
          verified: data.kyc_verified || false,
          type: data.kyc_type as 'nin' | 'bvn' | null,
          firstName: data.kyc_first_name || '',
          lastName: data.kyc_last_name || '',
        });
      }
    };

    fetchKycStatus();
  }, [user]);

  // Fetch total earnings from wallet transactions
  useEffect(() => {
    const fetchEarnings = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from('wallet_transactions')
        .select('amount')
        .eq('user_id', user.id)
        .eq('type', 'win');

      if (data) {
        const total = data.reduce((sum, t) => sum + t.amount, 0);
        setTotalEarnings(total);
      }
    };

    if (!isTestMode) {
      fetchEarnings();
    } else {
      setTotalEarnings(userProfile.totalEarnings);
    }
  }, [user, isTestMode, userProfile.totalEarnings]);

  const handleSave = async () => {
    if (!newName.trim()) return;
    
    setSaving(true);
    
    if (!isTestMode && user) {
      // Update in Supabase
      const { error } = await supabase
        .from('profiles')
        .update({ username: newName.trim() })
        .eq('id', user.id);
      
      if (error) {
        toast.error('Failed to update username');
        setSaving(false);
        return;
      }
      
      await refreshProfile();
      toast.success('Username updated!');
    } else {
      // Test mode - update local state
      updateProfile({ username: newName });
    }
    
    setIsEditing(false);
    play('success');
    buttonClick();
    setSaving(false);
  };

  const handleAvatarChange = async (emoji: string) => {
    play('click');
    buttonClick();
    
    if (!isTestMode && user) {
      const { error } = await supabase
        .from('profiles')
        .update({ avatar: emoji })
        .eq('id', user.id);
      
      if (error) {
        toast.error('Failed to update avatar');
        return;
      }
      
      await refreshProfile();
    } else {
      updateProfile({ avatar: emoji });
    }
  };

  const handleBack = () => {
    play('click');
    buttonClick();
    navigate('/home');
  };

  const handleToggle = (toggle: () => void) => {
    play('click');
    buttonClick();
    toggle();
  };

  const handleSignOut = async () => {
    play('click');
    buttonClick();
    await signOut();
    navigate('/auth');
  };

  const stats = [
    { label: 'Games', value: displayProfile.gamesPlayed, icon: Zap, color: 'text-primary' },
    { label: 'Top 3', value: displayProfile.wins, icon: Trophy, color: 'text-gold' },
    { label: 'Rank', value: displayProfile.rank ? `#${displayProfile.rank}` : '-', icon: Trophy, color: 'text-primary' },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="p-4 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-3">
            <button 
              onClick={handleBack} 
              className="w-10 h-10 rounded-xl bg-card flex items-center justify-center border border-border/50"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <div>
              <h1 className="text-xl font-black text-foreground">Profile</h1>
              <p className="text-sm text-muted-foreground">
                Your Fastest Finger stats
                {isTestMode && <span className="text-primary ml-2">(Test Mode)</span>}
              </p>
            </div>
          </div>
          
          {/* Admin/Mod Badge */}
          {(isAdmin || isModerator) && (
            <button
              onClick={() => navigate(isAdmin ? '/admin' : '/moderator')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/20 border border-primary/30 text-primary text-sm font-medium"
            >
              <Shield className="w-4 h-4" />
              {isAdmin ? 'Admin' : 'Mod'}
            </button>
          )}
        </div>

        {/* Profile Card */}
        <div className="card-panel border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card">
          <div className="flex flex-col items-center text-center py-4">
            <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center text-4xl border-2 border-primary/30 mb-4">
              {displayProfile.avatar}
            </div>
            
            {/* Avatar Selection */}
            <div className="flex flex-wrap justify-center gap-2 mb-4">
              {avatarOptions.map((emoji) => (
                <button 
                  key={emoji} 
                  onClick={() => handleAvatarChange(emoji)} 
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-lg transition-all ${
                    displayProfile.avatar === emoji 
                      ? 'bg-primary/20 border-2 border-primary scale-110' 
                      : 'bg-card-elevated hover:bg-card border border-border/50'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>

            {isEditing ? (
              <div className="flex gap-2 w-full max-w-xs">
                <input 
                  type="text" 
                  value={newName} 
                  onChange={(e) => setNewName(e.target.value)} 
                  className="flex-1 bg-background border border-border rounded-xl px-4 py-2 text-foreground text-center"
                  autoFocus
                  maxLength={20}
                />
                <button 
                  onClick={handleSave} 
                  disabled={saving}
                  className="btn-primary px-4 py-2"
                >
                  {saving ? '...' : 'Save'}
                </button>
              </div>
            ) : (
              <button 
                onClick={() => {
                  setNewName(displayProfile.username);
                  setIsEditing(true);
                }} 
                className="text-xl font-black text-foreground hover:text-primary transition-colors"
              >
                {displayProfile.username}
              </button>
            )}
            <p className="text-xs text-muted-foreground mt-1">Tap name to edit</p>
            {profile?.email && (
              <p className="text-xs text-muted-foreground mt-1">{profile.email}</p>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          {stats.map((stat) => (
            <div key={stat.label} className="card-panel text-center">
              <stat.icon className={`w-5 h-5 ${stat.color} mx-auto mb-2`} />
              <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Rank Points */}
        <div className="card-panel border-primary/30 bg-gradient-to-r from-primary/10 to-transparent">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
              <Trophy className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Rank Points</p>
              <p className="text-2xl font-black text-primary">{displayProfile.rankPoints}</p>
            </div>
          </div>
        </div>

        {/* Total Earnings */}
        <div className="card-panel border-gold/30 bg-gradient-to-r from-gold/10 to-transparent">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gold/20 flex items-center justify-center">
              <Coins className="w-6 h-6 text-gold" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Earnings</p>
              <p className="text-2xl font-black text-gold">₦{totalEarnings.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* KYC Verification Status */}
        <div className={`card-panel ${kycStatus.verified 
          ? 'border-primary/30 bg-gradient-to-r from-primary/10 to-transparent' 
          : 'border-yellow-500/30 bg-gradient-to-r from-yellow-500/10 to-transparent'}`}
        >
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              kycStatus.verified ? 'bg-primary/20' : 'bg-yellow-500/20'
            }`}>
              {kycStatus.verified 
                ? <ShieldCheck className="w-6 h-6 text-primary" />
                : <ShieldX className="w-6 h-6 text-yellow-500" />
              }
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Identity Verification</p>
              {kycStatus.verified ? (
                <>
                  <p className="text-lg font-bold text-primary">Verified</p>
                  <p className="text-xs text-muted-foreground">
                    {kycStatus.firstName} {kycStatus.lastName} • {kycStatus.type?.toUpperCase()}
                  </p>
                </>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg font-bold text-yellow-500">Not Verified</p>
                    <p className="text-xs text-muted-foreground">
                      Verify your identity with NIN or BVN
                    </p>
                  </div>
                  <button
                    onClick={() => setShowKycModal(true)}
                    className="px-4 py-2 bg-yellow-500 text-black text-sm font-medium rounded-lg hover:bg-yellow-400 transition-colors"
                  >
                    Verify Now
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Badges & Achievements */}
        <div className="card-panel">
          <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-primary" />
            Badges & Achievements
          </h3>
          <ProfileBadges 
            totalWins={displayProfile.wins} 
            gamesPlayed={displayProfile.gamesPlayed} 
          />
        </div>

        {/* Audio Settings */}
        <div className="card-panel">
          <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-primary" />
            Audio Settings
          </h3>
          
          <div className="space-y-4">
            {/* Background Music */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Music className="w-5 h-5 text-muted-foreground" />
                <span className="text-foreground">Music</span>
              </div>
              <button
                onClick={() => handleToggle(toggleMusic)}
                className={`w-12 h-7 rounded-full transition-colors ${settings.musicEnabled ? 'bg-primary' : 'bg-muted'}`}
              >
                <div className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform mx-1 ${settings.musicEnabled ? 'translate-x-5' : ''}`} />
              </button>
            </div>

            {/* Sound Effects */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {settings.sfxEnabled ? <Volume2 className="w-5 h-5 text-muted-foreground" /> : <VolumeX className="w-5 h-5 text-muted-foreground" />}
                <span className="text-foreground">Sound Effects</span>
              </div>
              <button
                onClick={() => handleToggle(toggleSfx)}
                className={`w-12 h-7 rounded-full transition-colors ${settings.sfxEnabled ? 'bg-primary' : 'bg-muted'}`}
              >
                <div className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform mx-1 ${settings.sfxEnabled ? 'translate-x-5' : ''}`} />
              </button>
            </div>

            {/* Host Commentary */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Mic className="w-5 h-5 text-muted-foreground" />
                <span className="text-foreground">Host Voice</span>
              </div>
              <button
                onClick={() => handleToggle(toggleCommentary)}
                className={`w-12 h-7 rounded-full transition-colors ${settings.commentaryEnabled ? 'bg-primary' : 'bg-muted'}`}
              >
                <div className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform mx-1 ${settings.commentaryEnabled ? 'translate-x-5' : ''}`} />
              </button>
            </div>

            {/* Volume Slider */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Master Volume</span>
                <span className="text-sm text-primary font-medium">{Math.round(settings.volume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={settings.volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
              />
            </div>
          </div>
        </div>

        {/* Sign Out */}
        <button
          onClick={handleSignOut}
          className="w-full card-panel flex items-center justify-center gap-2 text-destructive hover:bg-destructive/10 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Sign Out</span>
        </button>

        {/* App Info */}
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground">
            <span className="text-primary font-bold">Fortunes</span>HQ v1.0
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            The live comment battle game
          </p>
        </div>
      </div>
      <BottomNav />
      
      <KycVerificationModal
        open={showKycModal}
        onOpenChange={setShowKycModal}
        onVerified={handleKycVerified}
      />
    </div>
  );
};
