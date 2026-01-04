import { Mic } from 'lucide-react';

interface CrusaderHostProps {
  isLive?: boolean;
  message?: string;
}

export const CrusaderHost = ({ isLive, message }: CrusaderHostProps) => {
  return (
    <div className="card-panel border-primary/40 bg-gradient-to-r from-primary/10 to-primary/5">
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-teal-400 flex items-center justify-center text-2xl border-2 border-primary shadow-lg">
            🎙️
          </div>
          {isLive && (
            <div className="absolute -top-1 -right-1">
              <span className="live-dot" />
            </div>
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-foreground">Crusader</h3>
            <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-primary/20 text-primary rounded-full flex items-center gap-1">
              <Mic className="w-3 h-3" /> Host
            </span>
          </div>
          <p className="text-sm text-muted-foreground italic">
            {message || "Your hype man for the arena! 🔥"}
          </p>
        </div>
      </div>
    </div>
  );
};
