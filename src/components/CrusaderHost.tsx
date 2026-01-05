import { Mic, Users } from 'lucide-react';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { getHostById } from '@/hooks/useCrusaderHost';

interface CrusaderHostProps {
  isLive?: boolean;
  message?: string;
}

export const CrusaderHost = ({ isLive, message }: CrusaderHostProps) => {
  const { selectedHost, secondaryHost, isCoHostMode } = usePlatformSettings();
  const host = getHostById(selectedHost);
  const coHost = secondaryHost ? getHostById(secondaryHost) : null;

  return (
    <div className="card-panel border-primary/40 bg-gradient-to-r from-primary/10 to-primary/5">
      <div className="flex items-center gap-3">
        {/* Host avatars - show both when co-hosting */}
        <div className="relative">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-teal-400 flex items-center justify-center text-2xl border-2 border-primary shadow-lg">
            {host.emoji}
          </div>
          {isCoHostMode && coHost && (
            <div className="absolute -right-2 -bottom-1 w-9 h-9 rounded-full bg-gradient-to-br from-gold to-orange-400 flex items-center justify-center text-lg border-2 border-background shadow-lg">
              {coHost.emoji}
            </div>
          )}
          {isLive && (
            <div className="absolute -top-1 -right-1">
              <span className="live-dot" />
            </div>
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            {isCoHostMode && coHost ? (
              <h3 className="font-bold text-foreground">
                {host.name} <span className="text-muted-foreground font-normal">&</span> {coHost.name}
              </h3>
            ) : (
              <h3 className="font-bold text-foreground">{host.name}</h3>
            )}
            <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-primary/20 text-primary rounded-full flex items-center gap-1">
              {isCoHostMode ? (
                <>
                  <Users className="w-3 h-3" /> Hosts
                </>
              ) : (
                <>
                  <Mic className="w-3 h-3" /> Host
                </>
              )}
            </span>
          </div>
          <p className="text-sm text-muted-foreground italic">
            {message || (isCoHostMode ? "Your hosts for the arena! 🎙️🔥" : "Your hype man for the arena! 🔥")}
          </p>
        </div>
      </div>
    </div>
  );
};
