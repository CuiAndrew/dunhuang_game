// Updates the fixed DOM HUD for distance, coins, score, power-ups and pursuer danger.
export class Hud {
  constructor({ root }) {
    this.root = root;
    this.distance = this._make('distance-display', 'hud-value');
    this.coins = this._make('coin-display', 'hud-value');
    this.highScore = this._make('high-score-display', 'hud-value');
    this.powerUp = this._make('power-up-display', 'hud-power-up');
    this.danger = this._make('danger-vignette', 'danger-vignette');
  }

  update({ distance, coins, highScore, powerUp, pursuerDistance }) {
    this.distance.textContent = `距离 ${Math.floor(distance)} m`;
    this.coins.textContent = `◈ ${coins}`;
    this.highScore.textContent = `最高分 ${Math.floor(highScore)}`;
    this.powerUp.textContent = powerUp?.label ?? '';
    this.powerUp.style.setProperty('--power-progress', `${Math.max(0, Math.min(1, powerUp?.remainingRatio ?? 0)) * 100}%`);
    this.danger.style.opacity = pursuerDistance < 6 ? String(Math.min(0.72, (6 - pursuerDistance) / 8)) : '0';
  }

  _make(id, className) {
    const existing = document.querySelector(`#${id}`);
    if (existing) {
      return existing;
    }
    const element = document.createElement('div');
    element.id = id;
    element.className = className;
    this.root.append(element);
    return element;
  }
}
