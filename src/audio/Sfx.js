// Synthesizes short game sounds with Web Audio nodes and remembers the player’s mute preference.
export class Sfx {
  constructor({ config, storage = globalThis.localStorage }) {
    this.config = config;
    this.storage = storage;
    this.context = null;
    this.paused = true;
    this.ambientTimer = null;
    this.dangerTimer = null;
    this.ambientStep = 0;
    this.dangerActive = false;
    this.activeVoices = new Set();
    this.ambientVoices = new Set();
    try {
      this.muted = storage?.getItem('dunhuang-run-muted') === 'true';
    } catch {
      this.muted = false;
    }
  }

  async resume() {
    this.paused = false;
    let context = this.context;
    try {
      if (!this.context) {
        const host = typeof window === 'undefined' ? globalThis : window;
        const AudioContextClass = host.AudioContext || host.webkitAudioContext;
        if (!AudioContextClass) {
          this.paused = true;
          return false;
        }
        this.context = new AudioContextClass();
        context = this.context;
      }
      await context.resume();
      if (this.paused || this.context !== context) {
        await this._suspendContext(context);
        return false;
      }
      this.startAmbient();
      this._startDangerHeartbeat();
      return true;
    } catch {
      this.paused = true;
      this.stopAmbient();
      this._stopDangerHeartbeat();
      this._stopVoices(this.activeVoices);
      await this._suspendContext(context);
      return false;
    }
  }

  async pause() {
    this.paused = true;
    this.dangerActive = false;
    this.stopAmbient();
    this._stopDangerHeartbeat();
    this._stopVoices(this.activeVoices);
    await this._suspendContext(this.context);
    return true;
  }

  async _suspendContext(context) {
    if (!context || context.state === 'suspended') return;
    try {
      await context.suspend();
    } catch {
      // Suspending is best-effort; lifecycle state still prevents new sounds from being scheduled.
    }
  }

  _trackVoice(oscillator, collection = this.activeVoices) {
    this.activeVoices.add(oscillator);
    collection.add(oscillator);
    oscillator.onended = () => {
      this.activeVoices.delete(oscillator);
      collection.delete(oscillator);
    };
  }

  _stopVoices(voices) {
    for (const oscillator of [...voices]) {
      try {
        oscillator.stop();
      } catch {
        // An oscillator may have naturally ended between scheduling and cleanup.
      }
      this.activeVoices.delete(oscillator);
      this.ambientVoices.delete(oscillator);
    }
    voices.clear();
  }

  toggleMute() {
    this.muted = !this.muted;
    try {
      this.storage?.setItem('dunhuang-run-muted', String(this.muted));
    } catch {
      // Storage can be unavailable in private browsing; audio still works in-memory.
    }
    if (this.muted) {
      this.stopAmbient();
      this._stopDangerHeartbeat();
      this._stopVoices(this.activeVoices);
    } else if (!this.paused) {
      this.startAmbient();
      this._startDangerHeartbeat();
    }
    return this.muted;
  }

  setDanger(active) {
    const next = Boolean(active);
    if (next === this.dangerActive) return;
    this.dangerActive = next;
    if (!next) {
      this._stopDangerHeartbeat();
      return;
    }
    this._startDangerHeartbeat();
  }

  startAmbient() {
    if (this.paused || this.muted || !this.context || this.ambientTimer) return;
    const scale = [220, 262, 294, 330, 392];
    this.ambientTimer = setInterval(() => {
      if (this.paused || this.muted || !this.context) return;
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      const now = this.context.currentTime;
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(scale[this.ambientStep % scale.length], now);
      gain.gain.setValueAtTime(this.config.audio.masterVolume * 0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.72);
      oscillator.connect(gain).connect(this.context.destination);
      this._trackVoice(oscillator, this.ambientVoices);
      oscillator.start(now);
      oscillator.stop(now + 0.8);
      this.ambientStep += 1;
    }, 900);
  }

  stopAmbient() {
    if (this.ambientTimer) clearInterval(this.ambientTimer);
    this.ambientTimer = null;
    this._stopVoices(this.ambientVoices);
  }

  _startDangerHeartbeat() {
    if (this.paused || !this.dangerActive || this.muted || !this.context || this.dangerTimer) return;
    this.dangerTimer = setInterval(() => {
      if (this.dangerActive && !this.muted) this.play('heartbeat');
    }, 420);
  }

  _stopDangerHeartbeat() {
    if (this.dangerTimer) clearInterval(this.dangerTimer);
    this.dangerTimer = null;
  }

  play(name) {
    if (this.paused || this.muted || !this.context) return;
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
      heartbeat: { type: 'sine', startFrequency: 92, endFrequency: 68, duration: 0.12 },
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
    this._trackVoice(oscillator);
    oscillator.start(now);
    oscillator.stop(now + profile.duration + 0.02);
  }
}
