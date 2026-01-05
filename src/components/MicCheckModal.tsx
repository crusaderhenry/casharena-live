import { useState, useEffect, useCallback, useRef } from 'react';
import { Mic, MicOff, Volume2, VolumeX, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface MicCheckModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

export const MicCheckModal = ({ open, onOpenChange, onComplete }: MicCheckModalProps) => {
  const [step, setStep] = useState<'permission' | 'testing' | 'complete' | 'error'>('permission');
  const [micEnabled, setMicEnabled] = useState(false);
  const [speakerEnabled, setSpeakerEnabled] = useState(true);
  const [micVolume, setMicVolume] = useState(0);
  const [peakVolume, setPeakVolume] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [testDuration, setTestDuration] = useState(0);
  
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const testIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (testIntervalRef.current) {
      clearInterval(testIntervalRef.current);
      testIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;
  }, []);

  // Reset on close
  useEffect(() => {
    if (!open) {
      cleanup();
      setStep('permission');
      setMicEnabled(false);
      setMicVolume(0);
      setPeakVolume(0);
      setTestDuration(0);
      setErrorMessage('');
    }
  }, [open, cleanup]);

  // Voice activity detection
  const detectVoice = useCallback(() => {
    if (!analyserRef.current) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserRef.current.getByteFrequencyData(dataArray);

    let sum = 0;
    for (let i = 0; i < bufferLength; i++) {
      sum += dataArray[i];
    }
    const avg = sum / bufferLength / 255;
    
    setMicVolume(avg);
    setPeakVolume(prev => Math.max(prev, avg));

    animationRef.current = requestAnimationFrame(detectVoice);
  }, []);

  // Request microphone permission
  const requestMicPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;

      // Create audio context for analysis
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;

      source.connect(analyser);
      
      setMicEnabled(true);
      setStep('testing');
      
      // Start voice detection
      detectVoice();

      // Start test timer
      setTestDuration(0);
      testIntervalRef.current = setInterval(() => {
        setTestDuration(prev => prev + 1);
      }, 1000);

    } catch (error: any) {
      console.error('Microphone permission denied:', error);
      setErrorMessage(
        error.name === 'NotAllowedError' 
          ? 'Microphone access was denied. Please allow microphone access to use voice features.'
          : 'Could not access microphone. Please check your device settings.'
      );
      setStep('error');
    }
  };

  // Test speaker
  const testSpeaker = () => {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.value = 440;
    oscillator.type = 'sine';
    gainNode.gain.value = 0.1;

    oscillator.start();
    
    // Quick beep pattern
    setTimeout(() => {
      oscillator.frequency.value = 554;
    }, 100);
    setTimeout(() => {
      oscillator.frequency.value = 659;
    }, 200);
    setTimeout(() => {
      oscillator.stop();
      ctx.close();
    }, 300);
  };

  // Complete the check
  const handleComplete = () => {
    cleanup();
    setStep('complete');
    
    setTimeout(() => {
      onComplete();
      onOpenChange(false);
    }, 500);
  };

  // Skip mic check
  const handleSkip = () => {
    cleanup();
    onComplete();
    onOpenChange(false);
  };

  const micQuality = peakVolume > 0.3 ? 'great' : peakVolume > 0.15 ? 'good' : peakVolume > 0.05 ? 'low' : 'none';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mic className="w-5 h-5 text-primary" />
            Voice Check
          </DialogTitle>
          <DialogDescription>
            Test your microphone and speakers before joining the arena
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Permission Step */}
          {step === 'permission' && (
            <div className="text-center space-y-4">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Mic className="w-10 h-10 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">Enable Microphone</h3>
                <p className="text-sm text-muted-foreground">
                  We need access to your microphone so other players can hear you in the voice room.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Button onClick={requestMicPermission} className="w-full">
                  Allow Microphone Access
                </Button>
                <Button variant="ghost" onClick={handleSkip} className="w-full text-muted-foreground">
                  Skip for now
                </Button>
              </div>
            </div>
          )}

          {/* Testing Step */}
          {step === 'testing' && (
            <div className="space-y-4">
              {/* Mic Test */}
              <div className="p-4 bg-muted/50 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-full ${micEnabled ? 'bg-primary/20' : 'bg-destructive/20'}`}>
                      {micEnabled ? <Mic className="w-4 h-4 text-primary" /> : <MicOff className="w-4 h-4 text-destructive" />}
                    </div>
                    <div>
                      <p className="font-medium text-foreground text-sm">Microphone</p>
                      <p className="text-xs text-muted-foreground">Speak to test</p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">{testDuration}s</span>
                </div>

                {/* Volume Meter */}
                <div className="space-y-1">
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-75 ${
                        micVolume > 0.3 ? 'bg-primary' : 
                        micVolume > 0.15 ? 'bg-yellow-500' : 
                        micVolume > 0.05 ? 'bg-orange-500' : 
                        'bg-muted-foreground/30'
                      }`}
                      style={{ width: `${Math.min(micVolume * 100 * 2, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>Quiet</span>
                    <span>Loud</span>
                  </div>
                </div>

                {/* Peak indicator */}
                <div className={`text-center text-sm font-medium ${
                  micQuality === 'great' ? 'text-primary' :
                  micQuality === 'good' ? 'text-yellow-500' :
                  micQuality === 'low' ? 'text-orange-500' :
                  'text-muted-foreground'
                }`}>
                  {micQuality === 'great' && '🎉 Great! Your mic sounds perfect'}
                  {micQuality === 'good' && '👍 Good! Your mic is working'}
                  {micQuality === 'low' && '⚠️ Low volume - try speaking louder'}
                  {micQuality === 'none' && '🎤 Say something to test your mic...'}
                </div>
              </div>

              {/* Speaker Test */}
              <div className="p-4 bg-muted/50 rounded-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-full ${speakerEnabled ? 'bg-primary/20' : 'bg-destructive/20'}`}>
                      {speakerEnabled ? <Volume2 className="w-4 h-4 text-primary" /> : <VolumeX className="w-4 h-4 text-destructive" />}
                    </div>
                    <div>
                      <p className="font-medium text-foreground text-sm">Speakers</p>
                      <p className="text-xs text-muted-foreground">Click to test</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={testSpeaker}>
                    Test Sound
                  </Button>
                </div>
              </div>

              {/* Continue Button */}
              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={handleSkip} className="flex-1">
                  Skip
                </Button>
                <Button 
                  onClick={handleComplete} 
                  className="flex-1"
                  disabled={peakVolume < 0.05 && testDuration < 5}
                >
                  {peakVolume >= 0.05 ? 'Sounds Good!' : 'Continue Anyway'}
                </Button>
              </div>
            </div>
          )}

          {/* Complete Step */}
          {step === 'complete' && (
            <div className="text-center space-y-4 py-4">
              <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto animate-scale-in">
                <CheckCircle className="w-10 h-10 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">You're All Set!</h3>
                <p className="text-sm text-muted-foreground">
                  Your audio is ready. Good luck in the arena!
                </p>
              </div>
            </div>
          )}

          {/* Error Step */}
          {step === 'error' && (
            <div className="text-center space-y-4">
              <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
                <AlertCircle className="w-10 h-10 text-destructive" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">Microphone Error</h3>
                <p className="text-sm text-muted-foreground">{errorMessage}</p>
              </div>
              <div className="flex flex-col gap-2">
                <Button onClick={requestMicPermission} variant="outline" className="w-full">
                  Try Again
                </Button>
                <Button onClick={handleSkip} className="w-full">
                  Continue Without Mic
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
