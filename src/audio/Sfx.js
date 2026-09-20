// Synthesizes short game sounds with Web Audio nodes and remembers the player’s mute preference.
export class Sfx {
  constructor({ config, storage = globalThis.localStorage }) {
    this.config = config;
    this.storage = storage;
    this.context = null;
    this.ambientTimer = null;
    this.ambientStep = 0;
    this.muted = storage?.getItem('dunhuang-run-muted') === 'true';
  }

  async resume() {
    try {
      if (!this.context) {
        const host = typeof window === 'undefined' ? globalThis : window;
        const AudioContextClass = host.AudioContext || host.webkitAudioContext;
        if (!AudioContextClass) return false;
        this.context = new AudioContextClass();
      }
      await this.context.resume();
      this.startAmbient();
      return true;
    } catch {
      this.context = null;
      return false;
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    try {
      this.storage?.setItem('dunhuang-run-muted', String(this.muted));
    } catch {
      // Storage can be unavailable in private browsing; audio still works in-memory.
    }
    if (this.muted) this.stopAmbient();
    else this.startAmbient();
    return this.muted;
  }

  startAmbient() {
    if (this.muted || !this.context || this.ambientTimer) return;
    const scale = [220, 262, 294, 330, 392];
    this.ambientTimer = setInterval(() => {
      if (this.muted || !this.context) return;
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      const now = this.context.currentTime;
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(scale[this.ambientStep % scale.length], now);
      gain.gain.setValueAtTime(this.config.audio.masterVolume * 0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.72);
      oscillator.connect(gain).connect(this.context.destination);
      oscillator.start(now);
      oscillator.stop(now + 0.8);
      this.ambientStep += 1;
    }, 900);
  }

  stopAmbient() {
    if (this.ambientTimer) clearInterval(this.ambientTimer);
    this.ambientTimer = null;
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
