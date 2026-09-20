// Runs deterministic fixed-rate game updates while allowing smooth interpolated rendering.
export class FixedStepLoop {
  constructor({ fixedDt, maxFrameDelta, update, render }) {
    this.fixedDt = fixedDt;
    this.maxFrameDelta = maxFrameDelta;
    this.update = update;
    this.render = render;
    this.accumulator = 0;
    this.lastTime = 0;
    this.running = false;
    this.paused = false;
    this.frame = this.frame.bind(this);
  }

  start() {
    if (this.running) {
      return;
    }

    this.running = true;
    this.lastTime = performance.now();
    requestAnimationFrame(this.frame);
  }

  stop() {
    this.running = false;
  }

  frame(now) {
    if (!this.running) {
      return;
    }

    this.advance((now - this.lastTime) / 1000);
    this.lastTime = now;
    requestAnimationFrame(this.frame);
  }

  advance(deltaSeconds) {
    const delta = Math.min(this.maxFrameDelta, Math.max(0, deltaSeconds));

    if (!this.paused) {
      this.accumulator += delta;
      while (this.accumulator >= this.fixedDt) {
        this.update(this.fixedDt);
        this.accumulator -= this.fixedDt;
      }
    }

    this.render(this.accumulator / this.fixedDt);
  }
}
