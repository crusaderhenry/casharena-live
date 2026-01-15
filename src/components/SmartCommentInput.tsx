import { useRef, useEffect } from 'react';
import { Send, Flame } from 'lucide-react';

interface SmartCommentInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  sending: boolean;
  disabled?: boolean;
  countdown: number;
  userAvatar?: string;
}

export const SmartCommentInput = ({
  value,
  onChange,
  onSubmit,
  sending,
  disabled = false,
  countdown,
  userAvatar = '🎮'
}: SmartCommentInputProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const isUrgent = countdown <= 10 && countdown > 0;
  const isCritical = countdown <= 5 && countdown > 0;

  // Keep focus on input
  useEffect(() => {
    if (!disabled) {
      inputRef.current?.focus();
    }
  }, [disabled]);

  const getPlaceholder = () => {
    if (countdown === 0) return 'Game paused...';
    if (isCritical) return '🔥 NOW NOW NOW!';
    if (isUrgent) return '⚡ Quick! Type to survive!';
    return 'Type to stay alive...';
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className={`flex items-center gap-2 p-2 rounded-2xl transition-all ${
      isCritical 
        ? 'bg-destructive/20 ring-2 ring-destructive animate-pulse' 
        : isUrgent 
          ? 'bg-orange-500/10 ring-2 ring-orange-500/50' 
          : 'bg-muted/80'
    }`}>
      {/* User avatar */}
      <div className="shrink-0 w-10 h-10 rounded-full bg-muted flex items-center justify-center text-lg">
        {userAvatar}
      </div>
      
      {/* Input field */}
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={getPlaceholder()}
        disabled={disabled}
        maxLength={200}
        className={`flex-1 bg-transparent border-none outline-none text-sm text-foreground placeholder:transition-colors ${
          isCritical 
            ? 'placeholder:text-destructive placeholder:font-bold' 
            : isUrgent 
              ? 'placeholder:text-orange-400' 
              : 'placeholder:text-muted-foreground'
        }`}
      />
      
      {/* Urgency indicator */}
      {isUrgent && (
        <Flame className={`w-5 h-5 shrink-0 ${
          isCritical ? 'text-destructive animate-bounce' : 'text-orange-400'
        }`} />
      )}
      
      {/* Send button */}
      <button
        onClick={onSubmit}
        disabled={sending || disabled || !value.trim()}
        className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all disabled:opacity-40 ${
          isCritical 
            ? 'bg-destructive text-destructive-foreground' 
            : isUrgent 
              ? 'bg-orange-500 text-white' 
              : 'bg-primary text-primary-foreground'
        }`}
      >
        {sending ? (
          <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
        ) : (
          <Send className="w-4 h-4" />
        )}
      </button>
    </div>
  );
};
