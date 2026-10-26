export class SoundManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private enabled = true;

  private initCtx() {
    if (!this.enabled || typeof window === "undefined") return null;
    try {
      if (!this.ctx || this.ctx.state === "closed") {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext;
        if (!AudioCtx) return null;
        this.ctx = new AudioCtx();
        this.master = this.ctx.createGain();
        this.master.gain.setValueAtTime(0.65, this.ctx.currentTime);
        this.master.connect(this.ctx.destination);
      }
      if (this.ctx.state === "suspended") {
        // Autoplay permission must be requested inside a pointer/key gesture.
        void this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    } catch {
      // Audio is optional, including on devices without a usable output device.
      return null;
    }
  }

  public unlock() {
    this.initCtx();
  }

  public setEnabled(value: boolean) {
    this.enabled = value;
    try {
      if (this.ctx && this.master) {
        this.master.gain.cancelScheduledValues(this.ctx.currentTime);
        this.master.gain.setValueAtTime(value ? 0.65 : 0, this.ctx.currentTime);
      }
    } catch {
      // A closed output device must not affect the game or the mute control.
    }
  }

  public isEnabled() {
    return this.enabled;
  }

  private tone(
    frequency: number,
    duration: number,
    volume = 0.2,
    delay = 0,
    type: OscillatorType = "sine",
    endFrequency?: number,
  ) {
    const ctx = this.initCtx();
    if (!ctx || !this.master || !this.enabled) return;
    try {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = ctx.currentTime + delay;
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, start);
      if (endFrequency)
        oscillator.frequency.exponentialRampToValueAtTime(
          endFrequency,
          start + duration,
        );
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.exponentialRampToValueAtTime(volume, start + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
      oscillator.connect(gain);
      gain.connect(this.master);
      oscillator.onended = () => {
        oscillator.disconnect();
        gain.disconnect();
      };
      oscillator.start(start);
      oscillator.stop(start + duration + 0.01);
    } catch {
      // The visual notification and chess move remain usable if audio fails.
    }
  }

  public playMove() {
    this.tone(320, 0.065, 0.3, 0, "triangle", 140);
  }

  public playCapture() {
    this.tone(450, 0.1, 0.4, 0, "sine", 90);
  }

  public playCheck() {
    this.tone(600, 0.15);
    this.tone(900, 0.15, 0.2, 0.07);
  }

  public playCastle() {
    this.tone(320, 0.065, 0.3, 0, "triangle", 140);
    this.tone(320, 0.065, 0.3, 0.09, "triangle", 140);
  }

  public playVictory() {
    for (const [index, frequency] of [523.25, 659.25, 783.99, 1046.5].entries())
      this.tone(frequency, 0.3, 0.2, index * 0.1, "triangle");
  }

  public playJoin() {
    this.tone(587.33, 0.16, 0.16);
    this.tone(783.99, 0.22, 0.16, 0.1);
  }

  public playLeave() {
    this.tone(440, 0.15, 0.12);
    this.tone(329.63, 0.2, 0.12, 0.1);
  }

  public playYourTurn() {
    this.tone(659.25, 0.09, 0.11);
    this.tone(880, 0.13, 0.11, 0.08);
  }
}

export const sounds = new SoundManager();
