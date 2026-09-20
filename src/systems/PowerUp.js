// Tracks magnet, shield and boost effects independently so overlapping pickups remain deterministic.
export class PowerUp {
  constructor({ config }) {
    this.config = config;
    this.magnetRemaining = 0;
    this.shieldActive = false;
    this.boostRemaining = 0;
  }

  reset() {
    this.magnetRemaining = 0;
    this.shieldActive = false;
    this.boostRemaining = 0;
  }

  activate(type) {
    if (type === 'MAGNET') {
      this.magnetRemaining = this.config.powerUp.magnetDuration;
    } else if (type === 'SHIELD') {
      this.shieldActive = true;
    } else if (type === 'BOOST') {
      this.boostRemaining = this.config.powerUp.boostDuration;
    }
  }

  update(dt) {
    this.magnetRemaining = Math.max(0, this.magnetRemaining - dt);
    this.boostRemaining = Math.max(0, this.boostRemaining - dt);
  }

  consumeShield() {
    if (!this.shieldActive) {
      return false;
    }
    this.shieldActive = false;
    return true;
  }

  get speedMultiplier() {
    return this.boostRemaining > 0 ? this.config.powerUp.boostMultiplier : 1;
  }
}
