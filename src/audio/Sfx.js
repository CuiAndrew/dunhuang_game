// Synthesizes short game sounds with Web Audio nodes and remembers the player’s mute preference.
export class Sfx {
  constructor({ config, storage = globalThis.localStorage }) {
    this.config = config;
    this.storage = storage;
    this.context = null;
    this.muted = storage?.getItem('dunhuang-run-muted') === 'true';
  }

  async resume() {
    if (!this.context) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.context = new AudioContextClass();
    }
    await this.context.resume();
  }

  toggleMute() {
    this.muted = !this.muted;
    this.storage?.setItem('dunhuang-run-muted', String(this.muted));
    return this.muted;
  }

  play(name) {
    if (this.muted || !this.context) return;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    const now = this.context.currentTime;
    oscillator.type = name === 'hit' ? 'square' : 'triangle';
    oscillator.frequency.setValueAtTime(name === 'coin' ? this.config.audio.coinFrequency : 220, now);
    oscillator.frequency.linearRampToValueAtTime(name === 'coin' ? this.config.audio.coinEndFrequency : 440, now + 0.08);
    gain.gain.setValueAtTime(this.config.audio.masterVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    oscillator.connect(gain).connect(this.context.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.2);
  }
}
