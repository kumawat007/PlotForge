/**
 * Synthesizes authentic 3D printer / pen plotter stepper motor acoustics
 * and mechanical pen-up/pen-down clicks using pure Web Audio API.
 * Zero external audio assets or audio files required.
 */

class PlotterAudioEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private volume: number = 0.35;

  private stepperOsc: OscillatorNode | null = null;
  private stepperGain: GainNode | null = null;
  private masterGain: GainNode | null = null;
  private frictionNoiseGain: GainNode | null = null;

  private initContext() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.isMuted ? 0 : this.volume;
      this.masterGain.connect(this.ctx.destination);

      // 1. Stepper Motor Tone (Harmonic Pulse)
      this.stepperOsc = this.ctx.createOscillator();
      this.stepperOsc.type = 'triangle';
      this.stepperOsc.frequency.value = 220;

      this.stepperGain = this.ctx.createGain();
      this.stepperGain.gain.value = 0;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 1600;

      this.stepperOsc.connect(this.stepperGain);
      this.stepperGain.connect(filter);
      filter.connect(this.masterGain);
      this.stepperOsc.start();

      // 2. Pen Nib Paper Friction Pink Noise
      const bufferSize = this.ctx.sampleRate * 2;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        output[i] = (b0 + b1 + b2) * 0.1;
      }

      const noiseSource = this.ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;
      noiseSource.loop = true;

      const noiseFilter = this.ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.value = 2400;
      noiseFilter.Q.value = 1.2;

      this.frictionNoiseGain = this.ctx.createGain();
      this.frictionNoiseGain.gain.value = 0;

      noiseSource.connect(noiseFilter);
      noiseFilter.connect(this.frictionNoiseGain);
      this.frictionNoiseGain.connect(this.masterGain);
      noiseSource.start();
    } catch {
      // AudioContext not supported or restricted
    }
  }

  public ensureRunning() {
    if (!this.ctx) {
      this.initContext();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public playPenClick(isDown: boolean) {
    if (this.isMuted) return;
    this.ensureRunning();
    if (!this.ctx || !this.masterGain) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = isDown ? 'sine' : 'square';
      const startFreq = isDown ? 450 : 750;
      const endFreq = isDown ? 120 : 350;

      osc.frequency.setValueAtTime(startFreq, now);
      osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.04);

      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.05);
    } catch {
      // ignore
    }
  }

  public updateMotion(speedRatio: number, isPenDown: boolean) {
    if (this.isMuted) return;
    this.ensureRunning();
    if (!this.ctx || !this.stepperOsc || !this.stepperGain || !this.frictionNoiseGain) return;

    const now = this.ctx.currentTime;
    if (speedRatio <= 0.01) {
      this.stepperGain.gain.setTargetAtTime(0, now, 0.05);
      this.frictionNoiseGain.gain.setTargetAtTime(0, now, 0.05);
      return;
    }

    // Dynamic pitch based on simulated head speed (150 Hz to 850 Hz)
    const targetFreq = 160 + speedRatio * 550;
    this.stepperOsc.frequency.setTargetAtTime(targetFreq, now, 0.04);

    const stepperVol = isPenDown ? 0.15 : 0.22;
    this.stepperGain.gain.setTargetAtTime(stepperVol, now, 0.04);

    // Friction noise only when pen is on paper
    const frictionVol = isPenDown ? 0.18 : 0;
    this.frictionNoiseGain.gain.setTargetAtTime(frictionVol, now, 0.06);
  }

  public stopAll() {
    if (!this.ctx || !this.stepperGain || !this.frictionNoiseGain) return;
    const now = this.ctx.currentTime;
    this.stepperGain.gain.setTargetAtTime(0, now, 0.05);
    this.frictionNoiseGain.gain.setTargetAtTime(0, now, 0.05);
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime, 0.05);
    }
    if (this.isMuted) {
      this.stopAll();
    }
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx && !this.isMuted) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05);
    }
  }

  public getVolume(): number {
    return this.volume;
  }
}

export const plotterAudio = new PlotterAudioEngine();
