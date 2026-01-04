import { useState, useEffect } from 'react';
import { Mic, MicOff, Volume2 } from 'lucide-react';
import { Avatar } from './Avatar';

interface Speaker {
  name: string;
  isSpeaking: boolean;
}

const AI_SPEAKERS = [
  'Adebayo K.', 'Chidinma U.', 'Emeka A.', 'Fatima B.', 'Grace O.',
  'Henry I.', 'Kemi L.', 'Musa N.',
];

export const VoiceRoom = () => {
  const [isMicOn, setIsMicOn] = useState(false);
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [systemMessage, setSystemMessage] = useState('');

  // Simulate AI speakers
  useEffect(() => {
    const interval = setInterval(() => {
      const numSpeakers = Math.floor(Math.random() * 3) + 1;
      const selectedSpeakers: Speaker[] = [];
      
      for (let i = 0; i < numSpeakers; i++) {
        const randomSpeaker = AI_SPEAKERS[Math.floor(Math.random() * AI_SPEAKERS.length)];
        if (!selectedSpeakers.find(s => s.name === randomSpeaker)) {
          selectedSpeakers.push({ name: randomSpeaker, isSpeaking: true });
        }
      }
      
      setSpeakers(selectedSpeakers);
      
      if (selectedSpeakers.length > 1) {
        setSystemMessage('Multiple speakers live');
      } else if (selectedSpeakers.length === 1) {
        setSystemMessage(`${selectedSpeakers[0].name.split(' ')[0]} is speaking`);
      }
    }, 2000 + Math.random() * 3000);

    return () => clearInterval(interval);
  }, []);

  // Clear system message
  useEffect(() => {
    if (systemMessage) {
      const timer = setTimeout(() => setSystemMessage(''), 2000);
      return () => clearTimeout(timer);
    }
  }, [systemMessage]);

  const toggleMic = () => {
    setIsMicOn(!isMicOn);
    if (!isMicOn) {
      setSystemMessage('You are speaking');
    }
  };

  const VoiceWave = () => (
    <div className="voice-wave h-5">
      <span style={{ height: '8px' }}></span>
      <span style={{ height: '16px' }}></span>
      <span style={{ height: '12px' }}></span>
      <span style={{ height: '18px' }}></span>
    </div>
  );

  return (
    <div className="card-premium border-primary/30 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-primary" />
          <span className="text-sm font-bold text-foreground">Live Voice Room</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-primary">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          LIVE
        </div>
      </div>

      {/* Active Speakers */}
      <div className="flex items-center gap-3 mb-3 overflow-x-auto pb-2">
        {/* User */}
        <div className="flex flex-col items-center gap-1 min-w-fit">
          <div className={`relative ${isMicOn ? 'voice-ring' : ''}`}>
            <Avatar name="You" size="md" isWinner={isMicOn} />
            {isMicOn && (
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                <VoiceWave />
              </div>
            )}
          </div>
          <span className="text-[10px] font-medium text-primary">You</span>
        </div>

        {/* AI Speakers */}
        {speakers.map((speaker, i) => (
          <div key={`${speaker.name}-${i}`} className="flex flex-col items-center gap-1 min-w-fit animate-scale-in">
            <div className={`relative ${speaker.isSpeaking ? 'voice-ring' : ''}`}>
              <Avatar name={speaker.name} size="md" isWinner={speaker.isSpeaking} />
              {speaker.isSpeaking && (
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                  <VoiceWave />
                </div>
              )}
            </div>
            <span className="text-[10px] font-medium text-muted-foreground">
              {speaker.name.split(' ')[0]}
            </span>
          </div>
        ))}
      </div>

      {/* System Message */}
      {systemMessage && (
        <div className="text-xs text-center text-primary bg-primary/10 rounded-lg py-1.5 mb-3 animate-fade-in">
          {systemMessage}
        </div>
      )}

      {/* Mic Toggle */}
      <button
        onClick={toggleMic}
        className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all ${
          isMicOn
            ? 'bg-primary text-primary-foreground glow-primary'
            : 'bg-muted/50 text-muted-foreground border border-border/50'
        }`}
      >
        {isMicOn ? (
          <>
            <Mic className="w-5 h-5" />
            <span>Mic On</span>
          </>
        ) : (
          <>
            <MicOff className="w-5 h-5" />
            <span>Turn On Mic</span>
          </>
        )}
      </button>
    </div>
  );
};
