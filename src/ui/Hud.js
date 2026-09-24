// Connects live game values to theme-owned artwork without changing the gameplay state model.
export class Hud {
  constructor({ root, assets = {} }) {
    this.root = root;
    this.distance = this._make('distance-display', 'hud-art-value', 'distance');
    this.coins = this._make('coin-display', 'hud-art-value', 'coins');
    this.score = this._make('score-display', 'hud-art-value', 'score');
    this.highScore = this._make('high-score-display', 'hud-sr-only');
    this.powerUpPanel = this._make('power-up-display', 'hud-power-up');
    this.powerUp = this._make('power-up-label', 'hud-power-up-value', 'power-up');
    this.danger = this._make('danger-vignette', 'danger-vignette');
    this.swipeHint = this._query('swipe-hint');

    this._setImage('portrait-art', assets.portrait);
    this._setImage('score-art', assets.score);
    this._setImage('distance-art', assets.distance);
    this._setImage('coin-art', assets.coins);
    this._setImage('pause-art', assets.pause);
    this._setImage('skill-art', assets.skill);
    this._setImage('swipe-art', assets.swipeHint);
    this.setSwipeHintVisible(false);
  }

  setSwipeHintVisible(visible) {
    if (this.swipeHint) this.swipeHint.hidden = !visible;
  }

  update({ score = 0, distance = 0, coins = 0, highScore = 0, powerUp, pursuerDistance = Infinity, impactRatio = 0 }) {
    this.score.textContent = this._format(score);
    this.distance.textContent = `${this._format(distance)} 米`;
    this.coins.textContent = this._format(coins);
    this.highScore.textContent = `历史最高分 ${this._format(highScore)}`;

    const powerUpLabel = powerUp?.label ?? '';
    this.powerUp.textContent = powerUpLabel;
    this.powerUpPanel.dataset.active = powerUpLabel ? 'true' : 'false';
    this.powerUpPanel.hidden = !powerUpLabel;
    const powerProgress = Math.max(0, Math.min(1, powerUp?.remainingRatio ?? 0));
    this.powerUpPanel.style.setProperty('--power-progress', `${powerProgress * 100}%`);

    const dangerActive = pursuerDistance < 6;
    this.danger.classList.toggle('danger-active', dangerActive);
    const pursuerRatio = dangerActive ? Math.min(0.72, (6 - pursuerDistance) / 8) : 0;
    this.danger.style.opacity = String(Math.max(pursuerRatio, impactRatio));
  }

  _format(value) {
    const numericValue = Number.isFinite(value) ? Math.floor(value) : 0;
    return numericValue.toLocaleString('en-US');
  }

  _query(id) {
    return this.root.querySelector?.(`#${id}`) ?? globalThis.document?.querySelector(`#${id}`) ?? null;
  }

  _make(id, className, kind = '') {
    const existing = this._query(id);
    if (existing) {
      for (const token of className.split(' ')) existing.classList.add(token);
      if (kind) existing.dataset.kind = kind;
      return existing;
    }
    const element = (this.root.ownerDocument ?? globalThis.document).createElement('div');
    element.id = id;
    element.className = className;
    if (kind) element.dataset.kind = kind;
    this.root.append(element);
    return element;
  }

  _setImage(id, assetUrl) {
    const image = this._query(id);
    if (!image) return;
    const panel = image.closest?.('.hud-art-panel') ?? image.parentElement;
    if (!assetUrl) {
      image.hidden = true;
      if (panel?.dataset) panel.dataset.artFallback = 'true';
      return;
    }
    image.hidden = false;
    if (panel?.dataset) panel.dataset.artFallback = 'false';
    image.decoding = 'async';
    image.alt = '';
    image.src = assetUrl;
    image.onerror = () => {
      image.hidden = true;
      if (panel?.dataset) panel.dataset.artFallback = 'true';
    };
  }
}
