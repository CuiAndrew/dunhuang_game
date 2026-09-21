// Places a finite set of reusable Dunhuang silhouettes along the shared track frame.
import { ChunkPool } from './ChunkPool.js?v=20260920-3';

const KINDS = ['DUNE', 'TEMPLE', 'CAVE', 'LANTERN', 'FLAG'];

export class EnvironmentSystem {
  constructor({ config, track, createVisual, random = Math.random }) {
    this.config = config;
    this.track = track;
    this.random = random;
    this.createVisual = createVisual;
    this.density = 1;
    this.pool = new ChunkPool({ size: config.art.decorationPoolSize, create: () => ({ visual: createVisual() }) });
    this.nextS = config.scene.roadStart;
    const vector = (x, y, z) => ({ x, y, z, set(nx, ny, nz) { this.x = nx; this.y = ny; this.z = nz; } });
    this.frame = { position: vector(0, 0, 0), forward: vector(0, 0, 1), right: vector(1, 0, 0) };
  }

  ensureAhead(playerS, distanceAhead) {
    const target = playerS + distanceAhead;
    while (this.nextS < target) {
      const kind = KINDS[Math.floor(this.random() * KINDS.length)];
      const slot = this.random() <= this.density ? this.pool.acquire(this.nextS, kind) : null;
      if (slot) {
        slot.item.visual.visible = true;
        slot.item.visual.setKind?.(kind);
        this._place(slot);
      }
      this.nextS += this.config.art.decorationSpacing;
    }
  }

  recycleBefore(s) {
    this.pool.recycleBefore(s, (slot) => { slot.item.visual.visible = false; });
  }

  reset() {
    this.pool.reset((slot) => { slot.item.visual.visible = false; });
    this.nextS = this.config.scene.roadStart;
  }

  setDensity(value) {
    this.density = Math.max(0, Math.min(1, value));
  }

  update(playerS, distanceAhead) {
    this.ensureAhead(playerS, distanceAhead);
    this.recycleBefore(playerS - this.config.track.recycleBehind);
    for (const slot of this.pool.active) this._place(slot);
  }

  forEachVisual(callback) {
    for (const slot of this.pool.items) callback(slot.item.visual);
  }

  poolStats() {
    return { active: this.pool.activeCount(), free: this.pool.freeCount() };
  }

  _place(slot) {
    this.track.evalTrack(slot.s, this.frame);
    const side = slot.kind === 'TEMPLE' || slot.kind === 'CAVE' ? (slot.s % 2 === 0 ? -1 : 1) : (slot.s % 3 === 0 ? 1 : -1);
    const offset = this.config.art.decorationSideOffset * side;
    const visual = slot.item.visual;
    visual.position.set(
      this.frame.position.x + this.frame.right.x * offset,
      this.frame.position.y,
      this.frame.position.z + this.frame.right.z * offset,
    );
    visual.rotation.y = Math.atan2(-this.frame.forward.x, this.frame.forward.z);
  }
}
