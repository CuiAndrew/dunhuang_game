// Tracks sustained frame pressure and exposes small, deterministic quality steps for the renderer.
export class PerformanceBudget {
  constructor({ config }) {
    this.config = config;
    this.qualityPixelRatios = config.render.qualityPixelRatios ?? [config.render.maxPixelRatio, 1];
    this.shadowMapSizes = config.render.shadowMapSizes ?? [1024, 512, 0];
    this.decorationDensities = config.render.decorationDensities ?? [1, 0.7, 0.4];
    this.level = 0;
    this.lowFrameSeconds = 0;
  }

  update(frameDelta) {
    if (frameDelta <= 0) return false;
    const fps = 1 / frameDelta;
    if (fps < this.config.render.lowFpsThreshold) {
      this.lowFrameSeconds += frameDelta;
    } else {
      this.lowFrameSeconds = Math.max(0, this.lowFrameSeconds - frameDelta * 0.5);
    }
    if (this.lowFrameSeconds < this.config.render.lowFpsDuration || this.level >= this.qualityPixelRatios.length - 1) {
      return false;
    }
    this.level += 1;
    this.lowFrameSeconds = 0;
    return true;
  }

  get pixelRatioCap() {
    return this.qualityPixelRatios[this.level];
  }

  get shadowsEnabled() {
    return this.shadowMapSize > 0;
  }

  get shadowMapSize() {
    return this.shadowMapSizes[Math.min(this.level, this.shadowMapSizes.length - 1)] ?? 0;
  }

  get decorationDensity() {
    return this.decorationDensities[Math.min(this.level, this.decorationDensities.length - 1)] ?? 0;
  }
}
