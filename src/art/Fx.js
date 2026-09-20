// Provides a fixed particle buffer for sand, coin flashes and impact feedback without per-frame allocations.
export class FxSystem {
  constructor({ THREE, scene, config, palette }) {
    this.THREE = THREE;
    this.config = config;
    this.life = new Float32Array(config.fx.particleCount);
    this.velocity = new Float32Array(config.fx.particleCount * 3);
    this.positions = new Float32Array(config.fx.particleCount * 3);
    this.geometry = new THREE.BufferGeometry();
    this.positionAttribute = new THREE.BufferAttribute(this.positions, 3);
    this.geometry.setAttribute('position', this.positionAttribute);
    this.material = new THREE.PointsMaterial({ color: palette.dunhuangGold, size: 0.12, transparent: true, opacity: 0.85 });
    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    scene.add(this.points);
    this.cursor = 0;
  }

  emit(position, count = 8) {
    for (let index = 0; index < count; index += 1) {
      const slot = (this.cursor + index) % this.config.fx.particleCount;
      const offset = slot * 3;
      this.positions[offset] = position.x;
      this.positions[offset + 1] = position.y;
      this.positions[offset + 2] = position.z;
      this.velocity[offset] = (index % 3 - 1) * 1.4;
      this.velocity[offset + 1] = 1 + (index % 4) * 0.35;
      this.velocity[offset + 2] = (index % 2 === 0 ? 1 : -1) * 0.8;
      this.life[slot] = this.config.fx.particleLife;
    }
    this.cursor = (this.cursor + count) % this.config.fx.particleCount;
    this.positionAttribute.needsUpdate = true;
  }

  update(dt) {
    for (let index = 0; index < this.config.fx.particleCount; index += 1) {
      if (this.life[index] <= 0) continue;
      const offset = index * 3;
      this.life[index] = Math.max(0, this.life[index] - dt);
      this.positions[offset] += this.velocity[offset] * dt;
      this.positions[offset + 1] += this.velocity[offset + 1] * dt;
      this.positions[offset + 2] += this.velocity[offset + 2] * dt;
      this.velocity[offset + 1] -= 3.2 * dt;
    }
    this.positionAttribute.needsUpdate = true;
  }
}
