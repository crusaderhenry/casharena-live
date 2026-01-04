import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame, mockPlayers } from '@/contexts/GameContext';
import { Loader2 } from 'lucide-react';

export const PoolDraw = () => {
  const navigate = useNavigate();
  const { poolValue, isTestMode } = useGame();
  const [isDrawing, setIsDrawing] = useState(true);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [winner, setWinner] = useState<typeof mockPlayers[0] | null>(null);
  const participants = mockPlayers;

  useEffect(() => {
    if (!isDrawing) return;
    const interval = setInterval(() => {
      setHighlightedIndex(prev => (prev + 1) % participants.length);
    }, 150);

    const timeout = setTimeout(() => {
      clearInterval(interval);
      const winnerIndex = Math.floor(Math.random() * participants.length);
      setHighlightedIndex(winnerIndex);
      setWinner(participants[winnerIndex]);
      setIsDrawing(false);
      
      setTimeout(() => {
        navigate('/pool/result', { state: { winner: participants[winnerIndex], poolValue } });
      }, 2000);
    }, 4000);

    return () => { clearInterval(interval); clearTimeout(timeout); };
  }, [isDrawing, navigate, participants, poolValue]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <h1 className="text-2xl font-black text-foreground mb-8">
        {isDrawing ? 'Drawing Winner...' : '🎉 Winner Selected!'}
      </h1>
      
      <div className="w-full max-w-sm space-y-2 mb-8">
        {participants.map((player, index) => (
          <div key={player.id} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${highlightedIndex === index ? 'bg-primary/20 border border-primary scale-105' : 'bg-card/50 border border-transparent'} ${winner && winner.id === player.id ? 'animate-winner-glow' : ''}`}>
            <div className="w-10 h-10 rounded-full bg-card-elevated flex items-center justify-center text-xl">{player.avatar}</div>
            <span className="font-semibold text-foreground">{player.name}</span>
          </div>
        ))}
      </div>

      {isDrawing && <Loader2 className="w-8 h-8 text-primary animate-spin" />}
    </div>
  );
};
