// Owns menu, pause and result overlays while keeping focusable actions native and predictable.
export class Screens {
  constructor({ layer, onStart, onResume, onRestart, assets = {} }) {
    this.layer = layer;
    this.onStart = onStart;
    this.onResume = onResume;
    this.onRestart = onRestart;
    this.assets = assets;
    this.renderMenu();
  }

  _asset(name) {
    const value = this.assets?.[name];
    return typeof value === 'string' && value.trim() !== '' ? value : '';
  }

  _image(name, className) {
    const src = this._asset(name);
    return src
      ? `<img class="${className}" src="${src}" alt="" aria-hidden="true" />`
      : '';
  }

  _actionButton(id, label, { image = false, className = '' } = {}) {
    const artwork = image ? this._image('startButton', 'screen-button-art') : '';
    const imageClass = artwork ? ' screen-image-button' : '';
    return `<button id="${id}" class="seal-button screen-action-button${imageClass}${className ? ` ${className}` : ''}" type="button">
      ${artwork}
      <span>${label}</span>
    </button>`;
  }

  _panel(content, state, { className = '', panelArt = '', artReady = Boolean(panelArt), decorations = false } = {}) {
    const decoration = decorations ? `
      <div class="screen-decoration cloud-motif" aria-hidden="true"></div>
      <div class="screen-decoration flying-ribbon" aria-hidden="true"></div>` : '';
    return `<div class="paper-panel title-panel${className ? ` ${className}` : ''}" data-screen="${state}" data-art="${artReady ? 'true' : 'false'}">
      ${panelArt}
      ${decoration}
      <div class="screen-content">${content}</div>
    </div>`;
  }

  renderMenu() {
    const titleArt = this._image('titlePlaque', 'screen-title-art');
    this.layer.innerHTML = this._panel(`
      <div class="screen-title-wrap">
        ${titleArt}
        <h1 class="screen-title-copy">敦煌逃亡</h1>
      </div>
      <p class="instruction">越过石窟长桥，穿行月色与流云。<br />收集铜钱，在丝路上跑得更远。</p>
      <p class="controls-hint"><kbd>←</kbd><kbd>→</kbd> 换道　<kbd>↑</kbd> 跳跃　<kbd>↓</kbd> 滑行</p>
      ${this._actionButton('start-button', '开始逃亡', { image: true })}
    `, 'menu', {
      className: 'screen-menu',
      artReady: Boolean(titleArt),
    });
    this.layer.querySelector('#start-button').onclick = this.onStart;
    this.layer.hidden = false;
  }

  showPause() {
    this.layer.innerHTML = this._panel(`
      <p class="eyebrow">行者暂歇</p>
      <h2>已暂停</h2>
      <p class="instruction">沙海的风停在这一刻，准备好后继续前行。</p>
      <div class="button-row">
        ${this._actionButton('resume-button', '继续')}
        ${this._actionButton('restart-button', '重新开始')}
      </div>
    `, 'pause', { decorations: true });
    this.layer.querySelector('#resume-button').onclick = this.onResume;
    this.layer.querySelector('#restart-button').onclick = this.onRestart;
    this.layer.hidden = false;
  }

  showResult(score) {
    const recordLabel = score.newRecord ? '<span class="new-record">新纪录</span>' : '';
    const resultArt = this._image('resultPanel', 'screen-result-art');
    this.layer.innerHTML = this._panel(`
      <h2>本次逃亡</h2>
      <div class="result-stats" aria-label="本次成绩">
        <p><span>距离</span><strong>${Math.floor(score.distance)} 米</strong></p>
        <p><span>铜钱</span><strong>${score.coins}</strong></p>
        <p><span>分数</span><strong>${Math.floor(score.total)}</strong></p>
      </div>
      <p class="result-best">历史最高分 ${Math.floor(score.highScore)} ${recordLabel}</p>
      ${this._actionButton('restart-button', '再来一次', { className: 'screen-result-action' })}
    `, 'result', {
      className: 'screen-result',
      panelArt: resultArt,
      artReady: Boolean(resultArt),
    });
    this.layer.querySelector('#restart-button').onclick = this.onRestart;
    this.layer.hidden = false;
  }

  hide() {
    this.layer.hidden = true;
  }
}
