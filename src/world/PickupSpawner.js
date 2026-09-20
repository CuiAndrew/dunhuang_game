// Generates pooled coin strings and sparse power-ups on predictable arc-length intervals.
export class PickupSpawner {
  constructor({ config, random = Math.random, createCoinVisual = () => null, createPowerUpVisual = () => null }) {
    this.config = config;
    this.random = random;
    this.coins = [];
    this.powerUps = [];
    this.nextCoinS = config.spawn.coinGroupGapMin;
    this.nextPowerUpS = config.powerUp.pickupGapMin;
    this.createCoinVisual = createCoinVisual;
    this.createPowerUpVisual = createPowerUpVisual;
  }

  ensureAhead(playerS, distanceAhead) {
    const targetS = playerS + distanceAhead;
    while (this.nextCoinS < targetS) {
      this._spawnCoinGroup();
    }
    while (this.nextPowerUpS < targetS) {
      const type = this._pickPowerUp();
      this.powerUps.push({ s: this.nextPowerUpS, lane: Math.floor(this.random() * this.config.laneOffsets.length), type, collected: false, visual: this.createPowerUpVisual(type) });
      this.nextPowerUpS += this.config.powerUp.pickupGapMin
        + this.random() * (this.config.powerUp.pickupGapMax - this.config.powerUp.pickupGapMin);
    }
  }

  reset() {
    this.coins.length = 0;
    this.powerUps.length = 0;
    this.nextCoinS = this.config.spawn.coinGroupGapMin;
    this.nextPowerUpS = this.config.powerUp.pickupGapMin;
  }

  recycleBefore(s) {
    this.coins = this.coins.filter((coin) => coin.s >= s && !coin.collected);
    this.powerUps = this.powerUps.filter((powerUp) => powerUp.s >= s && !powerUp.collected);
  }

  collectCoins(runner, onCollect) {
    const radius = this.config.powerUp.magnetRadius;
    for (const coin of this.coins) {
      if (!coin.collected && Math.abs(coin.s - runner.s) <= radius && Math.abs(coin.lane - runner.lateral) <= radius) {
        coin.collected = true;
        coin.visual && (coin.visual.visible = false);
        onCollect(coin);
      }
    }
  }

  collectPowerUps(runner, onCollect) {
    for (const powerUp of this.powerUps) {
      if (!powerUp.collected && Math.abs(powerUp.s - runner.s) <= this.config.powerUp.magnetRadius && Math.abs(powerUp.lane - runner.lateral) <= this.config.powerUp.magnetRadius) {
        powerUp.collected = true;
        powerUp.visual && (powerUp.visual.visible = false);
        onCollect(powerUp);
      }
    }
  }

  forEachActive(callback) {
    for (const coin of this.coins) callback(coin, 'COIN');
    for (const powerUp of this.powerUps) callback(powerUp, 'POWER_UP');
  }

  getCoinSnapshots() {
    return this.coins.map((coin) => ({ s: coin.s, lane: coin.lane, collected: coin.collected }));
  }

  getPowerUpSnapshots() {
    return this.powerUps.map((powerUp) => ({ s: powerUp.s, lane: powerUp.lane, type: powerUp.type, collected: powerUp.collected }));
  }

  _spawnCoinGroup() {
    const spawn = this.config.spawn;
    const count = spawn.coinPerGroup[0] + Math.floor(this.random() * (spawn.coinPerGroup[1] - spawn.coinPerGroup[0] + 1));
    const lane = Math.floor(this.random() * this.config.laneOffsets.length);
    for (let index = 0; index < count; index += 1) {
      this.coins.push({ s: this.nextCoinS + index * spawn.coinSpacing, lane, collected: false, visual: this.createCoinVisual() });
    }
    this.nextCoinS += count * spawn.coinSpacing + spawn.coinGroupGapMin
      + this.random() * spawn.coinGroupGapVariance;
  }

  _pickPowerUp() {
    const types = this.config.powerUp.pickupTypes;
    return types[Math.floor(this.random() * types.length)];
  }
}
