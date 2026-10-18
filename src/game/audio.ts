/** Small, locally synthesized engine; starts only after an explicit sound-button gesture. */
export class EngineAudio {
  private context: AudioContext | null = null;
  private oscillator: OscillatorNode | null = null;
  private gain: GainNode | null = null;
  enabled = false;
  async toggle(): Promise<boolean> {
    if (!this.context) {
      this.context = new AudioContext();
      this.oscillator = this.context.createOscillator();
      this.oscillator.type = "sawtooth";
      const filter = this.context.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 400;
      this.gain = this.context.createGain();
      this.gain.gain.value = 0;
      this.oscillator.connect(filter);
      filter.connect(this.gain);
      this.gain.connect(this.context.destination);
      this.oscillator.start();
    }
    await this.context.resume();
    this.enabled = !this.enabled;
    this.update(0, false, false);
    return this.enabled;
  }
  update(speed: number, active: boolean, boosting: boolean) {
    if (!this.context || !this.oscillator || !this.gain) return;
    this.oscillator.frequency.setTargetAtTime(
      34 + speed * 1.7 + (boosting ? 35 : 0),
      this.context.currentTime,
      0.12,
    );
    this.gain.gain.setTargetAtTime(
      this.enabled && active ? 0.035 : 0,
      this.context.currentTime,
      0.06,
    );
  }
  dispose() {
    void this.context?.close();
  }
}
