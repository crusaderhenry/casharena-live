import { useState, useEffect } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { Player } from '@/contexts/GameContext';

interface VoiceRoomProps {
  players: Player[];
  onMicToggle?: (isMuted: boolean) => void;
}

export const VoiceRoom = ({ players, onMicToggle }: VoiceRoomProps) => {
  const [isMuted, setIsMuted] = useState(true);
  const [speakingPlayers, setSpeakingPlayers] = useState<Set<string>>(new Set());

  // Simulate random players speaking
  useEffect(() => {
    const interval = setInterval(() => {
      if (players.length > 0) {
        const randomIndex = Math.floor(Math.random() * Math.min(players.length, 5));
        const playerId = players[randomIndex]?.id;
        if (playerId) {
          setSpeakingPlayers(prev => {
            const next = new Set(prev);
            if (next.has(playerId)) {
              next.delete(playerId);
            } else {
              // Max 3 speaking at once
              if (next.size >= 3) {
                const first = Array.from(next)[0];
                next.delete(first);
              }
              next.add(playerId);
            }
            return next;
          });
        }
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [players]);

  const handleMicToggle = () => {
    setIsMuted(!isMuted);
    onMicToggle?.(!isMuted);
  };

  const displayPlayers = players.slice(0, 8);

  return (
    <div className="card-panel space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="voice-wave">
            <span /><span /><span /><span /><span />
          </div>
          <span className="text-sm font-semibold text-foreground">Voice Room</span>
        </div>
        <button
          onClick={handleMicToggle}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
            isMuted 
              ? 'bg-destructive/20 text-destructive' 
              : 'bg-primary/20 text-primary avatar-speaking'
          }`}
        >
          {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        {displayPlayers.map((player) => {
          const isSpeaking = speakingPlayers.has(player.id);
          return (
            <div key={player.id} className="flex flex-col items-center gap-1">
              <div 
                className={`w-12 h-12 rounded-full bg-card-elevated flex items-center justify-center text-xl transition-all ${
                  isSpeaking ? 'avatar-speaking' : ''
                }`}
              >
                {player.avatar}
              </div>
              <span className="text-[10px] text-muted-foreground truncate max-w-[50px]">
                {player.name}
              </span>
              {isSpeaking && (
                <div className="voice-wave scale-75">
                  <span /><span /><span />
                </div>
              )}
            </div>
          );
        })}
        {players.length > 8 && (
          <div className="flex flex-col items-center gap-1">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-sm font-semibold text-muted-foreground">
              +{players.length - 8}
            </div>
            <span className="text-[10px] text-muted-foreground">more</span>
          </div>
        )}
      </div>
    </div>
  );
};
