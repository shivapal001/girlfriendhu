/**
 * Sound Service for HUD earcons using Web Audio API.
 */

class SoundService {
  private ctx: AudioContext | null = null;

  private initCtx() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  private playTone(freq: number, type: OscillatorType, duration: number, volume: number) {
    this.initCtx();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    
    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  playStartListen() {
    this.playTone(880, 'sine', 0.1, 0.1);
    setTimeout(() => this.playTone(1760, 'sine', 0.1, 0.05), 50);
  }

  playStopListen() {
    this.playTone(1760, 'sine', 0.1, 0.05);
    setTimeout(() => this.playTone(880, 'sine', 0.1, 0.1), 50);
  }

  playThinkingPulse() {
    // A tiny electronic click
    this.playTone(120, 'square', 0.05, 0.01);
  }

  playSpeechStart() {
    // Subtle white noise burst for "synthesizer power up" feel
    this.initCtx();
    if (!this.ctx) return;

    const bufferSize = this.ctx.sampleRate * 0.05;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.02, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.05);

    noise.connect(gain);
    gain.connect(this.ctx.destination);
    noise.start();
  }
}

export const sounds = new SoundService();
