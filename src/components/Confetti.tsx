import { useEffect, useState } from 'react';

interface ConfettiPiece {
  id: number;
  left: number;
  color: string;
  delay: number;
  size: number;
}

interface ConfettiProps {
  duration?: number;
  count?: number;
  maxDelay?: number;
  burst?: boolean;
}

export const Confetti = ({ duration = 5000, count = 50, maxDelay = 2, burst = false }: ConfettiProps) => {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);
  const [show, setShow] = useState(true);

  useEffect(() => {
    const colors = [
      'hsl(43 70% 69%)', // gold
      'hsl(175 85% 38%)', // teal
      'hsl(210 10% 70%)', // silver
      'hsl(30 50% 50%)', // bronze
      'hsl(340 80% 60%)', // pink
      'hsl(200 80% 55%)', // blue
    ];

    const newPieces: ConfettiPiece[] = [];
    const pieceCount = burst ? count : 50;
    const delayMax = burst ? maxDelay : 2;
    
    for (let i = 0; i < pieceCount; i++) {
      newPieces.push({
        id: i,
        left: Math.random() * 100,
        color: colors[Math.floor(Math.random() * colors.length)],
        delay: Math.random() * delayMax,
        size: 8 + Math.random() * 8,
      });
    }
    setPieces(newPieces);

    const timeout = setTimeout(() => {
      setShow(false);
    }, duration);

    return () => clearTimeout(timeout);
  }, [duration, count, maxDelay, burst]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {pieces.map((piece) => (
        <div
          key={piece.id}
          className={burst ? "confetti-burst-piece" : "confetti-piece"}
          style={{
            left: `${piece.left}%`,
            backgroundColor: piece.color,
            width: `${piece.size}px`,
            height: `${piece.size}px`,
            animationDelay: `${piece.delay}s`,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
          }}
        />
      ))}
    </div>
  );
};