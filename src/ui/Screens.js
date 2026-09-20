// Owns menu, pause and result overlays while keeping focusable actions native and predictable.
export class Screens {
  constructor({ layer, onStart, onResume, onRestart }) {
    this.layer = layer;
    this.onStart = onStart;
    this.onResume = onResume;
    this.onRestart = onRestart;
    this.renderMenu();
  }

  renderMenu() {
    this.layer.innerHTML = '<div class="title-panel"><p class="eyebrow">壁画行者 · 沙海逃亡</p><h1>敦煌逃亡</h1><p class="instruction">自动前行，左右换道，跃过断壁，避开身后的苏醒石兽。</p><button id="start-button" type="button">开始逃亡</button></div>';
    this.layer.querySelector('#start-button').onclick = this.onStart;
    this.layer.hidden = false;
  }

  showPause() {
    this.layer.innerHTML = '<div class="title-panel"><p class="eyebrow">行者暂歇</p><h2>已暂停</h2><button id="resume-button" type="button">继续</button><button id="restart-button" type="button">重新开始</button></div>';
    this.layer.querySelector('#resume-button').onclick = this.onResume;
    this.layer.querySelector('#restart-button').onclick = this.onRestart;
    this.layer.hidden = false;
  }

  showResult(score) {
    this.layer.innerHTML = `<div class="title-panel"><p class="eyebrow">石兽已近</p><h2>本次逃亡</h2><p class="result-copy">${Math.floor(score.distance)} m · ${score.coins} 枚铜钱 · ${Math.floor(score.total)} 分</p><button id="restart-button" type="button">再来一次</button></div>`;
    this.layer.querySelector('#restart-button').onclick = this.onRestart;
    this.layer.hidden = false;
  }

  hide() {
    this.layer.hidden = true;
  }
}
