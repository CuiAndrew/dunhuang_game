// Generates pooled coin strings and sparse power-ups on predictable arc-length intervals.
export class PickupSpawner {
  constructor({ config, random = Math.random }) {
    this.config = config;
    this.random = random;
    this.coins = [];
    this.powerUps = [];
    this.nextCoinS = config.spawn.coinGroupGapMin;
    this.nextPowerUpS = config.powerUp.pickupGapMin;
  }

  ensureAhead(playerS, distanceAhead) {
    const targetS = playerS + distanceAhead;
    while (this.nextCoinS < targetS) {
      this._spawnCoinGroup();
    }
    while (this.nextPowerUpS < targetS) {
      this.powerUps.push({ s: this.nextPowerUpS, lane: Math.floor(this.random() * this.config.laneOffsets.length), type: this._pickPowerUp(), collected: false });
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
        onCollect(coin);
      }
    }
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
      this.coins.push({ s: this.nextCoinS + index * spawn.coinSpacing, lane, collected: false });
    }
    this.nextCoinS += count * spawn.coinSpacing + spawn.coinGroupGapMin
      + this.random() * spawn.coinGroupGapVariance;
  }

  _pickPowerUp() {
    const types = this.config.powerUp.pickupTypes;
    return types[Math.floor(this.random() * types.length)];
  }
}
