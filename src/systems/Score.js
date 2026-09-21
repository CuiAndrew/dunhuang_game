// Owns distance, coin value and durable best-score state without coupling scoring to any UI element.
export class Score {
  constructor({ config, storage = globalThis.localStorage }) {
    this.config = config;
    this.storage = storage;
    this.distance = 0;
    this.coins = 0;
    this.total = 0;
    this.highScore = this._readHighScore();
    this.persistedHighScore = this.highScore;
    this.newRecord = false;
  }

  reset() {
    this.distance = 0;
    this.coins = 0;
    this.total = 0;
    this.newRecord = false;
  }

  updateDistance(s) {
    this.distance = Math.floor(s);
    this._recalculate();
  }

  addCoin() {
    this.coins += 1;
    this._recalculate();
  }

  commitHighScore() {
    if (this.highScore > this.persistedHighScore) {
      try {
        this.storage?.setItem(this.config.score.highScoreStorageKey, String(this.highScore));
      } catch {
        // Private browsing can reject writes; keep the score in memory for this run.
      }
      this.persistedHighScore = this.highScore;
    }
  }

  _recalculate() {
    this.total = this.distance * this.config.score.distanceValue + this.coins * this.config.score.coinValue;
    this.newRecord = this.total > this.persistedHighScore;
    this.highScore = Math.max(this.highScore, this.total);
  }

  _readHighScore() {
    let stored = '0';
    try {
      stored = this.storage?.getItem(this.config.score.highScoreStorageKey) ?? '0';
    } catch {
      stored = '0';
    }
    const saved = Number.parseInt(stored, 10);
    return Number.isFinite(saved) ? saved : 0;
  }
}
