import { useRef, useEffect, useState, useCallback } from 'react';
import { Send, Flame } from 'lucide-react';

interface SmartCommentInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (honeypotValue: string) => void;
  sending: boolean;
  disabled?: boolean;
  countdown: number;
  userAvatar?: string;
  cooldownActive?: boolean;
}

interface BehaviorSignals {
  keystrokeCount: number;
  lastKeystrokeTime: number;
  typingIntervals: number[];
  hadMouseActivity: boolean;
  hadFocusEvents: boolean;
}

export const SmartCommentInput = ({
  value,
  onChange,
  onSubmit,
  sending,
  disabled = false,
  countdown,
  userAvatar = '🎮',
  cooldownActive = false
}: SmartCommentInputProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const honeypotRef = useRef<HTMLInputElement>(null);
  const isUrgent = countdown <= 10 && countdown > 0;
  const isCritical = countdown <= 5 && countdown > 0;
  
  // Behavioral tracking
  const [behavior, setBehavior] = useState<BehaviorSignals>({
    keystrokeCount: 0,
    lastKeystrokeTime: 0,
    typingIntervals: [],
    hadMouseActivity: false,
    hadFocusEvents: false,
  });

  // Keep focus on input
  useEffect(() => {
    if (!disabled && !cooldownActive) {
      inputRef.current?.focus();
    }
  }, [disabled, cooldownActive]);

  // Track mouse activity
  const handleMouseMove = useCallback(() => {
    setBehavior(prev => ({ ...prev, hadMouseActivity: true }));
  }, []);

  // Track focus events
  const handleFocus = useCallback(() => {
    setBehavior(prev => ({ ...prev, hadFocusEvents: true }));
  }, []);

  const getPlaceholder = () => {
    if (cooldownActive) return 'Wait...';
    if (countdown === 0) return 'Game paused...';
    if (isCritical) return '🔥 NOW NOW NOW!';
    if (isUrgent) return '⚡ Quick! Type to survive!';
    return 'Type to stay alive...';
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Track keystroke intervals for behavioral analysis
    const now = Date.now();
    if (behavior.lastKeystrokeTime > 0) {
      const interval = now - behavior.lastKeystrokeTime;
      setBehavior(prev => ({
        ...prev,
        keystrokeCount: prev.keystrokeCount + 1,
        lastKeystrokeTime: now,
        typingIntervals: [...prev.typingIntervals.slice(-10), interval],
      }));
    } else {
      setBehavior(prev => ({
        ...prev,
        keystrokeCount: prev.keystrokeCount + 1,
        lastKeystrokeTime: now,
      }));
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    const honeypotValue = honeypotRef.current?.value || '';
    onSubmit(honeypotValue);
    // Reset behavioral signals after submit
    setBehavior({
      keystrokeCount: 0,
      lastKeystrokeTime: 0,
      typingIntervals: [],
      hadMouseActivity: false,
      hadFocusEvents: false,
    });
  };

  const isDisabled = disabled || cooldownActive;

  return (
    <div 
      className={`flex items-center gap-2 p-2 rounded-2xl transition-all ${
        isCritical 
          ? 'bg-destructive/20 ring-2 ring-destructive animate-pulse' 
          : isUrgent 
            ? 'bg-orange-500/10 ring-2 ring-orange-500/50' 
            : 'bg-muted/80'
      }`}
      onMouseMove={handleMouseMove}
    >
      {/* User avatar */}
      <div className="shrink-0 w-10 h-10 rounded-full bg-muted flex items-center justify-center text-lg">
        {userAvatar}
      </div>
      
      {/* Honeypot field - hidden from humans, attractive to bots */}
      <input
        ref={honeypotRef}
        type="text"
        name="website"
        autoComplete="off"
        tabIndex={-1}
        className="absolute -left-[9999px] opacity-0 pointer-events-none"
        aria-hidden="true"
      />
      
      {/* Input field */}
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        placeholder={getPlaceholder()}
        disabled={isDisabled}
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
        onClick={handleSubmit}
        disabled={sending || isDisabled || !value.trim()}
        className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all disabled:opacity-40 ${
          isCritical 
            ? 'bg-destructive text-destructive-foreground' 
            : isUrgent 
              ? 'bg-orange-500 text-white' 
              : 'bg-primary text-primary-foreground'
        }`}
      >
        {sending || cooldownActive ? (
          <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
        ) : (
          <Send className="w-4 h-4" />
        )}
      </button>
    </div>
  );
};
