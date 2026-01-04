import { useEffect, useState } from 'react';

interface ConfettiPiece {
  id: number;
  left: number;
  color: string;
  delay: number;
  size: number;
}

export const Confetti = ({ duration = 5000 }: { duration?: number }) => {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);
  const [show, setShow] = useState(true);

  useEffect(() => {
    const colors = [
      'hsl(43 70% 69%)', // gold
      'hsl(175 85% 38%)', // teal
      'hsl(210 10% 70%)', // silver
      'hsl(30 50% 50%)', // bronze
    ];

    const newPieces: ConfettiPiece[] = [];
    for (let i = 0; i < 50; i++) {
      newPieces.push({
        id: i,
        left: Math.random() * 100,
        color: colors[Math.floor(Math.random() * colors.length)],
        delay: Math.random() * 2,
        size: 8 + Math.random() * 8,
      });
    }
    setPieces(newPieces);

    const timeout = setTimeout(() => {
      setShow(false);
    }, duration);

    return () => clearTimeout(timeout);
  }, [duration]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {pieces.map((piece) => (
        <div
          key={piece.id}
          className="confetti-piece"
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
