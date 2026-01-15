// Simple sound effects using Web Audio API for admin dashboard
// No external API calls needed - generates sounds client-side

class AdminAudioManager {
  private audioContext: AudioContext | null = null;
  private enabled: boolean = true;

  private getContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }
    return this.audioContext;
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  // Simple beep sound for new comments
  playBeep(frequency: number = 800, duration: number = 0.1, volume: number = 0.3) {
    if (!this.enabled) return;
    
    try {
      const ctx = this.getContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

      gainNode.gain.setValueAtTime(volume, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + duration);
    } catch (e) {
      console.log('Audio playback failed:', e);
    }
  }

  // New comment notification - pleasant chirp
  playNewComment() {
    this.playBeep(1200, 0.08, 0.2);
    setTimeout(() => this.playBeep(1400, 0.08, 0.15), 80);
  }

  // Timer warning - low urgency
  playTimerWarning() {
    this.playBeep(600, 0.15, 0.25);
  }

  // Timer critical - high urgency alarm
  playTimerCritical() {
    this.playBeep(800, 0.1, 0.4);
    setTimeout(() => this.playBeep(600, 0.1, 0.3), 150);
  }

  // Timer danger - very urgent
  playTimerDanger() {
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        this.playBeep(1000, 0.08, 0.5);
        setTimeout(() => this.playBeep(800, 0.08, 0.4), 100);
      }, i * 200);
    }
  }

  // Game started fanfare
  playGameStart() {
    const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      setTimeout(() => this.playBeep(freq, 0.15, 0.3), i * 100);
    });
  }

  // Game ended sound
  playGameEnd() {
    this.playBeep(523, 0.3, 0.4);
    setTimeout(() => this.playBeep(392, 0.4, 0.3), 300);
  }

  // Leader change notification
  playLeaderChange() {
    this.playBeep(880, 0.1, 0.25);
    setTimeout(() => this.playBeep(1100, 0.15, 0.3), 100);
  }

  // Drumroll effect for winner reveal (plays for specified duration)
  playDrumroll(durationMs: number = 4000) {
    if (!this.enabled) return;

    const interval = 60; // ms between hits
    const totalHits = Math.floor(durationMs / interval);
    let hitCount = 0;

    const drumrollInterval = setInterval(() => {
      if (hitCount >= totalHits) {
        clearInterval(drumrollInterval);
        return;
      }

      // Vary frequency slightly for natural feel
      const baseFreq = 180 + Math.random() * 40;
      // Gradually increase volume as we approach the end
      const progress = hitCount / totalHits;
      const volume = 0.1 + progress * 0.25;
      
      this.playBeep(baseFreq, 0.04, volume);
      
      // Occasionally add a higher accent hit
      if (Math.random() < 0.15) {
        setTimeout(() => this.playBeep(baseFreq * 1.5, 0.03, volume * 0.7), 20);
      }

      hitCount++;
    }, interval);

    return drumrollInterval;
  }

  // Stop drumroll (pass the interval returned from playDrumroll)
  stopDrumroll(intervalId: ReturnType<typeof setInterval>) {
    if (intervalId) {
      clearInterval(intervalId);
    }
  }
}

export const adminAudio = new AdminAudioManager();
