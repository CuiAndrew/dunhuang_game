// Draws the active sampled track as one reusable triangle-strip buffer, including visual holes for GAP segments.
export class TrackMesh {
  constructor({ THREE, track, config, palette, texture = null }) {
    this.THREE = THREE;
    this.track = track;
    this.config = config;
    this.palette = palette;
    this.capacity = config.track.samplePoolSize;
    this.positions = new Float32Array(this.capacity * 2 * 3);
    this.normals = new Float32Array(this.capacity * 2 * 3);
    this.indices = new Uint16Array((this.capacity - 1) * 6);
    this.geometry = new THREE.BufferGeometry();
    this.positionAttribute = new THREE.BufferAttribute(this.positions, 3);
    this.normalAttribute = new THREE.BufferAttribute(this.normals, 3);
    this.indexAttribute = new THREE.BufferAttribute(this.indices, 1);
    this.positionAttribute.setUsage(THREE.DynamicDrawUsage);
    this.normalAttribute.setUsage(THREE.DynamicDrawUsage);
    this.indexAttribute.setUsage(THREE.DynamicDrawUsage);
    this.geometry.setAttribute('position', this.positionAttribute);
    this.geometry.setAttribute('normal', this.normalAttribute);
    this.geometry.setIndex(this.indexAttribute);
    this.geometry.setDrawRange(0, 0);
    this.material = new THREE.MeshStandardMaterial({
      color: palette.sand ?? palette.plaster,
      map: texture,
      roughness: 0.92,
    });
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.matrixAutoUpdate = false;
    this.mesh.updateMatrix();
    this.mesh.frustumCulled = false;
    this.root = new THREE.Group();
    this.root.add(this.mesh);
    this.laneMarks = [];
    this.rails = [];
    const markMaterial = new THREE.MeshBasicMaterial({
      color: palette.muralGold ?? palette.dunhuangGold,
      transparent: true,
      opacity: 0.56,
    });
    const railMaterial = new THREE.MeshStandardMaterial({
      color: palette.muralBlue ?? palette.bronze,
      roughness: 0.9,
    });
    for (let index = 0; index < config.track.laneMarkCount * 2; index += 1) {
      const mark = new THREE.Mesh(new THREE.BoxGeometry(config.track.laneMarkWidth, config.track.laneMarkHeight, config.track.laneMarkLength), markMaterial);
      mark.visible = false;
      this.laneMarks.push(mark);
      this.root.add(mark);
    }
    for (let index = 0; index < 2; index += 1) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.22, 4), railMaterial);
      rail.visible = false;
      this.rails.push(rail);
      this.root.add(rail);
    }
    this.decorationFrame = { position: new THREE.Vector3(), forward: new THREE.Vector3(), right: new THREE.Vector3() };
    this.lastRevision = -1;
    this.updateFromTrack();
  }

  updateFromTrack() {
    if (this.lastRevision === this.track.revision) {
      return;
    }

    const sampleCount = this.track.sampleCount();
    const halfWidth = this.config.track.roadWidth / 2;
    let indexCount = 0;
    for (let index = 0; index < sampleCount; index += 1) {
      const sample = this.track.getSampleAt(index);
      const vertexOffset = index * 6;
      const rightX = sample.right.x * halfWidth;
      const rightZ = sample.right.z * halfWidth;
      this.positions[vertexOffset] = sample.position.x - rightX;
      this.positions[vertexOffset + 1] = sample.position.y;
      this.positions[vertexOffset + 2] = sample.position.z - rightZ;
      this.positions[vertexOffset + 3] = sample.position.x + rightX;
      this.positions[vertexOffset + 4] = sample.position.y;
      this.positions[vertexOffset + 5] = sample.position.z + rightZ;
      this.normals[vertexOffset + 1] = 1;
      this.normals[vertexOffset + 4] = 1;

      if (index > 0 && sample.type !== 'GAP') {
        const previousVertex = (index - 1) * 2;
        const currentVertex = index * 2;
        this.indices[indexCount] = previousVertex;
        this.indices[indexCount + 1] = currentVertex;
        this.indices[indexCount + 2] = previousVertex + 1;
        this.indices[indexCount + 3] = previousVertex + 1;
        this.indices[indexCount + 4] = currentVertex;
        this.indices[indexCount + 5] = currentVertex + 1;
        indexCount += 6;
      }
    }
    this.positionAttribute.needsUpdate = true;
    this.normalAttribute.needsUpdate = true;
    this.indexAttribute.needsUpdate = true;
    this.geometry.setDrawRange(0, indexCount);
    this._updateDecorations();
    this.lastRevision = this.track.revision;
  }

  _updateDecorations() {
    const firstS = this.track.firstSampleS();
    const lastS = this.track.trackLength();
    const spacing = this.config.track.laneMarkSpacing;
    for (let index = 0; index < this.laneMarks.length; index += 1) {
      const lane = index % 2 === 0 ? -1 : 1;
      const s = firstS + Math.floor(index / 2) * spacing;
      const mark = this.laneMarks[index];
      if (s > lastS) {
        mark.visible = false;
        continue;
      }
      this.track.evalTrack(s, this.decorationFrame);
      mark.visible = true;
      mark.position.set(
        this.decorationFrame.position.x + this.decorationFrame.right.x * lane * (this.config.track.roadWidth / 6),
        this.decorationFrame.position.y + this.config.track.laneMarkHeight,
        this.decorationFrame.position.z + this.decorationFrame.right.z * lane * (this.config.track.roadWidth / 6),
      );
      mark.rotation.y = Math.atan2(-this.decorationFrame.forward.x, this.decorationFrame.forward.z);
    }
    for (let index = 0; index < this.rails.length; index += 1) {
      const s = Math.min(lastS, firstS + 10 + index * 6);
      this.track.evalTrack(s, this.decorationFrame);
      const side = index === 0 ? -1 : 1;
      const offset = this.config.track.roadWidth / 2 + 0.25;
      const rail = this.rails[index];
      rail.visible = lastS > firstS + 4;
      rail.position.set(
        this.decorationFrame.position.x + this.decorationFrame.right.x * side * offset,
        this.decorationFrame.position.y + 0.18,
        this.decorationFrame.position.z + this.decorationFrame.right.z * side * offset,
      );
      rail.rotation.y = Math.atan2(-this.decorationFrame.forward.x, this.decorationFrame.forward.z);
    }
  }
}
