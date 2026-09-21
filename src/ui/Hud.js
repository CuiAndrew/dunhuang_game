// Updates the fixed DOM HUD for distance, coins, score, power-ups and pursuer danger.
export class Hud {
  constructor({ root }) {
    this.root = root;
    this.distance = this._make('distance-display', 'hud-value hud-badge', 'distance');
    this.coins = this._make('coin-display', 'hud-value hud-badge', 'coins');
    this.highScore = this._make('high-score-display', 'hud-value hud-badge', 'score');
    this.powerUp = this._make('power-up-display', 'hud-power-up hud-badge', 'power-up');
    this.danger = this._make('danger-vignette', 'danger-vignette');
  }

  update({ distance, coins, highScore, powerUp, pursuerDistance, impactRatio = 0 }) {
    this.distance.textContent = `距离 ${Math.floor(distance)} m`;
    this.coins.textContent = `◈ ${coins}`;
    this.highScore.textContent = `最高分 ${Math.floor(highScore)}`;
    this.powerUp.textContent = powerUp?.label ?? '';
    this.powerUp.dataset.active = powerUp?.label ? 'true' : 'false';
    this.powerUp.style.setProperty('--power-progress', `${Math.max(0, Math.min(1, powerUp?.remainingRatio ?? 0)) * 100}%`);
    const dangerActive = pursuerDistance < 6;
    this.danger.classList.toggle('danger-active', dangerActive);
    const pursuerRatio = dangerActive ? Math.min(0.72, (6 - pursuerDistance) / 8) : 0;
    this.danger.style.opacity = String(Math.max(pursuerRatio, impactRatio));
  }

  _make(id, className, kind = '') {
    const existing = document.querySelector(`#${id}`);
    if (existing) {
      for (const token of className.split(' ')) existing.classList.add(token);
      if (kind) existing.dataset.kind = kind;
      return existing;
    }
    const element = document.createElement('div');
    element.id = id;
    element.className = className;
    if (kind) element.dataset.kind = kind;
    this.root.append(element);
    return element;
  }
}
