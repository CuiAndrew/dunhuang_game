// Generates fixed-pool coin strings and sparse power-ups on predictable arc-length intervals.
export class PickupSpawner {
  constructor({ config, random = Math.random, createCoinVisual = () => null, createPowerUpVisual = () => null }) {
    this.config = config;
    this.random = random;
    this.createCoinVisual = createCoinVisual;
    this.createPowerUpVisual = createPowerUpVisual;
    this.coins = [];
    this.powerUps = [];
    this.freeCoins = [];
    this.freePowerUps = [];
    for (let index = 0; index < config.spawn.coinPoolSize; index += 1) {
      this.freeCoins.push({ s: 0, lane: 0, collected: false, visual: createCoinVisual() });
    }
    for (let index = 0; index < config.spawn.powerUpPoolSize; index += 1) {
      this.freePowerUps.push({ s: 0, lane: 0, type: 'MAGNET', collected: false, visual: createPowerUpVisual('MAGNET') });
    }
    this.nextCoinS = config.spawn.coinGroupGapMin;
    this.nextPowerUpS = config.powerUp.pickupGapMin;
  }

  ensureAhead(playerS, distanceAhead) {
    const targetS = playerS + distanceAhead;
    while (this.nextCoinS < targetS) this._spawnCoinGroup();
    while (this.nextPowerUpS < targetS) {
      const powerUp = this._acquirePowerUp();
      if (powerUp) {
        powerUp.s = this.nextPowerUpS;
        powerUp.lane = Math.floor(this.random() * this.config.laneOffsets.length);
        powerUp.type = this._pickPowerUp();
        powerUp.collected = false;
        powerUp.visual?.setType?.(powerUp.type);
        if (powerUp.visual) powerUp.visual.visible = true;
      }
      this.nextPowerUpS += this.config.powerUp.pickupGapMin
        + this.random() * (this.config.powerUp.pickupGapMax - this.config.powerUp.pickupGapMin);
    }
  }

  reset() {
    while (this.coins.length > 0) this._releaseCoin(this.coins.length - 1);
    while (this.powerUps.length > 0) this._releasePowerUp(this.powerUps.length - 1);
    this.nextCoinS = this.config.spawn.coinGroupGapMin;
    this.nextPowerUpS = this.config.powerUp.pickupGapMin;
  }

  recycleBefore(s) {
    let coinIndex = 0;
    while (coinIndex < this.coins.length) {
      if (this.coins[coinIndex].s < s || this.coins[coinIndex].collected) this._releaseCoin(coinIndex);
      else coinIndex += 1;
    }
    let powerUpIndex = 0;
    while (powerUpIndex < this.powerUps.length) {
      if (this.powerUps[powerUpIndex].s < s || this.powerUps[powerUpIndex].collected) this._releasePowerUp(powerUpIndex);
      else powerUpIndex += 1;
    }
  }

  collectCoins(runner, onCollect) {
    const radius = this.config.powerUp.magnetRadius;
    for (const coin of this.coins) {
      const laneOffset = this.config.laneOffsets[coin.lane];
      if (!coin.collected && Math.abs(coin.s - runner.s) <= radius && Math.abs(laneOffset - runner.lateral) <= radius) {
        coin.collected = true;
        coin.visual && (coin.visual.visible = false);
        onCollect(coin);
      }
    }
  }

  collectPowerUps(runner, onCollect) {
    for (const powerUp of this.powerUps) {
      const laneOffset = this.config.laneOffsets[powerUp.lane];
      if (!powerUp.collected && Math.abs(powerUp.s - runner.s) <= this.config.powerUp.magnetRadius && Math.abs(laneOffset - runner.lateral) <= this.config.powerUp.magnetRadius) {
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

  poolStats() {
    return {
      activeCoins: this.coins.length,
      freeCoins: this.freeCoins.length,
      activePowerUps: this.powerUps.length,
      freePowerUps: this.freePowerUps.length,
    };
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
    const isArc = this.random() < spawn.coinArcProbability;
    const arcStart = this.random() < 0.5 ? 0 : 2;
    const arcPattern = arcStart === 0 ? [0, 1, 2, 1, 0] : [2, 1, 0, 1, 2];
    for (let index = 0; index < count; index += 1) {
      const coin = this._acquireCoin();
      if (!coin) break;
      coin.s = this.nextCoinS + index * spawn.coinSpacing;
      coin.lane = isArc ? arcPattern[index % arcPattern.length] : lane;
      coin.collected = false;
      if (coin.visual) coin.visual.visible = true;
    }
    this.nextCoinS += count * spawn.coinSpacing + spawn.coinGroupGapMin
      + this.random() * spawn.coinGroupGapVariance;
  }

  _acquireCoin() {
    const coin = this.freeCoins.pop();
    if (coin) this.coins.push(coin);
    return coin;
  }

  _releaseCoin(index) {
    const last = this.coins.length - 1;
    const coin = this.coins[index];
    this.coins[index] = this.coins[last];
    this.coins.pop();
    coin.collected = false;
    if (coin.visual) coin.visual.visible = false;
    this.freeCoins.push(coin);
  }

  _acquirePowerUp() {
    const powerUp = this.freePowerUps.pop();
    if (powerUp) this.powerUps.push(powerUp);
    return powerUp;
  }

  _releasePowerUp(index) {
    const last = this.powerUps.length - 1;
    const powerUp = this.powerUps[index];
    this.powerUps[index] = this.powerUps[last];
    this.powerUps.pop();
    powerUp.collected = false;
    if (powerUp.visual) powerUp.visual.visible = false;
    this.freePowerUps.push(powerUp);
  }

  _pickPowerUp() {
    const types = this.config.powerUp.pickupTypes;
    return types[Math.floor(this.random() * types.length)];
  }
}
