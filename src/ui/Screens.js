// Owns menu, pause and result overlays while keeping focusable actions native and predictable.
export class Screens {
  constructor({ layer, onStart, onResume, onRestart }) {
    this.layer = layer;
    this.onStart = onStart;
    this.onResume = onResume;
    this.onRestart = onRestart;
    this.renderMenu();
  }

  _panel(content, state) {
    return `<div class="paper-panel title-panel" data-screen="${state}">
      <div class="screen-decoration cloud-motif" aria-hidden="true"></div>
      <div class="screen-decoration flying-ribbon" aria-hidden="true"></div>
      ${content}
    </div>`;
  }

  renderMenu() {
    this.layer.innerHTML = this._panel(`
      <p class="eyebrow">壁画行者 · 沙海逃亡</p>
      <h1>敦煌逃亡</h1>
      <p class="instruction">自动前行，左右换道，跃过断壁，避开身后的苏醒石兽。</p>
      <p class="controls-hint"><kbd>←</kbd><kbd>→</kbd> 换道　<kbd>↑</kbd> 跳跃　<kbd>↓</kbd> 滑行</p>
      <button id="start-button" class="seal-button" type="button">开始逃亡</button>
    `, 'menu');
    this.layer.querySelector('#start-button').onclick = this.onStart;
    this.layer.hidden = false;
  }

  showPause() {
    this.layer.innerHTML = this._panel(`
      <p class="eyebrow">行者暂歇</p>
      <h2>已暂停</h2>
      <p class="instruction">沙海的风停在这一刻，准备好后继续前行。</p>
      <div class="button-row">
        <button id="resume-button" class="seal-button" type="button">继续</button>
        <button id="restart-button" class="seal-button" type="button">重新开始</button>
      </div>
    `, 'pause');
    this.layer.querySelector('#resume-button').onclick = this.onResume;
    this.layer.querySelector('#restart-button').onclick = this.onRestart;
    this.layer.hidden = false;
  }

  showResult(score) {
    const recordLabel = score.newRecord ? '<span class="new-record">新纪录</span>' : '';
    this.layer.innerHTML = this._panel(`
      <p class="eyebrow">石兽已近</p>
      <h2>本次逃亡</h2>
      <p class="result-copy">${Math.floor(score.distance)} m · ${score.coins} 枚铜钱 · ${Math.floor(score.total)} 分</p>
      <p class="result-best">历史最高分 ${Math.floor(score.highScore)} ${recordLabel}</p>
      <button id="restart-button" class="seal-button" type="button">再来一次</button>
    `, 'result');
    this.layer.querySelector('#restart-button').onclick = this.onRestart;
    this.layer.hidden = false;
  }

  hide() {
    this.layer.hidden = true;
  }
}
