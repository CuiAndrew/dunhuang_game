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
    this.uvs = new Float32Array(this.capacity * 2 * 2);
    this.indices = new Uint16Array((this.capacity - 1) * 6);
    this.geometry = new THREE.BufferGeometry();
    this.positionAttribute = new THREE.BufferAttribute(this.positions, 3);
    this.normalAttribute = new THREE.BufferAttribute(this.normals, 3);
    this.uvAttribute = new THREE.BufferAttribute(this.uvs, 2);
    this.indexAttribute = new THREE.BufferAttribute(this.indices, 1);
    this.positionAttribute.setUsage(THREE.DynamicDrawUsage);
    this.normalAttribute.setUsage(THREE.DynamicDrawUsage);
    this.uvAttribute.setUsage(THREE.DynamicDrawUsage);
    this.indexAttribute.setUsage(THREE.DynamicDrawUsage);
    this.geometry.setAttribute('position', this.positionAttribute);
    this.geometry.setAttribute('normal', this.normalAttribute);
    this.geometry.setAttribute('uv', this.uvAttribute);
    this.geometry.setIndex(this.indexAttribute);
    this.geometry.setDrawRange(0, 0);
    this.material = new THREE.MeshStandardMaterial({
      color: texture ? 0xFFFFFF : (palette.sand ?? palette.plaster),
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
      color: palette.bronze ?? palette.muralBlue,
      map: texture,
      roughness: 0.82,
    });
    const railTrimMaterial = new THREE.MeshStandardMaterial({
      color: palette.muralGold ?? palette.dunhuangGold,
      roughness: 0.55,
      metalness: 0.12,
    });
    for (let index = 0; index < config.track.laneMarkCount * 2; index += 1) {
      const mark = new THREE.Mesh(new THREE.BoxGeometry(config.track.laneMarkWidth, config.track.laneMarkHeight, config.track.laneMarkLength), markMaterial);
      mark.visible = false;
      this.laneMarks.push(mark);
      this.root.add(mark);
    }
    this.railCapacity = (this.capacity - 1) * 2;
    this.railBody = new THREE.InstancedMesh(new THREE.BoxGeometry(0.18, 0.52, 1), railMaterial, this.railCapacity);
    this.railTrim = new THREE.InstancedMesh(new THREE.BoxGeometry(0.32, 0.08, 1), railTrimMaterial, this.railCapacity);
    this.railBody.name = 'bridge-parapets';
    this.railTrim.name = 'bridge-gold-trim';
    this.railBody.count = 0;
    this.railTrim.count = 0;
    this.railBody.frustumCulled = false;
    this.railTrim.frustumCulled = false;
    this.railBody.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.railTrim.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.root.add(this.railBody, this.railTrim);
    this.decorationFrame = { position: new THREE.Vector3(), forward: new THREE.Vector3(), right: new THREE.Vector3() };
    this.railDummy = new THREE.Object3D();
    this.railStart = new THREE.Vector3();
    this.railEnd = new THREE.Vector3();
    this.railMid = new THREE.Vector3();
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
      const uvOffset = index * 4;
      const textureV = sample.s / 4;
      this.uvs[uvOffset] = 0;
      this.uvs[uvOffset + 1] = textureV;
      this.uvs[uvOffset + 2] = 1;
      this.uvs[uvOffset + 3] = textureV;

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
    this.uvAttribute.needsUpdate = true;
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
    const sampleCount = this.track.sampleCount();
    const railOffset = this.config.track.roadWidth / 2 - 0.16;
    let railIndex = 0;
    for (let index = 0; index < sampleCount - 1 && railIndex < this.railCapacity; index += 1) {
      const sample = this.track.getSampleAt(index);
      const next = this.track.getSampleAt(index + 1);
      const segmentLength = next.s - sample.s;
      if (segmentLength <= 0 || sample.type === 'GAP' || next.type === 'GAP') continue;

      for (const side of [-1, 1]) {
        this.railStart.copy(sample.position).addScaledVector(sample.right, side * railOffset);
        this.railEnd.copy(next.position).addScaledVector(next.right, side * railOffset);
        this.railMid.lerpVectors(this.railStart, this.railEnd, 0.5);
        this.railDummy.position.copy(this.railMid);
        this.railDummy.lookAt(this.railEnd);
        this.railDummy.scale.set(1, 1, segmentLength);
        this.railDummy.position.y += 0.27;
        this.railDummy.updateMatrix();
        this.railBody.setMatrixAt(railIndex, this.railDummy.matrix);

        this.railDummy.position.y += 0.3;
        this.railDummy.updateMatrix();
        this.railTrim.setMatrixAt(railIndex, this.railDummy.matrix);
        railIndex += 1;
      }
    }
    this.railBody.count = railIndex;
    this.railTrim.count = railIndex;
    this.railBody.instanceMatrix.needsUpdate = true;
    this.railTrim.instanceMatrix.needsUpdate = true;
  }
}
