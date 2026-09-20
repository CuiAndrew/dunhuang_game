// Synthesizes short game sounds with Web Audio nodes and remembers the player’s mute preference.
export class Sfx {
  constructor({ config, storage = globalThis.localStorage }) {
    this.config = config;
    this.storage = storage;
    this.context = null;
    this.ambientTimer = null;
    this.ambientStep = 0;
    try {
      this.muted = storage?.getItem('dunhuang-run-muted') === 'true';
    } catch {
      this.muted = false;
    }
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
    const audio = this.config.audio;
    const profiles = {
      coin: {
        type: 'triangle',
        startFrequency: audio.coinFrequency,
        endFrequency: audio.coinEndFrequency,
        duration: 0.2,
      },
      'power-up': { type: 'sine', startFrequency: 440, endFrequency: 880, duration: 0.28 },
      hit: { type: 'square', startFrequency: 120, endFrequency: 55, duration: 0.32 },
      jump: { type: 'sine', startFrequency: 320, endFrequency: 560, duration: 0.2 },
      slide: { type: 'sawtooth', startFrequency: 180, endFrequency: 90, duration: 0.18 },
      roar: { type: 'sawtooth', startFrequency: 90, endFrequency: 42, duration: 0.48 },
    };
    const profile = profiles[name] ?? { type: 'triangle', startFrequency: 220, endFrequency: 440, duration: 0.18 };
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    const now = this.context.currentTime;
    oscillator.type = profile.type;
    oscillator.frequency.setValueAtTime(profile.startFrequency, now);
    oscillator.frequency.linearRampToValueAtTime(profile.endFrequency, now + profile.duration * 0.45);
    gain.gain.setValueAtTime(audio.masterVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + profile.duration);
    oscillator.connect(gain).connect(this.context.destination);
    oscillator.start(now);
    oscillator.stop(now + profile.duration + 0.02);
  }
}
